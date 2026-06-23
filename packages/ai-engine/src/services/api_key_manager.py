"""
API Key Manager
实现 API 密钥管理
"""
import os
import secrets
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class KeyTier(Enum):
    """API 密钥等级"""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class APIKey:
    """API 密钥"""
    key_id: str
    key_hash: str
    user_id: str
    tier: KeyTier
    created_at: datetime
    expires_at: Optional[datetime]
    last_used: Optional[datetime]
    is_active: bool = True
    rate_limit: int = 60  # 每分钟请求数
    monthly_quota: int = 10000  # 每月配额
    usage_this_month: int = 0

    def is_expired(self) -> bool:
        """检查是否过期"""
        if self.expires_at and datetime.now() > self.expires_at:
            return True
        return False

    def can_use(self) -> bool:
        """检查是否可以使用"""
        return self.is_active and not self.is_expired()


@dataclass
class UsageRecord:
    """使用记录"""
    key_id: str
    timestamp: datetime
    provider: str
    model: str
    tokens_used: int
    latency_ms: float
    success: bool


class APIKeyManager:
    """API 密钥管理器"""

    def __init__(self):
        self._keys: Dict[str, APIKey] = {}
        self._usage_records: List[UsageRecord] = []
        self._rate_limit_cache: Dict[str, List[datetime]] = {}
        self._initialize_default_keys()

    def _initialize_default_keys(self):
        """初始化默认密钥（用于开发环境）"""
        # 创建默认的开发密钥
        dev_key = self.create_key(
            user_id="dev_user",
            tier=KeyTier.PREMIUM,
            rate_limit=1000,
            monthly_quota=100000
        )
        logger.info(f"Created default development API key: {dev_key[:8]}...")

    def _hash_key(self, key: str) -> str:
        """哈希 API 密钥"""
        return hashlib.sha256(key.encode()).hexdigest()

    def _generate_key_id(self) -> str:
        """生成密钥 ID"""
        return secrets.token_hex(8)

    def _generate_key(self) -> str:
        """生成新的 API 密钥"""
        return f"nk4_{secrets.token_urlsafe(32)}"

    def create_key(
        self,
        user_id: str,
        tier: KeyTier = KeyTier.FREE,
        rate_limit: Optional[int] = None,
        monthly_quota: Optional[int] = None,
        expires_in_days: Optional[int] = None
    ) -> str:
        """创建新的 API 密钥"""
        key_id = self._generate_key_id()
        key = self._generate_key()
        key_hash = self._hash_key(key)

        # 根据等级设置默认限制
        if tier == KeyTier.FREE:
            default_rate_limit = 10
            default_quota = 1000
        elif tier == KeyTier.BASIC:
            default_rate_limit = 60
            default_quota = 50000
        elif tier == KeyTier.PREMIUM:
            default_rate_limit = 300
            default_quota = 500000
        else:  # ENTERPRISE
            default_rate_limit = 1000
            default_quota = -1  # 无限制

        expires_at = None
        if expires_in_days:
            expires_at = datetime.now() + timedelta(days=expires_in_days)

        api_key = APIKey(
            key_id=key_id,
            key_hash=key_hash,
            user_id=user_id,
            tier=tier,
            created_at=datetime.now(),
            expires_at=expires_at,
            last_used=None,
            rate_limit=rate_limit or default_rate_limit,
            monthly_quota=monthly_quota or default_quota,
            usage_this_month=0
        )

        self._keys[key_id] = api_key
        logger.info(f"Created API key for user {user_id}, tier: {tier.value}")

        # 返回完整密钥（只显示一次）
        return key

    def validate_key(self, key: str) -> Optional[APIKey]:
        """验证 API 密钥"""
        key_hash = self._hash_key(key)

        for api_key in self._keys.values():
            if api_key.key_hash == key_hash:
                if not api_key.can_use():
                    logger.warning(f"API key {api_key.key_id} is expired or inactive")
                    return None
                return api_key

        return None

    def check_rate_limit(self, key_id: str) -> bool:
        """检查速率限制"""
        if key_id not in self._keys:
            return False

        api_key = self._keys[key_id]
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)

        # 获取或初始化速率限制记录
        if key_id not in self._rate_limit_cache:
            self._rate_limit_cache[key_id] = []

        # 清理过期的记录
        self._rate_limit_cache[key_id] = [
            ts for ts in self._rate_limit_cache[key_id]
            if ts > minute_ago
        ]

        # 检查是否超过限制
        if len(self._rate_limit_cache[key_id]) >= api_key.rate_limit:
            logger.warning(f"Rate limit exceeded for key {key_id}")
            return False

        # 记录本次请求
        self._rate_limit_cache[key_id].append(now)
        return True

    def check_quota(self, key_id: str, tokens_needed: int = 1) -> bool:
        """检查配额"""
        if key_id not in self._keys:
            return False

        api_key = self._keys[key_id]

        # 企业级无限制
        if api_key.monthly_quota < 0:
            return True

        return api_key.usage_this_month + tokens_needed <= api_key.monthly_quota

    def record_usage(
        self,
        key_id: str,
        provider: str,
        model: str,
        tokens_used: int,
        latency_ms: float,
        success: bool
    ):
        """记录使用情况"""
        if key_id not in self._keys:
            return

        api_key = self._keys[key_id]
        api_key.usage_this_month += tokens_used
        api_key.last_used = datetime.now()

        # 记录详细使用记录
        record = UsageRecord(
            key_id=key_id,
            timestamp=datetime.now(),
            provider=provider,
            model=model,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
            success=success
        )
        self._usage_records.append(record)

        # 限制记录数量
        if len(self._usage_records) > 10000:
            self._usage_records = self._usage_records[-5000:]

    def revoke_key(self, key_id: str) -> bool:
        """撤销 API 密钥"""
        if key_id in self._keys:
            self._keys[key_id].is_active = False
            logger.info(f"Revoked API key {key_id}")
            return True
        return False

    def get_key_info(self, key_id: str) -> Optional[Dict[str, Any]]:
        """获取密钥信息"""
        if key_id not in self._keys:
            return None

        api_key = self._keys[key_id]
        return {
            "key_id": api_key.key_id,
            "user_id": api_key.user_id,
            "tier": api_key.tier.value,
            "created_at": api_key.created_at.isoformat(),
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "last_used": api_key.last_used.isoformat() if api_key.last_used else None,
            "is_active": api_key.is_active,
            "rate_limit": api_key.rate_limit,
            "monthly_quota": api_key.monthly_quota,
            "usage_this_month": api_key.usage_this_month
        }

    def get_user_keys(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户的所有密钥"""
        return [
            self.get_key_info(key.key_id)
            for key in self._keys.values()
            if key.user_id == user_id
        ]

    def get_usage_stats(self, key_id: str, days: int = 7) -> Dict[str, Any]:
        """获取使用统计"""
        if key_id not in self._keys:
            return {}

        api_key = self._keys[key_id]
        cutoff = datetime.now() - timedelta(days=days)

        recent_records = [
            r for r in self._usage_records
            if r.key_id == key_id and r.timestamp > cutoff
        ]

        total_requests = len(recent_records)
        successful_requests = sum(1 for r in recent_records if r.success)
        total_tokens = sum(r.tokens_used for r in recent_records)
        avg_latency = sum(r.latency_ms for r in recent_records) / total_requests if total_requests > 0 else 0

        return {
            "key_id": key_id,
            "period_days": days,
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "success_rate": successful_requests / total_requests if total_requests > 0 else 0,
            "total_tokens": total_tokens,
            "avg_latency_ms": avg_latency,
            "quota_remaining": api_key.monthly_quota - api_key.usage_this_month if api_key.monthly_quota > 0 else -1
        }

    def reset_monthly_usage(self):
        """重置月度使用量（通常在月初执行）"""
        for api_key in self._keys.values():
            api_key.usage_this_month = 0
        logger.info("Reset monthly API key usage")

    def list_tiers(self) -> List[Dict[str, Any]]:
        """列出所有密钥等级"""
        return [
            {
                "tier": "free",
                "rate_limit": 10,
                "monthly_quota": 1000,
                "price": "免费"
            },
            {
                "tier": "basic",
                "rate_limit": 60,
                "monthly_quota": 50000,
                "price": "$9.99/月"
            },
            {
                "tier": "premium",
                "rate_limit": 300,
                "monthly_quota": 500000,
                "price": "$49.99/月"
            },
            {
                "tier": "enterprise",
                "rate_limit": 1000,
                "monthly_quota": -1,
                "price": "联系销售"
            }
        ]