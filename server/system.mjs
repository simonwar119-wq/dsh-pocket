import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT_DIR } from './config.mjs';

const execFileAsync = promisify(execFile);
const HELPER = path.join(ROOT_DIR, 'bin', 'dsh-pocket-input');
const SOURCE = path.join(ROOT_DIR, 'native', 'input.swift');
const TMP = path.join(os.tmpdir(), 'dsh-pocket');
fs.mkdirSync(TMP, { recursive: true, mode: 0o700 });

let cache = { at: 0, value: null };
let screenCache = { at: 0, buffer: null, info: null };
let volumeCache = { at: 0, value: null };
let frontCache = { at: 0, value: null };
let infoCache = { at: 0, value: null };
let helperBuilding = null;

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: 6000,
      maxBuffer: 2 * 1024 * 1024,
      ...options,
    });
    return String(result.stdout || '').trim();
  } catch (error) {
    if (error.stdout) return String(error.stdout).trim();
    throw error;
  }
}

export async function ensureHelper() {
  if (process.platform !== 'darwin') throw new Error('远程控制目前仅支持 macOS');
  if (fs.existsSync(HELPER)) return HELPER;
  if (helperBuilding) return helperBuilding;
  helperBuilding = (async () => {
    await run('/usr/bin/xcrun', ['swiftc', '-O', SOURCE, '-o', HELPER], { timeout: 120000 });
    fs.chmodSync(HELPER, 0o755);
    return HELPER;
  })().finally(() => { helperBuilding = null; });
  return helperBuilding;
}

async function helper(command, args = []) {
  await ensureHelper();
  const output = await run(HELPER, [command, ...args], { timeout: 8000 });
  const line = output.split('\n').filter(Boolean).pop() || '{}';
  try { return JSON.parse(line); } catch { return { ok: false, error: output }; }
}

export async function screenInfo({ fresh = false } = {}) {
  if (!fresh && Date.now() - infoCache.at < 2500 && infoCache.value) return infoCache.value;
  try {
    const info = await helper('info');
    infoCache = { at: Date.now(), value: info };
    return info;
  } catch (error) {
    return {
      ok: false,
      trusted: false,
      width: 1440,
      height: 900,
      error: error.message,
      frontmost: '',
    };
  }
}

export async function screenshot({ width = 1500, quality = 62 } = {}) {
  if (Date.now() - screenCache.at < 650 && screenCache.buffer) return screenCache;
  const raw = path.join(TMP, `screen-${process.pid}.jpg`);
  await run('/usr/sbin/screencapture', ['-x', '-t', 'jpg', raw], { timeout: 10000 });
  if (!fs.existsSync(raw)) throw new Error('截屏失败：请给运行 DSH 的应用授予“屏幕录制”权限');
  const info = await screenInfo({ fresh: true });
  const targetWidth = Math.max(480, Math.min(2200, Number(width) || 1500));
  try {
    await run('/usr/bin/sips', ['-Z', String(targetWidth), '-s', 'formatOptions', String(quality), raw], { timeout: 8000 });
  } catch { /* keep original size */ }
  const buffer = await fs.promises.readFile(raw);
  const meta = await run('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', raw]).catch(() => '');
  const w = Number(meta.match(/pixelWidth:\s*(\d+)/)?.[1] || info.pixelWidth || 0);
  const h = Number(meta.match(/pixelHeight:\s*(\d+)/)?.[1] || info.pixelHeight || 0);
  fs.promises.unlink(raw).catch(() => {});
  screenCache = {
    at: Date.now(),
    buffer,
    info: {
      imageWidth: w,
      imageHeight: h,
      screenWidth: Number(info.width) || 1440,
      screenHeight: Number(info.height) || 900,
      frontmost: info.frontmost || '',
      trusted: Boolean(info.trusted),
      capturedAt: Date.now(),
    },
  };
  return screenCache;
}

async function frontmostApp() {
  if (Date.now() - frontCache.at < 5000 && frontCache.value) return frontCache.value;
  try {
    const name = await run('/usr/bin/osascript', ['-e', 'tell application "System Events" to get name of first process whose frontmost is true']);
    frontCache = { at: Date.now(), value: name };
    return name;
  } catch {
    return '';
  }
}

async function volume() {
  if (Date.now() - volumeCache.at < 5000) return volumeCache.value;
  try {
    const output = await run('/usr/bin/osascript', ['-e', 'get volume settings']);
    const level = Number(output.match(/output volume:(\d+)/)?.[1] || 0);
    const muted = /output muted:true/.test(output);
    volumeCache = { at: Date.now(), value: { level, muted } };
    return volumeCache.value;
  } catch {
    return { level: 0, muted: false };
  }
}

export async function stats() {
  if (Date.now() - cache.at < 2000 && cache.value) return cache.value;
  const cpus = os.cpus();
  const load = os.loadavg()[0];
  const total = os.totalmem();
  const vmRaw = await run('/usr/bin/vm_stat', []).catch(() => '');
  const pageSize = Number(vmRaw.match(/page size of (\d+) bytes/)?.[1] || 16384);
  const pages = (label) => Number(vmRaw.match(new RegExp(`${label}:\\s+(\\d+)`))?.[1] || 0);
  const active = pages('Pages active');
  const wired = pages('Pages wired down');
  const compressed = pages('Pages occupied by compressor');
  const freePages = pages('Pages free');
  const inactive = pages('Pages inactive');
  const speculative = pages('Pages speculative');
  const used = (active + wired + compressed) * pageSize;
  const free = Math.max(0, (freePages + inactive + speculative) * pageSize);
  const uptime = os.uptime();
  const batteryRaw = await run('/usr/bin/pmset', ['-g', 'batt']).catch(() => '');
  const batteryLevel = Number(batteryRaw.match(/(\d+)%/)?.[1] || 0);
  const charging = /AC Power|charging|charged/i.test(batteryRaw);
  const diskRaw = await run('/bin/df', ['-k', '/']).catch(() => '');
  const diskMatch = diskRaw.split('\n')[1]?.trim().split(/\s+/) || [];
  const diskTotal = Number(diskMatch[1] || 0) * 1024;
  const diskFree = Number(diskMatch[3] || 0) * 1024;
  const front = await frontmostApp();
  const vol = await volume();
  const value = {
    hostname: os.hostname().replace(/\.local$/i, ''),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptime,
    cpu: {
      cores: cpus.length,
      load1: Math.round(load * 100) / 100,
      percent: Math.min(100, Math.round((load / Math.max(1, cpus.length)) * 100)),
      model: cpus[0]?.model?.trim() || '',
    },
    memory: {
      total,
      used,
      free,
      percent: Math.round((used / total) * 100),
    },
    disk: {
      total: diskTotal,
      free: diskFree,
      used: Math.max(0, diskTotal - diskFree),
      percent: diskTotal ? Math.round(((diskTotal - diskFree) / diskTotal) * 100) : 0,
    },
    battery: {
      percent: batteryLevel,
      charging,
      present: Boolean(batteryLevel),
    },
    volume: vol,
    frontmost: front,
    time: Date.now(),
  };
  cache = { at: Date.now(), value };
  return value;
}

export async function screenPayload() {
  const shot = await screenshot();
  const info = await screenInfo();
  return { ...shot.info, trusted: Boolean(info.trusted), screenWidth: Number(info.width), screenHeight: Number(info.height) };
}

export async function remoteInput(input) {
  const kind = String(input?.kind || '');
  const info = await screenInfo({ fresh: true });
  if (!info.trusted) {
    const error = new Error('需要 macOS“辅助功能”权限才能控制鼠标和键盘');
    error.code = 'accessibility';
    throw error;
  }
  if (kind === 'click' || kind === 'doubleclick' || kind === 'rightclick') {
    const x = clamp(Number(input.x), 0, 1) * Number(info.width);
    const y = clamp(Number(input.y), 0, 1) * Number(info.height);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('点击坐标无效');
    return helper(kind, [String(Math.round(x)), String(Math.round(y))]);
  }
  if (kind === 'scroll') {
    const dx = clamp(Number(input.dx) || 0, -2000, 2000);
    const dy = clamp(Number(input.dy) || 0, -2000, 2000);
    return helper('scroll', [String(Math.round(dx)), String(Math.round(dy))]);
  }
  if (kind === 'type') {
    const text = String(input.text || '').slice(0, 12000);
    if (!text) throw new Error('没有输入内容');
    return helper('type', [text]);
  }
  if (kind === 'key') {
    const key = String(input.key || '');
    if (!/^[a-z0-9+_\-]+$/i.test(key) || key.length > 40) throw new Error('按键格式无效');
    return helper('key', [key]);
  }
  if (kind === 'activate') {
    const app = String(input.app || '').slice(0, 120);
    if (!app) throw new Error('应用名称不能为空');
    return helper('activate', [app]);
  }
  throw new Error('未知的远程控制类型');
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export async function runningApps() {
  try {
    const output = await run('/usr/bin/osascript', ['-e', 'tell application "System Events" to get name of every process whose background only is false']);
    return output.split(',').map((name) => name.trim()).filter(Boolean).slice(0, 60);
  } catch {
    return [];
  }
}

async function systemEvents(script) {
  return run('/usr/bin/osascript', ['-e', script], { timeout: 10000 });
}

export async function action(name) {
  switch (name) {
    case 'lock':
      await systemEvents('tell application "System Events" to keystroke "q" using {command down, control down}');
      return { ok: true, message: '已锁定屏幕' };
    case 'sleep':
      await run('/usr/bin/pmset', ['sleepnow']);
      return { ok: true, message: '电脑正在休眠' };
    case 'screenshot': {
      const target = path.join(os.homedir(), 'Desktop', `DSH 随身截屏 ${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`);
      await run('/usr/sbin/screencapture', ['-x', target]);
      return { ok: true, message: '截屏已保存到桌面', path: target };
    }
    case 'mute': {
      const current = await volume();
      const next = !current.muted;
      await systemEvents(`set volume output muted ${next ? 'true' : 'false'}`);
      volumeCache.at = 0;
      return { ok: true, message: next ? '已静音' : '已取消静音' };
    }
    case 'volume-up':
    case 'volume-down': {
      const current = await volume();
      const delta = name === 'volume-up' ? 10 : -10;
      const next = Math.max(0, Math.min(100, current.level + delta));
      await systemEvents(`set volume output volume ${next}`);
      volumeCache.at = 0;
      return { ok: true, message: `音量 ${next}%` };
    }
    case 'mission-control':
      await run('/usr/bin/open', ['-a', 'Mission Control']);
      return { ok: true, message: '已打开调度中心' };
    case 'show-desktop':
      await systemEvents('tell application "System Events" to key code 103');
      return { ok: true, message: '已显示桌面' };
    default:
      throw new Error('不支持的系统操作');
  }
}

