#!/bin/bash

# net4.xyz 快速启动脚本 (Linux/Mac)
# 用法: bash scripts/quick-start.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印标题
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         net4.xyz 快速启动脚本 - Linux/Mac                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 检查 Docker 是否运行
echo -e "${YELLOW}🔍 检查 Docker 状态...${NC}"
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已运行${NC}"
echo ""

# 启动 Docker 服务
echo -e "${YELLOW}🚀 启动 Docker 服务...${NC}"
docker-compose -f docker/docker-compose.dev.yml up -d
echo -e "${GREEN}✅ Docker 服务已启动${NC}"
echo ""

# 等待 MongoDB 启动
echo -e "${YELLOW}⏳ 等待 MongoDB 启动...${NC}"
sleep 5
echo -e "${GREEN}✅ MongoDB 已启动${NC}"
echo ""

# 显示启动选项
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    选择启动方式                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}1️⃣  启动后端 (Backend) - 端口 3000${NC}"
echo -e "${GREEN}2️⃣  启动前端 (Frontend) - 端口 3001${NC}"
echo -e "${GREEN}3️⃣  同时启动前端和后端${NC}"
echo -e "${GREEN}4️⃣  查看服务状态${NC}"
echo -e "${GREEN}5️⃣  停止所有服务${NC}"
echo -e "${CYAN}0️⃣  退出${NC}"
echo ""

read -p "请选择 (0-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}🚀 启动后端服务...${NC}"
        echo -e "${CYAN}📍 后端地址: http://localhost:3000${NC}"
        echo -e "${CYAN}📍 GraphQL: http://localhost:3000/graphql${NC}"
        echo ""
        cd packages/backend
        pnpm dev
        ;;
    2)
        echo ""
        echo -e "${YELLOW}🚀 启动前端服务...${NC}"
        echo -e "${CYAN}📍 前端地址: http://localhost:3001${NC}"
        echo ""
        cd packages/frontend
        pnpm dev
        ;;
    3)
        echo ""
        echo -e "${YELLOW}🚀 启动前端和后端...${NC}"
        echo ""
        echo -e "${CYAN}📍 后端地址: http://localhost:3000${NC}"
        echo -e "${CYAN}📍 GraphQL: http://localhost:3000/graphql${NC}"
        echo -e "${CYAN}📍 前端地址: http://localhost:3001${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  需要两个终端窗口，请按照以下步骤操作:${NC}"
        echo ""
        echo -e "${CYAN}终端 1 - 启动后端:${NC}"
        echo -e "${CYAN}  cd packages/backend${NC}"
        echo -e "${CYAN}  pnpm dev${NC}"
        echo ""
        echo -e "${CYAN}终端 2 - 启动前端:${NC}"
        echo -e "${CYAN}  cd packages/frontend${NC}"
        echo -e "${CYAN}  pnpm dev${NC}"
        echo ""
        ;;
    4)
        echo ""
        echo -e "${YELLOW}📊 服务状态:${NC}"
        echo ""
        docker-compose -f docker/docker-compose.dev.yml ps
        echo ""
        echo -e "${YELLOW}🔍 检查端口占用:${NC}"
        echo ""
        echo -e "${CYAN}后端 (3000):${NC}"
        lsof -i :3000 || echo "  未占用"
        echo ""
        echo -e "${CYAN}前端 (3001):${NC}"
        lsof -i :3001 || echo "  未占用"
        ;;
    5)
        echo ""
        echo -e "${YELLOW}🛑 停止所有 Docker 服务...${NC}"
        docker-compose -f docker/docker-compose.dev.yml down
        echo -e "${GREEN}✅ 所有服务已停止${NC}"
        ;;
    0)
        echo ""
        echo -e "${CYAN}👋 再见！${NC}"
        exit 0
        ;;
    *)
        echo ""
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac
