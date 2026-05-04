#!/bin/bash

# 进入项目目录（可选）
cd "$(dirname "$0")"

# 激活 venv
source mlx-env/bin/activate

# 启动 FastAPI 服务
uvicorn app:app \
  --host 0.0.0.0 \
  --port 8830 \
  --reload