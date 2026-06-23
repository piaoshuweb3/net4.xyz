"""
DeepSeek API Service
DeepSeek API (兼容 OpenAI 格式)
"""
import os
import json
from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
import logging

from .base import BaseAIService, AIServiceConfig

logger = logging.getLogger(__name__)


class DeepSeekService(BaseAIService):
    """DeepSeek API 服务 (兼容 OpenAI 格式)"""

    def __init__(self, config: AIServiceConfig):
        super().__init__(config)
        self.model_name = config.model_name or "deepseek-chat"
        self._client = None

    def _get_client(self) -> ChatOpenAI:
        """获取或创建 DeepSeek 客户端"""
        if self._client is None:
            api_key = os.getenv("DEEPSEEK_API_KEY")
            if not api_key:
                raise ValueError("DEEPSEEK_API_KEY environment variable not set")
        
            base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        
            self._client = ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                timeout=self.config.timeout,
                max_retries=self.config.max_retries,
            )
        return self._client

    async def generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """生成文本响应"""
        messages = []
        if system_message:
            messages.append(SystemMessage(content=system_message))
        messages.append(HumanMessage(content=prompt))

        try:
            client = self._get_client()
            response = await client.agenerate([messages])
        
            result = response.generations[0][0].text
        
            return {
                "success": True,
                "result": result,
                "model": self.model_name,
                "provider": "deepseek",
                "usage": {
                    "prompt_tokens": response.llm_output.get("token_usage", {}).get("prompt_tokens", 0),
                    "completion_tokens": response.llm_output.get("token_usage", {}).get("completion_tokens", 0),
                    "total_tokens": response.llm_output.get("token_usage", {}).get("total_tokens", 0),
                },
                "metadata": {
                    "response_id": response.llm_output.get("id") if hasattr(response, 'llm_output') else None,
                    "model": self.model_name
                }
            }
        except Exception as e:
            logger.error(f"DeepSeek API error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "deepseek"
            }

    async def generate_stream(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        **kwargs
    ):
        """流式生成文本响应"""
        messages = []
        if system_message:
            messages.append(SystemMessage(content=system_message))
        messages.append(HumanMessage(content=prompt))

        try:
            client = self._get_client()
            async for chunk in client.astream(messages):
                yield chunk.content
        except Exception as e:
            logger.error(f"DeepSeek API stream error: {str(e)}")
            yield f"Error: {str(e)}"

    async def chat(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """聊天接口"""
        langchain_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                langchain_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                langchain_messages.append(AIMessage(content=content))
            else:
                langchain_messages.append(HumanMessage(content=content))

        try:
            client = self._get_client()
            response = await client.agenerate([langchain_messages])
            result = response.generations[0][0].text

            return {
                "success": True,
                "result": result,
                "model": self.model_name,
                "provider": "deepseek"
            }
        except Exception as e:
            logger.error(f"DeepSeek chat error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "deepseek"
            }

    def get_available_models(self) -> List[Dict[str, str]]:
        """获取可用模型列表"""
        return [
            {"id": "deepseek-chat", "name": "DeepSeek V3", "status": "available"},
            {"id": "deepseek-reasoner", "name": "DeepSeek R1", "status": "available"},
        ]

    async def health_check(self) -> bool:
        """健康检查"""
        try:
            client = self._get_client()
            # 发送一个简单的测试请求
            from langchain_core.messages import HumanMessage
            response = await client.agenerate([[HumanMessage(content="Hello")]])
            return len(response.generations) > 0
        except Exception as e:
            logger.error(f"DeepSeek health check failed: {str(e)}")
            return False
