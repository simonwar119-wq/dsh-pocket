/* DSH 随身 — mobile control surface for DeepSeek Harness */
'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $('#app');
const sheetRoot = $('#sheet-root');
const toastRoot = $('#toast-root');

const state = {
  info: null,
  device: null,
  sessions: [],
  system: null,
  dsh: null,
  proxyUrl: null,
  currentSession: null,
  chat: null,
  chatId: null,
  es: null,
  route: '',
  tab: 'home',
  homeTimer: null,
  sessionsTimer: null,
  screenTimer: null,
  screenUrl: null,
  screenBusy: false,
  screenInfo: null,
  control: false,
  setup: null,
  installPrompt: null,
  chatLoading: false,
  reconnectTimer: null,
  lastRouteAt: 0,
};

const ICONS = {
  arrowLeft: '<path d="M15 18l-6-6 6-6"/>',
  home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.8-5.7A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 17v4"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.6 18-4-7.4L3 10l18-7Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  sparkles: '<path d="m12 3 1.3 4.1L17 8.5l-3.7 1.4L12 14l-1.3-4.1L7 8.5l3.7-1.4L12 3Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z"/>',
  terminal: '<path d="m5 7 5 5-5 5"/><path d="M12 17h7"/>',
  camera: '<path d="M4 7.5h3l1.5-2h7l1.5 2h3V19H4V7.5Z"/><circle cx="12" cy="13" r="3.4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  power: '<path d="M12 2v10"/><path d="M6.3 5.8a8 8 0 1 0 11.4 0"/>',
  external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.5 6.3"/><path d="M20 4v7h-7"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M9 13h.01M12 13h.01M15 13h.01M18 13h.01M7 16h10"/>',
  mouse: '<rect x="6" y="2.5" width="12" height="19" rx="6"/><path d="M12 2.5v8"/><path d="M6 10.5h12"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>',
  smartphone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  wifi: '<path d="M2 8.8a16 16 0 0 1 20 0"/><path d="M5.5 12.2a11 11 0 0 1 13 0"/><path d="M9 15.6a5.5 5.5 0 0 1 6 0"/><circle cx="12" cy="19" r=".9" fill="currentColor" stroke="none"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  memory: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10h2v4H7zM11 10h2v4h-2zM15 10h2v4h-2zM7 17v3M12 17v3M17 17v3"/>',
  battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3"/><path d="M6 10.5h6v3H6z" fill="currentColor" stroke="none"/>',
  volume: '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="m16 9 5 5M21 9l-5 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  desktop: '<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 17v4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  check: '<path d="m5 12 4.5 4.5L19 6.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  sleep: '<path d="M20 15.2A8.2 8.2 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>',
};

function icon(name, size = 20, cls = '') {
  const body = ICONS[name] || ICONS.info;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function nl2br(value) {
  return esc(value).replace(/\n/g, '<br>');
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${value} B`;
}

function formatTime(ms) {
  if (!ms) return '';
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function relativeTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - Number(ms);
  if (diff < 45 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`;
  const date = new Date(Number(ms));
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function shortDuration(seconds) {
  const value = Number(seconds) || 0;
  if (value < 60) return `${Math.floor(value)}秒`;
  if (value < 3600) return `${Math.floor(value / 60)}分`;
  if (value < 86400) return `${Math.floor(value / 3600)}小时`;
  return `${Math.floor(value / 86400)}天`;
}

function modelLabel(model) {
  if (!model) return 'DeepSeek';
  return String(model.model || model).replace(/^deepseek-/, 'DeepSeek ').replaceAll('-', ' ');
}

function currentTabFromRoute(route) {
  if (route.startsWith('chat/')) return 'chat';
  if (route.startsWith('remote')) return 'remote';
  if (route.startsWith('sessions')) return 'sessions';
  if (route.startsWith('settings')) return 'settings';
  return 'home';
}

function proxyUrl() {
  if (state.proxyUrl) return state.proxyUrl;
  return `${location.protocol}//${location.hostname}:8798/`;
}

function isDesktopBrowser() {
  return ['127.0.0.1', 'localhost', '::1'].includes(location.hostname);
}

async function api(path, { method = 'GET', body, signal, timeout = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'x-dshpocket': '1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
    if (!response.ok || data?.ok === false) {
      const error = new Error(data?.error || data?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function toast(message, type = '', duration = 2600) {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  toastRoot.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(6px)';
    node.style.transition = '.2s ease';
    setTimeout(() => node.remove(), 220);
  }, duration);
}

function closeSheet() {
  const backdrop = $$('.sheet-backdrop').at(-1);
  if (!backdrop) return;
  backdrop.style.opacity = '0';
  backdrop.style.transition = '.15s ease';
  setTimeout(() => backdrop.remove(), 160);
}

function openSheet(html, onMount) {
  closeSheet();
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div>${html}</div>`;
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeSheet();
  });
  sheetRoot.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  const observer = new MutationObserver(() => {
    if (!document.body.contains(backdrop) && !sheetRoot.querySelector('.sheet-backdrop')) {
      document.body.style.overflow = '';
      observer.disconnect();
    }
  });
  observer.observe(sheetRoot, { childList: true });
  backdrop.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-sheet]')) closeSheet();
  });
  onMount?.(backdrop);
}

function setBusy(button, busy, label = '处理中') {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span><span>${esc(label)}</span>`;
  } else {
    button.disabled = false;
    if (button.dataset.original) button.innerHTML = button.dataset.original;
  }
}

function confirmSheet({ title, message, confirmLabel = '确认', danger = false, onConfirm }) {
  openSheet(`
    <h2 class="sheet-title">${esc(title)}</h2>
    <p class="sheet-desc">${esc(message)}</p>
    <div class="sheet-actions">
      <button class="btn ghost" data-close-sheet>取消</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" id="confirm-action">${esc(confirmLabel)}</button>
    </div>
  `, (root) => {
    $('#confirm-action', root).addEventListener('click', async () => {
      const button = $('#confirm-action', root);
      setBusy(button, true, '执行中');
      try {
        await onConfirm();
        closeSheet();
      } catch (error) {
        toast(error.message, 'error');
        setBusy(button, false);
      }
    });
  });
}

function qrSvg(text, cellSize = 4, margin = 2) {
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize, margin, scalable: true });
  } catch {
    return `<div class="dim">二维码生成失败</div>`;
  }
}

function topbar(subtitle, options = {}) {
  const online = state.dsh?.online;
  const status = online ? '在线' : (state.dsh ? '离线' : '连接中');
  const dot = online ? 'online' : (state.dsh ? 'offline' : 'warn');
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">${icon('bolt', 22)}</div>
        <div class="brand-copy">
          <div class="brand-name">DSH 随身 <em>pocket</em></div>
          <div class="brand-sub">${esc(subtitle || state.info?.hostname || 'DeepSeek Harness')}</div>
        </div>
      </div>
      <div class="top-actions">
        <span class="status-pill"><span class="status-dot ${dot}"></span>${esc(options.statusText || status)}</span>
        <button class="icon-btn" data-nav="settings" aria-label="设置">${icon('settings', 19)}</button>
      </div>
    </header>`;
}

function bottomNav(active) {
  const items = [
    ['home', 'home', '首页'],
    ['sessions', 'chat', '会话'],
    ['remote', 'monitor', '电脑'],
    ['settings', 'settings', '我的'],
  ];
  return `<nav class="bottom-nav"><div class="nav-inner">${items.map(([key, iconName, label]) => `
    <button class="nav-item ${active === key ? 'active' : ''}" data-nav="${key}">
      ${icon(iconName, 21)}<span>${label}</span>
    </button>`).join('')}</div></nav>`;
}

function navigate(route) {
  const next = `#/${route}`.replace(/\/+$/, '');
  if (location.hash === next) { renderRoute(); return; }
  location.hash = next;
}

/* Boot */
async function boot() {
  try {
    const info = await api('/api/auth/status');
    state.info = info;
    state.dsh = info.dsh;
    if (!info.paired) {
      renderPair(info);
      return;
    }
    state.device = info.device;
    if (new URLSearchParams(location.search).has('pair')) {
      history.replaceState(null, '', location.pathname + location.hash);
    }
    startApp();
  } catch (error) {
    app.className = 'app-shell no-nav';
    app.innerHTML = `
      <div class="pair-screen">
        <div class="pair-brand">
          <div class="pair-logo">${icon('bolt', 40)}</div>
          <h1 class="pair-title">无法连接</h1>
          <p class="pair-sub">${esc(error.message)}</p>
        </div>
        <div class="pair-card card">
          <p class="pair-hint">请确认电脑上的 DSH 随身仍在运行，然后重试。</p>
          <button class="btn primary block mt-16" id="retry-boot">重试</button>
        </div>
      </div>`;
    $('#retry-boot').addEventListener('click', () => boot());
  }
}

function startApp() {
  window.addEventListener('hashchange', renderRoute);
  if (state.route === '') {
    if (!location.hash) location.hash = '#/home';
    else renderRoute();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (state.route === 'remote') refreshScreen();
  });
  registerServiceWorker();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    if (state.tab === 'settings') renderRoute();
  });
}

function cleanupRoute() {
  closeSheet();
  clearInterval(state.homeTimer);
  clearInterval(state.sessionsTimer);
  clearTimeout(state.screenTimer);
  state.homeTimer = null;
  state.sessionsTimer = null;
  state.screenTimer = null;
  if (state.es) {
    state.es.close();
    state.es = null;
  }
  if (state.screenUrl) {
    URL.revokeObjectURL(state.screenUrl);
    state.screenUrl = null;
  }
  document.body.style.overflow = '';
}

function renderRoute() {
  if (!state.device) return;
  cleanupRoute();
  const raw = (location.hash || '#/home').replace(/^#\//, '') || 'home';
  const [routePath, queryString] = raw.split('?');
  state.route = routePath;
  state.tab = currentTabFromRoute(routePath);
  const query = new URLSearchParams(queryString || '');
  window.scrollTo(0, 0);
  if (routePath.startsWith('chat/')) {
    const id = routePath.split('/')[1];
    renderChatScreen(id);
    return;
  }
  app.className = 'app-shell';
  if (routePath === 'sessions') renderSessions(query);
  else if (routePath === 'remote') renderRemote();
  else if (routePath === 'settings') renderSettings();
  else renderHome();
}

/* Pairing */
function renderPair(info) {
  app.className = 'app-shell no-nav';
  const params = new URLSearchParams(location.search);
  const codeFromUrl = (params.get('pair') || '').replace(/\D/g, '').slice(0, 6);
  const desktop = isDesktopBrowser();
  app.innerHTML = `
    <div class="pair-screen">
      <div class="pair-brand">
        <div class="pair-logo">${icon('bolt', 42)}</div>
        <h1 class="pair-title">连接你的电脑</h1>
        <p class="pair-sub">在手机上同步 DeepSeek Harness，随时继续电脑上的任务，并远程控制桌面。</p>
      </div>
      <div class="pair-card card" id="pair-card">
        ${desktop ? `
          <div class="pair-label">扫码连接</div>
          <div id="desktop-qr" class="pair-qr"><div class="spinner"></div></div>
          <div class="pair-code" id="desktop-code">······</div>
          <p class="pair-hint">手机与电脑连接同一 Wi-Fi，用相机扫码即可自动配对。<br>也可以手动打开 <strong>${esc(info.lanUrl)}</strong> 输入下方配对码。</p>
          <div id="desktop-error" class="pair-error hidden"></div>
        ` : `
          <form id="pair-form">
            <div class="pair-label">输入电脑上的 6 位配对码</div>
            <input class="pair-input" id="pair-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······" value="${esc(codeFromUrl)}" aria-label="配对码">
            <div id="pair-error" class="pair-error hidden"></div>
            <button class="btn primary block mt-16" id="pair-submit" type="submit">连接电脑</button>
          </form>
          <div class="pair-steps">
            <div class="pair-step"><b>1</b><span>在电脑上打开 DSH 随身设置页，找到二维码和配对码。</span></div>
            <div class="pair-step"><b>2</b><span>确保手机和电脑连接同一个 Wi-Fi。</span></div>
            <div class="pair-step"><b>3</b><span>输入配对码，开始同步。</span></div>
          </div>
        `}
      </div>
      <div class="pair-foot">当前地址 ${esc(location.origin)}<br>连接只在你自己的局域网内建立，密钥不会上传云端。</div>
    </div>`;

  if (desktop) {
    loadDesktopPairing();
  } else {
    const form = $('#pair-form');
    const input = $('#pair-code');
    const submit = $('#pair-submit');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = input.value.replace(/\D/g, '').slice(0, 6);
      if (code.length !== 6) {
        showPairError('请输入完整的 6 位配对码');
        return;
      }
      setBusy(submit, true, '正在配对');
      try {
        await api('/api/pair', { method: 'POST', body: { code, name: deviceName() } });
        toast('配对成功，正在同步', 'success');
        setTimeout(() => boot(), 250);
      } catch (error) {
        setBusy(submit, false);
        showPairError(error.message);
      }
    });
    if (codeFromUrl.length === 6) {
      setTimeout(() => form.requestSubmit(), 250);
    }
  }
}

function showPairError(message) {
  const node = $('#pair-error');
  if (!node) return;
  node.textContent = message;
  node.classList.remove('hidden');
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;]*;\s*([^;)]+)/);
    return match ? match[1].replace(/Build.*/i, '').trim() : 'Android 手机';
  }
  if (/Macintosh/i.test(ua)) return 'Mac 浏览器';
  return '我的手机';
}

async function loadDesktopPairing() {
  try {
    const setup = await api('/api/setup');
    state.setup = setup;
    const qr = $('#desktop-qr');
    if (qr) qr.innerHTML = qrSvg(setup.pairUrl, 5, 2);
    const code = $('#desktop-code');
    if (code) code.textContent = `${setup.code.slice(0, 3)} ${setup.code.slice(3)}`;
  } catch (error) {
    const node = $('#desktop-error');
    if (node) {
      node.textContent = `无法读取配对信息：${error.message}`;
      node.classList.remove('hidden');
    }
  }
}

let viewportReady = false;
function setupViewport() {
  if (viewportReady) return;
  viewportReady = true;
  const viewport = window.visualViewport;
  const apply = () => {
    const height = Math.round(viewport?.height || window.innerHeight || 0);
    if (height > 0) document.documentElement.style.setProperty('--app-height', `${height}px`);
  };
  viewport?.addEventListener('resize', apply);
  viewport?.addEventListener('scroll', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 200));
  apply();
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
    setTimeout(() => event.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 260);
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* Home */
function renderHome() {
  app.className = 'app-shell';
  app.innerHTML = `
    ${topbar(state.info?.hostname || 'DeepSeek Harness', { statusText: state.dsh?.online ? '已连接' : '连接中' })}
    <div class="page" id="home-page">
      <div class="page-head">
        <div class="page-kicker">Good to see you</div>
        <h1 class="page-title">${greeting()}</h1>
        <p class="page-desc">电脑上的 DeepSeek Harness，现在就在口袋里。</p>
      </div>
      <div id="home-content">
        ${homeSkeleton()}
      </div>
      <div id="home-screen-card"></div>
    </div>
    ${bottomNav('home')}`;
  loadHomeData();
  state.homeTimer = setInterval(() => {
    if (state.route === 'home' && document.visibilityState === 'visible') loadHomeData({ quiet: true });
  }, 12000);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function homeSkeleton() {
  return `
    <div class="card hero" style="height:188px"><div class="skeleton" style="height:100%;width:100%"></div></div>
    <div class="section"><div class="quick-grid">${Array.from({ length: 4 }).map(() => '<div class="quick-item"><div class="skeleton" style="width:38px;height:38px;border-radius:13px"></div><div class="skeleton" style="width:44px;height:9px"></div></div>').join('')}</div></div>
    <div class="section"><div class="skeleton" style="height:78px;border-radius:18px"></div></div>`;
}

async function loadHomeData({ quiet = false } = {}) {
  if (!quiet && state.route === 'home') {
    // keep skeleton
  }
  try {
    const [systemRes, sessionsRes] = await Promise.all([
      api('/api/system').catch((error) => ({ ok: false, error, system: null, dsh: { online: false, error: error.message } })),
      api('/api/sessions').catch((error) => ({ ok: false, sessions: [], error: error.message, dsh: { online: false } })),
    ]);
    if (state.route !== 'home') return;
    if (systemRes?.system) {
      state.system = systemRes.system;
      state.dsh = systemRes.dsh || systemRes.system.dsh || state.dsh;
      state.proxyUrl = systemRes.proxyUrl || state.proxyUrl;
      state.screenInfo = systemRes.screen || state.screenInfo;
    } else {
      state.dsh = systemRes?.dsh || { online: false, error: systemRes?.error?.message };
    }
    if (sessionsRes?.sessions) {
      state.sessions = sessionsRes.sessions;
      state.dsh = sessionsRes.dsh?.online ? sessionsRes.dsh : state.dsh;
    }
    const content = $('#home-content');
    if (content) content.innerHTML = homeContent();
    const card = $('#home-screen-card');
    if (card && !$('#home-screen-card .screen-frame')) card.innerHTML = homeScreenCard();
    updateHomeChrome();
    loadHomeScreen();
  } catch (error) {
    const content = $('#home-content');
    if (content) content.innerHTML = homeError(error.message);
  }
}

function homeContent() {
  const dshOnline = Boolean(state.dsh?.online);
  const active = state.sessions.find((session) => session.running);
  const recent = state.sessions.filter((session) => !session.running).slice(0, 3);
  const system = state.system || {};
  const host = system.hostname || state.info?.hostname || '电脑';
  const front = system.frontmost || state.screenInfo?.frontmost || '';
  return `
    <div class="card hero">
      <div class="hero-top">
        <div class="grow">
          <div class="hero-eyebrow"><span class="status-dot ${dshOnline ? 'online' : 'offline'}"></span>${dshOnline ? 'DESKTOP LINK ACTIVE' : 'DESKTOP LINK PAUSED'}</div>
          <h2 class="hero-title">${dshOnline ? '电脑已连接' : '等待电脑'}</h2>
          <p class="hero-sub">${dshOnline ? `${esc(host)} · ${front ? `前台 ${esc(front)}` : 'DSH 在线'}${system.battery?.percent ? ` · 电量 ${system.battery.percent}%` : ''}` : esc(state.dsh?.error || '正在寻找桌面上的 DeepSeek Harness…')}</p>
        </div>
        <div class="hero-orb">${icon(dshOnline ? 'bolt' : 'wifi', 29)}</div>
      </div>
      <div class="hero-actions">
        ${active ? `<button class="btn primary" data-open-session="${esc(active.id)}">${icon('play', 16)}继续任务</button>` : `<button class="btn primary" data-action="new-task">${icon('plus', 16)}开始新任务</button>`}
        <button class="btn" data-nav="remote">${icon('monitor', 16)}远程桌面</button>
      </div>
      <div class="hero-meta">
        <span class="status-dot ${dshOnline ? 'online' : 'offline'}"></span>
        <strong>DSH</strong> ${dshOnline ? '同步正常' : '离线'}
        <span class="dot"></span>
        <span>${system.uptime ? `已运行 ${shortDuration(system.uptime)}` : '正在读取状态'}</span>
        <span class="dot"></span>
        <span>${state.sessions.filter((session) => session.running).length} 个任务进行中</span>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <div class="section-title">快捷操作</div>
        <button class="section-link" data-action="refresh-home">${icon('refresh', 13)}刷新</button>
      </div>
      <div class="quick-grid">
        <button class="quick-item" data-action="new-task"><span class="quick-icon">${icon('plus', 20)}</span><span class="quick-label">新建任务</span></button>
        <button class="quick-item" data-action="screenshot"><span class="quick-icon">${icon('camera', 20)}</span><span class="quick-label">截图</span></button>
        <button class="quick-item" data-action="lock-confirm"><span class="quick-icon">${icon('lock', 20)}</span><span class="quick-label">锁定</span></button>
        <button class="quick-item" data-action="official"><span class="quick-icon">${icon('external', 20)}</span><span class="quick-label">官方界面</span></button>
      </div>
    </div>

    ${active ? `
      <div class="section">
        <div class="section-head"><div class="section-title">进行中 <span class="count">LIVE</span></div><span class="badge green"><span class="status-dot online pulse"></span>运行中</span></div>
        <button class="active-card" data-open-session="${esc(active.id)}">
          <div class="active-head">
            <span class="active-live"><span class="status-dot online pulse"></span>${esc(active.project || '工作区')}</span>
            <span class="badge neutral">${esc(modelLabel(active.model))}</span>
          </div>
          <h3 class="active-title">${esc(active.displayTitle || active.title || '正在处理任务…')}</h3>
          <p class="active-preview">${esc(active.preview || 'DSH 正在电脑上执行。点按查看实时进度。')}</p>
          <div class="active-foot">
            <span>${relativeTime(active.updatedAt)} · ${esc(active.cwd || '')}</span>
            <span class="open">打开会话 ${icon('chevron', 13)}</span>
          </div>
        </button>
      </div>` : ''}

    <div class="section">
      <div class="section-head"><div class="section-title">电脑状态</div><span class="badge neutral">${esc(host)}</span></div>
      <div class="stat-strip">
        <div class="stat-cell">
          <div class="stat-label">${icon('cpu', 12)} CPU</div>
          <div class="stat-value">${system.cpu?.percent ?? '—'}<small>%</small></div>
          <div class="meter"><span style="width:${Math.min(100, system.cpu?.percent || 0)}%"></span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">${icon('memory', 12)} 内存</div>
          <div class="stat-value">${system.memory?.percent ?? '—'}<small>%</small></div>
          <div class="meter green"><span style="width:${Math.min(100, system.memory?.percent || 0)}%"></span></div>
        </div>
        <div class="stat-cell">
          <div class="stat-label">${icon('battery', 12)} 电量</div>
          <div class="stat-value">${system.battery?.percent || '—'}<small>%</small></div>
          <div class="meter amber"><span style="width:${Math.min(100, system.battery?.percent || 0)}%"></span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <div class="section-title">最近会话</div>
        <button class="section-link" data-nav="sessions">全部 ${icon('chevron', 13)}</button>
      </div>
      ${recent.length ? `<div class="session-list">${recent.map((session) => sessionRow(session)).join('')}</div>` : `<div class="session-empty"><strong>还没有会话</strong>从手机发起第一个任务，DSH 会在电脑上执行。</div>`}
    </div>
  `;
}

function homeScreenCard() {
  return `
    <div class="section">
      <div class="section-head"><div class="section-title">桌面预览</div><button class="section-link" data-nav="remote">远程控制 ${icon('chevron', 13)}</button></div>
      <div class="card screen-card">
        <div class="screen-frame" id="home-screen-frame">
          <div class="screen-placeholder">${icon('monitor', 26)}<span>正在读取桌面画面…</span></div>
          <img id="home-screen-img" alt="电脑桌面预览" class="hidden">
          <div class="screen-overlay-top">
            <span class="screen-chip live"><span class="status-dot online"></span>LIVE</span>
            <span class="screen-chip" id="home-screen-app">${esc(state.system?.frontmost || state.screenInfo?.frontmost || '屏幕共享')}</span>
          </div>
        </div>
        <div class="screen-foot">
          <span class="meta">只读预览 · 点按进入触控</span>
          <div class="actions"><button class="btn small" data-nav="remote">${icon('mouse', 14)}控制</button></div>
        </div>
      </div>
    </div>`;
}

async function loadHomeScreen() {
  if (state.route !== 'home') return;
  const img = $('#home-screen-img');
  if (!img) return;
  try {
    const response = await fetch(`/api/screen.jpg?w=1100&t=${Date.now()}`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('screen unavailable');
    const blob = await response.blob();
    if (state.route !== 'home') return;
    if (state.screenUrl) URL.revokeObjectURL(state.screenUrl);
    state.screenUrl = URL.createObjectURL(blob);
    img.src = state.screenUrl;
    img.classList.remove('hidden');
    const placeholder = $('#home-screen-frame .screen-placeholder');
    if (placeholder) placeholder.classList.add('hidden');
    const chip = $('#home-screen-app');
    if (chip) chip.textContent = state.system?.frontmost || state.screenInfo?.frontmost || '桌面';
  } catch {
    const placeholder = $('#home-screen-frame .screen-placeholder');
    if (placeholder) placeholder.innerHTML = `${icon('monitor', 26)}<span>桌面预览不可用<br>请在电脑上授予屏幕录制权限</span>`;
  }
}

function homeError(message) {
  return `
    <div class="card" style="padding:22px;text-align:center">
      <div class="warning-card" style="text-align:left">${icon('alert', 17)}<span>${esc(message)}</span></div>
      <button class="btn primary mt-16" data-action="refresh-home">${icon('refresh', 15)}重新连接</button>
    </div>`;
}

function updateHomeChrome() {
  const pill = $('.topbar .status-pill');
  if (pill && state.dsh) {
    const online = state.dsh.online;
    pill.innerHTML = `<span class="status-dot ${online ? 'online' : 'offline'}"></span>${online ? '已连接' : '离线'}`;
  }
}

function sessionRow(session, compact = false) {
  const running = session.running;
  const title = session.displayTitle || session.title || '未命名会话';
  const preview = session.preview || (session.cwd ? '点按继续这段会话' : '点按打开会话');
  return `
    <button class="session-item" data-open-session="${esc(session.id)}">
      <span class="session-avatar">${running ? '<span class="session-running"></span>' : esc((session.project || 'D')[0] || 'D').toUpperCase()}</span>
      <span class="session-main">
        <span class="session-title-row">
          <span class="session-name">${esc(title)}</span>
          ${running ? '<span class="badge green">运行中</span>' : ''}
        </span>
        <span class="session-preview">${esc(preview)}</span>
        <span class="session-meta">
          <span>${esc(session.project || '工作区')}</span>
          <span class="sep"></span>
          <span>${relativeTime(session.updatedAt)}</span>
          ${session.model ? `<span class="sep"></span><span>${esc(modelLabel(session.model))}</span>` : ''}
        </span>
      </span>
      <span class="chev">${icon('chevron', 16)}</span>
    </button>`;
}

async function refreshHome() {
  await loadHomeData();
  toast('已刷新', 'success', 1200);
}

async function runSystemAction(name, { confirm = false, message = '' } = {}) {
  const perform = async () => {
    const result = await api('/api/remote/action', { method: 'POST', body: { action: name } });
    toast(result.message || '已执行', 'success');
  };
  if (confirm) {
    confirmSheet({ title: '确认操作', message, confirmLabel: '执行', danger: name === 'sleep' || name === 'lock', onConfirm: perform });
    return;
  }
  try {
    await perform();
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* Sessions */
function renderSessions(query = new URLSearchParams()) {
  app.className = 'app-shell';
  app.innerHTML = `
    ${topbar('会话同步', { statusText: '同步中' })}
    <div class="page">
      <div class="page-head">
        <div class="page-kicker">Conversations</div>
        <h1 class="page-title">会话</h1>
        <p class="page-desc">电脑上正在进行的任务，和过去的对话，都在这里同步。</p>
      </div>
      <div class="row" style="gap:9px">
        <div class="composer-inner" style="flex:1;padding-left:12px;border-radius:14px">
          ${icon('search', 17, 'dim')}
          <input class="composer-input" id="session-search" placeholder="搜索会话…" style="min-height:30px;padding:3px 0">
        </div>
        <button class="icon-btn accent" data-action="new-task" aria-label="新建任务">${icon('plus', 20)}</button>
      </div>
      <div id="sessions-list" class="mt-16">${sessionsSkeleton()}</div>
    </div>
    ${bottomNav('sessions')}`;
  loadSessions();
  state.sessionsTimer = setInterval(() => {
    if (state.route === 'sessions' && document.visibilityState === 'visible') loadSessions({ quiet: true });
  }, 12000);
  $('#session-search')?.addEventListener('input', () => renderSessionList($('#session-search').value));
  if (query.get('new') === '1') {
    setTimeout(() => openNewTaskSheet(), 300);
  }
}

function sessionsSkeleton() {
  return `<div class="session-list">${Array.from({ length: 4 }).map(() => '<div class="session-item"><div class="skeleton" style="width:37px;height:37px;border-radius:12px"></div><div class="grow"><div class="skeleton" style="height:11px;width:55%"></div><div class="skeleton mt-8" style="height:9px;width:75%"></div></div></div>').join('')}</div>`;
}

async function loadSessions({ quiet = false } = {}) {
  try {
    const result = await api('/api/sessions');
    if (state.route !== 'sessions') return;
    state.sessions = result.sessions || [];
    state.dsh = result.dsh || state.dsh;
    if (!quiet) renderSessionList($('#session-search')?.value || '');
    else renderSessionList($('#session-search')?.value || '');
    updateSessionHeader();
  } catch (error) {
    const list = $('#sessions-list');
    if (list) list.innerHTML = `<div class="session-empty"><strong>无法连接 DSH</strong>${esc(error.message)}<br><br><button class="btn small" data-action="new-task">重试</button></div>`;
  }
}

function updateSessionHeader() {
  const pill = $('.topbar .status-pill');
  if (pill && state.dsh) {
    const online = state.dsh.online;
    pill.innerHTML = `<span class="status-dot ${online ? 'online' : 'offline'}"></span>${online ? '已同步' : '离线'}`;
  }
}

function renderSessionList(filter = '') {
  const list = $('#sessions-list');
  if (!list) return;
  const keyword = String(filter).trim().toLowerCase();
  const sessions = state.sessions.filter((session) => {
    if (!keyword) return true;
    return [session.title, session.displayTitle, session.cwd, session.project, session.preview]
      .filter(Boolean).join(' ').toLowerCase().includes(keyword);
  });
  const running = sessions.filter((session) => session.running);
  const recent = sessions.filter((session) => !session.running);
  if (!sessions.length) {
    list.innerHTML = keyword
      ? `<div class="session-empty"><strong>没有匹配的会话</strong>换个关键词试试。</div>`
      : `<div class="session-empty"><strong>还没有会话</strong>在手机上发起任务，DSH 会在电脑上执行。<br><br><button class="btn primary small" data-action="new-task">${icon('plus', 14)}新建任务</button></div>`;
    return;
  }
  list.innerHTML = `
    ${running.length ? `
      <div class="section" style="margin-top:0">
        <div class="section-head"><div class="section-title">进行中 <span class="count">${running.length}</span></div><span class="badge green"><span class="status-dot online pulse"></span>LIVE</span></div>
        <div class="session-list">${running.map((session) => sessionRow(session)).join('')}</div>
      </div>` : ''}
    <div class="section" style="margin-top:${running.length ? '22px' : '0'}">
      <div class="section-head"><div class="section-title">全部会话 <span class="count">${recent.length}</span></div></div>
      <div class="session-list">${recent.length ? recent.map((session) => sessionRow(session)).join('') : '<div class="session-empty">没有其他会话</div>'}</div>
    </div>`;
}

function openNewTaskSheet(prefill = '') {
  const active = state.sessions.find((session) => session.running) || state.sessions[0];
  const cwds = [...new Set(state.sessions.map((session) => session.cwd).filter(Boolean))].slice(0, 6);
  const defaultCwd = active?.cwd || cwds[0] || '';
  openSheet(`
    <button class="icon-btn sheet-close" data-close-sheet aria-label="关闭">${icon('close', 17)}</button>
    <h2 class="sheet-title">新建任务</h2>
    <p class="sheet-desc">任务会在电脑上由 DeepSeek Harness 执行。你可以随时切回来看进度。</p>
    <form id="new-task-form">
      <div class="field">
        <div class="field-label">要做的事</div>
        <textarea class="field-textarea" id="new-task-prompt" placeholder="例如：帮我检查这个项目的依赖，并跑一遍测试。">${esc(prefill)}</textarea>
      </div>
      <div class="chip-row">
        <button type="button" class="chip" data-prompt-fill="查看当前项目的运行状态，并告诉我下一步建议。">查看项目状态</button>
        <button type="button" class="chip" data-prompt-fill="帮我整理今天的工作，列出还需要完成的事项。">整理待办</button>
        <button type="button" class="chip" data-prompt-fill="打开电脑上的终端，检查最近一次构建是否成功。">检查构建</button>
      </div>
      <div class="field">
        <div class="field-label">工作目录（可选）</div>
        <input class="field-input" id="new-task-cwd" value="${esc(defaultCwd)}" placeholder="留空则使用默认工作区">
      </div>
      ${cwds.length ? `<div class="chip-row">${cwds.map((cwd) => `<button type="button" class="chip" data-cwd-fill="${esc(cwd)}">${esc(cwd.split('/').pop() || cwd)}</button>`).join('')}</div>` : ''}
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-close-sheet>取消</button>
        <button type="submit" class="btn primary" id="new-task-submit">${icon('send', 15)}开始执行</button>
      </div>
    </form>
  `, (root) => {
    const prompt = $('#new-task-prompt', root);
    const cwd = $('#new-task-cwd', root);
    const submit = $('#new-task-submit', root);
    prompt.focus();
    root.addEventListener('click', (event) => {
      const fill = event.target.closest('[data-prompt-fill]');
      if (fill) { prompt.value = fill.dataset.promptFill; prompt.focus(); return; }
      const cwdFill = event.target.closest('[data-cwd-fill]');
      if (cwdFill) { cwd.value = cwdFill.dataset.cwdFill; }
    });
    $('#new-task-form', root).addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = prompt.value.trim();
      if (!text) { prompt.focus(); return; }
      setBusy(submit, true, '正在启动');
      try {
        const result = await api('/api/sessions', { method: 'POST', body: { prompt: text, cwd: cwd.value.trim() || undefined } });
        closeSheet();
        if (result.sessionId) {
          navigate(`chat/${result.sessionId}`);
          if (!result.ok) toast(result.error || '任务已创建，但发送失败', 'error', 3500);
        } else {
          toast('任务已创建', 'success');
        }
      } catch (error) {
        setBusy(submit, false);
        if (error.data?.sessionId) {
          closeSheet();
          navigate(`chat/${error.data.sessionId}`);
          toast(error.message, 'error', 3500);
        } else {
          toast(error.message, 'error');
        }
      }
    });
  });
}

/* Markdown + tool rendering */
function renderMarkdown(source) {
  const codeBlocks = [];
  let raw = String(source || '').replace(/```([^\n`]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.push({ lang: lang.trim(), code: code.replace(/\n$/, '') }) - 1;
    return `\u0000CODEBLOCK${index}\u0000`;
  });
  const inline = [];
  raw = raw.replace(/`([^`\n]+)`/g, (_, code) => {
    const index = inline.push(code) - 1;
    return `\u0000INLINE${index}\u0000`;
  });
  let text = esc(raw);
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  text = text.replace(/\u0000INLINE(\d+)\u0000/g, (_, index) => `<code>${esc(inline[Number(index)])}</code>`);

  const lines = text.split('\n');
  const out = [];
  let paragraph = [];
  let listType = null;
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    const blockMatch = trimmed.match(/^\u0000CODEBLOCK(\d+)\u0000$/);
    if (blockMatch) {
      flushParagraph(); closeList();
      const block = codeBlocks[Number(blockMatch[1])];
      out.push(`<pre><code>${esc(block.code)}</code></pre>`);
      continue;
    }
    if (!trimmed) { flushParagraph(); closeList(); continue; }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${heading[2]}</h${level}>`);
      continue;
    }
    if (/^(?:---+|\*\*\*+)$/.test(trimmed)) {
      flushParagraph(); closeList(); out.push('<hr>'); continue;
    }
    const quote = trimmed.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph(); closeList();
      out.push(`<blockquote>${quote[1]}</blockquote>`);
      continue;
    }
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      const wanted = ordered ? 'ol' : 'ul';
      if (listType !== wanted) { closeList(); out.push(`<${wanted}>`); listType = wanted; }
      out.push(`<li>${(ordered ? ordered[1] : unordered[1])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph(); closeList();
  return out.join('');
}

const TOOL_META = {
  bash: { label: '终端', icon: 'terminal' },
  read: { label: '读取文件', icon: 'file' },
  write: { label: '写入文件', icon: 'file' },
  edit: { label: '编辑文件', icon: 'file' },
  str_replace: { label: '编辑文件', icon: 'file' },
  glob: { label: '查找文件', icon: 'search' },
  grep: { label: '搜索内容', icon: 'search' },
  web_search: { label: '网页搜索', icon: 'search' },
  web_fetch: { label: '抓取网页', icon: 'external' },
  present: { label: '交付文件', icon: 'folder' },
  view_image: { label: '查看图片', icon: 'camera' },
  read_image: { label: '查看图片', icon: 'camera' },
  subagent: { label: '子代理', icon: 'sparkles' },
  workflow: { label: '工作流', icon: 'grid' },
  todo_write: { label: '任务清单', icon: 'check' },
  ask_user_question: { label: '等待确认', icon: 'alert' },
  goal: { label: '目标', icon: 'bolt' },
};

function toolMeta(name) {
  return TOOL_META[name] || { label: name || '工具', icon: 'terminal' };
}

function prettyArgs(args) {
  if (!args || typeof args !== 'object') return '';
  if (args.raw) return String(args.raw);
  if (args.command) return String(args.command);
  return JSON.stringify(args, null, 2);
}

function renderToolItem(item) {
  const meta = toolMeta(item.name);
  const status = item.status || 'completed';
  const statusClass = status === 'running' ? 'running' : status === 'error' ? 'error' : status === 'pending' ? 'pending' : '';
  const command = prettyArgs(item.arguments);
  return `
    <div class="tool-card" data-tool-id="${esc(item.id)}">
      <div class="tool-head">
        <span class="tool-icon">${icon(meta.icon, 15)}</span>
        <span class="tool-main">
          <span class="tool-name">${esc(meta.label)} <span class="dim">· ${esc(status === 'running' ? '执行中' : status === 'error' ? '失败' : status === 'pending' ? '等待中' : '完成')}</span></span>
          <span class="tool-title">${esc(item.title || item.name || '')}</span>
        </span>
        <span class="tool-status ${statusClass}"></span>
      </div>
      ${command || item.result ? `<details class="tool-body">
        <summary><span>查看详情</span><span>${item.result ? '参数与输出' : '参数'}</span></summary>
        ${command ? `<pre class="tool-pre">${esc(command)}</pre>` : ''}
        ${item.result ? `<pre class="tool-pre result ${item.isError ? 'tool-error' : ''}">${esc(item.result)}</pre>` : ''}
      </details>` : ''}
    </div>`;
}

/* Chat */
function chatShell(id) {
  const session = state.sessions.find((item) => item.id === id) || state.currentSession || {};
  const title = session.displayTitle || session.title || '会话';
  const running = Boolean(session.running || state.chat?.running);
  return `
    <div class="chat-screen">
      <header class="chat-head">
        <button class="icon-btn" id="chat-back" aria-label="返回">${icon('arrowLeft', 20)}</button>
        <div class="chat-head-main">
          <div class="chat-head-title" id="chat-title">${esc(title)}</div>
          <div class="chat-head-sub" id="chat-sub"><span class="status-dot ${running ? 'online pulse' : ''}"></span>${running ? '正在执行' : esc(session.project || 'DeepSeek Harness')}</div>
        </div>
        <div class="chat-head-actions">
          <button class="icon-btn ${running ? '' : 'hidden'}" id="chat-stop" aria-label="停止任务">${icon('stop', 17)}</button>
          <button class="icon-btn" id="chat-official" aria-label="官方界面">${icon('external', 17)}</button>
          <button class="icon-btn" id="chat-more" aria-label="更多">${icon('more', 18)}</button>
        </div>
      </header>
      <div class="chat-body" id="chat-body">
        <div class="chat-body-inner" id="chat-body-inner">
          <div class="chat-empty"><div class="spinner"></div><p class="mt-12">正在同步电脑上的会话…</p></div>
        </div>
      </div>
      <form class="chat-composer" id="chat-form">
        <div class="composer-inner">
          <textarea class="composer-input" id="chat-input" rows="1" placeholder="继续这个任务…" enterkeyhint="send"></textarea>
          <button class="composer-btn" id="chat-send" type="submit" aria-label="发送">${icon('send', 18)}</button>
        </div>
        <div class="composer-hint">同步到电脑上的 DSH 会话 · 消息会立即执行</div>
      </form>
    </div>`;
}

async function renderChatScreen(id) {
  state.chatId = id;
  state.chat = null;
  state.chatLoading = true;
  state.currentSession = state.sessions.find((session) => session.id === id) || null;
  app.className = 'app-shell no-nav';
  app.innerHTML = chatShell(id);
  bindChatControls(id);
  try {
    const initialRunning = state.currentSession?.running ? '?running=1' : '';
    const result = await api(`/api/sessions/${encodeURIComponent(id)}/state${initialRunning}`, { timeout: 26000 });
    if (state.chatId !== id || state.route !== `chat/${id}`) return;
    state.chat = result.state;
    state.chatLoading = false;
    renderChatMessages({ scroll: true });
    updateChatHeader();
  } catch (error) {
    if (state.chatId !== id) return;
    state.chatLoading = false;
    const inner = $('#chat-body-inner');
    if (inner) inner.innerHTML = `<div class="chat-error">${esc(error.message)}<br><br>正在尝试实时重连…</div>`;
  }
  openChatStream(id);
}

function bindChatControls(id) {
  $('#chat-back')?.addEventListener('click', () => {
    if (history.length > 1 && document.referrer.includes(location.host)) history.back();
    else navigate('sessions');
  });
  $('#chat-official')?.addEventListener('click', openOfficialUi);
  $('#chat-more')?.addEventListener('click', () => openChatMore(id));
  $('#chat-stop')?.addEventListener('click', () => stopChat(id));
  const form = $('#chat-form');
  const input = $('#chat-input');
  const send = $('#chat-send');
  const resize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(132, input.scrollHeight)}px`;
  };
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    send.innerHTML = '<span class="spinner"></span>';
    try {
      const result = await api(`/api/sessions/${encodeURIComponent(id)}/prompt`, { method: 'POST', body: { text, mode: state.chat?.running ? 'queue' : 'queue' } });
      input.value = '';
      resize();
      toast(result.accepted ? (state.chat?.running ? '已加入队列' : '已发送') : '已发送', result.accepted ? 'success' : '', 1600);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      send.disabled = false;
      send.innerHTML = icon('send', 18);
    }
  });
}

function openChatStream(id) {
  if (state.es) state.es.close();
  const es = new EventSource(`/api/sessions/${encodeURIComponent(id)}/events${state.currentSession?.running ? '?running=1' : ''}`);
  state.es = es;
  es.addEventListener('state', (event) => {
    if (state.chatId !== id) return;
    try {
      state.chat = JSON.parse(event.data);
      state.chatLoading = false;
      renderChatMessages({ scroll: true });
      updateChatHeader();
    } catch { /* ignore */ }
  });
  es.addEventListener('patch', (event) => {
    if (state.chatId !== id) return;
    let patch;
    try { patch = JSON.parse(event.data); } catch { return; }
    applyChatPatch(patch, id);
  });
  es.onerror = () => {
    if (state.chatId !== id) return;
    if (!state.chat) {
      const inner = $('#chat-body-inner');
      if (inner && state.chatLoading) inner.innerHTML = `<div class="chat-empty"><div class="spinner"></div><p class="mt-12">正在重连电脑上的会话…</p></div>`;
    }
    const sub = $('#chat-sub');
    if (sub) sub.innerHTML = '<span class="status-dot warn"></span>同步重连中…';
  };
}

function applyChatPatch(patch, id) {
  if (!state.chat) return;
  if (patch.op === 'item') {
    const items = state.chat.items || (state.chat.items = []);
    const index = items.findIndex((item) => item.id === patch.item.id);
    if (index >= 0) items[index] = patch.item;
    else items.push(patch.item);
    items.sort((a, b) => (a.seq || 0) - (b.seq || 0) || (a.time || 0) - (b.time || 0));
    renderChatMessages({ scroll: false });
    updateChatHeader();
  } else if (patch.op === 'status') {
    state.chat.running = Boolean(patch.running);
    state.chat.connected = Boolean(patch.connected);
    state.chat.connecting = Boolean(patch.connecting);
    state.chat.error = patch.error || null;
    if (patch.live) state.chat.live = patch.live;
    if (!patch.live) state.chat.live = null;
    updateChatHeader();
    updateLiveBubble();
    const stop = $('#chat-stop');
    if (stop) stop.classList.toggle('hidden', !state.chat.running);
    const errorNode = $('#chat-error');
    if (errorNode) {
      if (state.chat.error) { errorNode.textContent = state.chat.error; errorNode.classList.remove('hidden'); }
      else errorNode.classList.add('hidden');
    }
  } else if (patch.op === 'live') {
    state.chat.live = patch.live;
    updateLiveBubble();
  } else if (patch.op === 'title') {
    state.chat.title = patch.title;
    updateChatHeader();
  } else if (patch.op === 'permissions') {
    state.chat.permissions = patch.permissions;
  }
}

function updateChatHeader() {
  const title = $('#chat-title');
  const sub = $('#chat-sub');
  const stop = $('#chat-stop');
  if (!title || !sub) return;
  const chat = state.chat || {};
  const session = state.currentSession || state.sessions.find((item) => item.id === state.chatId) || {};
  title.textContent = chat.title || session.displayTitle || session.title || '会话';
  const running = Boolean(chat.running);
  const connected = chat.connected !== false;
  const cwd = chat.cwd || session.cwd || '';
  const project = session.project || (cwd ? cwd.split('/').filter(Boolean).pop() : '');
  sub.innerHTML = `<span class="status-dot ${running ? 'online pulse' : connected ? 'online' : 'warn'}"></span>${running ? '正在执行' : connected ? '已同步 · 空闲' : '同步重连中'}${project ? ` · ${esc(project)}` : ''}`;
  if (stop) stop.classList.toggle('hidden', !running);
}

function renderChatMessages({ scroll = false } = {}) {
  const inner = $('#chat-body-inner');
  if (!inner || !state.chat) return;
  const body = $('#chat-body');
  const nearBottom = body ? body.scrollHeight - body.scrollTop - body.clientHeight < 120 : false;
  const chat = state.chat;
  const items = chat.items || [];
  if (!items.length && !chat.live && !chat.running) {
    inner.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-mark">${icon('chat', 28)}</div>
        <h3>继续这段对话</h3>
        <p>在电脑上开始的会话会同步到这里。<br>输入消息，让 DSH 在电脑上继续执行。</p>
        <div class="prompt-chips">
          <button class="prompt-chip" data-prompt-fill="现在进展到哪一步了？">现在进展到哪一步？</button>
          <button class="prompt-chip" data-prompt-fill="请继续，完成后告诉我结果。">继续</button>
          <button class="prompt-chip" data-prompt-fill="把刚才的结果整理成一份简短总结。">整理总结</button>
        </div>
      </div>`;
    return;
  }
  const first = items[0];
  let html = first?.time ? `<div class="chat-day">${new Date(first.time).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</div>` : '';
  html += items.map(renderChatItem).join('');
  if (chat.questions?.length) {
    html += `<div class="warning-card" style="margin:12px 0 16px">${icon('alert', 17)}<span>DSH 在等待你的回答。请打开官方界面处理确认或选项。</span><button class="btn small soft" data-official style="margin-left:auto;flex:none">打开</button></div>`;
  }
  html += `<div id="chat-live">${renderLiveHtml(chat)}</div>`;
  html += `<div id="chat-error" class="chat-error ${chat.error ? '' : 'hidden'}">${esc(chat.error || '')}</div>`;
  inner.innerHTML = html;
  if (items.length === 0) {
    inner.querySelector('.prompt-chip')?.closest('.chat-empty')?.classList.remove('hidden');
  }
  if (scroll || nearBottom) {
    requestAnimationFrame(() => {
      if (body) body.scrollTop = body.scrollHeight;
    });
  }
}

function renderChatItem(item) {
  if (item.kind === 'user') return renderUserMessage(item);
  if (item.kind === 'assistant') return renderAssistantMessage(item);
  if (item.kind === 'tool') return renderToolItem(item);
  return '';
}

function renderUserMessage(item) {
  return `
    <div class="msg user">
      <div class="msg-avatar">你</div>
      <div class="msg-content">
        <div class="msg-name"><span>${formatTime(item.time)}</span></div>
        <div class="bubble">${nl2br(item.text || '')}</div>
      </div>
    </div>`;
}

function renderAssistantMessage(item) {
  if (!item.text && !item.reasoning) return '';
  const reasoning = item.reasoning ? `
    <details class="reasoning">
      <summary>${icon('sparkles', 13)}思考过程${item.reasoningTruncated ? ' · 已截断' : ''}</summary>
      <div class="reasoning-text">${esc(item.reasoning)}</div>
    </details>` : '';
  const bubble = item.text ? `<div class="bubble">${renderMarkdown(item.text)}</div>` : '';
  return `
    <div class="msg assistant">
      <div class="msg-avatar">D</div>
      <div class="msg-content">
        <div class="msg-name"><span>DSH</span>${item.model ? `<span class="model">${esc(modelLabel(item.model))}</span>` : ''}</div>
        ${reasoning}
        ${bubble}
        <div class="msg-foot"><span>${formatTime(item.time)}</span>${item.step ? `<span>步骤 ${item.step}</span>` : ''}</div>
      </div>
    </div>`;
}

function renderLiveHtml(chat) {
  const live = chat.live;
  if (live && (live.text || live.reasoning || live.toolName)) {
    const reasoning = live.reasoning ? `<details class="reasoning"><summary>${icon('sparkles', 13)}正在思考…</summary><div class="reasoning-text">${esc(live.reasoning)}</div></details>` : '';
    const text = live.text ? renderMarkdown(live.text) + '<span class="live-cursor"></span>' : `<span class="muted">${live.toolName ? `正在调用 ${esc(live.toolName)}…` : '正在组织回复…'}</span>`;
    return `<div class="live-bubble msg assistant">
      <div class="msg-avatar">D</div>
      <div class="msg-content">
        <div class="live-status"><span class="typing-dots"><span></span><span></span><span></span></span>${live.active === false ? '正在落盘' : '实时生成'}</div>
        ${reasoning}
        <div class="bubble">${text}</div>
      </div>
    </div>`;
  }
  if (chat.running) {
    return `<div class="live-bubble msg assistant">
      <div class="msg-avatar">D</div>
      <div class="msg-content"><div class="live-status"><span class="typing-dots"><span></span><span></span><span></span></span>DSH 正在电脑上处理…</div></div>
    </div>`;
  }
  return '';
}

function updateLiveBubble() {
  const node = $('#chat-live');
  if (!node || !state.chat) return;
  const body = $('#chat-body');
  const nearBottom = body ? body.scrollHeight - body.scrollTop - body.clientHeight < 140 : true;
  node.innerHTML = renderLiveHtml(state.chat);
  if (nearBottom) requestAnimationFrame(() => { if (body) body.scrollTop = body.scrollHeight; });
}

async function stopChat(id) {
  try {
    await api(`/api/sessions/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} });
    toast('已请求停止', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

function openOfficialUi() {
  window.open(proxyUrl(), '_blank', 'noopener');
}

function openChatMore(id) {
  openSheet(`
    <button class="icon-btn sheet-close" data-close-sheet aria-label="关闭">${icon('close', 17)}</button>
    <h2 class="sheet-title">会话操作</h2>
    <p class="sheet-desc">${esc(state.chat?.title || state.currentSession?.displayTitle || '当前会话')}</p>
    <div class="settings-group card">
      <button class="settings-row" data-sheet-action="rename"><span class="settings-icon">${icon('file', 16)}</span><span class="settings-main"><span class="settings-label">重命名会话</span><span class="settings-value">更新电脑上的标题</span></span>${icon('chevron', 15, 'chev')}</button>
      <button class="settings-row" data-sheet-action="official"><span class="settings-icon">${icon('external', 16)}</span><span class="settings-main"><span class="settings-label">打开官方界面</span><span class="settings-value">处理确认、选项和高级设置</span></span>${icon('chevron', 15, 'chev')}</button>
      <button class="settings-row" data-sheet-action="copy"><span class="settings-icon">${icon('copy', 16)}</span><span class="settings-main"><span class="settings-label">复制会话 ID</span><span class="settings-value">${esc(id)}</span></span>${icon('chevron', 15, 'chev')}</button>
      <button class="settings-row" data-sheet-action="stop"><span class="settings-icon" style="color:var(--red);background:rgba(255,126,140,.07);border-color:rgba(255,126,140,.12)">${icon('stop', 16)}</span><span class="settings-main"><span class="settings-label" style="color:var(--red)">停止当前任务</span><span class="settings-value">中断电脑上的执行</span></span>${icon('chevron', 15, 'chev')}</button>
    </div>
  `, (root) => {
    root.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-sheet-action]');
      if (!button) return;
      const action = button.dataset.sheetAction;
      closeSheet();
      if (action === 'official') openOfficialUi();
      if (action === 'copy') {
        try { await navigator.clipboard.writeText(id); toast('会话 ID 已复制', 'success'); }
        catch { toast(id, '', 5000); }
      }
      if (action === 'stop') stopChat(id);
      if (action === 'rename') openRenameSheet(id);
    });
  });
}

function openRenameSheet(id) {
  openSheet(`
    <h2 class="sheet-title">重命名会话</h2>
    <p class="sheet-desc">标题会同步到电脑上的 DSH。</p>
    <div class="field"><input class="field-input" id="rename-input" value="${esc(state.chat?.title || '')}" placeholder="输入新标题"></div>
    <div class="sheet-actions">
      <button class="btn ghost" data-close-sheet>取消</button>
      <button class="btn primary" id="rename-submit">保存</button>
    </div>
  `, (root) => {
    const input = $('#rename-input', root);
    input.focus(); input.select();
    $('#rename-submit', root).addEventListener('click', async (event) => {
      const title = input.value.trim();
      if (!title) return;
      setBusy(event.currentTarget, true, '保存中');
      try {
        await api(`/api/sessions/${encodeURIComponent(id)}/rename`, { method: 'POST', body: { title } });
        if (state.chat) state.chat.title = title;
        updateChatHeader();
        closeSheet();
        toast('已重命名', 'success');
      } catch (error) {
        toast(error.message, 'error');
        setBusy(event.currentTarget, false);
      }
    });
  });
}

/* Remote desktop */
function renderRemote() {
  app.className = 'app-shell';
  app.innerHTML = `
    ${topbar('远程桌面', { statusText: '实时画面' })}
    <div class="page">
      <div class="page-head">
        <div class="page-kicker">Remote control</div>
        <h1 class="page-title">电脑</h1>
        <p class="page-desc">看屏幕、点按、打字。适合在手机上接管正在运行的任务。</p>
      </div>
      <div id="remote-warning"></div>
      <div class="remote-toolbar mt-12">
        <button class="btn ${state.control ? 'active' : ''}" id="toggle-control">${icon('mouse', 15)}${state.control ? '触控已开启' : '开启触控'}</button>
        <button class="btn" id="remote-keyboard">${icon('keyboard', 15)}键盘</button>
        <button class="btn" id="remote-refresh">${icon('refresh', 15)}刷新</button>
        <button class="btn" id="remote-official">${icon('external', 15)}官方界面</button>
      </div>
      <div class="remote-screen mt-12 ${state.control ? 'control' : ''}" id="remote-screen">
        <div class="screen-placeholder" id="remote-placeholder">${icon('monitor', 30)}<span>正在连接桌面画面…</span></div>
        <img id="remote-img" alt="电脑桌面" class="hidden">
        <div class="screen-overlay-top">
          <span class="screen-chip live"><span class="status-dot online pulse"></span>LIVE</span>
          <span class="screen-chip" id="remote-front">屏幕共享</span>
        </div>
      </div>
      <div class="row between mt-12" style="padding:0 2px">
        <span class="dim" style="font-size:10.5px" id="remote-meta">${esc(state.system?.hostname || '')} · 等待画面</span>
        <button class="section-link" id="remote-apps-toggle">切换应用 ${icon('chevron', 13)}</button>
      </div>
      <div class="section">
        <div class="section-head"><div class="section-title">系统操作</div><span class="dim" style="font-size:10px">macOS</span></div>
        <div class="remote-actions">
          <button class="remote-action" data-remote-action="screenshot">${icon('camera', 20)}截屏</button>
          <button class="remote-action" data-remote-action="mute">${icon('mute', 20)}静音</button>
          <button class="remote-action" data-remote-action="lock">${icon('lock', 20)}锁定</button>
          <button class="remote-action" data-remote-action="sleep">${icon('sleep', 20)}休眠</button>
          <button class="remote-action" data-remote-action="mission-control">${icon('grid', 20)}调度中心</button>
          <button class="remote-action" data-remote-action="show-desktop">${icon('desktop', 20)}显示桌面</button>
          <button class="remote-action" data-remote-action="refresh">${icon('refresh', 20)}刷新</button>
          <button class="remote-action" data-remote-action="official">${icon('external', 20)}官方</button>
        </div>
      </div>
      <div class="section hidden" id="remote-apps-section">
        <div class="section-head"><div class="section-title">运行中的应用</div><button class="section-link" id="remote-apps-refresh">${icon('refresh', 13)}刷新</button></div>
        <div class="chip-row" id="remote-apps"></div>
      </div>
      <div class="info-note">触控会直接操作电脑鼠标。拖动画面滚动，轻点执行点击。请只在可信网络中配对手机。</div>
    </div>
    ${bottomNav('remote')}`;
  bindRemote();
  loadRemoteData();
  refreshScreen();
  scheduleScreenLoop();
}

function scheduleScreenLoop() {
  clearTimeout(state.screenTimer);
  state.screenTimer = setTimeout(async () => {
    if (state.route !== 'remote') return;
    if (document.visibilityState === 'visible') await refreshScreen();
    scheduleScreenLoop();
  }, 1900);
}

async function loadRemoteData() {
  try {
    const system = await api('/api/system');
    state.system = system.system || state.system;
    state.dsh = system.dsh || state.dsh;
    state.screenInfo = system.screen || state.screenInfo;
    state.proxyUrl = system.proxyUrl || state.proxyUrl;
    const warning = $('#remote-warning');
    if (warning) {
      warning.innerHTML = system.screen && system.screen.trusted === false
        ? `<div class="warning-card">${icon('alert', 17)}<span>远程控制需要 macOS 的 <strong>辅助功能</strong> 权限。请在「系统设置 → 隐私与安全性 → 辅助功能」中允许 DSH 或终端。</span></div>`
        : '';
    }
    const front = $('#remote-front');
    if (front) front.textContent = system.system?.frontmost || system.screen?.frontmost || '屏幕共享';
    const meta = $('#remote-meta');
    if (meta) meta.textContent = `${system.system?.hostname || ''} · ${system.screen?.width || ''}×${system.screen?.height || ''}`;
    updateRemoteChrome();
    loadRemoteApps();
  } catch (error) {
    const placeholder = $('#remote-placeholder');
    if (placeholder) placeholder.innerHTML = `${icon('alert', 28)}<span>${esc(error.message)}</span>`;
  }
}

function updateRemoteChrome() {
  const pill = $('.topbar .status-pill');
  if (pill && state.dsh) {
    const online = state.dsh.online;
    pill.innerHTML = `<span class="status-dot ${online ? 'online' : 'offline'}"></span>${online ? '实时画面' : '离线'}`;
  }
}

async function refreshScreen() {
  if (state.route !== 'remote' || state.screenBusy) return;
  state.screenBusy = true;
  try {
    const response = await fetch(`/api/screen.jpg?w=1400&t=${Date.now()}`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    if (state.route !== 'remote') return;
    if (state.screenUrl) URL.revokeObjectURL(state.screenUrl);
    state.screenUrl = URL.createObjectURL(blob);
    const img = $('#remote-img');
    if (!img) return;
    img.src = state.screenUrl;
    img.classList.remove('hidden');
    $('#remote-placeholder')?.classList.add('hidden');
    const meta = $('#remote-meta');
    if (meta && state.system) meta.textContent = `${state.system.hostname || ''} · ${state.system.frontmost || '桌面'} · ${formatTime(Date.now())}`;
    const front = $('#remote-front');
    if (front) front.textContent = state.system?.frontmost || state.screenInfo?.frontmost || '桌面';
  } catch (error) {
    const placeholder = $('#remote-placeholder');
    if (placeholder) {
      placeholder.classList.remove('hidden');
      placeholder.innerHTML = `${icon('alert', 28)}<span>${esc(error.message)}<br>请在电脑上授予屏幕录制权限</span>`;
    }
  } finally {
    state.screenBusy = false;
  }
}

function bindRemote() {
  const screen = $('#remote-screen');
  $('#toggle-control')?.addEventListener('click', () => {
    state.control = !state.control;
    screen?.classList.toggle('control', state.control);
    const button = $('#toggle-control');
    if (button) {
      button.classList.toggle('active', state.control);
      button.innerHTML = `${icon('mouse', 15)}${state.control ? '触控已开启' : '开启触控'}`;
    }
    if (!state.control) toast('已切换为只读预览');
    else toast('触控已开启：轻点点击，拖动滚动');
  });
  $('#remote-refresh')?.addEventListener('click', refreshScreen);
  $('#remote-official')?.addEventListener('click', openOfficialUi);
  $('#remote-keyboard')?.addEventListener('click', openKeyboardSheet);
  $('#remote-apps-toggle')?.addEventListener('click', () => {
    $('#remote-apps-section')?.classList.toggle('hidden');
  });
  $('#remote-apps-refresh')?.addEventListener('click', loadRemoteApps);
  bindScreenGestures(screen);
}

function handleRemoteAction(event) {
  const button = event.target.closest('[data-remote-action]');
  if (!button) return;
  const action = button.dataset.remoteAction;
  if (action === 'refresh') { refreshScreen(); toast('正在刷新画面'); return; }
  if (action === 'official') { openOfficialUi(); return; }
  if (action === 'lock') {
    confirmSheet({ title: '锁定电脑？', message: '锁屏后需要输入电脑密码才能继续操作。手机连接会保持。', confirmLabel: '锁定', danger: true, onConfirm: async () => { const r = await api('/api/remote/action', { method: 'POST', body: { action: 'lock' } }); toast(r.message, 'success'); } });
    return;
  }
  if (action === 'sleep') {
    confirmSheet({ title: '让电脑休眠？', message: '电脑将进入睡眠，DSH 任务可能会暂停。', confirmLabel: '休眠', danger: true, onConfirm: async () => { const r = await api('/api/remote/action', { method: 'POST', body: { action: 'sleep' } }); toast(r.message, 'success'); } });
    return;
  }
  runSystemAction(action);
}

function bindScreenGestures(screen) {
  if (!screen) return;
  let start = null;
  let moved = false;
  let last = null;
  let lastScrollAt = 0;
  let scrollX = 0;
  let scrollY = 0;
  const sendScroll = () => {
    if (!scrollX && !scrollY) return;
    const body = { kind: 'scroll', dx: Math.round(scrollX), dy: Math.round(scrollY) };
    scrollX = 0; scrollY = 0;
    api('/api/remote/input', { method: 'POST', body }).catch(() => {});
  };
  screen.addEventListener('pointerdown', (event) => {
    if (!state.control) return;
    if (event.button !== undefined && event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, at: Date.now() };
    last = { x: event.clientX, y: event.clientY };
    moved = false;
    scrollX = 0; scrollY = 0;
    screen.setPointerCapture?.(event.pointerId);
  });
  screen.addEventListener('pointermove', (event) => {
    if (!start || !state.control) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    if (Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y) > 7) moved = true;
    last = { x: event.clientX, y: event.clientY };
    if (moved) {
      scrollX += dx;
      scrollY += dy;
      const now = Date.now();
      if (now - lastScrollAt > 45) {
        lastScrollAt = now;
        sendScroll();
      }
    }
  });
  screen.addEventListener('pointerup', (event) => {
    if (!start || !state.control) { start = null; return; }
    const elapsed = Date.now() - start.at;
    const point = { x: event.clientX, y: event.clientY, at: start.at };
    const wasMoved = moved;
    start = null;
    sendScroll();
    if (wasMoved || elapsed > 700) return;
    const rect = screen.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));
    showTapRing(event.clientX - rect.left, event.clientY - rect.top);
    api('/api/remote/input', { method: 'POST', body: { kind: 'click', x: nx, y: ny } }).catch((error) => toast(error.message, 'error'));
  });
  screen.addEventListener('pointercancel', () => { start = null; moved = false; });
}

function showTapRing(x, y) {
  const screen = $('#remote-screen');
  if (!screen) return;
  const ring = document.createElement('div');
  ring.className = 'tap-ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  screen.appendChild(ring);
  setTimeout(() => ring.remove(), 600);
}

function openKeyboardSheet() {
  openSheet(`
    <button class="icon-btn sheet-close" data-close-sheet aria-label="关闭">${icon('close', 17)}</button>
    <h2 class="sheet-title">远程键盘</h2>
    <p class="sheet-desc">文字会输入到电脑当前获得焦点的窗口。</p>
    <div class="field">
      <textarea class="field-textarea" id="remote-type" placeholder="输入文字…" style="min-height:86px"></textarea>
    </div>
    <button class="btn primary block mt-12" id="remote-type-send">${icon('send', 15)}输入文字</button>
    <div class="section" style="margin-top:18px">
      <div class="section-title" style="margin-bottom:8px">特殊按键</div>
      <div class="key-grid">
        <button class="key-btn" data-key="return">Return</button>
        <button class="key-btn" data-key="escape">Esc</button>
        <button class="key-btn" data-key="tab">Tab</button>
        <button class="key-btn" data-key="backspace">⌫</button>
        <button class="key-btn" data-key="up">↑</button>
        <button class="key-btn" data-key="down">↓</button>
        <button class="key-btn" data-key="left">←</button>
        <button class="key-btn" data-key="right">→</button>
        <button class="key-btn" data-key="cmd+tab">⌘ Tab</button>
        <button class="key-btn" data-key="cmd+w">⌘ W</button>
        <button class="key-btn" data-key="cmd+s">⌘ S</button>
        <button class="key-btn" data-key="space">Space</button>
      </div>
    </div>
  `, (root) => {
    const textarea = $('#remote-type', root);
    textarea.focus();
    const sendText = async (event) => {
      const text = textarea.value;
      if (!text) return;
      setBusy(event.currentTarget, true, '输入中');
      try {
        await api('/api/remote/input', { method: 'POST', body: { kind: 'type', text } });
        textarea.value = '';
        toast('已输入', 'success', 1200);
      } catch (error) { toast(error.message, 'error'); }
      finally { setBusy(event.currentTarget, false); }
    };
    $('#remote-type-send', root).addEventListener('click', sendText);
    root.addEventListener('click', async (event) => {
      const key = event.target.closest('[data-key]');
      if (!key) return;
      try { await api('/api/remote/input', { method: 'POST', body: { kind: 'key', key: key.dataset.key } }); }
      catch (error) { toast(error.message, 'error'); }
    });
  });
}

async function loadRemoteApps() {
  try {
    const result = await api('/api/remote/apps');
    const list = $('#remote-apps');
    if (!list) return;
    const front = state.system?.frontmost || state.screenInfo?.frontmost;
    list.innerHTML = (result.apps || []).map((app) => `
      <button class="chip" data-activate-app="${esc(app)}" style="${app === front ? 'color:var(--accent);border-color:rgba(99,231,255,.25)' : ''}">${esc(app)}</button>
    `).join('') || '<span class="dim" style="font-size:11px">没有读取到应用列表</span>';
  } catch { /* ignore */ }
}

async function activateApp(app) {
  try {
    await api('/api/remote/input', { method: 'POST', body: { kind: 'activate', app } });
    toast(`已切换到 ${app}`, 'success');
    setTimeout(() => { refreshScreen(); loadRemoteData(); }, 700);
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* Settings */
function renderSettings() {
  app.className = 'app-shell';
  app.innerHTML = `
    ${topbar('连接与安全', { statusText: '安全' })}
    <div class="page">
      <div class="page-head">
        <div class="page-kicker">Account & security</div>
        <h1 class="page-title">我的</h1>
        <p class="page-desc">管理这台手机、桌面连接和隐私选项。</p>
      </div>
      <div id="settings-content">${settingsSkeleton()}</div>
    </div>
    ${bottomNav('settings')}`;
  loadSettings();
}

function settingsSkeleton() {
  return `<div class="card profile-card"><div class="skeleton" style="width:49px;height:49px;border-radius:17px"></div><div class="grow"><div class="skeleton" style="width:45%;height:13px"></div><div class="skeleton mt-8" style="width:65%;height:10px"></div></div></div>`;
}

async function loadSettings() {
  try {
    const [me, system] = await Promise.all([
      api('/api/me'),
      api('/api/system').catch(() => null),
    ]);
    state.device = me.device;
    state.devices = me.devices || [];
    if (system) {
      state.system = system.system || state.system;
      state.dsh = system.dsh || state.dsh;
      state.proxyUrl = system.proxyUrl || state.proxyUrl;
      state.screenInfo = system.screen || state.screenInfo;
    }
    const content = $('#settings-content');
    if (content) content.innerHTML = settingsContent();
    bindSettings();
  } catch (error) {
    const content = $('#settings-content');
    if (content) content.innerHTML = `<div class="warning-card">${icon('alert', 17)}<span>${esc(error.message)}</span></div><button class="btn mt-16 block" id="settings-retry">重试</button>`;
    $('#settings-retry')?.addEventListener('click', loadSettings);
  }
}

function settingsContent() {
  const device = state.device || {};
  const system = state.system || {};
  const dshOnline = Boolean(state.dsh?.online);
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const canInstall = Boolean(state.installPrompt);
  return `
    <div class="card profile-card">
      <div class="profile-avatar">${icon('smartphone', 24)}</div>
      <div class="grow">
        <div class="profile-name">${esc(device.name || '我的手机')}</div>
        <div class="profile-sub">已配对 · ${esc(location.hostname)}:${esc(location.port)}</div>
      </div>
      <span class="badge green">已连接</span>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">桌面连接</div><span class="badge ${dshOnline ? 'green' : 'red'}">${dshOnline ? 'DSH 在线' : 'DSH 离线'}</span></div>
      <div class="card settings-group">
        <div class="settings-row">
          <span class="settings-icon">${icon('monitor', 17)}</span>
          <span class="settings-main"><span class="settings-label">电脑</span><span class="settings-value">${esc(system.hostname || state.info?.hostname || '未知')} · ${esc(system.platform || 'macOS')} ${esc(system.release || '')}</span></span>
        </div>
        <div class="settings-row">
          <span class="settings-icon">${icon('bolt', 17)}</span>
          <span class="settings-main"><span class="settings-label">DeepSeek Harness</span><span class="settings-value">${dshOnline ? `运行中 · 端口 ${state.dsh?.port || '—'}` : esc(state.dsh?.error || '未连接')}</span></span>
        </div>
        <div class="settings-row">
          <span class="settings-icon">${icon('wifi', 17)}</span>
          <span class="settings-main"><span class="settings-label">本机地址</span><span class="settings-value">${esc(location.origin)}</span></span>
          <button class="btn small" data-copy="${esc(location.origin)}">复制</button>
        </div>
        <button class="settings-row" data-action="official">
          <span class="settings-icon">${icon('external', 17)}</span>
          <span class="settings-main"><span class="settings-label">打开完整 DSH 界面</span><span class="settings-value">用于审批、设置和高级操作</span></span>
          ${icon('chevron', 15, 'chev')}
        </button>
        <div class="settings-row">
          <span class="settings-icon">${icon('mouse', 17)}</span>
          <span class="settings-main"><span class="settings-label">远程控制权限</span><span class="settings-value">${state.screenInfo?.trusted ? '辅助功能已授权' : '需要在 macOS 系统设置中授权'}</span></span>
          <span class="badge ${state.screenInfo?.trusted ? 'green' : 'amber'}">${state.screenInfo?.trusted ? '正常' : '待授权'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">已配对设备 <span class="count">${state.devices?.length || 1}</span></div></div>
      <div class="card settings-group">
        ${(state.devices || [device]).map((item) => `
          <div class="device-row">
            <span class="device-dot ${item.id === device.id ? 'this' : ''}"></span>
            <span class="grow"><span class="device-name">${esc(item.name || '未知设备')}${item.id === device.id ? ' <span class="badge neutral" style="margin-left:4px">本机</span>' : ''}</span><span class="device-meta">上次活跃 ${relativeTime(item.lastSeenAt || Date.now())}</span></span>
            ${item.id !== device.id ? `<button class="btn small danger" data-revoke-device="${esc(item.id)}">移除</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="info-note">移除设备后，那台手机需要重新输入配对码。配对码只显示在电脑上。</div>
    </div>

    ${(canInstall || isIos || isAndroid) ? `
      <div class="section">
        <div class="section-head"><div class="section-title">安装到手机</div><span class="badge">PWA</span></div>
        <div class="card settings-group">
          ${canInstall ? `<button class="settings-row" data-install><span class="settings-icon">${icon('download', 17)}</span><span class="settings-main"><span class="settings-label">添加到主屏幕</span><span class="settings-value">像原生 App 一样全屏使用</span></span>${icon('chevron', 15, 'chev')}</button>` : ''}
          ${isIos ? `<div class="settings-row"><span class="settings-icon">${icon('info', 17)}</span><span class="settings-main"><span class="settings-label">Safari 安装方法</span><span class="settings-value">点底部分享按钮 → 添加到主屏幕</span></span></div>` : ''}
          ${isAndroid ? `<div class="settings-row"><span class="settings-icon">${icon('info', 17)}</span><span class="settings-main"><span class="settings-label">Chrome 安装方法</span><span class="settings-value">右上角菜单 → 添加到主屏幕</span></span></div>` : ''}
        </div>
      </div>` : ''}

    <div class="section">
      <div class="section-head"><div class="section-title">安全</div><span class="badge green">${icon('shield', 12)}局域网</span></div>
      <div class="card" style="padding:14px">
        <div class="pair-steps" style="margin:0">
          <div class="pair-step"><b>1</b><span>连接只通过你家里的 Wi-Fi / 局域网，不经过云端中转。</span></div>
          <div class="pair-step"><b>2</b><span>配对后这台手机会获得电脑的 DSH 与远程控制权限，请勿在公共 Wi-Fi 下配对陌生设备。</span></div>
          <div class="pair-step"><b>3</b><span>移除设备或关闭电脑上的 DSH 随身即可立即断开。</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="card settings-group">
        <button class="settings-row" data-action="logout">
          <span class="settings-icon" style="color:var(--red);background:rgba(255,126,140,.07);border-color:rgba(255,126,140,.12)">${icon('logout', 17)}</span>
          <span class="settings-main"><span class="settings-label" style="color:var(--red)">断开这台手机</span><span class="settings-value">清除本机配对令牌</span></span>
          ${icon('chevron', 15, 'chev')}
        </button>
      </div>
      <div class="info-note center">DSH 随身 1.0.0 · 非官方实验性客户端<br>为你的 DeepSeek Harness 提供一个口袋入口。</div>
    </div>`;
}

function bindSettings() {
  // Actions are delegated globally; this hook is reserved for future settings widgets.
}

/* Global interactions */
document.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    navigate(nav.dataset.nav);
    return;
  }
  const open = event.target.closest('[data-open-session]');
  if (open) {
    event.preventDefault();
    navigate(`chat/${open.dataset.openSession}`);
    return;
  }
  const official = event.target.closest('[data-official]');
  if (official) {
    openOfficialUi();
    return;
  }
  const remoteAction = event.target.closest('[data-remote-action]');
  if (remoteAction) {
    handleRemoteAction(event);
    return;
  }
  const activate = event.target.closest('[data-activate-app]');
  if (activate) {
    activateApp(activate.dataset.activateApp);
    return;
  }
  const revoke = event.target.closest('[data-revoke-device]');
  if (revoke) {
    const id = revoke.dataset.revokeDevice;
    confirmSheet({
      title: '移除这台设备？',
      message: '被移除的手机需要重新输入配对码才能连接。',
      confirmLabel: '移除',
      danger: true,
      onConfirm: async () => {
        await api(`/api/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
        toast('设备已移除', 'success');
        await loadSettings();
      },
    });
    return;
  }
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copy); toast('已复制', 'success'); }
    catch { toast(copy.dataset.copy, '', 5000); }
    return;
  }
  const fill = event.target.closest('[data-prompt-fill]');
  if (fill) {
    const input = $('#chat-input');
    if (input) {
      input.value = fill.dataset.promptFill;
      input.focus();
      input.dispatchEvent(new Event('input'));
    }
    return;
  }
  if (event.target.closest('[data-install]')) {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;
      if (choice.outcome === 'accepted') toast('正在安装…', 'success');
      state.installPrompt = null;
      loadSettings();
    } else {
      toast('请用浏览器菜单「添加到主屏幕」', '', 3500);
    }
    return;
  }
  if (event.target.closest('[data-key]')) return;
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === 'new-task') { openNewTaskSheet(); return; }
  if (action === 'official') { openOfficialUi(); return; }
  if (action === 'refresh-home') { await refreshHome(); return; }
  if (action === 'screenshot') { await runSystemAction('screenshot'); return; }
  if (action === 'lock-confirm') {
    confirmSheet({ title: '锁定电脑？', message: '锁屏后需要输入电脑密码才能继续操作。', confirmLabel: '锁定', danger: true, onConfirm: async () => { const r = await api('/api/remote/action', { method: 'POST', body: { action: 'lock' } }); toast(r.message, 'success'); } });
    return;
  }
  if (action === 'logout') {
    confirmSheet({
      title: '断开这台手机？',
      message: '配对令牌会被清除，下次需要重新扫码或输入配对码。',
      confirmLabel: '断开',
      danger: true,
      onConfirm: async () => {
        await api('/api/auth/logout', { method: 'POST', body: {} });
        location.reload();
      },
    });
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSheet();
});

/* Start */
setupViewport();
boot();
