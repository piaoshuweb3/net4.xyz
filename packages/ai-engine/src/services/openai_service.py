"""
OpenAI API Service
集成 GPT-4o 模型
"""
import os
import json
from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import logging

from .base import BaseAIService, AIServiceConfig

logger = logging.getLogger(__name__)


class OpenAIService(BaseAIService):
    """OpenAI GPT-4o 服务"""

    def __init__(self, config: AIServiceConfig):
        super().__init__(config)
        self.model_name = config.model_name or "gpt-4o"
        self._client = None

    def _get_client(self) -> ChatOpenAI:
        """获取或创建 OpenAI 客户端（支持 DeepSeek）"""
        if self._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            
            # 支持自定义 base_url（DeepSeek 等兼容 OpenAI 的 API）
            base_url = os.getenv("OPENAI_BASE_URL")  # DeepSeek: https://api.deepseek.com
            
            self._client = ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=base_url,  # 支持 DeepSeek API
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
            
            # 从响应中获取 token 使用信息
            usage = {}
            if hasattr(response, 'llm_output') and response.llm_output:
                usage = response.llm_output.get("token_usage", {})
            
            return {
                "success": True,
                "result": result,
                "model": self.model_name,
                "provider": "openai",
                "usage": {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                },
                "metadata": {
                    "response_id": response.id if hasattr(response, 'id') else None,
                    "model": self.model_name
                }
            }
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "openai"
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
            logger.error(f"OpenAI API stream error: {str(e)}")
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
                "provider": "openai"
            }
        except Exception as e:
            logger.error(f"OpenAI chat error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "openai"
            }

    def get_available_models(self) -> List[Dict[str, str]]:
        """获取可用模型列表"""
        return [
            {"id": "gpt-4o", "name": "GPT-4o", "status": "available"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "status": "available"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "status": "available"},
        ]

    async def health_check(self) -> bool:
        """健康检查"""
        try:
            client = self._get_client()
            # 发送一个简单的测试请求
            response = await self.generate("Hello", system_message="Reply with 'OK'")
            return response.get("success", False)
        except Exception:
            return False