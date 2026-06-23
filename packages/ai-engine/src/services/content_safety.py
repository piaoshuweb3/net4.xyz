"""
Content Safety Service
AI 内容安全过滤服务 - 集成内容安全 API、输出过滤、违规处理和情感安全审核
"""
import os
import logging
import re
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class SafetyLevel(str, Enum):
    """安全等级"""
    SAFE = "safe"
    LOW_RISK = "low_risk"
    MEDIUM_RISK = "medium_risk"
    HIGH_RISK = "high_risk"
    BLOCKED = "blocked"


class ViolationType(str, Enum):
    """违规类型"""
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    SEXUAL = "sexual"
    SELF_HARM = "self_harm"
    HARASSMENT = "harassment"
    ILLEGAL_CONTENT = "illegal_content"
    SPAM = "spam"
    SENSITIVE_INFO = "sensitive_info"
    EMOTIONAL_MANIPULATION = "emotional_manipulation"


@dataclass
class SafetyViolation:
    """安全违规记录"""
    type: ViolationType
    severity: float  # 0-1
    description: str
    matched_content: str
    location: Dict[str, int] = field(default_factory=dict)  # start, end positions


@dataclass
class ContentSafetyResult:
    """内容安全检查结果"""
    is_safe: bool
    safety_level: SafetyLevel
    overall_score: float  # 0-1, higher = more unsafe
    violations: List[SafetyViolation] = field(default_factory=list)
    filtered_content: Optional[str] = None
    action_taken: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EmotionalSafetyResult:
    """情感安全审核结果"""
    is_safe: bool
    concerns: List[str] = field(default_factory=list)
    emotional_manipulation_score: float = 0.0
    recommended_response_tone: str = "neutral"
    warnings: List[str] = field(default_factory=list)


class ContentSafetyConfig(BaseModel):
    """内容安全配置"""
    # API 配置
    azure_content_safety_endpoint: Optional[str] = None
    azure_content_safety_key: Optional[str] = None
    aws_rekognition_enabled: bool = False
    custom_api_endpoint: Optional[str] = None
    custom_api_key: Optional[str] = None
    
    # 本地过滤配置
    enable_local_filter: bool = True
    blocked_keywords: List[str] = Field(default_factory=lambda: [
        "spam", "scam", "illegal", "prohibited", "phishing", "malware"
    ])
    blocked_patterns: List[str] = Field(default_factory=list)
    
    # 阈值配置
    hate_speech_threshold: float = 0.7
    violence_threshold: float = 0.7
    sexual_threshold: float = 0.7
    self_harm_threshold: float = 0.5
    harassment_threshold: float = 0.7
    emotional_manipulation_threshold: float = 0.6
    
    # 情感安全配置
    enable_emotional_safety: bool = True
    max_emotional_intensity: float = 8.5
    
    # 行为配置
    auto_block_high_risk: bool = True
    auto_filter_medium_risk: bool = True
    log_violations: bool = True


class ContentSafetyService:
    """AI 内容安全服务主类"""
    
    def __init__(
        self,
        config: Optional[ContentSafetyConfig] = None,
        emotional_computing_service: Any = None
    ):
        self.config = config or ContentSafetyConfig()
        self.emotional_service = emotional_computing_service
        self._init_local_filters()
        self._violation_history: List[Dict[str, Any]] = []
    
    def _init_local_filters(self):
        """初始化本地过滤器"""
        # 编译正则表达式模式
        self._compiled_patterns: List[re.Pattern] = []
        for pattern in self.config.blocked_patterns:
            try:
                self._compiled_patterns.append(re.compile(pattern, re.IGNORECASE))
            except re.error as e:
                logger.warning(f"Invalid regex pattern '{pattern}': {e}")
        
        # 敏感词集合（用于快速查找）
        self._blocked_set: Set[str] = set(
            kw.lower() for kw in self.config.blocked_keywords
        )
    
    async def check_content(
        self,
        content: str,
        content_type: str = "text",
        user_id: Optional[str] = None,
        check_emotional: bool = True
    ) -> ContentSafetyResult:
        """
        检查内容安全性
        
        Args:
            content: 待检查的内容
            content_type: 内容类型 (text, image, etc.)
            user_id: 用户 ID（用于日志）
            check_emotional: 是否检查情感安全
        
        Returns:
            ContentSafetyResult: 安全检查结果
        """
        start_time = datetime.utcnow()
        
        violations: List[SafetyViolation] = []
        overall_score = 0.0
        
        # 1. 本地关键词过滤
        local_violations = self._check_local_keywords(content)
        violations.extend(local_violations)
        
        # 2. 本地正则过滤
        pattern_violations = self._check_local_patterns(content)
        violations.extend(pattern_violations)
        
        # 3. 外部 API 检查（如果配置了）
        if self.config.azure_content_safety_endpoint:
            api_violations = await self._check_azure_content_safety(content)
            violations.extend(api_violations)
        
        # 4. 计算总体安全评分
        if violations:
            # 取最高严重程度的违规
            overall_score = max(v.severity for v in violations)
        
        # 5. 情感安全检查
        emotional_result = None
        if check_emotional and self.config.enable_emotional_safety and self.emotional_service:
            emotional_result = await self._check_emotional_safety(content)
            if emotional_result and not emotional_result.is_safe:
                violations.append(SafetyViolation(
                    type=ViolationType.EMOTIONAL_MANIPULATION,
                    severity=emotional_result.emotional_manipulation_score,
                    description="Potential emotional manipulation detected",
                    matched_content=content[:100]
                ))
                overall_score = max(overall_score, emotional_result.emotional_manipulation_score)
        
        # 6. 确定安全等级和采取的行动
        safety_level = self._calculate_safety_level(overall_score)
        action_taken = None
        filtered_content = None
        
        if safety_level == SafetyLevel.BLOCKED:
            action_taken = "blocked"
            filtered_content = "[内容已被拦截]"
        elif safety_level == SafetyLevel.HIGH_RISK and self.config.auto_block_high_risk:
            action_taken = "blocked"
            filtered_content = "[内容已被拦截]"
        elif safety_level == SafetyLevel.MEDIUM_RISK and self.config.auto_filter_medium_risk:
            action_taken = "filtered"
            filtered_content = self._filter_content(content, violations)
        
        is_safe = safety_level in [SafetyLevel.SAFE, SafetyLevel.LOW_RISK]
        
        result = ContentSafetyResult(
            is_safe=is_safe,
            safety_level=safety_level,
            overall_score=overall_score,
            violations=violations,
            filtered_content=filtered_content,
            action_taken=action_taken,
            metadata={
                "content_type": content_type,
                "user_id": user_id,
                "check_duration_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                "emotional_check_performed": check_emotional,
                "emotional_result": {
                    "is_safe": emotional_result.is_safe,
                    "concerns": emotional_result.concerns,
                    "emotional_manipulation_score": emotional_result.emotional_manipulation_score,
                    "recommended_response_tone": emotional_result.recommended_response_tone,
                    "warnings": emotional_result.warnings
                } if emotional_result else None
            }
        )
        
        # 7. 记录违规日志
        if self.config.log_violations and not is_safe:
            self._log_violation(user_id, content, violations, safety_level)
        
        return result
    
    def _check_local_keywords(self, content: str) -> List[SafetyViolation]:
        """本地关键词检查"""
        violations = []
        content_lower = content.lower()
        words = content_lower.split()
        
        for i, word in enumerate(words):
            # 检查单词边界
            for blocked in self._blocked_set:
                if blocked in word:
                    # 确定违规类型
                    violation_type = self._classify_keyword_violation(blocked)
                    violations.append(SafetyViolation(
                        type=violation_type,
                        severity=0.8,
                        description=f"Blocked keyword detected: {blocked}",
                        matched_content=word,
                        location={"word_index": i, "start": content_lower.find(blocked), "end": content_lower.find(blocked) + len(blocked)}
                    ))
        
        return violations
    
    def _check_local_patterns(self, content: str) -> List[SafetyViolation]:
        """本地正则模式检查"""
        violations = []
        
        for pattern in self._compiled_patterns:
            matches = pattern.finditer(content)
            for match in matches:
                violations.append(SafetyViolation(
                    type=ViolationType.ILLEGAL_CONTENT,
                    severity=0.9,
                    description=f"Pattern match: {pattern.pattern}",
                    matched_content=match.group(),
                    location={"start": match.start(), "end": match.end()}
                ))
        
        return violations
    
    def _classify_keyword_violation(self, keyword: str) -> ViolationType:
        """根据关键词分类违规类型"""
        keyword_lower = keyword.lower()
        
        if keyword_lower in ["spam", "scam"]:
            return ViolationType.SPAM
        elif keyword_lower in ["illegal", "prohibited"]:
            return ViolationType.ILLEGAL_CONTENT
        elif keyword_lower in ["phishing"]:
            return ViolationType.SENSITIVE_INFO
        elif keyword_lower in ["malware"]:
            return ViolationType.ILLEGAL_CONTENT
        else:
            return ViolationType.ILLEGAL_CONTENT
    
    async def _check_azure_content_safety(
        self,
        content: str
    ) -> List[SafetyViolation]:
        """Azure 内容安全 API 检查"""
        violations = []
        
        if not self.config.azure_content_safety_endpoint:
            return violations
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.config.azure_content_safety_endpoint}/contentsafety/text:analyze",
                    headers={
                        "Ocp-Apim-Subscription-Key": self.config.azure_content_safety_key or "",
                        "Content-Type": "application/json"
                    },
                    json={
                        "text": content,
                        "categories": [
                            "HateSpeech",
                            "Violence",
                            "Sexual",
                            "SelfHarm",
                            "Harassment"
                        ],
                        "outputType": "FourSeverityLevels"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    violations.extend(self._parse_azure_response(data))
                else:
                    logger.warning(f"Azure content safety API error: {response.status_code}")
        
        except Exception as e:
            logger.error(f"Azure content safety check failed: {e}")
        
        return violations
    
    def _parse_azure_response(self, data: Dict[str, Any]) -> List[SafetyViolation]:
        """解析 Azure API 响应"""
        violations = []
        
        category_scores = {
            "HateSpeech": (self.config.hate_speech_threshold, ViolationType.HATE_SPEECH),
            "Violence": (self.config.violence_threshold, ViolationType.VIOLENCE),
            "Sexual": (self.config.sexual_threshold, ViolationType.SEXUAL),
            "SelfHarm": (self.config.self_harm_threshold, ViolationType.SELF_HARM),
            "Harassment": (self.config.harassment_threshold, ViolationType.HARASSMENT),
        }
        
        for category, (threshold, violation_type) in category_scores.items():
            if category in data:
                # Azure 返回 0-6 的严重程度
                severity = data[category].get("severity", 0) / 6.0
                if severity >= threshold:
                    violations.append(SafetyViolation(
                        type=violation_type,
                        severity=severity,
                        description=f"Azure detected {category} with severity {severity}",
                        matched_content=""
                    ))
        
        return violations
    
    async def _check_emotional_safety(
        self,
        content: str
    ) -> Optional[EmotionalSafetyResult]:
        """情感安全审核"""
        if not self.emotional_service:
            return None
        
        try:
            # 分析内容情感
            analysis = await self.emotional_service.analyze_emotion(content)
            
            concerns = []
            warnings = []
            emotional_manipulation_score = 0.0
            
            # 检查情感强度是否过高
            if analysis.intensity > self.config.max_emotional_intensity:
                concerns.append(f"High emotional intensity: {analysis.intensity}/10")
                emotional_manipulation_score += 0.3
            
            # 检查负面情感占比
            negative_emotions = ["sadness", "anger", "fear", "disgust"]
            negative_score = sum(
                score.score for score in analysis.emotion_scores
                if score.emotion in negative_emotions
            )
            
            if negative_score > 0.6:
                concerns.append("High proportion of negative emotions")
                emotional_manipulation_score += 0.2
            
            # 检查可能的情感操控
            if analysis.sentiment.value == "negative" and analysis.intensity > 7:
                warnings.append("Potential emotional manipulation: highly negative content")
                emotional_manipulation_score += 0.3
            
            # 检查极端正面情感（可能的操纵）
            if analysis.sentiment.value == "positive" and analysis.intensity > 9:
                warnings.append("Extremely positive tone may indicate manipulation")
                emotional_manipulation_score += 0.1
            
            is_safe = emotional_manipulation_score < self.config.emotional_manipulation_threshold
            
            # 确定推荐的响应语调
            if emotional_manipulation_score > 0.5:
                recommended_tone = "cautious"
            elif emotional_manipulation_score > 0.3:
                recommended_tone = "balanced"
            else:
                recommended_tone = "natural"
            
            return EmotionalSafetyResult(
                is_safe=is_safe,
                concerns=concerns,
                emotional_manipulation_score=emotional_manipulation_score,
                recommended_response_tone=recommended_tone,
                warnings=warnings
            )
        
        except Exception as e:
            logger.error(f"Emotional safety check failed: {e}")
            return None
    
    def _calculate_safety_level(self, score: float) -> SafetyLevel:
        """根据分数计算��全等级"""
        if score == 0:
            return SafetyLevel.SAFE
        elif score < 0.3:
            return SafetyLevel.LOW_RISK
        elif score < 0.6:
            return SafetyLevel.MEDIUM_RISK
        elif score < 0.8:
            return SafetyLevel.HIGH_RISK
        else:
            return SafetyLevel.BLOCKED
    
    def _filter_content(
        self,
        content: str,
        violations: List[SafetyViolation]
    ) -> str:
        """过滤内容 - 替换违规部分"""
        filtered = content
        
        # 按位置排序，从后向前替换（避免索引偏移）
        sorted_violations = sorted(
            violations,
            key=lambda v: v.location.get("start", 0),
            reverse=True
        )
        
        for violation in sorted_violations:
            start = violation.location.get("start", 0)
            end = violation.location.get("end", len(filtered))
            
            if start >= 0 and end <= len(filtered):
                filtered = filtered[:start] + "[已过滤]" + filtered[end:]
        
        return filtered
    
    def _log_violation(
        self,
        user_id: Optional[str],
        content: str,
        violations: List[SafetyViolation],
        safety_level: SafetyLevel
    ):
        """记录违规日志"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "violation_count": len(violations),
            "violation_types": [v.type.value for v in violations],
            "safety_level": safety_level.value,
            "content_preview": content[:200] if len(content) > 200 else content
        }
        
        self._violation_history.append(log_entry)
        
        # 保持历史记录在限制内
        max_history = 1000
        if len(self._violation_history) > max_history:
            self._violation_history = self._violation_history[-max_history:]
        
        logger.warning(f"Content safety violation: {log_entry}")
    
    def get_violation_history(
        self,
        user_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """获取违规历史"""
        if user_id:
            return [
                v for v in self._violation_history
                if v.get("user_id") == user_id
            ][:limit]
        return self._violation_history[:limit]
    
    async def check_output(
        self,
        ai_output: str,
        original_prompt: Optional[str] = None
    ) -> ContentSafetyResult:
        """
        检查 AI 输出内容的安全性
        这是输出过滤的核心方法
        """
        return await self.check_content(
            content=ai_output,
            content_type="ai_output",
            check_emotional=True
        )
    
    async def filter_prompt(
        self,
        user_prompt: str,
        user_id: Optional[str] = None
    ) -> ContentSafetyResult:
        """
        检查用户输入提示词的安全性
        在发送给 AI 之前进行过滤
        """
        return await self.check_content(
            content=user_prompt,
            content_type="user_prompt",
            user_id=user_id,
            check_emotional=False  # 输入不进行情感检查
        )


class ViolationHandler:
    """违规处理处理器"""
    
    def __init__(self, content_safety_service: ContentSafetyService):
        self.content_safety = content_safety_service
        self._escalation_rules: Dict[ViolationType, int] = {
            ViolationType.SELF_HARM: 3,  # 3次触发则升级
            ViolationType.VIOLENCE: 3,
            ViolationType.ILLEGAL_CONTENT: 1,  # 直接升级
            ViolationType.EMOTIONAL_MANIPULATION: 2,
        }
        self._user_violation_counts: Dict[str, Dict[ViolationType, int]] = {}
    
    async def handle_violation(
        self,
        user_id: str,
        violation: SafetyViolation,
        result: ContentSafetyResult
    ) -> Dict[str, Any]:
        """
        处理违规事件
        
        Returns:
            处理结果，包含采取的行动
        """
        # 更新用户违规计数
        self._update_violation_count(user_id, violation.type)
        
        # 检查是否需要升级
        should_escalate = self._should_escalate(user_id, violation.type)
        
        actions = []
        
        # 根据违规类型和严重程度采取行动
        if result.safety_level == SafetyLevel.BLOCKED:
            actions.append({
                "action": "block_content",
                "reason": "Content blocked due to high risk",
                "duration": None
            })
        
        if should_escalate:
            actions.append({
                "action": "escalate_to_admin",
                "reason": f"User exceeded {violation.type.value} threshold",
                "user_id": user_id
            })
        
        if violation.type == ViolationType.SELF_HARM:
            actions.append({
                "action": "show_crisis_resources",
                "reason": "Self-harm content detected"
            })
        
        # 记录处理结果
        handling_result = {
            "user_id": user_id,
            "violation_type": violation.type.value,
            "severity": violation.severity,
            "actions_taken": actions,
            "should_ban": should_escalate and self._get_violation_count(user_id, violation.type) >= 5,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.warning(f"Violation handled: {handling_result}")
        
        return handling_result
    
    def _update_violation_count(self, user_id: str, violation_type: ViolationType):
        """更新用户违规计数"""
        if user_id not in self._user_violation_counts:
            self._user_violation_counts[user_id] = {}
        
        current = self._user_violation_counts[user_id].get(violation_type, 0)
        self._user_violation_counts[user_id][violation_type] = current + 1
    
    def _get_violation_count(self, user_id: str, violation_type: ViolationType) -> int:
        """获取用户特定违规类型的计数"""
        return self._user_violation_counts.get(user_id, {}).get(violation_type, 0)
    
    def _should_escalate(self, user_id: str, violation_type: ViolationType) -> bool:
        """判断是否应该升级处理"""
        threshold = self._escalation_rules.get(violation_type, 3)
        return self._get_violation_count(user_id, violation_type) >= threshold
    
    def reset_user_violations(self, user_id: str):
        """重置用户违规计数"""
        if user_id in self._user_violation_counts:
            del self._user_violation_counts[user_id]


# 导出
__all__ = [
    "ContentSafetyService",
    "ViolationHandler",
    "ContentSafetyConfig",
    "SafetyLevel",
    "ViolationType",
    "SafetyViolation",
    "ContentSafetyResult",
    "EmotionalSafetyResult",
]