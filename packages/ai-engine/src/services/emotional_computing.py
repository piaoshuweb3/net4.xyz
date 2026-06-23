"""
Emotional Computing Service
情感计算服务 - PoUE 共识机制核心组件
"""
import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
# LLMChain is not available, using LLM directly
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class EmotionType(str, Enum):
    """情感类型"""
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "surprise"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    NEUTRAL = "neutral"
    ANTICIPATION = "anticipation"
    TRUST = "trust"
    ADMIRATION = "admiration"
    INTEREST = "interest"
    CONFUSION = "confusion"


class EmotionalTone(str, Enum):
    """情感色调"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"


@dataclass
class EmotionScore:
    """情感得分"""
    emotion: str
    score: float  # 0-1


@dataclass
class EmotionalAnalysis:
    """情感分析结果"""
    primary_emotion: str
    emotion_scores: List[EmotionScore]
    sentiment: EmotionalTone
    intensity: float  # 0-10
    tone_description: str
    emotional_keywords: List[str] = field(default_factory=list)
    confidence: float = 0.0  # 0-1


@dataclass
class EmotionalResponse:
    """情感响应"""
    response_text: str
    matched_emotion: str
    emotional_intensity: float
    empathy_level: float  # 0-1
    metadata: Dict[str, Any] = field(default_factory=dict)


class EmotionalComputingService:
    """情感计算服务主类"""
    
    def __init__(self, llm: Any, config: Optional[Dict[str, Any]] = None):
        self.llm = llm
        self.config = config or {}
        self.emotion_prompts = self._init_emotion_prompts()
    
    def _init_emotion_prompts(self) -> Dict[str, str]:
        """初始化情感提示模板"""
        return {
            "analysis": """Analyze the emotional content of the following text and provide a detailed emotional analysis.

Text: {text}

Provide your analysis in the following format:
1. Primary Emotion: [main emotion]
2. Emotion Scores (0-1):
   - Joy: [score]
   - Sadness: [score]
   - Anger: [score]
   - Fear: [score]
   - Surprise: [score]
   - Disgust: [score]
   - Anticipation: [score]
   - Trust: [score]
   - Admiration: [score]
   - Interest: [score]
   - Confusion: [score]
3. Sentiment: [positive/negative/neutral/mixed]
4. Intensity (0-10): [score]
5. Tone Description: [2-3 sentence description]
6. Emotional Keywords: [list of key emotional words found]""",
            
            "generation": """Generate text that expresses the specified emotion while maintaining authenticity.

Target Emotion: {emotion}
Intensity: {intensity}/10
Context: {context}

Generate text that naturally conveys this emotion:""",
            
            "response": """Generate an emotionally intelligent response that matches the user's emotional state.

User's Emotional State: {user_emotion}
User's Message: {user_message}
Response Tone: {tone}

Generate an empathetic and appropriate response:""",
            
            "consensus": """Analyze the emotional consensus of multiple inputs for PoUE validation.

Input 1: {input1}
Input 2: {input2}
Input 3: {input3}

Determine:
1. Emotional Consensus Score (0-1): [score]
2. Consensus Emotion: [main emotion]
3. Emotional Variance: [low/medium/high]
4. Validation Status: [valid/invalid]
5. Reasoning: [explanation]"""
        }
    
    async def analyze_emotion(
        self,
        text: str,
        return_scores: bool = True
    ) -> EmotionalAnalysis:
        """分析文本情感"""
        prompt = self.emotion_prompts["analysis"].format(text=text)
        
        messages = [HumanMessage(content=prompt)]
        
        try:
            response = await self.llm.agenerate([messages])
            analysis_text = response.generations[0][0].text
            
            # 解析结果
            return self._parse_emotion_analysis(analysis_text, text)
            
        except Exception as e:
            logger.error(f"Emotion analysis error: {str(e)}")
            return EmotionalAnalysis(
                primary_emotion=EmotionType.NEUTRAL.value,
                emotion_scores=[EmotionScore(EmotionType.NEUTRAL.value, 1.0)],
                sentiment=EmotionalTone.NEUTRAL,
                intensity=5.0,
                tone_description="Unable to analyze emotion",
                confidence=0.0
            )
    
    def _parse_emotion_analysis(
        self,
        analysis_text: str,
        original_text: str
    ) -> EmotionalAnalysis:
        """解析情感分析结果"""
        lines = analysis_text.strip().split("\n")
        
        primary_emotion = EmotionType.NEUTRAL.value
        emotion_scores = []
        sentiment = EmotionalTone.NEUTRAL
        intensity = 5.0
        tone_description = ""
        emotional_keywords = []
        
        for line in lines:
            line_lower = line.lower()
            
            if "primary emotion" in line_lower:
                # 提取主要情感
                parts = line.split(":")
                if len(parts) > 1:
                    primary_emotion = parts[1].strip().lower()
            
            elif "sentiment:" in line_lower:
                # 提取情感倾向
                parts = line.split(":")
                if len(parts) > 1:
                    sent = parts[1].strip().lower()
                    if "positive" in sent:
                        sentiment = EmotionalTone.POSITIVE
                    elif "negative" in sent:
                        sentiment = EmotionalTone.NEGATIVE
                    elif "mixed" in sent:
                        sentiment = EmotionalTone.MIXED
                    else:
                        sentiment = EmotionalTone.NEUTRAL
            
            elif "intensity" in line_lower and "0-10" in line_lower:
                # 提取强度
                parts = line.split(":")
                if len(parts) > 1:
                    try:
                        intensity = float(parts[1].strip())
                    except:
                        pass
            
            elif "tone description" in line_lower:
                # 提取色调描述
                parts = line.split(":")
                if len(parts) > 1:
                    tone_description = parts[1].strip()
            
            elif "emotional keywords" in line_lower:
                # 提取关键词
                parts = line.split(":")
                if len(parts) > 1:
                    keywords = parts[1].strip().split(",")
                    emotional_keywords = [k.strip() for k in keywords if k.strip()]
            
            else:
                # 解析各情感得分
                for emotion in [e.value for e in EmotionType]:
                    if emotion in line_lower and ":" in line_lower:
                        try:
                            score_str = line.split(":")[-1].strip()
                            score = float(score_str)
                            emotion_scores.append(EmotionScore(emotion, score))
                        except:
                            pass
        
        # 如果没有解析到情感得分，生成默认值
        if not emotion_scores:
            emotion_scores = [
                EmotionScore(EmotionType.NEUTRAL.value, 1.0)
            ]
        
        return EmotionalAnalysis(
            primary_emotion=primary_emotion,
            emotion_scores=emotion_scores,
            sentiment=sentiment,
            intensity=intensity,
            tone_description=tone_description,
            emotional_keywords=emotional_keywords,
            confidence=0.8  # 假设置信度
        )
    
    async def generate_emotional_text(
        self,
        target_emotion: str,
        context: str = "",
        intensity: float = 7.0,
        max_length: int = 500
    ) -> str:
        """生成情感文本"""
        prompt = self.emotion_prompts["generation"].format(
            emotion=target_emotion,
            intensity=intensity,
            context=context
        )
        
        messages = [HumanMessage(content=prompt)]
        
        response = await self.llm.agenerate([messages])
        return response.generations[0][0].text
    
    async def generate_emotional_response(
        self,
        user_message: str,
        user_emotion: str,
        tone: str = "empathetic"
    ) -> EmotionalResponse:
        """生成情感响应"""
        prompt = self.emotion_prompts["response"].format(
            user_emotion=user_emotion,
            user_message=user_message,
            tone=tone
        )
        
        messages = [HumanMessage(content=prompt)]
        
        response = await self.llm.agenerate([messages])
        response_text = response.generations[0][0].text
        
        # 分析生成的响应
        response_analysis = await self.analyze_emotion(response_text)
        
        return EmotionalResponse(
            response_text=response_text,
            matched_emotion=response_analysis.primary_emotion,
            emotional_intensity=response_analysis.intensity,
            empathy_level=self._calculate_empathy_level(
                user_emotion,
                response_analysis.primary_emotion
            ),
            metadata={
                "user_emotion": user_emotion,
                "response_sentiment": response_analysis.sentiment.value,
                "response_intensity": response_analysis.intensity
            }
        )
    
    def _calculate_empathy_level(
        self,
        user_emotion: str,
        response_emotion: str
    ) -> float:
        """计算共情水平"""
        # 情感映射：相似情感得高分
        emotion_groups = {
            "positive": [EmotionType.JOY.value, EmotionType.TRUST.value, 
                        EmotionType.ADMIRATION.value, EmotionType.INTEREST.value],
            "negative": [EmotionType.SADNESS.value, EmotionType.ANGER.value,
                        EmotionType.FEAR.value, EmotionType.DISGUST.value],
            "neutral": [EmotionType.NEUTRAL.value, EmotionType.CONFUSION.value]
        }
        
        user_group = None
        response_group = None
        
        for group, emotions in emotion_groups.items():
            if user_emotion in emotions:
                user_group = group
            if response_emotion in emotions:
                response_group = group
        
        if user_group == response_group:
            return 0.9
        elif user_emotion == response_emotion:
            return 1.0
        else:
            return 0.5
    
    async def emotional_consensus(
        self,
        inputs: List[str],
        threshold: float = 0.7
    ) -> Dict[str, Any]:
        """情感共识验证 - PoUE 核心功能"""
        if len(inputs) < 2:
            raise ValueError("Need at least 2 inputs for consensus")
        
        # 分析每个输入的情感
        analyses = []
        for text in inputs:
            analysis = await self.analyze_emotion(text)
            analyses.append(analysis)
        
        # 计算共识
        primary_emotions = [a.primary_emotion for a in analyses]
        
        # 统计主要情感出现频率
        emotion_counts = {}
        for emotion in primary_emotions:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        consensus_emotion = max(emotion_counts, key=emotion_counts.get)
        consensus_score = emotion_counts[consensus_emotion] / len(inputs)
        
        # 计算情感强度方差
        intensities = [a.intensity for a in analyses]
        intensity_variance = np.var(intensities)
        
        if intensity_variance < 2:
            variance_level = "low"
        elif intensity_variance < 5:
            variance_level = "medium"
        else:
            variance_level = "high"
        
        # 验证是否通过共识
        is_valid = consensus_score >= threshold and variance_level != "high"
        
        return {
            "consensus_emotion": consensus_emotion,
            "consensus_score": consensus_score,
            "intensity_variance": variance_level,
            "is_valid": is_valid,
            "individual_analyses": [
                {
                    "primary_emotion": a.primary_emotion,
                    "sentiment": a.sentiment.value,
                    "intensity": a.intensity
                }
                for a in analyses
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def batch_analyze(
        self,
        texts: List[str]
    ) -> List[EmotionalAnalysis]:
        """批量情感分析"""
        tasks = [self.analyze_emotion(text) for text in texts]
        
        import asyncio
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 过滤异常
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch analysis error for text {i}: {result}")
                valid_results.append(EmotionalAnalysis(
                    primary_emotion=EmotionType.NEUTRAL.value,
                    emotion_scores=[EmotionScore(EmotionType.NEUTRAL.value, 1.0)],
                    sentiment=EmotionalTone.NEUTRAL,
                    intensity=5.0,
                    tone_description="Analysis failed",
                    confidence=0.0
                ))
            else:
                valid_results.append(result)
        
        return valid_results
    
    def get_emotion_distribution(
        self,
        analyses: List[EmotionalAnalysis]
    ) -> Dict[str, float]:
        """获取情感分布统计"""
        emotion_totals = {e.value: 0.0 for e in EmotionType}
        
        for analysis in analyses:
            for score in analysis.emotion_scores:
                emotion_totals[score.emotion] += score.score
        
        # 平均化
        count = len(analyses) if analyses else 1
        return {k: v / count for k, v in emotion_totals.items()}


class EmotionalMemory:
    """情感记忆 - 用于维护对话中的情感上下文"""
    
    def __init__(self, max_history: int = 10):
        self.max_history = max_history
        self.history: List[Dict[str, Any]] = []
    
    def add_interaction(
        self,
        user_emotion: str,
        assistant_emotion: str,
        sentiment: str,
        intensity: float
    ) -> None:
        """添加交互记录"""
        self.history.append({
            "user_emotion": user_emotion,
            "assistant_emotion": assistant_emotion,
            "sentiment": sentiment,
            "intensity": intensity,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # 保持历史记录在限制内
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def get_recent_emotions(self, n: int = 5) -> List[Dict[str, Any]]:
        """获取最近的情感记录"""
        return self.history[-n:] if self.history else []
    
    def get_dominant_emotion(self) -> Optional[str]:
        """获取主导情感"""
        if not self.history:
            return None
        
        emotions = [h["user_emotion"] for h in self.history]
        from collections import Counter
        return Counter(emotions).most_common(1)[0][0]
    
    def clear(self) -> None:
        """清空历史"""
        self.history = []


# 导出
__all__ = [
    "EmotionalComputingService",
    "EmotionalMemory",
    "EmotionType",
    "EmotionalTone",
    "EmotionScore",
    "EmotionalAnalysis",
    "EmotionalResponse",
]