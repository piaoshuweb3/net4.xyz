"""
AI Cloud API Service Tests
轨道 A：云端 API 服务测试
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch, AsyncMock

# 添加 src 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.base import BaseAIService, AIServiceConfig
from services.openai_service import OpenAIService
from services.anthropic_service import AnthropicService
from services.router import AIRouter, ModelProvider, LoadBalancingStrategy, ProviderStats
from services.api_key_manager import APIKeyManager, KeyTier


class TestAIServiceConfig:
    """测试 AI 服务配置"""

    def test_default_config(self):
        """测试默认配置"""
        config = AIServiceConfig()
        assert config.model_name == "gpt-4o"
        assert config.temperature == 0.7
        assert config.max_tokens == 4096
        assert config.timeout == 60
        assert config.max_retries == 3

    def test_custom_config(self):
        """测试自定义配置"""
        config = AIServiceConfig(
            model_name="claude-3-5-sonnet-20241022",
            temperature=0.5,
            max_tokens=2048
        )
        assert config.model_name == "claude-3-5-sonnet-20241022"
        assert config.temperature == 0.5
        assert config.max_tokens == 2048


class TestProviderStats:
    """测试提供商统计"""

    def test_initial_stats(self):
        """测试初始统计"""
        stats = ProviderStats(ModelProvider.OPENAI)
        assert stats.provider == ModelProvider.OPENAI
        assert stats.request_count == 0
        assert stats.success_count == 0
        assert stats.failure_count == 0
        assert stats.success_rate == 0.0

    def test_success_rate_calculation(self):
        """测试成功率计算"""
        stats = ProviderStats(ModelProvider.OPENAI)
        stats.request_count = 10
        stats.success_count = 8
        assert stats.success_rate == 0.8

    def test_avg_latency_calculation(self):
        """测试平均延迟计算"""
        stats = ProviderStats(ModelProvider.OPENAI)
        stats.request_count = 5
        stats.total_latency = 100.0
        assert stats.avg_latency == 20.0


class TestAIRouter:
    """测试 AI 路由器"""

    @pytest.fixture
    def router(self):
        """创建路由器实例"""
        with patch('services.router.OpenAIService') as mock_openai, \
             patch('services.router.AnthropicService') as mock_anthropic:
            
            # Mock the services
            mock_openai_instance = Mock()
            mock_openai_instance.generate = AsyncMock(return_value={
                "success": True,
                "result": "Test response",
                "model": "gpt-4o",
                "provider": "openai",
                "usage": {"total_tokens": 10}
            })
            mock_openai_instance.get_available_models = Mock(return_value=[
                {"id": "gpt-4o", "name": "GPT-4o"}
            ])
            mock_openai_instance.health_check = AsyncMock(return_value=True)
            mock_openai.return_value = mock_openai_instance

            mock_anthropic_instance = Mock()
            mock_anthropic_instance.generate = AsyncMock(return_value={
                "success": True,
                "result": "Test response",
                "model": "claude-3-5-sonnet-20241022",
                "provider": "anthropic",
                "usage": {"total_tokens": 10}
            })
            mock_anthropic_instance.get_available_models = Mock(return_value=[
                {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5"}
            ])
            mock_anthropic_instance.health_check = AsyncMock(return_value=True)
            mock_anthropic.return_value = mock_anthropic_instance

            return AIRouter(strategy=LoadBalancingStrategy.ROUND_ROBIN)

    @pytest.mark.asyncio
    async def test_route_with_provider(self, router):
        """测试指定提供商的路由"""
        result = await router.route(
            prompt="Hello",
            provider=ModelProvider.OPENAI
        )
        assert result["success"] == True
        assert result["provider"] == "openai"

    @pytest.mark.asyncio
    async def test_route_fallback(self, router):
        """测试回退机制"""
        # Mock one provider to fail
        router._services[ModelProvider.OPENAI].generate = AsyncMock(
            side_effect=Exception("OpenAI failed")
        )
        
        result = await router.route(
            prompt="Hello",
            provider=ModelProvider.OPENAI
        )
        # Should fallback to Anthropic
        assert result.get("fallback") == True

    def test_get_stats(self, router):
        """测试获取统计信息"""
        stats = router.get_stats()
        assert "strategy" in stats
        assert "providers" in stats
        assert "openai" in stats["providers"]
        assert "anthropic" in stats["providers"]

    def test_set_weights(self, router):
        """测试设置权重"""
        router.set_weights({
            ModelProvider.OPENAI: 0.7,
            ModelProvider.ANTHROPIC: 0.3
        })
        assert router._weights[ModelProvider.OPENAI] == 0.7
        assert router._weights[ModelProvider.ANTHROPIC] == 0.3

    def test_set_weights_invalid(self, router):
        """测试无效权重"""
        with pytest.raises(ValueError):
            router.set_weights({
                ModelProvider.OPENAI: 0.5,
                ModelProvider.ANTHROPIC: 0.5
            })


class TestAPIKeyManager:
    """测试 API 密钥管理器"""

    @pytest.fixture
    def key_manager(self):
        """创建密钥管理器实例"""
        return APIKeyManager()

    def test_create_key(self, key_manager):
        """测试创建密钥"""
        key = key_manager.create_key(
            user_id="test_user",
            tier=KeyTier.FREE
        )
        assert key.startswith("nk4_")
        
        # 验证密钥
        api_key = key_manager.validate_key(key)
        assert api_key is not None
        assert api_key.user_id == "test_user"
        assert api_key.tier == KeyTier.FREE

    def test_validate_invalid_key(self, key_manager):
        """测试验证无效密钥"""
        result = key_manager.validate_key("invalid_key_123")
        assert result is None

    def test_check_rate_limit(self, key_manager):
        """测试速率限制"""
        key = key_manager.create_key(
            user_id="test_user",
            tier=KeyTier.FREE,
            rate_limit=5
        )
        api_key = key_manager.validate_key(key)
        
        # 前 5 次应该通过
        for _ in range(5):
            assert key_manager.check_rate_limit(api_key.key_id) == True
        
        # 第 6 次应该失败
        assert key_manager.check_rate_limit(api_key.key_id) == False

    def test_check_quota(self, key_manager):
        """测试配额检查"""
        key = key_manager.create_key(
            user_id="test_user",
            tier=KeyTier.FREE,
            monthly_quota=100
        )
        api_key = key_manager.validate_key(key)
        
        # 检查配额
        assert key_manager.check_quota(api_key.key_id, 50) == True
        assert key_manager.check_quota(api_key.key_id, 60) == False

    def test_record_usage(self, key_manager):
        """测试记录使用"""
        key = key_manager.create_key(
            user_id="test_user",
            tier=KeyTier.FREE
        )
        api_key = key_manager.validate_key(key)
        
        key_manager.record_usage(
            key_id=api_key.key_id,
            provider="openai",
            model="gpt-4o",
            tokens_used=100,
            latency_ms=500,
            success=True
        )
        
        assert api_key.usage_this_month == 100

    def test_revoke_key(self, key_manager):
        """测试撤销密钥"""
        key = key_manager.create_key(
            user_id="test_user",
            tier=KeyTier.FREE
        )
        api_key = key_manager.validate_key(key)
        
        # 撤销密钥
        result = key_manager.revoke_key(api_key.key_id)
        assert result == True
        
        # 验证被撤销的密钥
        api_key = key_manager.validate_key(key)
        assert api_key is None

    def test_get_usage_stats(self, key_manager):
        """测试获取使用统计"""
        key = key_manager.create_key(
            user_id="test_user",
            tier=KeyTier.FREE
        )
        api_key = key_manager.validate_key(key)
        
        # 记录一些使用
        key_manager.record_usage(
            key_id=api_key.key_id,
            provider="openai",
            model="gpt-4o",
            tokens_used=100,
            latency_ms=500,
            success=True
        )
        
        stats = key_manager.get_usage_stats(api_key.key_id, days=7)
        assert stats["total_requests"] == 1
        assert stats["total_tokens"] == 100

    def test_list_tiers(self, key_manager):
        """测试列出密钥等级"""
        tiers = key_manager.list_tiers()
        assert len(tiers) == 4
        assert tiers[0]["tier"] == "free"
        assert tiers[3]["tier"] == "enterprise"


class TestLoadBalancingStrategies:
    """测试负载均衡策略"""

    @pytest.mark.asyncio
    async def test_round_robin(self):
        """测试轮询策略"""
        with patch('services.router.OpenAIService') as mock_openai, \
             patch('services.router.AnthropicService') as mock_anthropic:
            
            mock_openai_instance = Mock()
            mock_openai_instance.generate = AsyncMock(return_value={"success": True})
            mock_openai_instance.get_available_models = Mock(return_value=[])
            mock_openai_instance.health_check = AsyncMock(return_value=True)
            mock_openai.return_value = mock_openai_instance

            mock_anthropic_instance = Mock()
            mock_anthropic_instance.generate = AsyncMock(return_value={"success": True})
            mock_anthropic_instance.get_available_models = Mock(return_value=[])
            mock_anthropic_instance.health_check = AsyncMock(return_value=True)
            mock_anthropic.return_value = mock_anthropic_instance

            router = AIRouter(strategy=LoadBalancingStrategy.ROUND_ROBIN)
            
            # 多次调用应该轮换提供商
            providers = set()
            for _ in range(4):
                result = await router.route(prompt="test")
                providers.add(result.get("provider"))
            
            # 轮询策略应该选择不同的提供商
            assert len(providers) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])