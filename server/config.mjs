import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SERVER_DIR, '..');
export const WEB_DIR = path.join(ROOT_DIR, 'web');
export const DATA_DIR = process.env.DSH_POCKET_DATA || path.join(ROOT_DIR, '.pocket');
export const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
export const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
export const CREDENTIALS_PATH = path.join(DSH_HOME, '.credentials.yaml');

const DEFAULT_CONFIG = {
  version: 1,
  pairCode: null,
  pairExpiresAt: 0,
  createdAt: Date.now(),
  devices: [],
};

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

export function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...DEFAULT_CONFIG, ...parsed, devices: Array.isArray(parsed.devices) ? parsed.devices : [] };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config) {
  const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CONFIG_PATH);
}

export function updateConfig(mutator) {
  const config = readConfig();
  const result = mutator(config);
  writeConfig(config);
  return result;
}

export function localAddresses() {
  const found = [];
  for (const [name, infos] of Object.entries(os.networkInterfaces())) {
    for (const info of infos || []) {
      if (info.family === 'IPv4' && !info.internal) {
        found.push({ name, address: info.address });
      }
    }
  }
  const rank = (entry) => {
    const n = entry.name.toLowerCase();
    if (n === 'en0') return 0;
    if (n.startsWith('en')) return 1;
    if (n.startsWith('bridge') || n.startsWith('utun')) return 3;
    return 2;
  };
  return found.sort((a, b) => rank(a) - rank(b));
}

export function isTailscaleIPv4(address) {
  const parts = String(address).split('.').map((part) => Number.parseInt(part, 10));
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

export function tailscaleAddresses() {
  return localAddresses().filter((entry) => isTailscaleIPv4(entry.address));
}

export function primaryLanAddress() {
  const list = localAddresses();
  return list[0]?.address || '127.0.0.1';
}

export function isLoopbackRequest(req) {
  const address = req.socket?.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

export function normalizeOrigin(value) {
  try {
    const url = new URL(String(value));
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function parsePort(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : fallback;
}

export const APP_PORT = parsePort(process.env.DSH_POCKET_PORT, 8797);
export const PROXY_PORT = parsePort(process.env.DSH_POCKET_PROXY_PORT, 8798);
export const BIND_HOST = process.env.DSH_POCKET_HOST || '0.0.0.0';
export const HOST_NAME = os.hostname().replace(/\.local$/i, '');

export function isAllowedHost(req) {
  const raw = String(req.headers.host || '').toLowerCase();
  if (!raw) return false;
  let hostname = raw;
  if (hostname.startsWith('[')) {
    const end = hostname.indexOf(']');
    hostname = end >= 0 ? hostname.slice(1, end) : hostname;
  } else {
    hostname = hostname.split(':')[0];
  }
  const allowed = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    HOST_NAME.toLowerCase(),
    `${HOST_NAME.toLowerCase()}.local`,
    ...localAddresses().map((entry) => entry.address.toLowerCase()),
  ]);
  for (const extra of String(process.env.DSH_POCKET_TRUSTED_HOSTS || '').split(',')) {
    const value = extra.trim().toLowerCase();
    if (value) allowed.add(value);
  }
  return allowed.has(hostname);
}
