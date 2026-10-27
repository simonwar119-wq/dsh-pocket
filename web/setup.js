'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const toastRoot = $('#toast-root');

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function toast(message, error = false) {
  const node = document.createElement('div');
  node.className = `toast ${error ? 'error' : 'success'}`;
  node.textContent = message;
  toastRoot.appendChild(node);
  setTimeout(() => { node.style.opacity = '0'; node.style.transition = '.2s'; setTimeout(() => node.remove(), 220); }, 2400);
}

function qrSvg(text) {
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  } catch {
    return '<div style="color:#111;font:12px sans-serif;padding:30px">二维码生成失败</div>';
  }
}

function formatTime(ms) {
  if (!ms) return '—';
  const date = new Date(ms);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function relative(ms) {
  if (!ms) return '未连接';
  const diff = Date.now() - ms;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-dshpocket': '1', ...(options.headers || {}) },
    method: options.method || 'GET',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

let current = null;
let timer = null;

async function load() {
  try {
    const setup = await api('/api/setup');
    current = setup;
    render(setup);
    const status = $('#setup-status');
    if (status) {
      status.innerHTML = setup.dsh?.online
        ? '<span class="status-dot online"></span>DSH 在线'
        : '<span class="status-dot offline"></span>DSH 离线';
    }
  } catch (error) {
    $('#setup-content').innerHTML = `
      <div class="card setup-card" style="text-align:center">
        <div class="warning-card" style="text-align:left">${esc(error.message)}</div>
        <p class="setup-note mt-16">请在运行 DSH 随身的那台电脑上，用浏览器打开 <b>http://127.0.0.1:8797/setup</b>。</p>
        <button class="btn mt-16" id="retry-setup">重试</button>
      </div>`;
  }
}

function render(setup) {
  const expireMinutes = Math.max(0, Math.ceil((setup.expiresAt - Date.now()) / 60000));
  const code = `${setup.code.slice(0, 3)} ${setup.code.slice(3)}`;
  $('#setup-content').innerHTML = `
    <div class="setup-grid">
      <section class="card setup-card setup-qr-wrap">
        <div class="setup-qr">${qrSvg(setup.pairUrl)}</div>
        <div class="setup-code" id="setup-code">${esc(code)}</div>
        <div class="setup-code-label">配对码 · ${expireMinutes} 分钟内有效</div>
        <div class="setup-url" id="setup-url">${esc(setup.pairUrl)}</div>
        <div class="row between mt-16" style="width:100%">
          <button class="btn small" id="copy-url">复制链接</button>
          <button class="btn small accent" id="rotate-code">刷新配对码</button>
        </div>
        <p class="setup-note mt-12" style="text-align:center">用 iPhone 相机或 Android 扫描二维码，<br>手机与电脑需连接同一个 Wi-Fi。</p>
      </section>
      <aside class="setup-side">
        <section class="card setup-card">
          <h3 class="setup-h">连接状态</h3>
          <div class="setup-status">
            <span class="status-dot ${setup.dsh?.online ? 'online' : 'offline'}"></span>
            <span>${setup.dsh?.online ? `DeepSeek Harness 正在运行 · 端口 ${setup.dsh.port || ''}` : esc(setup.dsh?.error || '未找到 DSH')}</span>
          </div>
          <div class="stat-strip mt-16">
            <div class="stat-cell"><div class="stat-label">电脑</div><div class="stat-value" style="font-size:13px">${esc(setup.hostname)}</div></div>
            <div class="stat-cell"><div class="stat-label">运行时长</div><div class="stat-value" style="font-size:13px">${Math.floor(setup.uptime / 60)} 分钟</div></div>
            <div class="stat-cell"><div class="stat-label">已配对</div><div class="stat-value" style="font-size:13px">${setup.devices.length} 台</div></div>
          </div>
          <div class="setup-url mt-12">${esc(setup.urls[0] || '')}</div>
        </section>
        <section class="card setup-card">
          <div class="row between">
            <h3 class="setup-h" style="margin:0">外网访问 · Tailscale</h3>
            <span class="badge ${setup.tailscale?.available ? 'green' : 'neutral'}">${setup.tailscale?.available ? '已就绪' : '未启用'}</span>
          </div>
          ${setup.tailscale?.available ? `
            <div class="setup-qr small">${qrSvg(setup.remotePairUrl, 4, 2)}</div>
            <div class="setup-url">${esc(setup.remoteUrls[0])}</div>
            <p class="setup-note mt-12">手机安装 Tailscale 并登录同一账号后，扫这个码配对；以后用这个地址就可以在外面使用。</p>
            <button class="btn small primary block mt-12" id="copy-remote">复制外网地址</button>
          ` : `
            <p class="setup-note" style="margin:0">在 Mac 和手机上安装 <a href="https://tailscale.com/download" target="_blank" rel="noopener">Tailscale</a> 并登录同一账号。启用网络扩展后，这里会自动出现外网二维码。</p>
          `}
        </section>
        <section class="card setup-card">
          <h3 class="setup-h">手机连接步骤</h3>
          <div class="setup-steps">
            <div class="setup-step"><b>1</b><span>确认手机和电脑连在同一个 Wi-Fi。</span></div>
            <div class="setup-step"><b>2</b><span>用手机相机扫码，或打开 <strong>${esc(setup.urls[0] || '')}</strong> 输入配对码。</span></div>
            <div class="setup-step"><b>3</b><span>配对成功后，手机会自动同步电脑上的 DSH 会话。</span></div>
          </div>
        </section>
        <section class="card setup-card">
          <h3 class="setup-h">已配对设备</h3>
          <div class="setup-list" id="setup-devices">
            ${setup.devices.length ? setup.devices.map((device) => `
              <div class="setup-device"><span class="status-dot online"></span><span class="name">${esc(device.name || '手机')}</span><span class="time">${relative(device.lastSeenAt)}</span></div>
            `).join('') : '<div class="setup-note">还没有手机配对。扫码后会自动出现在这里。</div>'}
          </div>
        </section>
        <section class="card setup-card">
          <div class="row between">
            <div><h3 class="setup-h" style="margin:0">手机完整界面</h3><p class="setup-note mt-8" style="margin:0">需要审批、设置模型或查看文件时，在已配对的手机浏览器打开这个地址。</p></div>
            <button class="btn small primary" id="copy-proxy">复制</button>
          </div>
        </section>
      </aside>
    </div>`;

  $('#rotate-code')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    try {
      current = await api('/api/setup/rotate', { method: 'POST', body: {} });
      render(current);
      toast('已生成新的配对码');
    } catch (error) {
      toast(error.message, true);
      event.currentTarget.disabled = false;
    }
  });
  $('#copy-url')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(setup.pairUrl); toast('链接已复制'); }
    catch { toast(setup.pairUrl); }
  });
  $('#copy-proxy')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(setup.proxyUrl); toast('完整界面地址已复制，请在手机浏览器打开'); }
    catch { toast(setup.proxyUrl); }
  });
  $('#copy-remote')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(setup.remoteUrls[0]); toast('外网地址已复制'); }
    catch { toast(setup.remoteUrls[0]); }
  });
}

load();
timer = setInterval(() => {
  if (document.visibilityState === 'visible') load();
}, 12000);
