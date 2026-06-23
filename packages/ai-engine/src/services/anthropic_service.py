"""
Anthropic API Service
集成 Claude 3.5 模型
"""
import os
from typing import Optional, Dict, Any, List
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
import logging

from .base import BaseAIService, AIServiceConfig

logger = logging.getLogger(__name__)


class AnthropicService(BaseAIService):
    """Anthropic Claude 3.5 服务"""

    def __init__(self, config: AIServiceConfig):
        super().__init__(config)
        self.model_name = config.model_name or "claude-3-5-sonnet-20241022"
        self._client = None

    def _get_client(self) -> ChatAnthropic:
        """获取或创建 Anthropic 客户端"""
        if self._client is None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable not set")

            self._client = ChatAnthropic(
                model=self.model_name,
                api_key=api_key,
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
            
            # 获取使用统计
            usage = {}
            if hasattr(response, 'llm_output') and response.llm_output:
                usage = response.llm_output.get('usage', {})
            
            return {
                "success": True,
                "result": result,
                "model": self.model_name,
                "provider": "anthropic",
                "usage": usage,
                "metadata": {
                    "response_id": response.id if hasattr(response, 'id') else None,
                    "model": self.model_name
                }
            }
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "anthropic"
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
            logger.error(f"Anthropic API stream error: {str(e)}")
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
                "provider": "anthropic"
            }
        except Exception as e:
            logger.error(f"Anthropic chat error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "provider": "anthropic"
            }

    def get_available_models(self) -> List[Dict[str, str]]:
        """获取可用模型列表"""
        return [
            {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "status": "available"},
            {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "status": "available"},
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "status": "available"},
        ]

    async def health_check(self) -> bool:
        """健康检查"""
        try:
            client = self._get_client()
            response = await self.generate("Hello", system_message="Reply with 'OK'")
            return response.get("success", False)
        except Exception:
            return False