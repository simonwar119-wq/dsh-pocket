import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import {
  APP_PORT, BIND_HOST, HOST_NAME, PROXY_PORT, WEB_DIR,
  isAllowedHost, isLoopbackRequest, localAddresses, primaryLanAddress, tailscaleAddresses,
} from './config.mjs';
import {
  authenticate, clearCookie, ensurePairCode, listDevices, pairDevice, pairInfo,
  publicDevice, requireAuth, revokeCurrent, revokeDevice, sendJson, sessionCookie,
} from './auth.mjs';
import { dsh } from './dsh.mjs';
import { hub } from './sessions.mjs';
import { action, remoteInput, runningApps, screenInfo, screenshot, screenPayload, stats } from './system.mjs';
import { createProxyServer } from './proxy.mjs';

const APP_START = Date.now();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function securityHeaders(extra = {}) {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; manifest-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    ...extra,
  };
}

function serveStatic(req, res, pathname) {
  let relative;
  if (pathname === '/' || pathname === '') relative = 'index.html';
  else if (pathname === '/setup' || pathname === '/setup/') relative = 'setup.html';
  else relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.resolve(WEB_DIR, relative);
  if (!file.startsWith(`${path.resolve(WEB_DIR)}${path.sep}`) && file !== path.resolve(WEB_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return true;
  }
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const noStore = relative === 'index.html' || relative === 'setup.html' || relative === 'sw.js' || relative === 'app.js' || relative === 'app.css';
  res.writeHead(200, securityHeaders({
    'content-type': MIME[ext] || 'application/octet-stream',
    'content-length': String(stat.size),
    'cache-control': noStore ? 'no-store' : 'public, max-age=3600',
    ...(relative === 'sw.js' ? { 'service-worker-allowed': '/' } : {}),
  }));
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(file).pipe(res);
  return true;
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('请求体过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('请求体不是合法 JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers.host;
    const originUrl = new URL(origin);
    return originUrl.host === host && ['http:', 'https:'].includes(originUrl.protocol);
  } catch { return false; }
}

function requireMutation(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE' && req.method !== 'PUT') return true;
  if (req.headers['x-dshpocket'] !== '1') {
    sendJson(res, 403, { error: 'missing_mutation_header' });
    return false;
  }
  if (!checkOrigin(req)) {
    sendJson(res, 403, { error: 'bad_origin' });
    return false;
  }
  return true;
}

function lanUrls(req) {
  const addresses = localAddresses().map((entry) => entry.address);
  const unique = [...new Set(addresses)];
  const host = req.headers.host || '';
  const hostname = host.split(':')[0];
  if (hostname && hostname !== '127.0.0.1' && hostname !== 'localhost' && hostname !== '::1' && !unique.includes(hostname)) unique.unshift(hostname);
  return unique.map((address) => `http://${address}:${APP_PORT}`);
}

async function setupPayload(req) {
  const { code, expiresAt } = ensurePairCode();
  const urls = lanUrls(req);
  const base = urls[0] || `http://127.0.0.1:${APP_PORT}`;
  const pairUrl = `${base}/?pair=${encodeURIComponent(code)}`;
  const remoteUrls = tailscaleAddresses().map((entry) => `http://${entry.address}:${APP_PORT}`);
  const remotePairUrl = remoteUrls[0] ? `${remoteUrls[0]}/?pair=${encodeURIComponent(code)}` : null;
  const remoteProxyUrl = remoteUrls[0] ? `http://${tailscaleAddresses()[0].address}:${PROXY_PORT}/` : null;
  let dshStatus;
  try { dshStatus = await dsh.status(); } catch (error) { dshStatus = { online: false, error: error.message }; }
  return {
    app: 'DSH Pocket',
    version: '1.0.0',
    hostname: HOST_NAME,
    platform: process.platform,
    code,
    expiresAt,
    urls,
    pairUrl,
    proxyUrl: `${base.replace(/:\d+$/, `:${PROXY_PORT}`)}/`,
    remoteUrls,
    remotePairUrl,
    remoteProxyUrl,
    tailscale: { available: remoteUrls.length > 0 },
    devices: listDevices(null),
    dsh: dshStatus,
    uptime: Math.floor((Date.now() - APP_START) / 1000),
    now: Date.now(),
  };
}

function publicProxyUrl(req) {
  const host = String(req.headers.host || '').toLowerCase();
  const hostname = host.split(':')[0];
  if (hostname.endsWith('.ts.net')) return `https://${hostname}:8443/`;
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwarded === 'https' ? 'https' : 'http';
  return `${proto}://${hostname}:${PROXY_PORT}/`;
}

function pathParts(pathname) {
  return pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  try {
    if (!isAllowedHost(req)) {
      sendJson(res, 403, { error: 'host_not_allowed', message: '请通过本机局域网地址访问。' });
      return;
    }
    if (pathname === '/health') {
      const dshStatus = await dsh.status();
      sendJson(res, 200, { ok: true, app: 'dsh-pocket', dsh: dshStatus, uptime: Math.floor((Date.now() - APP_START) / 1000) });
      return;
    }

    if (pathname === '/api/auth/status' && req.method === 'GET') {
      const device = authenticate(req);
      let dshStatus;
      try { dshStatus = await dsh.status(); } catch (error) { dshStatus = { online: false, error: error.message }; }
      sendJson(res, 200, {
        ok: true,
        paired: Boolean(device),
        device: device ? publicDevice(device) : null,
        hostname: HOST_NAME,
        lanUrl: `http://${primaryLanAddress()}:${APP_PORT}`,
        loopback: isLoopbackRequest(req),
        dsh: dshStatus,
        now: Date.now(),
      });
      return;
    }

    if (pathname === '/api/setup' && req.method === 'GET') {
      if (!isLoopbackRequest(req)) { sendJson(res, 403, { error: 'loopback_only' }); return; }
      sendJson(res, 200, await setupPayload(req));
      return;
    }

    if (pathname === '/api/setup/rotate' && req.method === 'POST') {
      if (!isLoopbackRequest(req)) { sendJson(res, 403, { error: 'loopback_only' }); return; }
      if (!requireMutation(req, res)) return;
      ensurePairCode({ rotate: true });
      sendJson(res, 200, await setupPayload(req));
      return;
    }

    if (pathname === '/api/pair' && req.method === 'POST') {
      if (!requireMutation(req, res)) return;
      const body = await readBody(req, 16 * 1024);
      const result = pairDevice(req, body);
      if (!result.ok) { sendJson(res, result.status || 400, { ok: false, error: result.error }); return; }
      res.setHeader('set-cookie', sessionCookie(result.token));
      sendJson(res, 200, {
        ok: true,
        device: result.device,
        hostname: HOST_NAME,
        proxyUrl: publicProxyUrl(req),
      });
      return;
    }

    // Every route below this line requires a paired device.
    const device = pathname.startsWith('/api/') ? requireAuth(req, res) : null;
    if (pathname.startsWith('/api/') && !device) return;

    if (pathname === '/api/me' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, device: publicDevice(device), devices: listDevices(device.id) });
      return;
    }

    if (pathname === '/api/devices' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, devices: listDevices(device.id) });
      return;
    }

    if (pathname.startsWith('/api/devices/') && req.method === 'DELETE') {
      if (!requireMutation(req, res)) return;
      const id = pathParts(pathname)[2];
      if (!id) { sendJson(res, 400, { error: 'missing_id' }); return; }
      const revokedCurrent = id === device.id;
      const removed = revokeDevice(id);
      if (revokedCurrent) res.setHeader('set-cookie', clearCookie());
      sendJson(res, removed ? 200 : 404, { ok: removed, revokedCurrent });
      return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      if (!requireMutation(req, res)) return;
      revokeCurrent(req);
      res.setHeader('set-cookie', clearCookie());
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/dsh/status' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, dsh: await dsh.status() });
      return;
    }

    if (pathname === '/api/sessions' && req.method === 'GET') {
      try {
        const sessions = await hub.list();
        sendJson(res, 200, { ok: true, sessions, dsh: await dsh.status(), now: Date.now() });
      } catch (error) {
        sendJson(res, 200, { ok: false, sessions: [], error: error.message, dsh: { online: false, error: error.message }, now: Date.now() });
      }
      return;
    }

    if (pathname === '/api/sessions' && req.method === 'POST') {
      if (!requireMutation(req, res)) return;
      const body = await readBody(req);
      const text = String(body.prompt || '').trim();
      const cwd = String(body.cwd || process.env.HOME || '').trim();
      if (text.length > 100000) { sendJson(res, 413, { error: 'prompt_too_long' }); return; }
      if (cwd && !path.isAbsolute(cwd)) { sendJson(res, 400, { error: 'cwd_must_be_absolute' }); return; }
      try {
        const created = await dsh.createSession({ cwd: cwd || undefined, agentPreset: body.agentPreset || undefined });
        let accepted = false;
        let promptError = null;
        if (text) {
          try {
            await dsh.prompt({ sessionId: created.sessionId, text });
            accepted = true;
          } catch (error) {
            promptError = error;
          }
        }
        sendJson(res, promptError ? 502 : 200, {
          ok: !promptError,
          sessionId: created.sessionId,
          agentPreset: created.agentPreset || null,
          accepted,
          ...(promptError ? { error: promptError.message, code: promptError.code || null } : {}),
        });
      } catch (error) {
        sendJson(res, 502, { ok: false, error: error.message, code: error.code || null });
      }
      return;
    }

    const parts = pathParts(pathname);
    if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2]) {
      const id = parts[2];
      const actionName = parts[3] || '';
      if (!id.startsWith('session-')) { sendJson(res, 400, { error: 'invalid_session_id' }); return; }

      if (req.method === 'GET' && actionName === 'state') {
        try {
          const state = await hub.state(id, { running: url.searchParams.get('running') === '1' });
          sendJson(res, 200, { ok: true, state });
        } catch (error) {
          sendJson(res, 502, { ok: false, error: error.message });
        }
        return;
      }

      if (req.method === 'GET' && actionName === 'events') {
        res.writeHead(200, securityHeaders({
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        }));
        res.write(': connected\n\n');
        const unsubscribe = hub.subscribe(id, res, { running: url.searchParams.get('running') === '1' });
        req.on('close', () => unsubscribe());
        return;
      }

      if (req.method === 'POST' && actionName === 'prompt') {
        if (!requireMutation(req, res)) return;
        const body = await readBody(req);
        const text = String(body.text || '').trim();
        if (!text) { sendJson(res, 400, { error: 'empty_prompt' }); return; }
        if (text.length > 100000) { sendJson(res, 413, { error: 'prompt_too_long' }); return; }
        try {
          const result = await dsh.prompt({ sessionId: id, text, mode: body.mode });
          sendJson(res, 200, { ok: true, accepted: Boolean(result?.accepted), sessionId: id });
        } catch (error) {
          sendJson(res, 502, { ok: false, error: error.message, code: error.code || null });
        }
        return;
      }

      if (req.method === 'POST' && actionName === 'cancel') {
        if (!requireMutation(req, res)) return;
        try {
          const result = await dsh.cancel(id);
          sendJson(res, 200, { ok: true, accepted: Boolean(result?.accepted) });
        } catch (error) {
          sendJson(res, 502, { ok: false, error: error.message });
        }
        return;
      }

      if (req.method === 'POST' && actionName === 'rename') {
        if (!requireMutation(req, res)) return;
        const body = await readBody(req);
        const title = String(body.title || '').trim().slice(0, 120);
        if (!title) { sendJson(res, 400, { error: 'empty_title' }); return; }
        try {
          const result = await dsh.rename(id, title);
          sendJson(res, 200, { ok: true, title: result?.title || title });
        } catch (error) {
          sendJson(res, 502, { ok: false, error: error.message });
        }
        return;
      }
    }

    if (pathname === '/api/system' && req.method === 'GET') {
      const [systemStats, dshStatus, info] = await Promise.all([
        stats().catch((error) => ({ error: error.message })),
        dsh.status(),
        screenInfo().catch(() => ({})),
      ]);
      sendJson(res, 200, {
        ok: true,
        system: systemStats,
        dsh: dshStatus,
        screen: {
          trusted: Boolean(info.trusted),
          width: info.width,
          height: info.height,
          frontmost: info.frontmost,
          frontmostBundle: info.frontmostBundle,
        },
        proxyUrl: publicProxyUrl(req),
        now: Date.now(),
      });
      return;
    }

    if (pathname === '/api/screen.jpg' && req.method === 'GET') {
      try {
        const width = Math.max(480, Math.min(2200, Number(url.searchParams.get('w') || 1400)));
        const shot = await screenshot({ width });
        res.writeHead(200, securityHeaders({
          'content-type': 'image/jpeg',
          'content-length': String(shot.buffer.length),
          'cache-control': 'no-store, max-age=0',
        }));
        res.end(shot.buffer);
      } catch (error) {
        sendJson(res, 503, { ok: false, error: error.message });
      }
      return;
    }

    if (pathname === '/api/screen/meta' && req.method === 'GET') {
      try {
        const payload = await screenPayload();
        sendJson(res, 200, { ok: true, screen: payload });
      } catch (error) {
        sendJson(res, 503, { ok: false, error: error.message });
      }
      return;
    }

    if (pathname === '/api/remote/info' && req.method === 'GET') {
      const info = await screenInfo({ fresh: true });
      sendJson(res, 200, { ok: true, ...info });
      return;
    }

    if (pathname === '/api/remote/apps' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, apps: await runningApps() });
      return;
    }

    if (pathname === '/api/remote/input' && req.method === 'POST') {
      if (!requireMutation(req, res)) return;
      const body = await readBody(req, 64 * 1024);
      try {
        const result = await remoteInput(body);
        sendJson(res, 200, { ok: true, result });
      } catch (error) {
        sendJson(res, error.code === 'accessibility' ? 403 : 400, { ok: false, error: error.message, code: error.code || null });
      }
      return;
    }

    if (pathname === '/api/remote/action' && req.method === 'POST') {
      if (!requireMutation(req, res)) return;
      const body = await readBody(req, 16 * 1024);
      const allowed = new Set(['lock', 'sleep', 'screenshot', 'mute', 'volume-up', 'volume-down', 'mission-control', 'show-desktop']);
      if (!allowed.has(body.action)) { sendJson(res, 400, { error: 'unknown_action' }); return; }
      try {
        const result = await action(body.action);
        sendJson(res, 200, { ok: true, ...result });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
      }
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'not_found' });
      return;
    }

    if (serveStatic(req, res, pathname)) return;
    // Hash-routed app: unknown non-API paths fall back to the shell.
    if (serveStatic(req, res, '/')) return;
    res.writeHead(404); res.end('Not found');
  } catch (error) {
    if (res.headersSent) { try { res.end(); } catch { /* ignore */ } return; }
    sendJson(res, error.status || 500, { ok: false, error: error.message || '服务器错误' });
  }
});

server.requestTimeout = 120000;
server.headersTimeout = 30000;
server.on('clientError', (error, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

const proxyServer = createProxyServer();
proxyServer.requestTimeout = 120000;
proxyServer.headersTimeout = 30000;

function listen(instance, port) {
  return new Promise((resolve, reject) => {
    instance.once('error', reject);
    instance.listen(port, BIND_HOST, () => {
      instance.off('error', reject);
      resolve();
    });
  });
}

async function main() {
  const open = !process.argv.includes('--no-open') && process.env.DSH_POCKET_OPEN !== '0';
  ensurePairCode({ rotate: process.env.DSH_POCKET_NEW_CODE === '1' });
  await listen(server, APP_PORT);
  try {
    await listen(proxyServer, PROXY_PORT);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`端口 ${PROXY_PORT} 已被占用；官方界面入口将不可用。手机端功能仍然可用。`);
    } else {
      throw error;
    }
  }
  const lan = `http://${primaryLanAddress()}:${APP_PORT}`;
  const setup = `http://127.0.0.1:${APP_PORT}/setup`;
  const { code, expiresAt } = pairInfo();
  console.log('');
  console.log('  ╭──────────────────────────────────────────────╮');
  console.log('  │            DSH 随身 · Pocket DSH             │');
  console.log('  ╰──────────────────────────────────────────────╯');
  console.log(`  手机访问   ${lan}`);
  console.log(`  配对码     ${code.slice(0, 3)} ${code.slice(3)}   有效期至 ${new Date(expiresAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
  console.log(`  电脑设置   ${setup}`);
  console.log(`  官方界面   http://${primaryLanAddress()}:${PROXY_PORT}/`);
  console.log('');
  console.log('  手机与电脑需在同一 Wi-Fi。按 Ctrl+C 停止。');
  console.log('');
  if (open) {
    execFile('/usr/bin/open', [setup], () => {});
  }
}

const shutdown = () => {
  console.log('\n正在关闭 DSH 随身…');
  hub.closeAll();
  server.close();
  proxyServer.close();
  setTimeout(() => process.exit(0), 500).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (error) => {
  console.error('[dsh-pocket] uncaught:', error);
});
process.on('unhandledRejection', (error) => {
  console.error('[dsh-pocket] unhandled:', error);
});

main().catch((error) => {
  console.error(`启动失败：${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${APP_PORT} 已被占用。可能 DSH 随身已经在运行，或请设置 DSH_POCKET_PORT。`);
  }
  process.exit(1);
});
