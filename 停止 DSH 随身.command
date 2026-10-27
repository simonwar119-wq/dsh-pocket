#!/bin/zsh
PORT="${DSH_POCKET_PORT:-8797}"
PIDS=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [[ -z "$PIDS" ]]; then
  echo "DSH 随身没有在运行。"
else
  for PID in $PIDS; do
    COMMAND=$(ps -p "$PID" -o command= 2>/dev/null || true)
    if [[ "$COMMAND" == *"server/index.mjs"* ]]; then
      kill "$PID" 2>/dev/null && echo "已停止 DSH 随身（PID $PID）。"
    else
      echo "端口 $PORT 被其他程序占用，未停止：$COMMAND"
    fi
  done
fi
read -r "?按回车关闭…"
