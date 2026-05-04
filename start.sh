#!/bin/bash

# Galaxy Bot 启动脚本（多终端窗口版）
# 为每个服务新开一个终端窗口，方便查看日志

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 存储终端窗口进程 PID
TERMINAL_PIDS=()

# 检测操作系统和可用的终端
 detect_terminal() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v osascript >/dev/null 2>&1; then
            echo "osascript"
        else
            echo -e "${RED}错误：macOS 需要 osascript (AppleScript)${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v gnome-terminal >/dev/null 2>&1; then
            echo "gnome-terminal"
        elif command -v konsole >/dev/null 2>&1; then
            echo "konsole"
        elif command -v xterm >/dev/null 2>&1; then
            echo "xterm"
        else
            echo -e "${RED}错误：未找到支持的终端 (gnome-terminal/konsole/xterm)${NC}"
            exit 1
        fi
    else
        echo -e "${RED}错误：不支持的操作系统: $OSTYPE${NC}"
        exit 1
    fi
}

# 在新终端窗口中运行命令
run_in_terminal() {
    local title=$1
    local command=$2
    local terminal=$3

    case "$terminal" in
        "osascript")
            # macOS Terminal.app
            osascript <<EOF &
tell application "Terminal"
    do script "cd '$PROJECT_DIR' && echo '=== $title ===' && $command; exec bash"
    set custom title of front window to "$title"
end tell
EOF
            ;;
        "gnome-terminal")
            gnome-terminal --title="$title" -- bash -c "cd '$PROJECT_DIR' && echo '=== $title ===' && $command; exec bash" &
            ;;
        "konsole")
            konsole --new-tab --title="$title" -e bash -c "cd '$PROJECT_DIR' && echo '=== $title ===' && $command; exec bash" &
            ;;
        "xterm")
            xterm -title "$title" -e bash -c "cd '$PROJECT_DIR' && echo '=== $title ===' && $command; exec bash" &
            ;;
    esac
    
    TERMINAL_PIDS+=($!)
    sleep 1
}

# 保存终端 PID 到文件，供 stop.sh 使用
save_pids() {
    local pid_file="$PROJECT_DIR/.galaxy-bot.pids"
    echo "${TERMINAL_PIDS[*]}" > "$pid_file"
    echo "$terminal_type" >> "$pid_file"
}

# 主程序
echo -e "${BLUE}Galaxy Bot 启动器${NC}"
echo -e "${BLUE}=================${NC}\n"

# 检测终端类型
terminal_type=$(detect_terminal)
echo -e "检测到终端: ${GREEN}$terminal_type${NC}\n"

# 启动 MLX Service
echo -e "${YELLOW}启动 MLX Service (端口 8830)...${NC}"
if [ -f "$PROJECT_DIR/mlx-service/mlx-env/bin/activate" ]; then
    run_in_terminal "MLX Service" "cd mlx-service && source mlx-env/bin/activate && uvicorn app:app --host 0.0.0.0 --port 8830 --reload" "$terminal_type"
else
    run_in_terminal "MLX Service" "cd mlx-service && uvicorn app:app --host 0.0.0.0 --port 8830 --reload" "$terminal_type"
fi

# 等待 MLX 启动
sleep 3

# 启动 Backend
echo -e "${YELLOW}启动 Backend (端口 3001)...${NC}"
run_in_terminal "Backend" "cd backend && npm run dev" "$terminal_type"

# 等待 Backend 启动
sleep 2

# 启动 Frontend
echo -e "${YELLOW}启动 Frontend (端口 5173)...${NC}"
run_in_terminal "Frontend" "cd frontend && npm run dev" "$terminal_type"

# 保存 PID
save_pids

# 等待所有服务启动
sleep 3

echo -e "\n${GREEN}=================================${NC}"
echo -e "${GREEN}所有服务已启动！${NC}"
echo -e "${GREEN}=================================${NC}"
echo -e "  Frontend: ${YELLOW}http://localhost:5173${NC}"
echo -e "  Backend:  ${YELLOW}http://localhost:3001${NC}"
echo -e "  MLX:      ${YELLOW}http://localhost:8830${NC}"
echo -e "${GREEN}=================================${NC}"
echo -e "\n运行 ${YELLOW}./stop.sh${NC} 关闭所有服务和终端窗口\n"

# 保持脚本运行，捕获 Ctrl+C
trap 'echo -e "\n${BLUE}使用 ./stop.sh 来关闭服务${NC}"' SIGINT
wait
