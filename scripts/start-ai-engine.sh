#!/bin/bash

# ============================================================
# net4.xyz AI 引擎启动脚本 (Linux/Mac)
# ============================================================
# 用法: bash scripts/start-ai-engine.sh [--prod]
#
# 参数:
#   --prod    以生产模式启动 (绑定 0.0.0.0:8000)
#
# 说明:
#   1. 检查 Python 3.10+ 环境
#   2. 激活虚拟环境 (如存在)
#   3. 检查并安装依赖
#   4. 启动 FastAPI 服务 (uvicorn)
#
# 开发模式: http://localhost:8000 (热重载)
# 生产模式: http://0.0.0.0:8000
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AI_ENGINE_DIR="$PROJECT_ROOT/packages/ai-engine"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}         net4.xyz AI 引擎启动脚本 (Linux/Mac)              ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ---- 检查 Python 环境 ----
echo -e "${YELLOW}[1/4] 检查 Python 环境...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}未找到 python3，请安装 Python 3.10+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}Python 版本: ${PYTHON_VERSION}${NC}"

# 检查版本 >= 3.10
MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]; }; then
    echo -e "${RED}需要 Python 3.10+，当前版本: ${PYTHON_VERSION}${NC}"
    exit 1
fi

# ---- 激活虚拟环境 ----
echo -e "${YELLOW}[2/4] 配置 Python 环境...${NC}"

VENV_DIR="$AI_ENGINE_DIR/venv"
if [ -d "$VENV_DIR" ]; then
    echo -e "${GREEN}激活虚拟环境: ${VENV_DIR}${NC}"
    source "$VENV_DIR/bin/activate"
    PYTHON_CMD="python"
else
    echo -e "${YELLOW}未找到虚拟环境，使用系统 Python${NC}"
    PYTHON_CMD="python3"
fi

# ---- 检查依赖 ----
echo -e "${YELLOW}[3/4] 检查依赖...${NC}"

cd "$AI_ENGINE_DIR"

if [ "$PYTHON_CMD" == "python" ]; then
    if ! python -c "import fastapi" 2>/dev/null; then
        echo -e "${YELLOW}安装依赖中...${NC}"
        pip install -r requirements.txt
    else
        echo -e "${GREEN}依赖已就绪${NC}"
    fi
else
    if ! python3 -c "import fastapi" 2>/dev/null; then
        echo -e "${YELLOW}安装依赖中... (建议先创建虚拟环境: python3 -m venv packages/ai-engine/venv)${NC}"
        pip3 install -r requirements.txt
    else
        echo -e "${GREEN}依赖已就绪${NC}"
    fi
fi

# ---- 启动服务 ----
echo -e "${YELLOW}[4/4] 启动 AI 引擎服务...${NC}"
echo ""

PROD_MODE=false
for arg in "$@"; do
    if [ "$arg" == "--prod" ]; then
        PROD_MODE=true
    fi
done

if [ "$PROD_MODE" = true ]; then
    echo -e "${CYAN}生产模式: http://0.0.0.0:8000${NC}"
    echo -e "${CYAN}API 文档: http://localhost:8000/docs${NC}"
    echo ""
    $PYTHON_CMD -m uvicorn src.main:app --host 0.0.0.0 --port 8000
else
    echo -e "${CYAN}开发模式 (热重载): http://localhost:8000${NC}"
    echo -e "${CYAN}API 文档: http://localhost:8000/docs${NC}"
    echo ""
    $PYTHON_CMD -m uvicorn src.main:app --reload
fi
