import crypto from 'node:crypto';
import { readConfig, updateConfig } from './config.mjs';

const COOKIE_NAME = 'dshpocket_session';
const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const PAIR_TTL_MS = 10 * 60 * 1000;
const MAX_DEVICES = 12;
const attempts = new Map();

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function freshPairCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function ensurePairCode({ rotate = false } = {}) {
  const current = readConfig();
  const now = Date.now();
  if (!rotate && current.pairCode && current.pairExpiresAt > now) {
    return { code: current.pairCode, expiresAt: current.pairExpiresAt };
  }
  return updateConfig((config) => {
    config.pairCode = freshPairCode();
    config.pairExpiresAt = now + PAIR_TTL_MS;
    return { code: config.pairCode, expiresAt: config.pairExpiresAt };
  });
}

export function pairInfo() {
  const config = readConfig();
  if (!config.pairCode || !config.pairExpiresAt || config.pairExpiresAt <= Date.now()) {
    return ensurePairCode();
  }
  return { code: config.pairCode, expiresAt: config.pairExpiresAt };
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    const key = part.slice(0, at).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(at + 1).trim());
  }
  return out;
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${DEVICE_COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Strict`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

export function authenticate(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token || token.length < 20) return null;
  const hash = digest(token);
  const config = readConfig();
  const device = config.devices.find((entry) => safeEqual(entry.tokenHash, hash));
  if (!device) return null;
  const now = Date.now();
  if (!device.lastSeenAt || now - device.lastSeenAt > 5 * 60 * 1000) {
    updateConfig((next) => {
      const found = next.devices.find((entry) => entry.id === device.id);
      if (found) found.lastSeenAt = now;
    });
  }
  return { ...device, token };
}

export function requireAuth(req, res) {
  const device = authenticate(req);
  if (!device) {
    sendJson(res, 401, { error: 'unauthorized', message: '请重新配对这台手机。' });
    return null;
  }
  return device;
}

export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
    'x-content-type-options': 'nosniff',
  });
  res.end(payload);
}

function clientKey(req) {
  return req.socket?.remoteAddress || 'unknown';
}

export function pairDevice(req, body) {
  const key = clientKey(req);
  const now = Date.now();
  const record = attempts.get(key) || { count: 0, resetAt: now + 10 * 60 * 1000 };
  if (record.resetAt <= now) {
    record.count = 0;
    record.resetAt = now + 10 * 60 * 1000;
  }
  if (record.count >= 12) {
    attempts.set(key, record);
    return { ok: false, status: 429, error: '尝试次数过多，请稍后再试。' };
  }
  record.count += 1;
  attempts.set(key, record);

  const code = String(body?.code ?? '').replace(/\D/g, '');
  const config = readConfig();
  if (!config.pairCode || !config.pairExpiresAt || config.pairExpiresAt <= now) {
    return { ok: false, status: 410, error: '配对码已过期，请在电脑上刷新后重试。' };
  }
  if (!safeEqual(code, config.pairCode)) {
    return { ok: false, status: 401, error: '配对码不正确。' };
  }
  if (config.devices.length >= MAX_DEVICES) {
    return { ok: false, status: 409, error: '已连接的设备过多，请先在电脑上移除旧设备。' };
  }

  const token = randomToken();
  const name = String(body?.name || '我的手机').trim().slice(0, 40) || '我的手机';
  const device = {
    id: crypto.randomUUID(),
    name,
    tokenHash: digest(token),
    createdAt: now,
    lastSeenAt: now,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
  };
  updateConfig((next) => {
    next.devices.push(device);
    // A code is single-use by default. The desktop setup page can rotate it.
    next.pairCode = null;
    next.pairExpiresAt = 0;
  });
  return { ok: true, token, device: publicDevice(device) };
}

export function publicDevice(device) {
  return {
    id: device.id,
    name: device.name,
    createdAt: device.createdAt,
    lastSeenAt: device.lastSeenAt || null,
    current: Boolean(device.current),
  };
}

export function listDevices(currentId) {
  const config = readConfig();
  return config.devices.map((device) => publicDevice({ ...device, current: device.id === currentId }));
}

export function revokeDevice(id) {
  let removed = false;
  updateConfig((config) => {
    const before = config.devices.length;
    config.devices = config.devices.filter((device) => device.id !== id);
    removed = config.devices.length !== before;
  });
  return removed;
}

export function revokeCurrent(req) {
  const device = authenticate(req);
  if (!device) return false;
  return revokeDevice(device.id);
}

export function pairUrl(origin, code) {
  return `${origin}/?pair=${encodeURIComponent(code)}`;
}
