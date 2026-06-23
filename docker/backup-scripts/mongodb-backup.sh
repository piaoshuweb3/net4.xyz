#!/bin/bash
# MongoDB 备份脚本
# 支持定时备份和增量备份

set -e

# 配置
MONGO_HOST="${MONGO_HOST:-mongodb-primary}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-net4xyz}"
MONGO_PASSWORD="${MONGO_PASSWORD:-net4xyz123}"
MONGO_AUTH_SOURCE="${MONGO_AUTH_SOURCE:-admin}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DATABASE_NAME="net4xyz"

# 日期格式
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"

echo "=========================================="
echo "MongoDB 备份开始 - ${DATE}"
echo "=========================================="

# 创建备份目录
mkdir -p "${BACKUP_PATH}"

# 执行 mongodump 备份
echo "正在备份数据库: ${DATABASE_NAME}"
mongodump \
  --host "${MONGO_HOST}" \
  --port "${MONGO_PORT}" \
  --username "${MONGO_USER}" \
  --password "${MONGO_PASSWORD}" \
  --authenticationDatabase "${MONGO_AUTH_SOURCE}" \
  --db "${DATABASE_NAME}" \
  --out "${BACKUP_PATH}" \
  --gzip \
  --oplog

if [ $? -eq 0 ]; then
  echo "备份成功: ${BACKUP_PATH}"
  
  # 创建备份元数据
  cat > "${BACKUP_PATH}/metadata.json" << EOF
{
  "database": "${DATABASE_NAME}",
  "backupDate": "${DATE}",
  "host": "${MONGO_HOST}",
  "port": "${MONGO_PORT}",
  "retentionDays": ${RETENTION_DAYS}
}
EOF
  
  # 创建压缩包
  echo "正在压缩备份文件..."
  cd "${BACKUP_DIR}"
  tar -czf "mongodb_backup_${DATE}.tar.gz" "${DATE}/"
  
  # 创建最新备份软链接
  ln -sf "mongodb_backup_${DATE}.tar.gz" "mongodb_backup_latest.tar.gz"
  
  echo "备份完成: mongodb_backup_${DATE}.tar.gz"
else
  echo "备份失败!"
  exit 1
fi

# 清理过期备份
echo "清理过期备份 (保留 ${RETENTION_DAYS} 天)..."
find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -type d -name "2*" -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

echo "=========================================="
echo "MongoDB 备份完成"
echo "=========================================="