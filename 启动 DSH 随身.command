#!/bin/zsh
set -e
cd "$(dirname "$0")"
NODE="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
if [[ ! -x "$NODE" ]]; then
  NODE="$(command -v node || true)"
fi
if [[ -z "$NODE" || ! -x "$NODE" ]]; then
  echo "没有找到可用的 Node.js。请先安装/打开 DeepSeek Harness，或安装 Node.js 22+。"
  read -r "?按回车退出…"
  exit 1
fi
PORT="${DSH_POCKET_PORT:-8797}"
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  open "http://127.0.0.1:$PORT/setup"
  exit 0
fi
exec "$NODE" server/index.mjs "$@"
