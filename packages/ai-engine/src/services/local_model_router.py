"""
net4.xyz AI Engine - 本地模型路由服务
轨道 B：本地模型部署
统一管理 Ollama 和 vLLM 服务
"""
import os
import time
import uuid
from typing import Optional, List, Dict, Any, AsyncGenerator
from enum import Enum
from pydantic import BaseModel
import logging

from .ollama_service import OllamaService, LocalModel
from .vllm_service import VLLMService, SamplingParams, ChatMessage

logger = logging.getLogger(__name__)


class ModelProvider(str, Enum):
    """模型提供商"""
    OLLAMA = "ollama"
    VLLM = "vllm"
    AUTO = "auto"


class ModelLoadStrategy(str, Enum):
    """模型加载策略"""
    AUTO = "auto"           # 自动选择
    PREFER_OLLAMA = "prefer_ollama"   # 优先 Ollama
    PREFER_VLLM = "prefer_vllm"       # 优先 vLLM


class LocalModelRequest(BaseModel):
    """本地模型请求"""
    prompt: str
    system_message: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[ModelProvider] = None
    strategy: ModelLoadStrategy = ModelLoadStrategy.AUTO
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False


class LocalModelResponse(BaseModel):
    """本地模型响应"""
    success: bool
    result: str
    model: str
    provider: str
    latency_ms: int
    usage: Dict[str, int] = {}


class LocalModelRouter:
    """本地模型路由服务"""

    # 默认模型
    DEFAULT_MODELS = {
        "llama3:70b": ModelProvider.OLLAMA,
        "llama3:405b": ModelProvider.OLLAMA,
        "mixtral:8x22b": ModelProvider.OLLAMA,
        "llama-3-70b-instruct": ModelProvider.VLLM,
        "llama-3-405b-instruct": ModelProvider.VLLM,
        "mixtral-8x22b-instruct": ModelProvider.VLLM,
    }

    def __init__(self):
        """初始化路由服务"""
        self.ollama: Optional[OllamaService] = None
        self.vllm: Optional[VLLMService] = None
        self._initialized = False

    async def initialize(self):
        """初始化服务"""
        if self._initialized:
            return

        # 初始化 Ollama
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        self.ollama = OllamaService(base_url=ollama_url)

        # 初始化 vLLM
        vllm_url = os.getenv("VLLM_BASE_URL", "http://vllm:8000")
        self.vllm = VLLMService(base_url=vllm_url)

        self._initialized = True
        logger.info("Local model router initialized")

    async def close(self):
        """关闭服务"""
        if self.ollama:
            await self.ollama.close()
        if self.vllm:
            await self.vllm.close()
        self._initialized = False

    async def check_health(self) -> Dict[str, bool]:
        """检查所有服务健康状态"""
        health = {}

        if self.ollama:
            health["ollama"] = await self.ollama.check_health()

        if self.vllm:
            health["vllm"] = await self.vllm.check_health()

        return health

    def _select_provider(
        self,
        model: str,
        preferred_provider: Optional[ModelProvider],
        strategy: ModelLoadStrategy
    ) -> ModelProvider:
        """选择提供商"""
        # 如果指定了提供商，直接使用
        if preferred_provider and preferred_provider != ModelProvider.AUTO:
            return preferred_provider

        # 检查模型默认提供商
        for default_model, provider in self.DEFAULT_MODELS.items():
            if default_model in model:
                return provider

        # 根据策略选择
        if strategy == ModelLoadStrategy.PREFER_OLLAMA:
            return ModelProvider.OLLAMA
        elif strategy == ModelLoadStrategy.PREFER_VLLM:
            return ModelProvider.VLLM

        # 默认优先 vLLM（性能更好）
        return ModelProvider.VLLM

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_message: Optional[str] = None,
        provider: Optional[ModelProvider] = None,
        strategy: ModelLoadStrategy = ModelLoadStrategy.AUTO,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ) -> LocalModelResponse:
        """生成文本"""
        await self.initialize()

        # 默认模型
        model = model or os.getenv("DEFAULT_LOCAL_MODEL", "llama3:70b")

        # 选择提供商
        selected_provider = self._select_provider(model, provider, strategy)

        start_time = time.time()

        try:
            if selected_provider == ModelProvider.OLLAMA:
                result = await self._generate_ollama(
                    model, prompt, system_message, temperature, max_tokens
                )
            else:
                result = await self._generate_vllm(
                    model, prompt, system_message, temperature, max_tokens
                )

            latency_ms = int((time.time() - start_time) * 1000)

            return LocalModelResponse(
                success=True,
                result=result["response"],
                model=model,
                provider=selected_provider.value,
                latency_ms=latency_ms,
                usage={
                    "prompt_tokens": result.get("prompt_tokens", 0),
                    "completion_tokens": result.get("completion_tokens", 0),
                    "total_tokens": result.get("total_tokens", 0)
                }
            )
        except Exception as e:
            logger.error(f"Generate error: {e}")
            latency_ms = int((time.time() - start_time) * 1000)

            # 尝试回退
            if provider is None and strategy == ModelLoadStrategy.AUTO:
                fallback_provider = (
                    ModelProvider.VLLM if selected_provider == ModelProvider.OLLAMA
                    else ModelProvider.OLLAMA
                )
                logger.info(f"Trying fallback provider: {fallback_provider}")

                try:
                    if fallback_provider == ModelProvider.OLLAMA:
                        result = await self._generate_ollama(
                            model, prompt, system_message, temperature, max_tokens
                        )
                    else:
                        result = await self._generate_vllm(
                            model, prompt, system_message, temperature, max_tokens
                        )

                    latency_ms = int((time.time() - start_time) * 1000)

                    return LocalModelResponse(
                        success=True,
                        result=result["response"],
                        model=model,
                        provider=fallback_provider.value,
                        latency_ms=latency_ms,
                        usage={
                            "prompt_tokens": result.get("prompt_tokens", 0),
                            "completion_tokens": result.get("completion_tokens", 0),
                            "total_tokens": result.get("total_tokens", 0)
                        }
                    )
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {fallback_error}")

            return LocalModelResponse(
                success=False,
                result=f"Error: {str(e)}",
                model=model,
                provider=selected_provider.value,
                latency_ms=latency_ms,
                usage={}
            )

    async def _generate_ollama(
        self,
        model: str,
        prompt: str,
        system_message: Optional[str],
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """通过 Ollama 生成"""
        if not self.ollama:
            raise Exception("Ollama service not available")

        response = await self.ollama.generate(
            model=model,
            prompt=prompt,
            system=system_message,
            temperature=temperature,
            num_predict=max_tokens,
            stream=False
        )

        return {
            "response": response.response,
            "prompt_tokens": response.prompt_eval_count or 0,
            "completion_tokens": response.eval_count or 0,
            "total_tokens": (response.prompt_eval_count or 0) + (response.eval_count or 0)
        }

    async def _generate_vllm(
        self,
        model: str,
        prompt: str,
        system_message: Optional[str],
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """通过 vLLM 生成"""
        if not self.vllm:
            raise Exception("vLLM service not available")

        # 构建消息
        messages = []
        if system_message:
            messages.append(ChatMessage(role="system", content=system_message))
        messages.append(ChatMessage(role="user", content=prompt))

        sampling_params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens
        )

        response = await self.vllm.chat_completion_v2(
            model=model,
            messages=messages,
            sampling_params=sampling_params,
            stream=False
        )

        # 解析响应
        content = ""
        if "choices" in response and len(response["choices"]) > 0:
            content = response["choices"][0]["message"]["content"]

        usage = response.get("usage", {})

        return {
            "response": content,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0)
        }

    async def generate_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_message: Optional[str] = None,
        provider: Optional[ModelProvider] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """流式生成文本"""
        await self.initialize()

        model = model or os.getenv("DEFAULT_LOCAL_MODEL", "llama3:70b")
        selected_provider = self._select_provider(
            model, provider, ModelLoadStrategy.AUTO
        )

        try:
            if selected_provider == ModelProvider.OLLAMA:
                async for chunk in self.ollama.generate_stream(
                    model=model,
                    prompt=prompt,
                    system=system_message,
                    temperature=temperature,
                    num_predict=max_tokens
                ):
                    yield chunk
            else:
                async for chunk in self._generate_vllm_stream(
                    model, prompt, system_message, temperature, max_tokens
                ):
                    yield chunk
        except Exception as e:
            logger.error(f"Generate stream error: {e}")
            yield f"Error: {str(e)}"

    async def _generate_vllm_stream(
        self,
        model: str,
        prompt: str,
        system_message: Optional[str],
        temperature: float,
        max_tokens: int
    ) -> AsyncGenerator[str, None]:
        """vLLM 流式生成"""
        if not self.vllm:
            raise Exception("vLLM service not available")

        messages = []
        if system_message:
            messages.append(ChatMessage(role="system", content=system_message))
        messages.append(ChatMessage(role="user", content=prompt))

        sampling_params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens
        )

        async with self.vllm.client.stream(
            "POST",
            "/v1/chat/completions",
            json={
                "model": model,
                "messages": [msg.model_dump() for msg in messages],
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True
            }
        ) as response:
            async for line in response.aiter_lines():
                if line and line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        import json
                        data = json.loads(data_str)
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                    except Exception:
                        continue

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        provider: Optional[ModelProvider] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LocalModelResponse:
        """聊天接口"""
        await self.initialize()

        model = model or os.getenv("DEFAULT_LOCAL_MODEL", "llama3:70b")
        selected_provider = self._select_provider(model, provider, ModelLoadStrategy.AUTO)

        start_time = time.time()

        try:
            if selected_provider == ModelProvider.OLLAMA:
                ollama_messages = [
                    OllamaChatMessage(role=msg["role"], content=msg["content"])
                    for msg in messages
                ]
                response = await self.ollama.chat(
                    model=model,
                    messages=ollama_messages,
                    temperature=temperature,
                    num_predict=max_tokens
                )
                content = response.get("message", {}).get("content", "")
            else:
                chat_messages = [
                    ChatMessage(role=msg["role"], content=msg["content"])
                    for msg in messages
                ]
                response = await self.vllm.chat_completion_v2(
                    model=model,
                    messages=chat_messages,
                    sampling_params=SamplingParams(
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                )
                content = ""
                if "choices" in response and len(response["choices"]) > 0:
                    content = response["choices"][0]["message"]["content"]

            latency_ms = int((time.time() - start_time) * 1000)

            return LocalModelResponse(
                success=True,
                result=content,
                model=model,
                provider=selected_provider.value,
                latency_ms=latency_ms,
                usage={}
            )
        except Exception as e:
            logger.error(f"Chat error: {e}")
            latency_ms = int((time.time() - start_time) * 1000)

            return LocalModelResponse(
                success=False,
                result=f"Error: {str(e)}",
                model=model,
                provider=selected_provider.value,
                latency_ms=latency_ms,
                usage={}
            )

    async def list_models(self) -> Dict[str, List[Dict[str, Any]]]:
        """列出所有可用模型"""
        await self.initialize()

        result = {
            "ollama": [],
            "vllm": []
        }

        if self.ollama:
            try:
                ollama_models = await self.ollama.list_models()
                result["ollama"] = [
                    {
                        "name": m.name,
                        "family": m.model_family,
                        "size": m.size,
                        "status": m.status
                    }
                    for m in ollama_models
                ]
            except Exception as e:
                logger.error(f"Failed to list Ollama models: {e}")

        if self.vllm:
            try:
                vllm_models = await self.vllm.list_models()
                result["vllm"] = vllm_models
            except Exception as e:
                logger.error(f"Failed to list vLLM models: {e}")

        return result

    async def get_available_models(self) -> List[Dict[str, Any]]:
        """获取可用模型列表（带硬件要求）"""
        models = []

        # Ollama 模型
        if self.ollama:
            for model_name, info in self.ollama.SUPPORTED_MODELS.items():
                models.append({
                    "name": model_name,
                    "provider": "ollama",
                    "family": info["family"].value,
                    "size": info["size"].value,
                    "description": info["description"],
                    "hardware": info["hardware"],
                    "context_length": info.get("context_length", 4096)
                })

        # vLLM 模型
        if self.vllm:
            for model_name, info in self.vllm.SUPPORTED_MODELS.items():
                models.append({
                    "name": model_name,
                    "provider": "vllm",
                    "description": info["description"],
                    "hardware": info["hardware"],
                    "max_model_len": info.get("max_model_len", 4096)
                })

        return models

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "providers": {
                "ollama": self.ollama is not None,
                "vllm": self.vllm is not None
            },
            "default_model": os.getenv("DEFAULT_LOCAL_MODEL", "llama3:70b")
        }


# 全局服务实例
_local_model_router: Optional[LocalModelRouter] = None


def get_local_model_router() -> LocalModelRouter:
    """获取本地模型路由服务实例"""
    global _local_model_router
    if _local_model_router is None:
        _local_model_router = LocalModelRouter()
    return _local_model_router


async def init_local_model_router() -> LocalModelRouter:
    """初始化本地模型路由服务"""
    global _local_model_router
    _local_model_router = LocalModelRouter()
    await _local_model_router.initialize()
    return _local_model_router


async def close_local_model_router():
    """关闭本地模型路由服务"""
    global _local_model_router
    if _local_model_router:
        await _local_model_router.close()
        _local_model_router = None


# 导出类型
from .ollama_service import OllamaChatMessage