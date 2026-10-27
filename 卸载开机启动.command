#!/bin/zsh
for JOB in com.dshpocket.server com.dshpocket.dsh com.dshpocket.caffeinate; do
  launchctl bootout "gui/$(id -u)/$JOB" 2>/dev/null || true
  rm -f "$HOME/Library/LaunchAgents/$JOB.plist"
done
echo "已移除 DSH 随身开机启动、DSH 自启动和常驻唤醒。"
read -r "?按回车关闭…"
