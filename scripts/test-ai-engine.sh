#!/bin/bash

# ============================================================
# net4.xyz AI 引擎测试脚本 (Linux/Mac)
# ============================================================
# 用法: bash scripts/test-ai-engine.sh [--cov] [--verbose] [--file <test_file>]
#
# 参数:
#   --cov         显示测试覆盖率报告
#   --verbose     详细输出模式 (-vv)
#   --file <path> 运行指定测试文件
#
# 说明:
#   1. 检查 Python 环境
#   2. 激活虚拟环境 (如存在)
#   3. 运行 pytest 测试
#   4. (可选) 显示覆盖率报告
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
echo -e "${CYAN}         net4.xyz AI 引擎测试脚本 (Linux/Mac)              ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ---- 解析参数 ----
SHOW_COV=false
VERBOSE=""
TEST_FILE=""

for arg in "$@"; do
    case "$arg" in
        --cov)   SHOW_COV=true ;;
        --verbose) VERBOSE="-vv" ;;
        --file)
            shift
            TEST_FILE="$1"
            ;;
    esac
done

# ---- 检查 Python 环境 ----
echo -e "${YELLOW}[1/3] 检查 Python 环境...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}未找到 python3，请安装 Python 3.10+${NC}"
    exit 1
fi

# ---- 激活虚拟环境 ----
echo -e "${YELLOW}[2/3] 配置 Python 环境...${NC}"

VENV_DIR="$AI_ENGINE_DIR/venv"
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi

cd "$AI_ENGINE_DIR"

# ---- 运行测试 ----
echo -e "${YELLOW}[3/3] 运行测试...${NC}"
echo ""

PYTEST_ARGS="$VERBOSE"

if [ -n "$TEST_FILE" ]; then
    PYTEST_ARGS="$PYTEST_ARGS $TEST_FILE"
else
    PYTEST_ARGS="$PYTEST_ARGS tests/"
fi

if [ "$SHOW_COV" = true ]; then
    echo -e "${CYAN}运行测试并生成覆盖率报告...${NC}"
    $PYTHON_CMD -m pytest $PYTEST_ARGS --cov=src --cov-report=term-missing --cov-report=html
    echo ""
    echo -e "${GREEN}HTML 覆盖率报告: ${AI_ENGINE_DIR}/htmlcov/index.html${NC}"
else
    $PYTHON_CMD -m pytest $PYTEST_ARGS
fi

# ---- 结果 ----
echo ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
else
    echo -e "${RED}测试失败，请检查输出${NC}"
    exit 1
fi
