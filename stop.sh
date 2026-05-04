#!/bin/bash

# Galaxy Bot 停止脚本
# 关闭所有服务和终端窗口

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/.galaxy-bot.pids"

echo -e "${BLUE}Galaxy Bot 停止脚本${NC}"
echo -e "${BLUE}=================${NC}\n"

# 按端口查找并杀死进程
kill_by_port() {
    local port=$1
    local name=$2
    
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pids=$(lsof -Pi :"$port" -sTCP:LISTEN -t)
        echo -e "${YELLOW}关闭 $name (端口 $port)${NC}"
        for pid in $pids; do
            kill -15 "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
        done
    else
        echo -e "${BLUE}$name (端口 $port) 未运行${NC}"
    fi
}

# 关闭 macOS Terminal 窗口（通过标题）
close_macos_terminals() {
    if command -v osascript >/dev/null 2>&1; then
        echo -e "${YELLOW}关闭 Terminal 窗口...${NC}"
        osascript <<EOF 2>/dev/null || true
tell application "Terminal"
    set windowList to every window
    repeat with aWindow in windowList
        set windowTitle to custom title of aWindow
        if windowTitle is in {"MLX Service", "Backend", "Frontend"} then
            close aWindow
        end if
    end repeat
end tell
EOF
    fi
}

# 关闭 Linux 终端进程
close_linux_terminals() {
    local terminal_type=$1
    
    echo -e "${YELLOW}关闭终端窗口...${NC}"
    
    # 尝试从 PID 文件读取
    if [ -f "$PID_FILE" ]; then
        local first_line=$(head -1 "$PID_FILE")
        for pid in $first_line; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -15 "$pid" 2>/dev/null || true
            fi
        done
        rm -f "$PID_FILE"
    fi
    
    # 额外：通过进程名查找并关闭
    case "$terminal_type" in
        "gnome-terminal")
            # 查找包含项目路径的 gnome-terminal 进程
            pkill -f "gnome-terminal.*galaxy-bot" 2>/dev/null || true
            ;;
        "konsole")
            pkill -f "konsole.*galaxy-bot" 2>/dev/null || true
            ;;
        "xterm")
            pkill -f "xterm.*galaxy-bot" 2>/dev/null || true
            ;;
    esac
}

# 主程序

# 1. 关闭各端口服务
echo -e "${BLUE}关闭服务进程...${NC}"
kill_by_port 5173 "Frontend"
kill_by_port 3001 "Backend"
kill_by_port 8830 "MLX Service"

# 等待进程退出
sleep 1

# 2. 关闭终端窗口
if [[ "$OSTYPE" == "darwin"* ]]; then
    close_macos_terminals
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # 尝试从 PID 文件读取终端类型
    terminal_type=""
    if [ -f "$PID_FILE" ]; then
        terminal_type=$(sed -n '2p' "$PID_FILE" 2>/dev/null)
    fi
    close_linux_terminals "$terminal_type"
fi

# 3. 清理残留进程（确保）
echo -e "${BLUE}清理残留进程...${NC}"

# 查找并关闭 Python mlx-service 进程
pkill -f "python.*mlx-service/app.py" 2>/dev/null || true

# 查找并关闭 npm run dev 进程
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite dev" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true

# 清理 PID 文件
rm -f "$PID_FILE"

echo -e "\n${GREEN}=================================${NC}"
echo -e "${GREEN}所有服务和终端已关闭${NC}"
echo -e "${GREEN}=================================${NC}\n"
