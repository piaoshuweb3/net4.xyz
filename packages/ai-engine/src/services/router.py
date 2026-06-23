"""
API Router & Load Balancer
实现 API 路由与负载均衡
"""
import os
import asyncio
import logging
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass
import hashlib
import time

from .base import BaseAIService, AIServiceConfig
from .openai_service import OpenAIService
from .anthropic_service import AnthropicService
from .deepseek_service import DeepSeekService

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    """模型提供商"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"


class LoadBalancingStrategy(Enum):
    """负载均衡策略"""
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    WEIGHTED = "weighted"
    HASH = "hash"  # 基于用户 ID 哈希


@dataclass
class ProviderStats:
    """提供商统计信息"""
    provider: ModelProvider
    request_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    total_latency: float = 0.0
    last_used: float = 0.0

    @property
    def success_rate(self) -> float:
        if self.request_count == 0:
            return 0.0
        return self.success_count / self.request_count

    @property
    def avg_latency(self) -> float:
        if self.request_count == 0:
            return 0.0
        return self.total_latency / self.request_count


class AIRouter:
    """AI API 路由器"""

    def __init__(
        self,
        strategy: LoadBalancingStrategy = LoadBalancingStrategy.WEIGHTED,
        enable_fallback: bool = True
    ):
        self.strategy = strategy
        self.enable_fallback = enable_fallback
        self._services: Dict[ModelProvider, BaseAIService] = {}
        self._stats: Dict[ModelProvider, ProviderStats] = {
            ModelProvider.OPENAI: ProviderStats(ModelProvider.OPENAI),
            ModelProvider.ANTHROPIC: ProviderStats(ModelProvider.ANTHROPIC),
            ModelProvider.DEEPSEEK: ProviderStats(ModelProvider.DEEPSEEK),
        }
        self._round_robin_index = 0
        self._weights = {
            ModelProvider.OPENAI: 0.4,  # OpenAI 权重 40%
            ModelProvider.ANTHROPIC: 0.2,  # Anthropic 权重 20%
            ModelProvider.DEEPSEEK: 0.4,  # DeepSeek 权重 40%
        }
        self._initialize_services()

    def _initialize_services(self):
        """初始化 AI 服务（根据环境变量决定是否启用）"""
        # 读取环境变量
        enable_openai = os.getenv("ENABLE_OPENAI", "true").lower() == "true"
        enable_anthropic = os.getenv("ENABLE_ANTHROPIC", "true").lower() == "true"
        enable_deepseek = os.getenv("ENABLE_DEEPSEEK", "true").lower() == "true"
        
        # 初始化 OpenAI 服务（如果启用）
        if enable_openai:
            try:
                openai_config = AIServiceConfig(
                    model_name=os.getenv("OPENAI_MODEL", "gpt-4o"),
                    temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
                    max_tokens=int(os.getenv("AI_MAX_TOKENS", "4096")),
                    timeout=int(os.getenv("AI_TIMEOUT", "60")),
                    max_retries=int(os.getenv("AI_MAX_RETRIES", "3")),
                )
                self._services[ModelProvider.OPENAI] = OpenAIService(openai_config)
                logger.info("✅ OpenAI service initialized")
            except Exception as e:
                logger.warning(f"❌ Failed to initialize OpenAI service: {e}")
                # 从 services 中移除（如果之前添加了）
                if ModelProvider.OPENAI in self._services:
                    del self._services[ModelProvider.OPENAI]
        
        # 初始化 Anthropic 服务（如果启用）
        if enable_anthropic:
            try:
                anthropic_config = AIServiceConfig(
                    model_name=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                    temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
                    max_tokens=int(os.getenv("AI_MAX_TOKENS", "4096")),
                    timeout=int(os.getenv("AI_TIMEOUT", "60")),
                    max_retries=int(os.getenv("AI_MAX_RETRIES", "3")),
                )
                self._services[ModelProvider.ANTHROPIC] = AnthropicService(anthropic_config)
                logger.info("✅ Anthropic service initialized")
            except Exception as e:
                logger.warning(f"❌ Failed to initialize Anthropic service: {e}")
                if ModelProvider.ANTHROPIC in self._services:
                    del self._services[ModelProvider.ANTHROPIC]
        
        # 初始化 DeepSeek 服务（如果启用）
        if enable_deepseek:
            try:
                deepseek_config = AIServiceConfig(
                    model_name=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
                    temperature=float(os.getenv("DEEPSEEK_TEMPERATURE", os.getenv("AI_TEMPERATURE", "0.7"))),
                    max_tokens=int(os.getenv("DEEPSEEK_MAX_TOKENS", os.getenv("AI_MAX_TOKENS", "4096"))),
                    timeout=int(os.getenv("AI_TIMEOUT", "60")),
                    max_retries=int(os.getenv("AI_MAX_RETRIES", "3")),
                )
                self._services[ModelProvider.DEEPSEEK] = DeepSeekService(deepseek_config)
                logger.info("✅ DeepSeek service initialized")
            except Exception as e:
                logger.warning(f"❌ Failed to initialize DeepSeek service: {e}")
                if ModelProvider.DEEPSEEK in self._services:
                    del self._services[ModelProvider.DEEPSEEK]
        
        # 检查是否有可用的服务
        if not self._services:
            logger.error("❌ No AI services available! Please check your API keys and environment configuration.")
        else:
            logger.info(f"🚀 AI Router initialized with {len(self._services)} service(s): {[p.value for p in self._services.keys()]}")

    def _select_provider(self, user_id: Optional[str] = None) -> ModelProvider:
        """根据负载均衡策略选择提供商"""
        if self.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            providers = list(ModelProvider)
            self._round_robin_index = (self._round_robin_index + 1) % len(providers)
            return providers[self._round_robin_index]

        elif self.strategy == LoadBalancingStrategy.LEAST_LOADED:
            # 选择平均延迟最低的提供商
            return min(
                self._stats.keys(),
                key=lambda p: self._stats[p].avg_latency
            )

        elif self.strategy == LoadBalancingStrategy.WEIGHTED:
            # 权重轮询
            rand = asyncio.get_event_loop().time() % 1.0
            cumulative = 0.0
            for provider, weight in self._weights.items():
                cumulative += weight
                if rand < cumulative:
                    return provider
            return ModelProvider.OPENAI  # 默认

        elif self.strategy == LoadBalancingStrategy.HASH:
            # 基于用户 ID 哈希
            if user_id:
                hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
                providers = list(ModelProvider)
                return providers[hash_value % len(providers)]
            return ModelProvider.OPENAI

        return ModelProvider.OPENAI

    async def route(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        provider: Optional[ModelProvider] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """路由请求到合适的 AI 提供商"""
        # 如果指定了提供商，直接使用
        if provider is None:
            provider = self._select_provider(user_id)

        start_time = time.time()
        stats = self._stats[provider]
        stats.request_count += 1

        try:
            service = self._services[provider]
            result = await service.generate(prompt, system_message, **kwargs)

            # 更新统计
            latency = time.time() - start_time
            stats.total_latency += latency
            stats.last_used = time.time()

            if result.get("success"):
                stats.success_count += 1
            else:
                stats.failure_count += 1
                # 如果启用回退且失败，尝试其他提供商
                if self.enable_fallback:
                    logger.warning(f"Provider {provider.value} failed, trying fallback")
                    return await self._fallback(prompt, system_message, provider, user_id, **kwargs)

            return result

        except Exception as e:
            stats.failure_count += 1
            logger.error(f"Router error with provider {provider.value}: {str(e)}")

            # 尝试回退
            if self.enable_fallback:
                return await self._fallback(prompt, system_message, provider, user_id, **kwargs)

            return {
                "success": False,
                "error": str(e),
                "provider": provider.value
            }

    async def _fallback(
        self,
        prompt: str,
        system_message: Optional[str],
        failed_provider: ModelProvider,
        user_id: Optional[str],
        **kwargs
    ) -> Dict[str, Any]:
        """回退到其他提供商"""
        providers = [p for p in ModelProvider if p != failed_provider]

        for provider in providers:
            try:
                service = self._services[provider]
                result = await service.generate(prompt, system_message, **kwargs)

                if result.get("success"):
                    result["fallback"] = True
                    result["original_provider"] = failed_provider.value
                    return result

            except Exception as e:
                logger.error(f"Fallback provider {provider.value} also failed: {str(e)}")
                continue

        return {
            "success": False,
            "error": "All providers failed",
            "providers_tried": [p.value for p in ModelProvider]
        }

    async def route_stream(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        provider: Optional[ModelProvider] = None,
        user_id: Optional[str] = None,
        **kwargs
    ):
        """流式路由"""
        if provider is None:
            provider = self._select_provider(user_id)

        service = self._services[provider]
        async for chunk in service.generate_stream(prompt, system_message, **kwargs):
            yield chunk

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "strategy": self.strategy.value,
            "providers": {
                provider.value: {
                    "request_count": stats.request_count,
                    "success_count": stats.success_count,
                    "failure_count": stats.failure_count,
                    "success_rate": stats.success_rate,
                    "avg_latency": stats.avg_latency,
                    "last_used": stats.last_used
                }
                for provider, stats in self._stats.items()
            }
        }

    def get_health_status(self) -> Dict[str, bool]:
        """获取健康状态"""
        return {
            provider.value: asyncio.run(service.health_check())
            for provider, service in self._services.items()
        }

    def set_weights(self, weights: Dict[ModelProvider, float]):
        """设置提供商权重"""
        total = sum(weights.values())
        if abs(total - 1.0) > 0.01:
            raise ValueError("Weights must sum to 1.0")
        self._weights = weights

    def get_available_providers(self) -> List[Dict[str, Any]]:
        """获取可用提供商列表"""
        return [
            {
                "provider": provider.value,
                "models": service.get_available_models(),
                "weight": self._weights.get(provider, 0.0)
            }
            for provider, service in self._services.items()
        ]