"""
Base AI Service
所有 AI 服务的基础抽象类
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class AIServiceConfig(BaseModel):
    """AI 服务配置"""
    model_name: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: int = 60
    max_retries: int = 3
    api_key: Optional[str] = None


class BaseAIService(ABC):
    """AI 服务基类"""

    def __init__(self, config: AIServiceConfig):
        self.config = config

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """生成文本响应"""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        **kwargs
    ):
        """流式生成文本响应"""
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """聊天接口"""
        pass

    @abstractmethod
    def get_available_models(self) -> List[Dict[str, str]]:
        """获取可用模型列表"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """健康检查"""
        pass