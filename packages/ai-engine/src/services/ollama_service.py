"""
net4.xyz AI Engine - Ollama 本地模型服务
轨道 B：本地模型部署
支持 Llama 3 70B/405B、Mixtral 8x22B 等开源模型
"""
import os
import json
import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from enum import Enum
import logging

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ModelSize(str, Enum):
    """模型大小分类"""
    SMALL = "7b"      # 7B 参数
    MEDIUM = "70b"    # 70B 参数
    LARGE = "405b"    # 405B 参数
    MIXTRAL = "8x22b" # Mixtral 8x22B


class ModelFamily(str, Enum):
    """模型系列"""
    LLAMA = "llama"
    MIXTRAL = "mixtral"
    CUSTOM = "custom"


class ModelStatus(str, Enum):
    """模型状态"""
    AVAILABLE = "available"
    DOWNLOADING = "downloading"
    LOADED = "loaded"
    ERROR = "error"


class LocalModel(BaseModel):
    """本地模型信息"""
    name: str
    model_family: str
    size: str
    status: str
    size_bytes: Optional[int] = None
    modified_at: Optional[str] = None


class OllamaGenerateRequest(BaseModel):
    """Ollama 生成请求"""
    model: str
    prompt: str
    system: Optional[str] = None
    template: Optional[str] = None
    context: Optional[int] = None
    stream: bool = False
    raw: bool = False
    temperature: Optional[float] = Field(0.7, ge=0, le=2)
    top_p: Optional[float] = Field(0.9, ge=0, le=1)
    top_k: Optional[int] = Field(40, ge=0)
    num_predict: Optional[int] = Field(4096, ge=1, le=128000)
    stop: Optional[List[str]] = None


class OllamaChatMessage(BaseModel):
    """Ollama 聊天消息"""
    role: str
    content: str


class OllamaChatRequest(BaseModel):
    """Ollama 聊天请求"""
    model: str
    messages: List[OllamaChatMessage]
    stream: bool = False
    temperature: Optional[float] = Field(0.7, ge=0, le=2)
    top_p: Optional[float] = Field(0.9, ge=0, le=1)
    top_k: Optional[int] = Field(40, ge=0)
    num_predict: Optional[int] = Field(4096, ge=1, le=128000)
    stop: Optional[List[str]] = None


class OllamaResponse(BaseModel):
    """Ollama 响应"""
    model: str
    created_at: str
    response: str
    done: bool
    context: Optional[List[int]] = None
    total_duration: Optional[int] = None
    load_duration: Optional[int] = None
    prompt_eval_count: Optional[int] = None
    eval_count: Optional[int] = None
    eval_duration: Optional[int] = None


class OllamaService:
    """Ollama 本地模型服务"""

    # 支持的模型列表
    SUPPORTED_MODELS = {
        "llama3:70b": {
            "family": ModelFamily.LLAMA,
            "size": ModelSize.MEDIUM,
            "description": "Llama 3 70B - 高性能推理模型",
            "hardware": "H100/A100 或 RTX 4090",
            "context_length": 8192,
        },
        "llama3:405b": {
            "family": ModelFamily.LLAMA,
            "size": ModelSize.LARGE,
            "description": "Llama 3 405B - 超大规模推理模型",
            "hardware": "H100/A100 (多卡)",
            "context_length": 8192,
        },
        "llama3:8b": {
            "family": ModelFamily.LLAMA,
            "size": ModelSize.SMALL,
            "description": "Llama 3 8B - 轻量推理模型",
            "hardware": "RTX 3080+",
            "context_length": 8192,
        },
        "mixtral:8x22b": {
            "family": ModelFamily.MIXTRAL,
            "size": ModelSize.MIXTRAL,
            "description": "Mixtral 8x22B - 高效稀疏专家模型",
            "hardware": "H100/A100 或 RTX 4090",
            "context_length": 65536,
        },
        "mixtral:8x7b": {
            "family": ModelFamily.MIXTRAL,
            "size": ModelSize.SMALL,
            "description": "Mixtral 8x7B - 轻量稀疏专家模型",
            "hardware": "RTX 3090+",
            "context_length": 32768,
        },
    }

    def __init__(self, base_url: Optional[str] = None):
        """初始化 Ollama 服务"""
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.timeout = int(os.getenv("OLLAMA_TIMEOUT", "300"))
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=True
        )
        self._loaded_models: Dict[str, str] = {}  # model_name -> status

    async def close(self):
        """关闭客户端"""
        await self.client.aclose()

    async def check_health(self) -> bool:
        """检查 Ollama 服务健康状态"""
        try:
            response = await self.client.get("/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False

    async def list_models(self) -> List[LocalModel]:
        """列出已安装的模型"""
        try:
            response = await self.client.get("/api/tags")
            if response.status_code != 200:
                return []

            data = response.json()
            models = []

            for model in data.get("models", []):
                model_name = model.get("name", "")
                # 解析模型信息
                family = "unknown"
                size = "unknown"

                for supported, info in self.SUPPORTED_MODELS.items():
                    if supported in model_name:
                        family = info["family"].value
                        size = info["size"].value
                        break

                models.append(LocalModel(
                    name=model_name,
                    model_family=family,
                    size=size,
                    status=ModelStatus.AVAILABLE.value,
                    size_bytes=model.get("size"),
                    modified_at=model.get("modified_at")
                ))

            return models
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    async def pull_model(self, model_name: str, stream: bool = True) -> AsyncGenerator[str, None]:
        """下载模型"""
        try:
            async with self.client.stream(
                "POST",
                "/api/pull",
                json={"name": model_name, "stream": stream}
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            status = data.get("status", "")
                            if stream:
                                yield status
                            if data.get("completed", False):
                                logger.info(f"Model {model_name} pulled successfully")
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            yield f"Error: {str(e)}"

    async def delete_model(self, model_name: str) -> bool:
        """删除模型"""
        try:
            response = await self.client.delete(f"/api/delete/{model_name}")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to delete model {model_name}: {e}")
            return False

    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 40,
        num_predict: int = 4096,
        stream: bool = False
    ) -> OllamaResponse:
        """生成文本"""
        request = OllamaGenerateRequest(
            model=model,
            prompt=prompt,
            system=system,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            num_predict=num_predict,
            stream=stream
        )

        try:
            response = await self.client.post(
                "/api/generate",
                json=request.model_dump(exclude_none=True)
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code}")

            data = response.json()
            return OllamaResponse(**data)
        except Exception as e:
            logger.error(f"Generate error: {e}")
            raise

    async def generate_stream(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 40,
        num_predict: int = 4096
    ) -> AsyncGenerator[str, None]:
        """流式生成文本"""
        request = OllamaGenerateRequest(
            model=model,
            prompt=prompt,
            system=system,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            num_predict=num_predict,
            stream=True
        )

        try:
            async with self.client.stream(
                "POST",
                "/api/generate",
                json=request.model_dump(exclude_none=True)
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Generate stream error: {e}")
            yield f"Error: {str(e)}"

    async def chat(
        self,
        model: str,
        messages: List[OllamaChatMessage],
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 40,
        num_predict: int = 4096,
        stream: bool = False
    ) -> Dict[str, Any]:
        """聊天接口"""
        request = OllamaChatRequest(
            model=model,
            messages=messages,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            num_predict=num_predict,
            stream=stream
        )

        try:
            response = await self.client.post(
                "/api/chat",
                json=request.model_dump(exclude_none=True, exclude={"stream"})
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code}")

            return response.json()
        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise

    async def chat_stream(
        self,
        model: str,
        messages: List[OllamaChatMessage],
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 40,
        num_predict: int = 4096
    ) -> AsyncGenerator[str, None]:
        """流式聊天接口"""
        request = OllamaChatRequest(
            model=model,
            messages=messages,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            num_predict=num_predict,
            stream=True
        )

        try:
            async with self.client.stream(
                "POST",
                "/api/chat",
                json=request.model_dump(exclude_none=True)
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield f"Error: {str(e)}"

    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取模型详细信息"""
        try:
            response = await self.client.post(
                "/api/show",
                json={"name": model_name}
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            return None

    def get_supported_models(self) -> Dict[str, Dict[str, Any]]:
        """获取支持的模型列表"""
        return self.SUPPORTED_MODELS

    def get_model_requirements(self, model_name: str) -> Optional[Dict[str, Any]]:
        """获取模型硬件要求"""
        for supported, info in self.SUPPORTED_MODELS.items():
            if supported in model_name:
                return info
        return None


# 全局服务实例
_ollama_service: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """获取 Ollama 服务实例"""
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service


async def init_ollama_service() -> OllamaService:
    """初始化 Ollama 服务"""
    global _ollama_service
    _ollama_service = OllamaService()
    return _ollama_service


async def close_ollama_service():
    """关闭 Ollama 服务"""
    global _ollama_service
    if _ollama_service:
        await _ollama_service.close()
        _ollama_service = None