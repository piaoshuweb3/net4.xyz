"""
net4.xyz AI Engine - vLLM 高性能推理服务
轨道 B：本地模型部署
支持高吞吐量推理服务
"""
import os
import json
from typing import Optional, List, Dict, Any, AsyncGenerator
from enum import Enum
import logging

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class SamplingParams(BaseModel):
    """采样参数"""
    temperature: float = Field(0.7, ge=0, le=2)
    top_p: float = Field(0.9, ge=0, le=1)
    top_k: int = Field(50, ge=0)
    max_tokens: int = Field(4096, ge=1, le=128000)
    stop: Optional[List[str]] = None
    presence_penalty: Optional[float] = Field(0, ge=-2, le=2)
    frequency_penalty: Optional[float] = Field(0, ge=-2, le=2)
    repeat_penalty: Optional[float] = Field(1.0, ge=0, le=2)


class CompletionRequest(BaseModel):
    """补全请求"""
    prompt: str
    sampling_params: Optional[SamplingParams] = None
    prompt_token_ids: Optional[List[int]] = None


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    """聊天补全请求"""
    messages: List[ChatMessage]
    sampling_params: Optional[SamplingParams] = None


class CompletionResponse(BaseModel):
    """补全响应"""
    id: str
    object: str = "text_completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


class ChatCompletionResponse(BaseModel):
    """聊天补全响应"""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


class VLLMModel(BaseModel):
    """vLLM 模型信息"""
    model_name: str
    model_path: Optional[str] = None
    dtype: str = "auto"
    tensor_parallel_size: int = 1
    gpu_memory_utilization: float = 0.9
    max_num_seqs: int = 256
    max_model_len: Optional[int] = None


class VLLMService:
    """vLLM 高性能推理服务"""

    # 支持的模型
    SUPPORTED_MODELS = {
        "llama-3-70b-instruct": {
            "model_path": "meta-llama/Llama-3-70b-instruct",
            "dtype": "bfloat16",
            "description": "Llama 3 70B 指令微调版",
            "hardware": "H100/A100 x 2",
            "max_model_len": 8192,
        },
        "llama-3-405b-instruct": {
            "model_path": "meta-llama/Llama-3-405b-instruct",
            "dtype": "bfloat16",
            "description": "Llama 3 405B 指令微调版",
            "hardware": "H100/A100 x 4",
            "max_model_len": 8192,
        },
        "mixtral-8x22b-instruct": {
            "model_path": "mistralai/Mixtral-8x22B-Instruct-v0.1",
            "dtype": "bfloat16",
            "description": "Mixtral 8x22B 指令微调版",
            "hardware": "H100/A100 x 2",
            "max_model_len": 65536,
        },
        "mixtral-8x7b-instruct": {
            "model_path": "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "dtype": "bfloat16",
            "description": "Mixtral 8x7B 指令微调版",
            "hardware": "RTX 4090",
            "max_model_len": 32768,
        },
    }

    def __init__(self, base_url: Optional[str] = None):
        """初始化 vLLM 服务"""
        self.base_url = base_url or os.getenv("VLLM_BASE_URL", "http://localhost:8000")
        self.timeout = int(os.getenv("VLLM_TIMEOUT", "300"))
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=True
        )
        self._health_cache = False
        self._last_health_check = 0

    async def close(self):
        """关闭客户端"""
        await self.client.aclose()

    async def check_health(self) -> bool:
        """检查 vLLM 服务健康状态"""
        import time
        current_time = time.time()

        # 缓存 10 秒
        if current_time - self._last_health_check < 10 and self._health_cache:
            return self._health_cache

        try:
            response = await self.client.get("/health")
            self._health_cache = response.status_code == 200
            self._last_health_check = current_time
            return self._health_cache
        except Exception as e:
            logger.error(f"vLLM health check failed: {e}")
            self._health_cache = False
            return False

    async def is_server_ready(self) -> bool:
        """检查服务器是否就绪"""
        try:
            response = await self.client.get("/v1/models")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"vLLM server ready check failed: {e}")
            return False

    async def list_models(self) -> List[str]:
        """列出可用模型"""
        try:
            response = await self.client.get("/v1/models")
            if response.status_code != 200:
                return []

            data = response.json()
            return [model["id"] for model in data.get("data", [])]
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    async def completion(
        self,
        model: str,
        prompt: str,
        sampling_params: Optional[SamplingParams] = None,
        stream: bool = False
    ) -> CompletionResponse:
        """文本补全"""
        if sampling_params is None:
            sampling_params = SamplingParams()

        request_data = {
            "model": model,
            "prompt": prompt,
            "temperature": sampling_params.temperature,
            "top_p": sampling_params.top_p,
            "top_k": sampling_params.top_k,
            "max_tokens": sampling_params.max_tokens,
            "stream": stream,
        }

        if sampling_params.stop:
            request_data["stop"] = sampling_params.stop

        try:
            if stream:
                return await self._completion_stream(model, prompt, sampling_params)
            else:
                response = await self.client.post(
                    "/v1/completions",
                    json=request_data
                )

                if response.status_code != 200:
                    raise Exception(f"vLLM API error: {response.status_code} - {response.text}")

                data = response.json()
                return CompletionResponse(**data)
        except Exception as e:
            logger.error(f"Completion error: {e}")
            raise

    async def _completion_stream(
        self,
        model: str,
        prompt: str,
        sampling_params: SamplingParams
    ) -> AsyncGenerator[str, None]:
        """流式文本补全"""
        request_data = {
            "model": model,
            "prompt": prompt,
            "temperature": sampling_params.temperature,
            "top_p": sampling_params.top_p,
            "top_k": sampling_params.top_k,
            "max_tokens": sampling_params.max_tokens,
            "stream": True,
        }

        if sampling_params.stop:
            request_data["stop"] = sampling_params.stop

        try:
            async with self.client.stream(
                "POST",
                "/v1/completions",
                json=request_data
            ) as response:
                async for line in response.aiter_lines():
                    if line and line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                yield data["choices"][0].get("text", "")
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Completion stream error: {e}")
            yield f"Error: {str(e)}"

    async def chat_completion(
        self,
        model: str,
        messages: List[ChatMessage],
        sampling_params: Optional[SamplingParams] = None,
        stream: bool = False
    ) -> ChatCompletionResponse:
        """聊天补全"""
        if sampling_params is None:
            sampling_params = SamplingParams()

        # 构建提示词
        prompt = self._build_prompt(messages)

        request_data = {
            "model": model,
            "prompt": prompt,
            "temperature": sampling_params.temperature,
            "top_p": sampling_params.top_p,
            "top_k": sampling_params.top_k,
            "max_tokens": sampling_params.max_tokens,
            "stream": stream,
        }

        if sampling_params.stop:
            request_data["stop"] = sampling_params.stop

        try:
            response = await self.client.post(
                "/v1/completions",
                json=request_data
            )

            if response.status_code != 200:
                raise Exception(f"vLLM API error: {response.status_code} - {response.text}")

            data = response.json()

            # 转换为聊天格式
            if "choices" in data and len(data["choices"]) > 0:
                choice = data["choices"][0]
                chat_choice = {
                    "index": choice.get("index", 0),
                    "message": {
                        "role": "assistant",
                        "content": choice.get("text", "")
                    },
                    "finish_reason": choice.get("finish_reason", "stop")
                }
                data["choices"] = [chat_choice]

            return ChatCompletionResponse(**data)
        except Exception as e:
            logger.error(f"Chat completion error: {e}")
            raise

    async def chat_completion_v2(
        self,
        model: str,
        messages: List[ChatMessage],
        sampling_params: Optional[SamplingParams] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """聊天补全 (OpenAI 兼容格式)"""
        if sampling_params is None:
            sampling_params = SamplingParams()

        # 转换为 OpenAI 格式
        messages_data = [msg.model_dump() for msg in messages]

        request_data = {
            "model": model,
            "messages": messages_data,
            "temperature": sampling_params.temperature,
            "top_p": sampling_params.top_p,
            "max_tokens": sampling_params.max_tokens,
            "stream": stream,
        }

        if sampling_params.stop:
            request_data["stop"] = sampling_params.stop

        try:
            response = await self.client.post(
                "/v1/chat/completions",
                json=request_data
            )

            if response.status_code != 200:
                raise Exception(f"vLLM API error: {response.status_code} - {response.text}")

            return response.json()
        except Exception as e:
            logger.error(f"Chat completion v2 error: {e}")
            raise

    def _build_prompt(self, messages: List[ChatMessage]) -> str:
        """构建提示词"""
        prompt_parts = []
        for msg in messages:
            if msg.role == "system":
                prompt_parts.append(f"System: {msg.content}")
            elif msg.role == "user":
                prompt_parts.append(f"User: {msg.content}")
            elif msg.role == "assistant":
                prompt_parts.append(f"Assistant: {msg.content}")

        prompt_parts.append("Assistant:")
        return "\n\n".join(prompt_parts)

    def get_supported_models(self) -> Dict[str, Dict[str, Any]]:
        """获取支持的模型列表"""
        return self.SUPPORTED_MODELS

    def get_model_config(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取模型配置"""
        return self.SUPPORTED_MODELS.get(model_name)

    async def get_server_info(self) -> Dict[str, Any]:
        """获取服务器信息"""
        try:
            response = await self.client.get("/v1/models")
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"Failed to get server info: {e}")
            return {}


# 全局服务实例
_vllm_service: Optional[VLLMService] = None


def get_vllm_service() -> VLLMService:
    """获取 vLLM 服务实例"""
    global _vllm_service
    if _vllm_service is None:
        _vllm_service = VLLMService()
    return _vllm_service


async def init_vllm_service() -> VLLMService:
    """初始化 vLLM 服务"""
    global _vllm_service
    _vllm_service = VLLMService()
    return _vllm_service


async def close_vllm_service():
    """关闭 vLLM 服务"""
    global _vllm_service
    if _vllm_service:
        await _vllm_service.close()
        _vllm_service = None