"""
Safety Wrapper for AI Services
AI 服务安全包装器 - 在 AI 输入输出时集成内容安全检查
"""
import os
import logging
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass

from .base import BaseAIService, AIServiceConfig
from .content_safety import (
    ContentSafetyService,
    ContentSafetyConfig,
    ViolationHandler,
    ContentSafetyResult,
    SafetyLevel,
    SafetyViolation
)
from .emotional_computing import EmotionalComputingService

logger = logging.getLogger(__name__)


@dataclass
class SafetyCheckResult:
    """安全检查结果数据类"""
    passed: bool
    blocked: bool
    filtered: bool
    safety_result: Optional[ContentSafetyResult]
    original_content: str
    processed_content: str
    violations: List[SafetyViolation]


class SafetyWrapper:
    """
    AI 服务安全包装器
    
    在 AI 服务的输入和输出阶段集成内容安全检查：
    - 输入过滤：检查用户提示词
    - 输出过滤：检查 AI 响应
    - 违规处理：处理检测到的违规
    """
    
    def __init__(
        self,
        ai_service: BaseAIService,
        safety_config: Optional[ContentSafetyConfig] = None,
        emotional_service: Optional[EmotionalComputingService] = None,
        enable_input_filter: bool = True,
        enable_output_filter: bool = True,
        enable_violation_handling: bool = True
    ):
        self.ai_service = ai_service
        self.safety_service = ContentSafetyService(
            config=safety_config,
            emotional_computing_service=emotional_service
        )
        self.violation_handler = ViolationHandler(self.safety_service)
        
        self.enable_input_filter = enable_input_filter
        self.enable_output_filter = enable_output_filter
        self.enable_violation_handling = enable_violation_handling
        
        # 回调函数
        self._on_violation_callbacks: List[Callable] = []
        self._on_blocked_callbacks: List[Callable] = []
    
    def add_violation_callback(self, callback: Callable):
        """添加违规回调"""
        self._on_violation_callbacks.append(callback)
    
    def add_blocked_callback(self, callback: Callable):
        """添加拦截回调"""
        self._on_blocked_callbacks.append(callback)
    
    async def generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        user_id: Optional[str] = None,
        skip_safety_check: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        带安全检查的生成方法
        
        流程：
        1. 检查用户输入（如果启用）
        2. 如果输入安全，调用 AI 服务
        3. 检查 AI 输出（如果启用）
        4. 返回安全的结果
        """
        # 1. 输入安全检查
        input_check = None
        if self.enable_input_filter and not skip_safety_check:
            input_check = await self._check_input(prompt, user_id)
            
            if input_check.blocked:
                await self._handle_blocked_input(input_check, user_id)
                return {
                    "success": False,
                    "error": "Input content blocked due to safety policy violation",
                    "safety_result": input_check.safety_result,
                    "violations": [v.type.value for v in input_check.violations]
                }
            
            if input_check.filtered:
                # 使用过滤后的内容
                prompt = input_check.processed_content
        
        # 2. 调用 AI 服务
        try:
            result = await self.ai_service.generate(prompt, system_message, **kwargs)
        except Exception as e:
            logger.error(f"AI service error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        
        # 3. 输出安全检查
        if self.enable_output_filter and not skip_safety_check and result.get("success"):
            output_content = result.get("text", "") or result.get("content", "")
            
            if output_content:
                output_check = await self._check_output(output_content, user_id)
                
                if output_check.blocked:
                    await self._handle_blocked_output(output_check, user_id)
                    return {
                        "success": False,
                        "error": "Output content blocked due to safety policy violation",
                        "safety_result": output_check.safety_result,
                        "violations": [v.type.value for v in output_check.violations]
                    }
                
                if output_check.filtered:
                    # 使用过滤后的内容
                    result["text"] = output_check.processed_content
                    result["filtered"] = True
                    result["safety_result"] = output_check.safety_result
        
        # 添加安全信息到结果
        if not skip_safety_check:
            result["safety_check"] = {
                "input_check": input_check.safety_result.__dict__ if input_check else None,
                "output_check": None  # 会在输出检查后填充
            }
        
        return result
    
    async def generate_stream(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        user_id: Optional[str] = None,
        skip_safety_check: bool = False,
        **kwargs
    ):
        """
        带安全检查的流式生成方法
        
        注意：流式输出无法在生成后过滤，
        会在流结束后进行整体检查
        """
        # 输入检查（非流式）
        if self.enable_input_filter and not skip_safety_check:
            input_check = await self._check_input(prompt, user_id)
            
            if input_check.blocked:
                await self._handle_blocked_input(input_check, user_id)
                yield {
                    "success": False,
                    "error": "Input content blocked",
                    "blocked": True
                }
                return
            
            if input_check.filtered:
                prompt = input_check.processed_content
        
        # 流式生成
        full_output = ""
        try:
            async for chunk in self.ai_service.generate_stream(prompt, system_message, **kwargs):
                if isinstance(chunk, dict):
                    text = chunk.get("text", "") or chunk.get("content", "")
                    full_output += text
                    yield chunk
                else:
                    full_output += str(chunk)
                    yield chunk
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield {
                "success": False,
                "error": str(e)
            }
            return
        
        # 流结束后检查输出
        if self.enable_output_filter and not skip_safety_check and full_output:
            output_check = await self._check_output(full_output, user_id)
            
            if output_check.blocked:
                await self._handle_blocked_output(output_check, user_id)
                # 注意：流式输出无法撤回已发送的内容
                # 这里可以记录日志或触发其他处理
                logger.warning(f"Stream output blocked after completion: {output_check.violations}")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        user_id: Optional[str] = None,
        skip_safety_check: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        带安全检查的聊天方法
        
        检查最后一条用户消息和 AI 响应
        """
        if not messages:
            return {"success": False, "error": "Empty messages"}
        
        # 获取最后一条用户消息
        user_messages = [m for m in messages if m.get("role") == "user"]
        last_user_message = user_messages[-1]["content"] if user_messages else ""
        
        # 输入检查
        input_check = None
        if self.enable_input_filter and not skip_safety_check and last_user_message:
            input_check = await self._check_input(last_user_message, user_id)
            
            if input_check.blocked:
                await self._handle_blocked_input(input_check, user_id)
                return {
                    "success": False,
                    "error": "Input content blocked",
                    "safety_result": input_check.safety_result
                }
        
        # 调用 AI 服务
        result = await self.ai_service.chat(messages, **kwargs)
        
        # 输出检查
        if self.enable_output_filter and not skip_safety_check and result.get("success"):
            output_content = result.get("text", "") or result.get("content", "")
            
            if output_content:
                output_check = await self._check_output(output_content, user_id)
                
                if output_check.blocked:
                    await self._handle_blocked_output(output_check, user_id)
                    return {
                        "success": False,
                        "error": "Output content blocked",
                        "safety_result": output_check.safety_result
                    }
                
                if output_check.filtered:
                    result["text"] = output_check.processed_content
                    result["filtered"] = True
        
        return result
    
    async def _check_input(
        self,
        content: str,
        user_id: Optional[str]
    ) -> SafetyCheckResult:
        """检查输入内容"""
        safety_result = await self.safety_service.filter_prompt(content, user_id)
        
        return self._create_check_result(
            content, safety_result
        )
    
    async def _check_output(
        self,
        content: str,
        user_id: Optional[str]
    ) -> SafetyCheckResult:
        """检查输出内容"""
        safety_result = await self.safety_service.check_output(content)
        
        return self._create_check_result(
            content, safety_result
        )
    
    def _create_check_result(
        self,
        original_content: str,
        safety_result: ContentSafetyResult
    ) -> SafetyCheckResult:
        """创建检查结果"""
        blocked = safety_result.safety_level in [
            SafetyLevel.BLOCKED,
            SafetyLevel.HIGH_RISK
        ]
        filtered = safety_result.action_taken == "filtered"
        
        return SafetyCheckResult(
            passed=safety_result.is_safe,
            blocked=blocked,
            filtered=filtered,
            safety_result=safety_result,
            original_content=original_content,
            processed_content=safety_result.filtered_content or original_content,
            violations=safety_result.violations
        )
    
    async def _handle_blocked_input(
        self,
        check_result: SafetyCheckResult,
        user_id: Optional[str]
    ):
        """处理被拦截的输入"""
        logger.warning(f"Input blocked for user {user_id}: {check_result.violations}")
        
        # 触发回调
        for callback in self._on_blocked_callbacks:
            try:
                await callback("input", user_id, check_result)
            except Exception as e:
                logger.error(f"Blocked callback error: {e}")
        
        # 触发违规处理
        if self.enable_violation_handling and user_id:
            for violation in check_result.violations:
                await self.violation_handler.handle_violation(
                    user_id, violation, check_result.safety_result
                )
    
    async def _handle_blocked_output(
        self,
        check_result: SafetyCheckResult,
        user_id: Optional[str]
    ):
        """处理被拦截的输出"""
        logger.warning(f"Output blocked for user {user_id}: {check_result.violations}")
        
        # 触发回调
        for callback in self._on_blocked_callbacks:
            try:
                await callback("output", user_id, check_result)
            except Exception as e:
                logger.error(f"Blocked callback error: {e}")
    
    def get_safety_stats(self) -> Dict[str, Any]:
        """获取安全统计信息"""
        return {
            "input_filter_enabled": self.enable_input_filter,
            "output_filter_enabled": self.enable_output_filter,
            "violation_handling_enabled": self.enable_violation_handling,
            "recent_violations": self.safety_service.get_violation_history(limit=10)
        }


def create_safe_service(
    ai_service: BaseAIService,
    config: Optional[ContentSafetyConfig] = None,
    emotional_service: Optional[EmotionalComputingService] = None
) -> SafetyWrapper:
    """
    工厂函数：创建带安全包装的 AI 服务
    
    Usage:
        openai_service = OpenAIService(config)
        safe_service = create_safe_service(openai_service)
        
        result = await safe_service.generate("Hello")
    """
    return SafetyWrapper(
        ai_service=ai_service,
        safety_config=config,
        emotional_service=emotional_service
    )


# 导出
__all__ = [
    "SafetyWrapper",
    "SafetyCheckResult",
    "create_safe_service",
]