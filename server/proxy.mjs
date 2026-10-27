import http from 'node:http';
import net from 'node:net';
import { authenticate } from './auth.mjs';
import { dsh } from './dsh.mjs';
import { APP_PORT, isAllowedHost } from './config.mjs';

const FLOAT = `
<div id="dsh-pocket-return" style="position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483647;font:600 13px -apple-system,BlinkMacSystemFont,'SF Pro Text','PingFang SC',sans-serif;">
  <a href="__POCKET_HOME__" style="display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:999px;background:rgba(10,16,28,.82);color:#e8f7ff;text-decoration:none;border:1px solid rgba(105,230,255,.35);backdrop-filter:blur(16px);box-shadow:0 8px 30px rgba(0,0,0,.4);">← 随身</a>
</div>`;

function unauthorized(res) {
  res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end('<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#0b1220;color:#dfe9ff;font:16px -apple-system;padding:40px 24px;text-align:center"><h2>需要配对</h2><p>请先在 DSH 随身中完成配对。</p><a style="color:#5ee7ff" href="/">返回首页</a></body>');
}

function rewriteCookieHeader(headers, cookie) {
  const next = { ...headers };
  delete next.host;
  delete next.cookie;
  delete next.origin;
  delete next.referer;
  delete next.connection;
  delete next['proxy-connection'];
  delete next['keep-alive'];
  delete next.upgrade;
  delete next['content-length'];
  next.cookie = cookie;
  return next;
}

function pocketHome(req) {
  const host = String(req.headers.host || '127.0.0.1:8798');
  const hostname = host.split(':')[0];
  if (hostname.endsWith('.ts.net')) return `https://${hostname}/`;
  return `http://${hostname}:${APP_PORT}/`;
}

export function createProxyServer() {
  const server = http.createServer(async (req, res) => {
    if (!isAllowedHost(req)) { res.writeHead(403); res.end('Host not allowed'); return; }
    if (!authenticate(req)) return unauthorized(res);
    try {
      await dsh.discover();
      await dsh.refreshCookie();
    } catch (error) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`DeepSeek Harness 离线：${error.message}`);
      return;
    }

    const upstream = new URL(dsh.upstreamOrigin);
    const headers = rewriteCookieHeader(req.headers, dsh.cookie);
    headers.host = dsh.hostHeader;
    headers.origin = dsh.origin;
    if (req.headers.referer) {
      try {
        const referer = new URL(req.headers.referer);
        headers.referer = dsh.origin + referer.pathname + referer.search;
      } catch { /* ignore */ }
    }
    headers['accept-encoding'] = 'identity';

    const proxyReq = http.request({
      host: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: req.url,
      headers,
    }, (proxyRes) => {
      const outHeaders = { ...proxyRes.headers };
      delete outHeaders['set-cookie'];
      delete outHeaders['content-security-policy'];
      delete outHeaders['content-security-policy-report-only'];
      delete outHeaders['x-frame-options'];
      delete outHeaders['content-length'];
      delete outHeaders['transfer-encoding'];

      const type = String(outHeaders['content-type'] || '');
      const isHtml = type.includes('text/html') && req.method !== 'HEAD';
      if (!isHtml) {
        res.writeHead(proxyRes.statusCode || 502, outHeaders);
        proxyRes.pipe(res);
        return;
      }

      const chunks = [];
      let size = 0;
      proxyRes.on('data', (chunk) => {
        size += chunk.length;
        if (size <= 3 * 1024 * 1024) chunks.push(chunk);
      });
      proxyRes.on('end', () => {
        let html = Buffer.concat(chunks).toString('utf8');
        const home = pocketHome(req);
        const float = FLOAT.replace('__POCKET_HOME__', home);
        if (html.includes('</body>')) html = html.replace('</body>', `${float}</body>`);
        else html += float;
        const body = Buffer.from(html);
        outHeaders['content-length'] = String(body.length);
        res.writeHead(proxyRes.statusCode || 200, outHeaders);
        res.end(body);
      });
      proxyRes.on('error', () => {
        try { res.writeHead(502); res.end('代理读取失败'); } catch { /* ignore */ }
      });
    });

    proxyReq.on('error', (error) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`代理连接失败：${error.message}`);
      } else {
        res.destroy();
      }
    });
    req.pipe(proxyReq);
  });

  server.on('upgrade', async (req, socket, head) => {
    if (!isAllowedHost(req)) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
    const dbg = (...args) => { if (process.env.DSH_POCKET_DEBUG === '1') console.log('[ws-proxy]', ...args); };
    dbg('upgrade', req.url, 'head', head?.length || 0);
    if (!authenticate(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    try {
      await dsh.discover();
      await dsh.refreshCookie();
    } catch {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const upstream = new URL(dsh.upstreamOrigin);
    const upstreamSocket = net.connect(Number(upstream.port), upstream.hostname);
    upstreamSocket.setTimeout(10000);
    let connected = false;
    let buffer = Buffer.alloc(0);

    upstreamSocket.on('connect', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`, `Host: ${dsh.hostHeader}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const key = req.rawHeaders[i];
        const value = req.rawHeaders[i + 1];
        const lower = key.toLowerCase();
        if (['host', 'cookie', 'origin', 'connection', 'upgrade', 'proxy-connection'].includes(lower)) continue;
        lines.push(`${key}: ${value}`);
      }
      lines.push(`Cookie: ${dsh.cookie}`);
      lines.push(`Origin: ${dsh.origin}`);
      lines.push('Connection: Upgrade');
      lines.push('Upgrade: websocket');
      upstreamSocket.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (head?.length) upstreamSocket.write(head);
    });

    const onData = (chunk) => {
      if (connected) {
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) {
        if (buffer.length > 64 * 1024) {
          socket.destroy();
          upstreamSocket.destroy();
        }
        return;
      }
      const headerText = buffer.subarray(0, end).toString('latin1');
      const status = Number(headerText.split('\r\n')[0]?.split(' ')[1] || 0);
      dbg('upstream handshake', status, headerText.split('\r\n')[0]);
      if (status !== 101) {
        socket.write(buffer.subarray(0, end + 4));
        socket.destroy();
        upstreamSocket.destroy();
        return;
      }
      connected = true;
      dbg('connected');
      socket.write(buffer.subarray(0, end + 4));
      const rest = buffer.subarray(end + 4);
      if (rest.length) socket.write(rest);
      buffer = Buffer.alloc(0);
      upstreamSocket.setTimeout(0);
      upstreamSocket.off('data', onData);
      socket.pipe(upstreamSocket);
      upstreamSocket.pipe(socket);
      socket.resume();
    };
    upstreamSocket.on('data', onData);

    const closeBoth = () => {
      try { socket.destroy(); } catch { /* ignore */ }
      try { upstreamSocket.destroy(); } catch { /* ignore */ }
    };
    upstreamSocket.on('error', (e) => { dbg('upstream error', e.message); closeBoth(); });
    upstreamSocket.on('close', () => { dbg('upstream close'); closeBoth(); });
    upstreamSocket.on('timeout', () => { dbg('upstream timeout'); closeBoth(); });
    socket.on('error', (e) => { dbg('client error', e.message); closeBoth(); });
    socket.on('close', () => { dbg('client close'); closeBoth(); });
  });

  return server;
}
