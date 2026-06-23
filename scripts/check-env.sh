#!/bin/bash

# ============================================================
# net4.xyz 环境检查脚本 (Linux/Mac)
# ============================================================
# 用法: bash scripts/check-env.sh
#
# 说明:
#   检查开发环境所有必要工具和配置是否就绪:
#   - Python 3.10+
#   - Node.js 18+
#   - pnpm
#   - Docker
#   - .env 配置文件
#   - 项目依赖
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}         net4.xyz 开发环境检查 (Linux/Mac)                 ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "  ${GREEN}[PASS]${NC} $1"
}

check_fail() {
    echo -e "  ${RED}[FAIL]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "  ${YELLOW}[WARN]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# ---- Python ----
echo -e "${YELLOW}[Python]${NC}"

if command -v python3 &> /dev/null; then
    PY_VER=$(python3 --version 2>&1)
    PY_MAJOR=$(echo "$PY_VER" | awk '{print $2}' | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | awk '{print $2}' | cut -d. -f2)
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 10 ]; then
        check_pass "$PY_VER (>= 3.10)"
    else
        check_fail "$PY_VER (需要 >= 3.10)"
    fi
else
    check_fail "未安装 python3"
fi

# Python venv
VENV_DIR="$PROJECT_ROOT/packages/ai-engine/venv"
if [ -d "$VENV_DIR" ]; then
    check_pass "虚拟环境存在 ($VENV_DIR)"
else
    check_warn "虚拟环境不存在 ($VENV_DIR)，建议创建: python3 -m venv $VENV_DIR"
fi

# ---- Node.js ----
echo ""
echo -e "${YELLOW}[Node.js]${NC}"

if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VER" | sed 's/^v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_pass "$NODE_VER (>= 18)"
    else
        check_fail "$NODE_VER (需要 >= 18)"
    fi
else
    check_fail "未安装 Node.js"
fi

# ---- pnpm ----
echo ""
echo -e "${YELLOW}[pnpm]${NC}"

if command -v pnpm &> /dev/null; then
    PNPM_VER=$(pnpm --version)
    check_pass "pnpm $PNPM_VER"
else
    check_fail "未安装 pnpm (npm install -g pnpm)"
fi

# ---- Docker ----
echo ""
echo -e "${YELLOW}[Docker]${NC}"

if command -v docker &> /dev/null; then
    DOCKER_VER=$(docker --version)
    if docker ps &> /dev/null; then
        check_pass "$DOCKER_VER (运行中)"
    else
        check_warn "$DOCKER_VER (未运行)"
    fi
else
    check_warn "未安装 Docker (可选)"
fi

if command -v docker-compose &> /dev/null; then
    DC_VER=$(docker-compose --version)
    check_pass "$DC_VER"
elif docker compose version &> /dev/null; then
    check_pass "docker compose $(docker compose version --short)"
else
    check_warn "未安装 docker-compose (可选)"
fi

# ---- 项目配置 ----
echo ""
echo -e "${YELLOW}[项目配置]${NC}"

# .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    check_pass ".env 文件存在"
else
    check_warn ".env 文件不存在，请参考 .env.example 创建"
fi

# packages
if [ -f "$PROJECT_ROOT/pnpm-workspace.yaml" ]; then
    check_pass "pnpm workspace 配置存在"
else
    check_fail "pnpm-workspace.yaml 不存在"
fi

# node_modules
if [ -d "$PROJECT_ROOT/node_modules" ]; then
    check_pass "node_modules 已安装"
else
    check_warn "node_modules 不存在，请运行 pnpm install"
fi

# ai-engine requirements
AI_REQ="$PROJECT_ROOT/packages/ai-engine/requirements.txt"
if [ -f "$AI_REQ" ]; then
    check_pass "AI 引擎 requirements.txt 存在"
else
    check_fail "AI 引擎 requirements.txt 不存在"
fi

# ---- 总结 ----
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}                         检查结果                             ${NC}"
echo -e "${CYAN}============================================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}所有检查通过，环境已就绪！${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}${WARNINGS} 个警告，建议处理后再开发${NC}"
else
    echo -e "${RED}${ERRORS} 个错误，${WARNINGS} 个警告${NC}"
    echo -e "${RED}请先修复错误项${NC}"
    exit 1
fi
