import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import WebSocket from './vendor/ws/index.js';
import { CREDENTIALS_PATH } from './config.mjs';

export class DshError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DshError';
    this.code = code;
    this.details = details;
  }
}

const COMMON_PORTS = [65440, 3080, 3000, 8080, 8081, 8888];

function parseSecret() {
  let text;
  try {
    text = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  } catch {
    throw new DshError('dsh/credentials', '没有找到 DSH 凭据文件，请先打开 DeepSeek Harness。');
  }
  const match = text.match(/client-connection\/browser-session:[\s\S]*?secret:\s*([A-Za-z0-9_-]+)/);
  if (!match) {
    throw new DshError('dsh/credentials', 'DSH 凭据中没有浏览器会话密钥，请重启一次 DeepSeek Harness 后再试。');
  }
  try {
    const value = match[1];
    const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
    const secret = Buffer.from(padded.replaceAll('-', '+').replaceAll('_', '/'), 'base64');
    if (secret.length !== 32) throw new Error('bad secret length');
    return secret;
  } catch {
    throw new DshError('dsh/credentials', 'DSH 浏览器会话密钥格式不正确，请重启 DeepSeek Harness。');
  }
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function cookieFor(authority, secret) {
  const now = Date.now();
  const payload = {
    version: 1,
    authority,
    issuedAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const name = `dsh-auth-${crypto.createHash('sha256').update(authority).digest('base64url')}`;
  return `${name}=v1.${body}.${signature}`;
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', timeout: 2500, ...options }).trim();
  } catch {
    return '';
  }
}

function listenPortsForDsh() {
  const pids = [];
  for (const pattern of ['dsh-desktop-host', 'dsh-web', 'dsh --profile web']) {
    const output = run('/usr/bin/pgrep', ['-f', pattern]);
    for (const line of output.split('\n')) {
      const pid = Number.parseInt(line, 10);
      if (Number.isInteger(pid) && pid > 0 && !pids.includes(pid)) pids.push(pid);
    }
  }
  const ports = [];
  for (const pid of pids.slice(0, 8)) {
    const output = run('/usr/sbin/lsof', ['-nP', '-a', '-p', String(pid), '-iTCP', '-sTCP:LISTEN', '-F', 'n']);
    for (const line of output.split('\n')) {
      if (!line.startsWith('n')) continue;
      const match = line.match(/n(?:127\.0\.0\.1|\[::1\]|::1):(\d+)$/);
      if (match) ports.push(Number.parseInt(match[1], 10));
    }
  }
  return [...new Set(ports)];
}

function probeCandidate(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1200 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        if (body.length < 12000) body += chunk;
      });
      res.on('end', () => {
        const looksLikeDsh = res.statusCode === 401 && /dsh web authentication required/i.test(body)
          || /__DSH_|DeepSeek Harness|dsh-client/i.test(body);
        resolve(looksLikeDsh ? port : null);
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

export class DshClient {
  constructor() {
    this.origin = null;
    this.port = null;
    this.cookie = '';
    this.secret = null;
    this.lastDiscovery = 0;
    this.discoveryPromise = null;
    this.secretMtime = 0;
    this.secretSize = 0;
    this.lastError = null;
  }

  async discover({ force = false } = {}) {
    if (!force && this.origin && Date.now() - this.lastDiscovery < 5000) return this.origin;
    if (this.discoveryPromise) return this.discoveryPromise;
    this.discoveryPromise = (async () => {
      const env = process.env.DSH_POCKET_UPSTREAM || process.env.DSH_WEB_URL;
      const candidates = [];
      if (env) {
        try {
          const url = new URL(env);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            candidates.push(Number(url.port || (url.protocol === 'https:' ? 443 : 80)));
          }
        } catch { /* ignore */ }
      }
      candidates.push(...listenPortsForDsh(), ...COMMON_PORTS);
      const unique = [...new Set(candidates.filter((port) => Number.isInteger(port) && port > 0))];
      let found = null;
      for (const port of unique) {
        const ok = await probeCandidate(port);
        if (ok) { found = port; break; }
      }
      if (!found) {
        this.origin = null;
        this.port = null;
        this.cookie = '';
        this.lastDiscovery = Date.now();
        this.lastError = '没有找到正在运行的 DeepSeek Harness Web 服务';
        throw new DshError('dsh/offline', '没有找到正在运行的 DeepSeek Harness。请确认桌面版 DSH 已打开。');
      }
      this.port = found;
      this.origin = `http://127.0.0.1:${found}`;
      this.lastDiscovery = Date.now();
      await this.refreshCookie(true);
      this.lastError = null;
      return this.origin;
    })().finally(() => {
      this.discoveryPromise = null;
    });
    return this.discoveryPromise;
  }

  async refreshCookie(force = false) {
    const stat = (() => {
      try { return fs.statSync(CREDENTIALS_PATH); } catch { return null; }
    })();
    if (!force && this.cookie && stat && stat.mtimeMs === this.secretMtime && stat.size === this.secretSize) return this.cookie;
    this.secret = parseSecret();
    this.secretMtime = stat?.mtimeMs || 0;
    this.secretSize = stat?.size || 0;
    const authority = `127.0.0.1:${this.port}`;
    this.cookie = cookieFor(authority, this.secret);
    return this.cookie;
  }

  get upstreamOrigin() {
    return this.origin;
  }

  get hostHeader() {
    return this.port ? `127.0.0.1:${this.port}` : '';
  }

  async request(method, args = {}, { timeout = 20000, retry = true } = {}) {
    await this.discover();
    await this.refreshCookie();
    const rpcId = crypto.randomUUID();
    const endpoint = `${this.origin}/api/${method}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: this.origin,
          cookie: this.cookie,
        },
        body: JSON.stringify({
          type: 'client-request',
          rpcId,
          method,
          payload: { args },
        }),
        signal: controller.signal,
      });
      if (response.status === 401 && retry) {
        await this.refreshCookie(true);
        return this.request(method, args, { timeout, retry: false });
      }
      if (!response.ok) {
        throw new DshError('dsh/http', `DSH 接口返回 HTTP ${response.status}`, { status: response.status });
      }
      const data = await response.json();
      if (!data || data.type !== 'server-response') throw new DshError('dsh/protocol', 'DSH 返回了无法识别的响应');
      if (!data.result?.ok) {
        const error = data.result?.error || {};
        throw new DshError(error.code || 'dsh/error', error.message || 'DSH 调用失败', error.details || {});
      }
      return data.result.value;
    } catch (error) {
      if (error instanceof DshError) throw error;
      this.origin = null;
      this.lastDiscovery = 0;
      throw new DshError('dsh/connection', `无法连接 DeepSeek Harness：${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async status() {
    try {
      await this.discover();
      return { online: true, port: this.port, origin: this.origin };
    } catch (error) {
      return { online: false, error: error.message };
    }
  }

  async listSessions() {
    const value = await this.request('session/list', { _request: {} });
    return value.items || [];
  }

  async createSession({ cwd, workspaceId, agentPreset, sessionId } = {}) {
    const request = {};
    if (workspaceId) request.workspaceId = workspaceId;
    if (cwd) request.cwd = cwd;
    if (agentPreset) request.agentPreset = agentPreset;
    if (sessionId) request.sessionId = sessionId;
    return this.request('session/create', { request });
  }

  async prompt({ sessionId, text, mode = 'queue', requestId }) {
    return this.request('session/prompt', {
      request: {
        requestId: requestId || `pocket-${crypto.randomUUID()}`,
        sessionId,
        mode: mode === 'steer' ? 'steer' : 'queue',
        content: [{ type: 'text', text }],
      },
    }, { timeout: 30000 });
  }

  async cancel(sessionId) {
    return this.request('session/cancel', { request: { sessionId } });
  }

  async rename(sessionId, title) {
    return this.request('session/rename', { request: { sessionId, title } });
  }

  async projections(sessionId) {
    return this.request('session/projections', { request: { sessionId } });
  }

  async page({ sessionId, throughSeq, beforeSeq, maxMessages = 30 }) {
    return this.request('session/page', {
      request: {
        address: { kind: 'session', sessionId },
        throughSeq,
        ...(Number.isInteger(beforeSeq) ? { beforeSeq } : {}),
        maxMessages,
      },
    });
  }

  async follow(sessionId, handlers = {}, { maxMessages = 40 } = {}) {
    await this.discover();
    await this.refreshCookie(true);
    const streamId = crypto.randomUUID();
    const socket = new WebSocket(`${this.origin.replace('http:', 'ws:')}/api/remote.mux`, {
      headers: {
        cookie: this.cookie,
        origin: this.origin,
        'user-agent': 'DSH-Pocket/1.0',
      },
      handshakeTimeout: 8000,
    });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      try { socket.close(1000, 'pocket close'); } catch { /* ignore */ }
    };
    socket.on('open', () => {
      socket.send(JSON.stringify({
        type: 'open',
        streamId,
        endpoint: 'session/follow',
        payload: {
          args: {
            request: {
              address: { kind: 'session', sessionId },
              assistantStream: true,
              maxMessages,
            },
          },
        },
      }));
    });
    socket.on('message', (data) => {
      let frame;
      try { frame = JSON.parse(String(data)); } catch { return; }
      if (!frame || frame.streamId !== streamId) return;
      if (frame.type === 'item') {
        const value = frame.value;
        if (!value || typeof value !== 'object') return;
        if (value.type === 'snapshot') handlers.onSnapshot?.(value);
        else if (value.type === 'event') handlers.onEvent?.(value.event);
        else if (value.type === 'assistant-stream') handlers.onAssistantStream?.(value.frame);
        else handlers.onUnknown?.(value);
      } else if (frame.type === 'error') {
        handlers.onError?.(new DshError(frame.error?.code || 'dsh/stream', frame.error?.message || 'DSH 会话流失败', frame.error?.details || {}));
      } else if (frame.type === 'end') {
        handlers.onEnd?.();
      }
    });
    socket.on('error', (error) => {
      handlers.onError?.(new DshError('dsh/stream', `DSH 会话流连接失败：${error.message}`));
    });
    socket.on('close', () => {
      if (!closed) handlers.onClose?.();
    });
    return { close };
  }
}

export const dsh = new DshClient();
