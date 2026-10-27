import path from 'node:path';
import { dsh } from './dsh.mjs';

const MAX_TOOL_RESULT = 24000;
const MAX_REASONING = 12000;
const LIVE_THROTTLE_MS = 90;
const IDLE_CLOSE_MS = 2 * 60 * 1000;

function clip(text, limit) {
  const value = String(text ?? '');
  if (value.length <= limit) return { text: value, truncated: false };
  return { text: `${value.slice(0, limit)}\n\n… 已截断 ${value.length - limit} 个字符`, truncated: true };
}

function textFromContent(content) {
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    else if (block.type === 'image') parts.push('[图片]');
    else if (block.type === 'file') parts.push('[文件]');
    else if (block.type === 'tool-result' && typeof block.text === 'string') parts.push(block.text);
  }
  return parts.join('\n').trim();
}

function reasoningFromContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block?.type === 'reasoning' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n\n')
    .trim();
}

function toolCallsFromContent(content) {
  if (!Array.isArray(content)) return [];
  return content.filter((block) => block?.type === 'tool-call' && block.id);
}

function parseArguments(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try { return JSON.parse(value); } catch { return { raw: value }; }
}

function toolTitle(name, args) {
  if (!args || typeof args !== 'object') return name || '工具';
  if (name === 'bash' && args.command) return String(args.command).split('\n')[0].slice(0, 120);
  if (args.description) return String(args.description).slice(0, 120);
  if (args.path) return String(args.path).slice(0, 120);
  if (args.query) return String(args.query).slice(0, 120);
  return name || '工具';
}

function basename(cwd) {
  if (!cwd) return '工作区';
  return path.basename(String(cwd).replace(/\/+$/, '')) || String(cwd);
}

function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function eventTime(event) {
  const time = Number(event?.time || event?.data?.time || 0);
  return Number.isFinite(time) && time > 0 ? time : Date.now();
}

class SessionSync {
  constructor(hub, id, { running = false } = {}) {
    this.hub = hub;
    this.id = id;
    this.state = {
      id,
      title: null,
      cwd: null,
      createdAt: null,
      updatedAt: Date.now(),
      running,
      connected: false,
      connecting: true,
      error: null,
      live: null,
      items: [],
      usage: null,
      context: null,
      model: null,
      permissions: null,
      questions: [],
      todos: null,
      goal: null,
      cursor: 0,
      hasMore: false,
      modelCatalog: null,
    };
    this.items = new Map();
    this.subscribers = new Set();
    this.ready = false;
    this.readyPromise = null;
    this.readyResolve = null;
    this.readyReject = null;
    this.stream = null;
    this.opening = false;
    this.closed = false;
    this.retryTimer = null;
    this.retryAttempt = 0;
    this.idleTimer = null;
    this.liveTimer = null;
    this.liveDirty = false;
    this.lastUsedAt = Date.now();
  }

  ensureReady() {
    if (this.ready) return Promise.resolve(this.state);
    if (!this.readyPromise) {
      this.readyPromise = new Promise((resolve, reject) => {
        this.readyResolve = resolve;
        this.readyReject = reject;
        setTimeout(() => {
          if (!this.ready) reject(new Error('连接 DSH 会话超时'));
        }, 20000).unref?.();
      });
    }
    this.open();
    return this.readyPromise;
  }

  scheduleIdleClose() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.subscribers.size === 0) this.dispose();
    }, IDLE_CLOSE_MS);
    this.idleTimer.unref?.();
  }

  touch() {
    this.lastUsedAt = Date.now();
    clearTimeout(this.idleTimer);
  }

  open() {
    if (this.closed || this.stream || this.opening) return;
    this.opening = true;
    this.state.connecting = true;
    this.state.error = null;
    dsh.follow(this.id, {
      onSnapshot: (snapshot) => this.applySnapshot(snapshot),
      onEvent: (event) => this.applyEvent(event, { broadcast: true }),
      onAssistantStream: (frame) => this.applyAssistantFrame(frame),
      onError: (error) => this.handleFailure(error),
      onEnd: () => this.handleFailure(new Error('DSH 会话流已结束')),
      onClose: () => this.handleFailure(new Error('DSH 会话流已断开')),
    }, { maxMessages: 50 }).then((handle) => {
      this.opening = false;
      this.stream = handle;
      this.broadcastStatus();
    }).catch((error) => {
      this.opening = false;
      this.handleFailure(error);
    });
  }

  handleFailure(error) {
    this.stream = null;
    this.opening = false;
    this.state.connected = false;
    this.state.connecting = false;
    this.state.error = error instanceof Error ? error.message : String(error);
    if (!this.ready && this.readyReject) {
      const reject = this.readyReject;
      this.readyPromise = null;
      this.readyResolve = null;
      this.readyReject = null;
      reject(error instanceof Error ? error : new Error(String(error)));
    }
    this.broadcastStatus();
    if (this.subscribers.size > 0 && !this.closed) {
      const delay = Math.min(10000, 1200 * 2 ** Math.min(this.retryAttempt, 4));
      this.retryAttempt += 1;
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        if (!this.closed && this.subscribers.size > 0) this.open();
      }, delay);
      this.retryTimer.unref?.();
    }
  }

  applySnapshot(snapshot) {
    const wasReady = this.ready;
    this.items.clear();
    this.state.items = [];
    this.state.live = null;
    this.state.error = null;
    this.state.connected = true;
    this.state.connecting = false;
    this.state.cursor = Number(snapshot.cursor || 0);
    this.state.hasMore = Boolean(snapshot.hasMore);
    const header = snapshot.header || {};
    this.state.cwd = header.cwd || this.state.cwd;
    this.state.createdAt = header.createdAt || this.state.createdAt;
    this.state.updatedAt = Date.now();
    this.state.chat = { version: header.version, preset: header.agentPreset };
    for (const record of snapshot.records || []) {
      if (record?.type === 'event' && record.event) this.applyEvent(record.event, { broadcast: false });
    }
    this.applyProjections(snapshot.projections);
    const activeAttempt = snapshot.assistantStream?.activeAttempt;
    if (activeAttempt) {
      this.state.running = true;
      this.state.live = {
        active: true,
        text: '',
        reasoning: '',
        toolName: null,
        startedAt: Date.now(),
        attemptId: activeAttempt.attemptId,
      };
      for (const chunk of activeAttempt.stream || []) {
        if (chunk && typeof chunk === 'object') this.applyAssistantFrame({ type: 'chunk', chunk });
      }
      this.state.live.active = true;
    }
    this.state.updatedAt = Date.now();
    this.ready = true;
    this.retryAttempt = 0;
    this.sendToAll('state', this.state);
    if (!wasReady) this.readyResolve?.(this.state);
    this.broadcastStatus();
  }

  applyProjections(projections) {
    const values = projections?.values || {};
    if (typeof values.title === 'string') this.state.title = cleanTitle(values.title);
    if (values.tokenUsage) this.state.usage = values.tokenUsage;
    if (values.contextPressure) this.state.context = values.contextPressure;
    if (values.modelSelection) {
      const selected = values.modelSelection.next || values.modelSelection.lastUsed;
      if (selected) this.state.model = selected;
    }
    if (values.permissions) this.state.permissions = values.permissions;
    if (values.userQuestions) this.state.questions = values.userQuestions.active || [];
    if (values.todos) this.state.todos = values.todos;
    if (values.goal) this.state.goal = values.goal;
    if (values.workingDirectory) this.state.cwd = values.workingDirectory;
  }

  upsertItem(item) {
    const existing = this.items.get(item.id);
    if (existing) {
      Object.assign(existing, item);
      this.state.items[this.state.items.indexOf(existing)] = existing;
      return { item: existing, added: false };
    }
    this.items.set(item.id, item);
    this.state.items.push(item);
    this.state.items.sort((a, b) => (a.seq || 0) - (b.seq || 0) || (a.time || 0) - (b.time || 0));
    return { item, added: true };
  }

  applyEvent(event, { broadcast = true } = {}) {
    if (!event || typeof event.type !== 'string') return;
    const data = event.data || {};
    const seq = Number(event.seq || 0);
    const time = eventTime(event);
    let changed = null;

    if (event.type === 'user/message') {
      const sourceKind = data.source?.kind;
      if (sourceKind && sourceKind !== 'user') return;
      const id = `user:${data.id || seq}`;
      const text = textFromContent(data.content);
      if (/^(?:Current runtime context\.|<system-reminder>|Time sampled while preparing)/.test(text)) return;
      if (text) {
        changed = this.upsertItem({
          id,
          kind: 'user',
          seq,
          time,
          text,
          images: (data.content || []).filter((block) => block?.type === 'image').length,
        });
      }
      this.state.live = null;
    } else if (event.type === 'assistant/message') {
      const message = data.message || {};
      const content = message.content || [];
      const text = textFromContent(content);
      const reasoning = reasoningFromContent(content);
      const toolCalls = toolCallsFromContent(content);
      if (text || reasoning) {
        const limitedReasoning = clip(reasoning, MAX_REASONING);
        changed = this.upsertItem({
          id: `assistant:${seq}`,
          kind: 'assistant',
          seq,
          time,
          turn: data.turn,
          step: data.step,
          text,
          reasoning: limitedReasoning.text,
          reasoningTruncated: limitedReasoning.truncated,
          model: message.source?.model,
          provider: message.source?.provider,
        });
      }
      for (const call of toolCalls) {
        if (!this.items.has(`tool:${call.id}`)) {
          const args = parseArguments(call.arguments);
          this.upsertItem({
            id: `tool:${call.id}`,
            kind: 'tool',
            seq: seq + 0.1,
            time,
            callId: call.id,
            name: call.name || 'tool',
            title: toolTitle(call.name, args),
            arguments: args,
            status: 'pending',
            result: null,
            isError: false,
          });
        }
      }
      this.state.live = null;
      this.state.running = true;
    } else if (event.type === 'tool/call') {
      const args = parseArguments(data.arguments);
      changed = this.upsertItem({
        id: `tool:${data.callId}`,
        kind: 'tool',
        seq,
        time,
        callId: data.callId,
        name: data.name || 'tool',
        title: toolTitle(data.name, args),
        arguments: args,
        status: 'running',
        result: null,
        isError: false,
      });
    } else if (event.type === 'tool/result') {
      const message = data.message || {};
      const callId = message.toolCallId || data.callId;
      if (!callId) return;
      const existing = this.items.get(`tool:${callId}`);
      const text = textFromContent(message.content);
      const limited = clip(text, MAX_TOOL_RESULT);
      if (existing) {
        Object.assign(existing, {
          status: message.isError ? 'error' : 'completed',
          result: limited.text,
          resultTruncated: limited.truncated,
          isError: Boolean(message.isError),
          finishedAt: time,
        });
        changed = { item: existing, added: false };
      } else {
        changed = this.upsertItem({
          id: `tool:${callId}`,
          kind: 'tool',
          seq,
          time,
          callId,
          name: data.name || 'tool',
          title: oneLine(text) || '工具结果',
          arguments: {},
          status: message.isError ? 'error' : 'completed',
          result: limited.text,
          resultTruncated: limited.truncated,
          isError: Boolean(message.isError),
        });
      }
    } else if (event.type === 'job/registered') {
      const callId = data.toolCall?.callId;
      if (callId && this.items.has(`tool:${callId}`)) {
        const item = this.items.get(`tool:${callId}`);
        item.status = 'running';
        item.jobId = data.jobId;
        changed = { item, added: false };
      }
    } else if (event.type === 'job/settled') {
      const callId = data.toolCall?.callId;
      if (callId && this.items.has(`tool:${callId}`)) {
        const item = this.items.get(`tool:${callId}`);
        if (item.status === 'running' || item.status === 'pending') {
          item.status = data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'error' : item.status;
        }
        item.detail = data.detail;
        changed = { item, added: false };
      }
    } else if (event.type === 'turn/start') {
      this.state.running = true;
      this.state.live = this.state.live || { active: false, text: '', reasoning: '', startedAt: Date.now() };
      this.broadcastStatus();
    } else if (event.type === 'turn/end') {
      this.state.running = false;
      this.state.live = null;
      this.state.updatedAt = Date.now();
      this.broadcastStatus();
    } else if (event.type === 'session/title') {
      const title = cleanTitle(data.title || data.text || data.message);
      if (title) {
        this.state.title = title;
        this.broadcastPatch({ op: 'title', title });
      }
    } else if (event.type === 'permission/preset' || event.type === 'sandbox/mode' || event.type === 'approval/policy') {
      this.state.permissions = { ...(this.state.permissions || {}), currentValue: data.value || data.preset || data.mode || data.policy };
      this.broadcastPatch({ op: 'permissions', permissions: this.state.permissions });
    } else if (event.type === 'step/start') {
      this.state.running = true;
    } else if (event.type === 'step/end') {
      this.state.running = true;
    }

    if (changed) {
      this.state.updatedAt = Date.now();
      if (broadcast) this.broadcastPatch({ op: 'item', item: changed.item });
    }
  }

  applyAssistantFrame(frame) {
    if (!frame?.type) return;
    if (frame.type === 'start') {
      this.state.running = true;
      this.state.live = {
        active: true,
        text: '',
        reasoning: '',
        toolName: null,
        startedAt: Date.now(),
        attemptId: frame.attemptId,
      };
      this.broadcastStatus();
      return;
    }
    if (frame.type === 'end') {
      if (this.state.live) {
        this.state.live.active = false;
        this.state.live.finishedAt = Date.now();
        this.broadcastLive(true);
      }
      return;
    }
    if (frame.type !== 'chunk' || !this.state.live) return;
    const chunk = frame.chunk || {};
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      this.state.live.text = (this.state.live.text + chunk.text).slice(-40000);
      this.liveDirty = true;
    } else if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string') {
      this.state.live.reasoning = (this.state.live.reasoning + chunk.text).slice(-MAX_REASONING);
      this.liveDirty = true;
    } else if (chunk.type === 'block-start' && chunk.blockType) {
      this.state.live.currentBlock = chunk.blockType;
    } else if (chunk.type === 'tool-call-delta') {
      if (chunk.name) this.state.live.toolName = chunk.name;
      this.state.live.toolHint = true;
      this.liveDirty = true;
    } else if (chunk.type === 'block-end' && chunk.block?.type === 'tool-call') {
      this.state.live.toolName = chunk.block.name || this.state.live.toolName;
      this.liveDirty = true;
    }
    if (this.liveDirty && !this.liveTimer) {
      this.liveTimer = setTimeout(() => {
        this.liveTimer = null;
        if (this.liveDirty) {
          this.liveDirty = false;
          this.broadcastLive();
        }
      }, LIVE_THROTTLE_MS);
    }
  }

  broadcastLive(force = false) {
    if (!this.state.live) return;
    this.broadcastPatch({
      op: 'live',
      live: {
        active: this.state.live.active,
        text: this.state.live.text,
        reasoning: this.state.live.reasoning,
        toolName: this.state.live.toolName,
        startedAt: this.state.live.startedAt,
      },
    }, force);
  }

  sendToAll(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of this.subscribers) {
      try { res.write(payload); } catch { /* ignore */ }
    }
  }

  broadcastPatch(patch) {
    if (this.subscribers.size === 0) return;
    this.sendToAll('patch', patch);
  }

  broadcastStatus() {
    this.sendToAll('patch', {
      op: 'status',
      running: this.state.running,
      connected: this.state.connected,
      connecting: this.state.connecting,
      error: this.state.error,
      live: this.state.live,
    });
  }

  addSubscriber(res) {
    this.touch();
    this.subscribers.add(res);
    this.retryAttempt = 0;
    if (this.ready) {
      res.write(`event: state\ndata: ${JSON.stringify(this.state)}\n\n`);
    } else {
      res.write(`event: hello\ndata: {"message":"正在连接 DSH 会话…"}\n\n`);
    }
    this.open();
    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { /* ignore */ }
    }, 15000);
    heartbeat.unref?.();
    return () => {
      clearInterval(heartbeat);
      this.subscribers.delete(res);
      if (this.subscribers.size === 0) this.scheduleIdleClose();
    };
  }

  close() {
    this.dispose();
  }

  dispose() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearTimeout(this.idleTimer);
    clearTimeout(this.liveTimer);
    try { this.stream?.close(); } catch { /* ignore */ }
    this.stream = null;
    for (const res of this.subscribers) {
      try { res.end(); } catch { /* ignore */ }
    }
    this.subscribers.clear();
  }
}

function oneLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

export class SessionHub {
  constructor() {
    this.sessions = new Map();
  }

  peek(id) {
    return this.sessions.get(id) || null;
  }

  ensure(id, options = {}) {
    let session = this.sessions.get(id);
    if (!session || session.closed) {
      session = new SessionSync(this, id, options);
      this.sessions.set(id, session);
    }
    return session;
  }

  async state(id, options = {}) {
    const session = this.ensure(id, options);
    return session.ensureReady();
  }

  subscribe(id, res, options = {}) {
    const session = this.ensure(id, options);
    return session.addSubscriber(res);
  }

  mergedSession(item) {
    const id = item.sessionId;
    const live = this.sessions.get(id);
    const values = item.projections?.values || {};
    const title = live?.state.title || values.title || null;
    const cwd = values.workingDirectory || live?.state.cwd || item.cwd || null;
    const model = values.modelSelection?.next || values.modelSelection?.lastUsed || live?.state.model || null;
    const lastPromptAt = values.sessionListMetadata?.lastPromptAt || null;
    const running = Boolean(item.running) || Boolean(live?.state.running);
    return {
      id,
      title: title ? cleanTitle(title) : null,
      displayTitle: title ? cleanTitle(title) : basename(cwd),
      cwd,
      project: basename(cwd),
      updatedAt: item.updatedAt || live?.state.updatedAt || 0,
      createdAt: live?.state.createdAt || null,
      running,
      agentAvailable: Boolean(item.agentAvailable),
      blank: Boolean(item.blank),
      isSubagent: item.origin === 'subagent',
      parentSessionId: item.parentSessionId || null,
      model: model ? { provider: model.provider, model: model.model, reasoningEffort: model.reasoningEffort || null } : null,
      lastPromptAt,
      connected: Boolean(live?.state.connected),
      preview: previewOf(live),
    };
  }

  async list() {
    const items = await dsh.listSessions();
    const mapped = items
      .filter((item) => item.origin !== 'subagent')
      .map((item) => this.mergedSession(item))
      .sort((a, b) => Number(b.running) - Number(a.running) || (b.updatedAt || 0) - (a.updatedAt || 0));
    return mapped;
  }

  closeAll() {
    for (const session of this.sessions.values()) session.dispose();
    this.sessions.clear();
  }
}

function previewOf(session) {
  if (!session) return null;
  const live = session.state.live;
  if (live?.text) return oneLine(live.text).slice(0, 90);
  const last = [...session.state.items].reverse().find((item) => item.kind === 'assistant' && item.text);
  if (last) return oneLine(last.text).slice(0, 90);
  const user = [...session.state.items].reverse().find((item) => item.kind === 'user' && item.text);
  return user ? oneLine(user.text).slice(0, 90) : null;
}

export const hub = new SessionHub();
export { basename, cleanTitle };
