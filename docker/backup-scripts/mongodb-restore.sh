#!/bin/bash
# MongoDB 恢复脚本
# 支持从备份文件恢复数据库

set -e

# 配置
MONGO_HOST="${MONGO_HOST:-mongodb-primary}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-net4xyz}"
MONGO_PASSWORD="${MONGO_PASSWORD:-net4xyz123}"
MONGO_AUTH_SOURCE="${MONGO_AUTH_SOURCE:-admin}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
DATABASE_NAME="net4xyz"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "MongoDB 数据库恢复工具"
echo "=========================================="

# 列出可用备份
echo -e "${YELLOW}可用备份:${NC}"
ls -lh "${BACKUP_DIR}"/mongodb_backup_*.tar.gz 2>/dev/null || echo "没有找到备份文件"

# 获取要恢复的备份文件
if [ -z "$1" ]; then
  echo -e "\n${YELLOW}用法: $0 <备份文件名>${NC}"
  echo "示例: $0 mongodb_backup_20240101_020000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  echo -e "${RED}错误: 备份文件不存在: ${BACKUP_FILE}${NC}"
  exit 1
fi

echo -e "\n${YELLOW}警告: 此操作将覆盖现有数据库!${NC}"
read -p "确认继续? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "操作已取消"
  exit 0
fi

# 解压备份
echo "正在解压备份文件..."
TEMP_DIR=$(mktemp -d)
tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}" -C "${TEMP_DIR}"

# 获取解压后的目录
BACKUP_DIR_EXTRACTED=$(ls "${TEMP_DIR}"/)

echo "正在恢复数据库: ${DATABASE_NAME}"
mongorestore \
  --host "${MONGO_HOST}" \
  --port "${MONGO_PORT}" \
  --username "${MONGO_USER}" \
  --password "${MONGO_PASSWORD}" \
  --authenticationDatabase "${MONGO_AUTH_SOURCE}" \
  --db "${DATABASE_NAME}" \
  --drop \
  --gzip \
  "${TEMP_DIR}/${BACKUP_DIR_EXTRACTED}/${DATABASE_NAME}"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}数据库恢复成功!${NC}"
else
  echo -e "${RED}数据库恢复失败!${NC}"
  exit 1
fi

# 清理临时目录
rm -rf "${TEMP_DIR}"

echo "=========================================="
echo "MongoDB 恢复完成"
echo "=========================================="