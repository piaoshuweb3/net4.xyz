#!/bin/bash

# ============================================================
# net4.xyz Node Client 构建脚本 (Linux/Mac)
# ============================================================
# 用法: bash scripts/build-node-client.sh [--platform <win|mac|linux>]
#
# 参数:
#   --platform <win|mac|linux>   指定构建平台 (默认: 当前系统)
#
# 说明:
#   1. 检查 Node.js 环境
#   2. 检查 pnpm
#   3. 安装依赖 (如需要)
#   4. TypeScript 编译
#   5. Electron 构建
#
# 构建产物输出到: packages/node-client/release/
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
echo -e "${CYAN}         net4.xyz Node Client 构建脚本 (Linux/Mac)         ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ---- 解析参数 ----
PLATFORM=""
for arg in "$@"; do
    case "$arg" in
        --platform)
            shift
            PLATFORM="$1"
            ;;
    esac
done

# ---- 检查 Node.js ----
echo -e "${YELLOW}[1/4] 检查 Node.js 环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}未找到 Node.js，请安装 Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}Node.js 版本: ${NODE_VERSION}${NC}"

# ---- 检查 pnpm ----
echo -e "${YELLOW}[2/4] 检查 pnpm...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}未找到 pnpm，正在安装...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}pnpm 版本: $(pnpm --version)${NC}"

# ---- 安装依赖 ----
echo -e "${YELLOW}[3/4] 检查依赖...${NC}"
cd "$PROJECT_ROOT"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装项目依赖...${NC}"
    pnpm install
else
    echo -e "${GREEN}依赖已就绪${NC}"
fi

# ---- 构建项目 ----
echo -e "${YELLOW}[4/4] 构建 Node Client...${NC}"
echo ""

cd "$NODE_CLIENT_DIR"

# 清理旧的构建产物
if [ -d "dist" ]; then
    echo -e "${YELLOW}清理旧构建...${NC}"
    rm -rf dist
fi

# 根据平台选择构建命令
case "$PLATFORM" in
    win)
        echo -e "${CYAN}构建 Windows 版本...${NC}"
        pnpm build:win
        ;;
    mac)
        echo -e "${CYAN}构建 macOS 版本...${NC}"
        pnpm build:mac
        ;;
    linux)
        echo -e "${CYAN}构建 Linux 版本...${NC}"
        pnpm build:linux
        ;;
    *)
        echo -e "${CYAN}构建当前平台版本...${NC}"
        pnpm build
        ;;
esac

echo ""
echo -e "${GREEN}构建完成！${NC}"
echo -e "${GREEN}输出目录: ${NODE_CLIENT_DIR}/release/${NC}"
