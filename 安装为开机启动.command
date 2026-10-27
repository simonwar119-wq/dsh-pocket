#!/bin/zsh
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
RUNTIME="$HOME/Library/Application Support/DSH-Pocket"
NODE="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node"
if [[ ! -x "$NODE" ]]; then NODE="$(command -v node || true)"; fi
if [[ -z "$NODE" || ! -x "$NODE" ]]; then
  echo "没有找到 Node.js。"
  exit 1
fi
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs"
mkdir -p "$AGENTS" "$LOGS" "$RUNTIME/.pocket"
chmod 700 "$RUNTIME/.pocket"
# macOS blocks launchd processes from reading the Desktop. Keep a runtime copy in
# Application Support; the editable source may stay anywhere.
rsync -a --exclude ".pocket" "$ROOT/" "$RUNTIME/"

cat > "$AGENTS/com.dshpocket.server.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dshpocket.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$RUNTIME/server/index.mjs</string>
    <string>--no-open</string>
  </array>
  <key>WorkingDirectory</key><string>$RUNTIME</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOGS/DSH-Pocket.log</string>
  <key>StandardErrorPath</key><string>$LOGS/DSH-Pocket.error.log</string>
</dict>
</plist>
PLIST

cat > "$AGENTS/com.dshpocket.dsh.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dshpocket.dsh</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/open</string>
    <string>-a</string>
    <string>/Applications/DeepSeek Harness.app</string>
  </array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
PLIST

cat > "$AGENTS/com.dshpocket.caffeinate.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dshpocket.caffeinate</string>
  <key>ProgramArguments</key>
  <array><string>/usr/bin/caffeinate</string><string>-s</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOGS/DSH-Pocket.caffeinate.log</string>
  <key>StandardErrorPath</key><string>$LOGS/DSH-Pocket.caffeinate.error.log</string>
</dict>
</plist>
PLIST

for JOB in com.dshpocket.server com.dshpocket.dsh com.dshpocket.caffeinate; do
  launchctl bootout "gui/$(id -u)/$JOB" 2>/dev/null || true
done
# 先停掉可能手动启动的桥接进程，避免端口占用导致 KeepAlive 反复重启。
PIDS=$(lsof -ti tcp:8797 2>/dev/null || true)
for PID in $PIDS; do
  COMMAND=$(ps -p "$PID" -o command= 2>/dev/null || true)
  if [[ "$COMMAND" == *"server/index.mjs"* ]]; then kill "$PID" 2>/dev/null || true; fi
done
sleep 1
for JOB in com.dshpocket.server com.dshpocket.dsh com.dshpocket.caffeinate; do
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/$JOB.plist"
done
echo "已安装常驻运行："
echo "  · 桥接服务开机启动"
echo "  · DeepSeek Harness 登录后自动打开"
echo "  · 插电时保持系统唤醒"
echo "运行目录：$RUNTIME"
echo "打开 http://127.0.0.1:8797/setup 查看配对二维码。"
read -r "?按回车关闭…"
