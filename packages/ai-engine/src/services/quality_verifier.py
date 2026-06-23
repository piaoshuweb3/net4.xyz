"""
Web4 Knowledge Base Quality Verifier
Web4 知识库质量验证器

负责验证模型输出质量，包括：
- 答案准确性验证
- 知识一致性检查
- 响应质量评估
- 自动化测试
"""
import os
import json
import logging
import re
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
from pathlib import Path
import asyncio

logger = logging.getLogger(__name__)


class QualityMetric(str, Enum):
    """质量指标"""
    ACCURACY = "accuracy"           # 准确性
    RELEVANCE = "relevance"         # 相关性
    COHERENCE = "coherence"         # 连贯性
    COMPLETENESS = "completeness"   # 完整性
    SAFETY = "safety"               # 安全性
    CONSISTENCY = "consistency"     # 一致性
    FRESHNESS = "freshness"         # 时效性


class QualityLevel(str, Enum):
    """质量等级"""
    EXCELLENT = "excellent"  # >= 0.9
    GOOD = "good"            # >= 0.7
    ACCEPTABLE = "acceptable"  # >= 0.5
    POOR = "poor"            # < 0.5


@dataclass
class TestCase:
    """测试用例"""
    id: str
    question: str
    expected_keywords: List[str]
    expected_category: Optional[str] = None
    min_length: int = 50
    max_length: int = 2000
    required_tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class QualityScore:
    """质量分数"""
    metric: QualityMetric
    score: float
    details: str
    evidence: List[str] = field(default_factory=list)


@dataclass
class VerificationResult:
    """验证结果"""
    test_case_id: str
    passed: bool
    overall_score: float
    quality_level: QualityLevel
    scores: List[QualityScore]
    answer: str
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    timestamp: str = ""


@dataclass
class QualityReport:
    """质量报告"""
    total_tests: int
    passed_tests: int
    failed_tests: int
    pass_rate: float
    average_scores: Dict[str, float]
    quality_level: QualityLevel
    issues_summary: Dict[str, int]
    recommendations: List[str]
    timestamp: str = ""


class QualityVerifier:
    """质量验证器"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.test_results: List[VerificationResult] = []
        self._init_default_test_cases()
    
    def _init_default_test_cases(self):
        """初始化默认测试用例"""
        self.default_test_cases = [
            # Web4 概念测试
            TestCase(
                id="test_web4_definition",
                question="什么是 Web4？",
                expected_keywords=["Web4", "下一代互联网", "AI", "感知互联网"],
                expected_category="web4_technology",
                required_tags=["web4"]
            ),
            TestCase(
                id="test_poue_definition",
                question="什么是 PoUE 共识机制？",
                expected_keywords=["PoUE", "Proof of Useful Energy", "AI", "共识"],
                expected_category="poue_consensus",
                required_tags=["poue", "共识"]
            ),
            TestCase(
                id="test_afc_token",
                question="AFC 代币是什么？",
                expected_keywords=["AFC", "代币", "治理", "抵押"],
                expected_category="blockchain",
                required_tags=["afc", "代币"]
            ),
            TestCase(
                id="test_spark_nft",
                question="火种 NFT 是什么？",
                expected_keywords=["火种", "NFT", "节点", "AI分身"],
                expected_category="nft_did",
                required_tags=["nft", "火种"]
            ),
            TestCase(
                id="test_web4_dns",
                question="Web4 DNS 是什么？",
                expected_keywords=["web4", "域名", "去中心化", "DID"],
                expected_category="nft_did",
                required_tags=["web4", "dns"]
            ),
            TestCase(
                id="test_knowledge_base",
                question="AI 知识库是什么？",
                expected_keywords=["知识库", "RAG", "AI", "检索"],
                expected_category="web4_technology",
                required_tags=["ai", "知识库"]
            ),
            # 常见问题测试
            TestCase(
                id="test_faq_start",
                question="如何开始使用 net4.xyz？",
                expected_keywords=["注册", "钱包", "连接"],
                expected_category="faq"
            ),
            TestCase(
                id="test_faq_node",
                question="如何成为验证节点？",
                expected_keywords=["火种", "NFT", "抵押", "硬件"],
                expected_category="faq"
            ),
        ]
    
    async def verify_answer(
        self,
        test_case: TestCase,
        answer: str,
        model_response: str = ""
    ) -> VerificationResult:
        """验证答案质量"""
        scores = []
        issues = []
        suggestions = []
        
        # 1. 准确性检查
        accuracy_score = self._check_accuracy(answer, test_case.expected_keywords)
        scores.append(accuracy_score)
        if accuracy_score.score < 0.5:
            issues.append(f"准确性不足: {accuracy_score.details}")
            suggestions.append("确保答案包含正确的技术概念")
        
        # 2. 相关性检查
        relevance_score = self._check_relevance(answer, test_case.question)
        scores.append(relevance_score)
        if relevance_score.score < 0.5:
            issues.append(f"相关性不足: {relevance_score.details}")
        
        # 3. 连贯性检查
        coherence_score = self._check_coherence(answer)
        scores.append(coherence_score)
        if coherence_score.score < 0.5:
            issues.append(f"连贯性不足: {coherence_score.details}")
            suggestions.append("改善答案的结构和逻辑流")
        
        # 4. 完整性检查
        completeness_score = self._check_completeness(
            answer, test_case.min_length, test_case.max_length
        )
        scores.append(completeness_score)
        if completeness_score.score < 0.5:
            issues.append(f"完整性不足: {completeness_score.details}")
            suggestions.append("提供更详细的解释")
        
        # 5. 安全性检查
        safety_score = self._check_safety(answer)
        scores.append(safety_score)
        if safety_score.score < 1.0:
            issues.append(f"安全问题: {safety_score.details}")
        
        # 计算总分
        overall_score = sum(s.score for s in scores) / len(scores)
        
        # 确定质量���级
        quality_level = self._get_quality_level(overall_score)
        
        passed = overall_score >= 0.5 and len(issues) == 0
        
        result = VerificationResult(
            test_case_id=test_case.id,
            passed=passed,
            overall_score=overall_score,
            quality_level=quality_level,
            scores=scores,
            answer=answer,
            issues=issues,
            suggestions=suggestions,
            timestamp=datetime.utcnow().isoformat()
        )
        
        self.test_results.append(result)
        return result
    
    def _check_accuracy(self, answer: str, expected_keywords: List[str]) -> QualityScore:
        """检查准确性"""
        found_keywords = []
        missing_keywords = []
        
        answer_lower = answer.lower()
        
        for keyword in expected_keywords:
            if keyword.lower() in answer_lower:
                found_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)
        
        score = len(found_keywords) / len(expected_keywords) if expected_keywords else 0.5
        
        details = f"找到 {len(found_keywords)}/{len(expected_keywords)} 个关键词"
        if missing_keywords:
            details += f", 缺失: {', '.join(missing_keywords[:3])}"
        
        return QualityScore(
            metric=QualityMetric.ACCURACY,
            score=score,
            details=details,
            evidence=found_keywords
        )
    
    def _check_relevance(self, answer: str, question: str) -> QualityScore:
        """检查相关性"""
        # 简单检查：答案是否包含问题中的关键词
        question_words = set(re.findall(r'\w+', question.lower()))
        answer_words = set(re.findall(r'\w+', answer.lower()))
        
        # 移除常见停用词
        stop_words = {'什么', '是', '的', '了', '和', '与', '或', '如何', '怎么', '请', '介绍'}
        question_words = question_words - stop_words
        
        if not question_words:
            return QualityScore(
                metric=QualityMetric.RELEVANCE,
                score=0.5,
                details="无法评估相关性"
            )
        
        common_words = question_words & answer_words
        score = len(common_words) / len(question_words)
        
        return QualityScore(
            metric=QualityMetric.RELEVANCE,
            score=score,
            details=f"相关词占比: {score:.2%}",
            evidence=list(common_words)[:5]
        )
    
    def _check_coherence(self, answer: str) -> QualityScore:
        """检查连贯性"""
        # 检查是否有完整的句子
        sentences = re.split(r'[。！？\n]', answer)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return QualityScore(
                metric=QualityMetric.COHERENCE,
                score=0.0,
                details="没有完整的句子"
            )
        
        # 检查句子平均长度
        avg_length = sum(len(s) for s in sentences) / len(sentences)
        
        # 理想长度在 20-100 字符之间
        if avg_length < 10:
            score = 0.3
            details = f"句子过短，平均 {avg_length:.1f} 字符"
        elif avg_length > 150:
            score = 0.6
            details = f"句子过长，平均 {avg_length:.1f} 字符"
        else:
            score = 0.9
            details = f"句子结构良好，平均 {avg_length:.1f} 字符"
        
        return QualityScore(
            metric=QualityMetric.COHERENCE,
            score=score,
            details=details,
            evidence=[f"{len(sentences)} 个句子"]
        )
    
    def _check_completeness(
        self,
        answer: str,
        min_length: int,
        max_length: int
    ) -> QualityScore:
        """检查完整性"""
        length = len(answer)
        
        if length < min_length:
            score = length / min_length
            details = f"内容过短: {length} < {min_length} 字符"
        elif length > max_length:
            score = max(0.5, 1 - (length - max_length) / max_length)
            details = f"内容过长: {length} > {max_length} 字符"
        else:
            score = 1.0
            details = f"长度合适: {length} 字符"
        
        return QualityScore(
            metric=QualityMetric.COMPLETENESS,
            score=score,
            details=details
        )
    
    def _check_safety(self, answer: str) -> QualityScore:
        """检查安全性"""
        # 检查是否有不当内容
        unsafe_patterns = [
            (r'(?i)(hack|exploit|vulnerability)', "安全相关关键词"),
            (r'(?i)(scam|fraud|ponzi)', "欺诈相关关键词"),
            (r'(?i)(money|profit|investment).*(guarantee|promise)', "承诺收益"),
        ]
        
        issues = []
        for pattern, desc in unsafe_patterns:
            if re.search(pattern, answer):
                issues.append(desc)
        
        if issues:
            return QualityScore(
                metric=QualityMetric.SAFETY,
                score=0.5,
                details=f"发现潜在问题: {', '.join(issues)}",
                evidence=issues
            )
        
        return QualityScore(
            metric=QualityMetric.SAFETY,
            score=1.0,
            details="未发现安全问题"
        )
    
    def _get_quality_level(self, score: float) -> QualityLevel:
        """获取质量等级"""
        if score >= 0.9:
            return QualityLevel.EXCELLENT
        elif score >= 0.7:
            return QualityLevel.GOOD
        elif score >= 0.5:
            return QualityLevel.ACCEPTABLE
        else:
            return QualityLevel.POOR
    
    async def run_batch_verification(
        self,
        test_cases: List[TestCase],
        answer_generator: Callable[[str], str]
    ) -> QualityReport:
        """批量验证"""
        results = []
        
        for test_case in test_cases:
            # 生成答案
            answer = await answer_generator(test_case.question)
            
            # 验证
            result = await self.verify_answer(test_case, answer)
            results.append(result)
        
        return self.generate_report(results)
    
    def generate_report(self, results: List[VerificationResult] = None) -> QualityReport:
        """生成质量报告"""
        if results is None:
            results = self.test_results
        
        if not results:
            return QualityReport(
                total_tests=0,
                passed_tests=0,
                failed_tests=0,
                pass_rate=0.0,
                average_scores={},
                quality_level=QualityLevel.POOR,
                issues_summary={},
                recommendations=[],
                timestamp=datetime.utcnow().isoformat()
            )
        
        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed
        
        # 计算各指标平均分
        metric_scores = {}
        for metric in QualityMetric:
            scores = [r for r in results if any(s.metric == metric for s in r.scores)]
            if scores:
                avg = sum(
                    next((s.score for s in r.scores if s.metric == metric), 0)
                    for r in scores
                ) / len(scores)
                metric_scores[metric.value] = avg
        
        # 汇总问题
        issues_summary = {}
        for result in results:
            for issue in result.issues:
                # 提取问题类型
                issue_type = issue.split(':')[0] if ':' in issue else issue
                issues_summary[issue_type] = issues_summary.get(issue_type, 0) + 1
        
        # 生成建议
        recommendations = self._generate_recommendations(results, issues_summary)
        
        # 计算整体质量等级
        avg_score = sum(r.overall_score for r in results) / total
        quality_level = self._get_quality_level(avg_score)
        
        return QualityReport(
            total_tests=total,
            passed_tests=passed,
            failed_tests=failed,
            pass_rate=passed / total if total > 0 else 0,
            average_scores=metric_scores,
            quality_level=quality_level,
            issues_summary=issues_summary,
            recommendations=recommendations,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def _generate_recommendations(
        self,
        results: List[VerificationResult],
        issues_summary: Dict[str, int]
    ) -> List[str]:
        """生成建议"""
        recommendations = []
        
        # 基于问题生成建议
        if issues_summary.get("准确性不足", 0) > 0:
            recommendations.append("增加知识库中技术概念的覆盖范围")
        
        if issues_summary.get("完整性不足", 0) > 0:
            recommendations.append("扩展答案内容，提供更详细的解释")
        
        if issues_summary.get("连贯性不足", 0) > 0:
            recommendations.append("改善答案结构，使用清晰的段落分隔")
        
        if issues_summary.get("相关性不足", 0) > 0:
            recommendations.append("确保答案直接回应用户问题")
        
        # 基于质量等级生成建议
        avg_score = sum(r.overall_score for r in results) / len(results) if results else 0
        
        if avg_score < 0.5:
            recommendations.append("建议重新训练模型或增加训练数据")
        elif avg_score < 0.7:
            recommendations.append("考虑增加高质量训练数据")
        
        if not recommendations:
            recommendations.append("模型质量良好，继续保持")
        
        return recommendations
    
    def get_test_results(self) -> List[VerificationResult]:
        """获取测试结果"""
        return self.test_results
    
    def export_results(self, output_path: str) -> None:
        """导出结果"""
        data = [asdict(r) for r in self.test_results]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Exported {len(data)} test results to {output_path}")


class ModelQualityMonitor:
    """模型质量监控器"""
    
    def __init__(self):
        self.verifier = QualityVerifier()
        self.quality_history: List[QualityReport] = []
    
    async def monitor_and_verify(
        self,
        test_cases: List[TestCase],
        answer_generator: Callable[[str], str]
    ) -> QualityReport:
        """监控并验证"""
        report = await self.verifier.run_batch_verification(test_cases, answer_generator)
        self.quality_history.append(report)
        
        # 检查是否需要告警
        if report.quality_level == QualityLevel.POOR:
            logger.warning(
                f"Model quality alert: {report.quality_level.value} "
                f"(pass rate: {report.pass_rate:.1%})"
            )
        
        return report
    
    def get_quality_trend(self) -> Dict[str, List[float]]:
        """获取质量趋势"""
        return {
            "pass_rate": [r.pass_rate for r in self.quality_history],
            "overall_score": [
                sum(r.average_scores.values()) / len(r.average_scores)
                if r.average_scores else 0
                for r in self.quality_history
            ]
        }


# 导出
__all__ = [
    "QualityVerifier",
    "ModelQualityMonitor",
    "QualityScore",
    "VerificationResult",
    "QualityReport",
    "TestCase",
    "QualityMetric",
    "QualityLevel",
]