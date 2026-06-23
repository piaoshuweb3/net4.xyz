#!/bin/bash

# ============================================================
# net4.xyz Node Client 启动脚本 (Linux/Mac)
# ============================================================
# 用法: bash scripts/start-node-client.sh
#
# 说明:
#   1. 检查 Node.js 18+ 环境
#   2. 检查 pnpm
#   3. 安装依赖 (如需要)
#   4. 启动 Electron 开发模式
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_CLIENT_DIR="$PROJECT_ROOT/packages/node-client"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}         net4.xyz Node Client 启动脚本 (Linux/Mac)        ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ---- 检查 Node.js ----
echo -e "${YELLOW}[1/4] 检查 Node.js 环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}未找到 Node.js，请安装 Node.js 18+${NC}"
    echo -e "${YELLOW}推荐: https://nodejs.org/ 或 nvm install 18${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}Node.js 版本: ${NODE_VERSION}${NC}"

MAJOR=$(echo "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
    echo -e "${RED}需要 Node.js 18+，当前版本: ${NODE_VERSION}${NC}"
    exit 1
fi

# ---- 检查 pnpm ----
echo -e "${YELLOW}[2/4] 检查 pnpm...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}未找到 pnpm，正在安装...${NC}"
    npm install -g pnpm
fi

PNPM_VERSION=$(pnpm --version)
echo -e "${GREEN}pnpm 版本: ${PNPM_VERSION}${NC}"

# ---- 安装依赖 ----
echo -e "${YELLOW}[3/4] 检查依赖...${NC}"
cd "$PROJECT_ROOT"

if [ ! -d "node_modules" ] || [ ! -d "$NODE_CLIENT_DIR/node_modules" ]; then
    echo -e "${YELLOW}安装项目依赖 (pnpm install)...${NC}"
    pnpm install
else
    echo -e "${GREEN}依赖已就绪${NC}"
fi

# ---- 启动 Electron ----
echo -e "${YELLOW}[4/4] 启动 Node Client (Electron 开发模式)...${NC}"
echo ""
echo -e "${CYAN}net4.xyz 节点客户端正在启动...${NC}"
echo ""

cd "$NODE_CLIENT_DIR"
pnpm dev
