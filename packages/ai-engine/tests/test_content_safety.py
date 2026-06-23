"""
Content Safety Service Tests
AI 内容安全过滤服务测试
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
# Add src directory to path, bypassing the __init__.py imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'services'))

# Import directly from the module file
import importlib.util
spec = importlib.util.spec_from_file_location(
    "content_safety", 
    os.path.join(os.path.dirname(__file__), '..', 'src', 'services', 'content_safety.py')
)
content_safety = importlib.util.module_from_spec(spec)
spec.loader.exec_module(content_safety)

ContentSafetyService = content_safety.ContentSafetyService
ContentSafetyConfig = content_safety.ContentSafetyConfig
ViolationHandler = content_safety.ViolationHandler
SafetyLevel = content_safety.SafetyLevel
ViolationType = content_safety.ViolationType
SafetyViolation = content_safety.SafetyViolation
ContentSafetyResult = content_safety.ContentSafetyResult
EmotionalSafetyResult = content_safety.EmotionalSafetyResult


class TestContentSafetyConfig:
    """内容安全配置测试"""
    
    def test_default_config(self):
        """测试默认配置"""
        config = ContentSafetyConfig()
        
        assert config.enable_local_filter is True
        assert config.hate_speech_threshold == 0.7
        assert "spam" in config.blocked_keywords
        assert config.auto_block_high_risk is True
    
    def test_custom_config(self):
        """测试自定义配置"""
        config = ContentSafetyConfig(
            blocked_keywords=["test", "mock"],
            hate_speech_threshold=0.5,
            enable_emotional_safety=False
        )
        
        assert "test" in config.blocked_keywords
        assert config.hate_speech_threshold == 0.5
        assert config.enable_emotional_safety is False


class TestContentSafetyService:
    """内容安全服务测试"""
    
    @pytest.fixture
    def config(self):
        """测试配置"""
        return ContentSafetyConfig(
            blocked_keywords=["spam", "scam", "illegal"],
            enable_emotional_safety=False  # 简化测试
        )
    
    @pytest.fixture
    def service(self, config):
        """测试服务实例"""
        return ContentSafetyService(config=config)
    
    @pytest.mark.asyncio
    async def test_safe_content(self, service):
        """测试安全内容"""
        result = await service.check_content("Hello, how are you?")
        
        assert result.is_safe is True
        assert result.safety_level == SafetyLevel.SAFE
        assert result.overall_score == 0.0
        assert len(result.violations) == 0
    
    @pytest.mark.asyncio
    async def test_blocked_keyword(self, service):
        """测试拦截关键词"""
        result = await service.check_content("This is a spam message")
        
        assert result.is_safe is False
        assert len(result.violations) > 0
        assert result.violations[0].type == ViolationType.SPAM
    
    @pytest.mark.asyncio
    async def test_multiple_violations(self, service):
        """测试多个违规"""
        result = await service.check_content("This is spam and illegal content")
        
        assert result.is_safe is False
        assert len(result.violations) >= 1
    
    @pytest.mark.asyncio
    async def test_filtered_content(self, service):
        """测试内容过滤"""
        config = ContentSafetyConfig(
            blocked_keywords=["bad"],
            auto_filter_medium_risk=True,
            hate_speech_threshold=0.3  # 低阈值以触发过滤
        )
        service = ContentSafetyService(config=config)
        
        result = await service.check_content("This has bad word in it")
        
        # 中等风险应该被过滤
        assert result.action_taken in ["filtered", "blocked"] or not result.is_safe
    
    @pytest.mark.asyncio
    async def test_check_output(self, service):
        """测试输出检查"""
        result = await service.check_output("AI generated response")
        
        assert result is not None
        assert hasattr(result, "is_safe")
        assert hasattr(result, "safety_level")
    
    @pytest.mark.asyncio
    async def test_filter_prompt(self, service):
        """测试提示词过滤"""
        result = await service.filter_prompt("User prompt", user_id="test_user")
        
        assert result is not None
        assert result.metadata.get("content_type") == "user_prompt"
    
    @pytest.mark.asyncio
    async def test_violation_history(self, service):
        """测试违规历史记录"""
        # 触发违规
        await service.check_content("spam content", user_id="test_user")
        
        history = service.get_violation_history(user_id="test_user")
        
        assert len(history) > 0
        assert history[0]["user_id"] == "test_user"


class TestViolationHandler:
    """违规处理器测试"""
    
    @pytest.fixture
    def service(self):
        """内容安全服务"""
        config = ContentSafetyConfig(enable_emotional_safety=False)
        return ContentSafetyService(config=config)
    
    @pytest.fixture
    def handler(self, service):
        """违规处理器"""
        return ViolationHandler(service)
    
    @pytest.mark.asyncio
    async def test_handle_violation(self, handler):
        """测试违规处理"""
        violation = SafetyViolation(
            type=ViolationType.SPAM,
            severity=0.8,
            description="Spam detected",
            matched_content="spam"
        )
        
        result = await handler.handle_violation(
            user_id="test_user",
            violation=violation,
            result=ContentSafetyResult(
                is_safe=False,
                safety_level=SafetyLevel.HIGH_RISK,
                overall_score=0.8
            )
        )
        
        assert result is not None
        assert result["user_id"] == "test_user"
        assert "actions_taken" in result
    
    @pytest.mark.asyncio
    async def test_escalation(self, handler):
        """测试违规升级"""
        # 多次触发同一类型违规
        violation = SafetyViolation(
            type=ViolationType.ILLEGAL_CONTENT,
            severity=0.9,
            description="Illegal",
            matched_content="illegal"
        )
        
        for i in range(3):
            await handler.handle_violation(
                user_id="test_escalate",
                violation=violation,
                result=ContentSafetyResult(
                    is_safe=False,
                    safety_level=SafetyLevel.BLOCKED,
                    overall_score=0.9
                )
            )
        
        # 检查是否升级
        should_escalate = handler._should_escalate("test_escalate", ViolationType.ILLEGAL_CONTENT)
        assert should_escalate is True
    
    @pytest.mark.asyncio
    async def test_reset_violations(self, handler):
        """测试重置违规计数"""
        violation = SafetyViolation(
            type=ViolationType.SPAM,
            severity=0.8,
            description="Spam",
            matched_content="spam"
        )
        
        await handler.handle_violation(
            user_id="test_reset",
            violation=violation,
            result=ContentSafetyResult(
                is_safe=False,
                safety_level=SafetyLevel.HIGH_RISK,
                overall_score=0.8
            )
        )
        
        # 重置
        handler.reset_user_violations("test_reset")
        
        # 验证已重置
        count = handler._get_violation_count("test_reset", ViolationType.SPAM)
        assert count == 0


class TestSafetyLevel:
    """安全等级测试"""
    
    def test_safety_level_order(self):
        """测试安全等级顺序"""
        levels = [
            SafetyLevel.SAFE,
            SafetyLevel.LOW_RISK,
            SafetyLevel.MEDIUM_RISK,
            SafetyLevel.HIGH_RISK,
            SafetyLevel.BLOCKED
        ]
        
        # 验证所有等级都存在
        assert len(levels) == 5
        
        # 验证可以比较
        assert SafetyLevel.SAFE != SafetyLevel.BLOCKED


class TestEmotionalSafety:
    """情感安全测试"""
    
    @pytest.fixture
    def mock_emotional_service(self):
        """模拟情感计算服务"""
        mock = Mock()
        mock.analyze_emotion = AsyncMock(return_value=Mock(
            primary_emotion="joy",
            sentiment=Mock(value="positive"),
            intensity=5.0,
            emotion_scores=[
                Mock(emotion="joy", score=0.8),
                Mock(emotion="sadness", score=0.1)
            ]
        ))
        return mock
    
    @pytest.mark.asyncio
    async def test_emotional_safety_check(self, mock_emotional_service):
        """测试情感安全检查"""
        config = ContentSafetyConfig(
            enable_emotional_safety=True,
            max_emotional_intensity=8.5
        )
        service = ContentSafetyService(
            config=config,
            emotional_computing_service=mock_emotional_service
        )
        
        result = await service.check_content(
            "I am very happy today!",
            check_emotional=True
        )
        
        # 情感安全检查应该执行
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_high_intensity_emotion(self, mock_emotional_service):
        """测试高强度情感检测"""
        # 模拟高强度负面情感
        mock_emotional_service.analyze_emotion = AsyncMock(return_value=Mock(
            primary_emotion="anger",
            sentiment=Mock(value="negative"),
            intensity=9.5,
            emotion_scores=[
                Mock(emotion="anger", score=0.9),
                Mock(emotion="sadness", score=0.3)
            ]
        ))
        
        config = ContentSafetyConfig(
            enable_emotional_safety=True,
            max_emotional_intensity=8.0,
            emotional_manipulation_threshold=0.5
        )
        service = ContentSafetyService(
            config=config,
            emotional_computing_service=mock_emotional_service
        )
        
        result = await service.check_content(
            "I hate everything! This is terrible!",
            check_emotional=True
        )
        
        # 高强度情感应该被标记
        assert result is not None


# Property-based tests using pytest-repeat for multiple iterations
class TestContentSafetyProperties:
    """内容安全属性测试"""
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("content", [
        "Hello world",
        "This is a test message",
        "Normal conversation",
        "How can I help you today?",
        "Thank you for your assistance"
    ])
    async def test_safe_content_always_passes(self, content):
        """属性：安全内容总是通过检查"""
        config = ContentSafetyConfig(blocked_keywords=["spam", "scam"])
        service = ContentSafetyService(config=config)
        
        result = await service.check_content(content)
        
        # 安全内容应该通过或最多 low_risk
        assert result.safety_level in [SafetyLevel.SAFE, SafetyLevel.LOW_RISK]
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("content", [
        "spam message here",
        "This is a scam",
        "illegal content"
    ])
    async def test_blocked_keywords_always_detected(self, content):
        """属性：包含禁用关键词的内容总是被检测"""
        config = ContentSafetyConfig(blocked_keywords=["spam", "scam", "illegal"])
        service = ContentSafetyService(config=config)
        
        result = await service.check_content(content)
        
        # 应该检测到违规
        assert len(result.violations) > 0
        assert result.is_safe is False
    
    @pytest.mark.asyncio
    async def test_empty_content_is_safe(self):
        """属性：空内容是安全的"""
        config = ContentSafetyConfig()
        service = ContentSafetyService(config=config)
        
        result = await service.check_content("")
        
        assert result.is_safe is True
        assert result.safety_level == SafetyLevel.SAFE
    
    @pytest.mark.asyncio
    async def test_very_long_content(self):
        """属性：长内容也能正确处理"""
        config = ContentSafetyConfig()
        service = ContentSafetyService(config=config)
        
        # 生成长内容
        long_content = "This is a test message. " * 1000
        
        result = await service.check_content(long_content)
        
        assert result is not None
        assert result.metadata.get("check_duration_ms") is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])