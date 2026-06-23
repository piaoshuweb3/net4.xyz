"""
Tests for Web4 Knowledge Base Training Data Preparation
Web4 知识库训练数据准备测试
"""
import pytest
import asyncio
import os
import json
import sys
import importlib.util
from pathlib import Path

# 添加 src 目录到路径
src_path = str(Path(__file__).parent.parent / "src")
sys.path.insert(0, src_path)

# 设置测试环境
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

# 直接加载模块文件，避免通过 __init__.py
def load_module_from_file(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# 加载需要的模块
training_data_collector = load_module_from_file(
    "training_data_collector",
    str(Path(src_path) / "services" / "training_data_collector.py")
)
fine_tuning_service = load_module_from_file(
    "fine_tuning_service",
    str(Path(src_path) / "services" / "fine_tuning_service.py")
)
quality_verifier = load_module_from_file(
    "quality_verifier",
    str(Path(src_path) / "services" / "quality_verifier.py")
)
knowledge_base_updater = load_module_from_file(
    "knowledge_base_updater",
    str(Path(src_path) / "services" / "knowledge_base_updater.py")
)

# 导入类
Web4DataCollector = training_data_collector.Web4DataCollector
TrainingDataItem = training_data_collector.TrainingDataItem
DataCollectionConfig = training_data_collector.DataCollectionConfig
DataSourceType = training_data_collector.DataSourceType
DataQualityLevel = training_data_collector.DataQualityLevel

FineTuningService = fine_tuning_service.FineTuningService
FineTuningConfig = fine_tuning_service.FineTuningConfig
FineTuningProvider = fine_tuning_service.FineTuningProvider
ModelSize = fine_tuning_service.ModelSize

QualityVerifier = quality_verifier.QualityVerifier
QualityReport = quality_verifier.QualityReport
TestCase = quality_verifier.TestCase
QualityMetric = quality_verifier.QualityMetric
QualityLevel = quality_verifier.QualityLevel

KnowledgeBaseVersionManager = knowledge_base_updater.KnowledgeBaseVersionManager
KnowledgeBaseUpdater = knowledge_base_updater.KnowledgeBaseUpdater
UpdateConfig = knowledge_base_updater.UpdateConfig
UpdateType = knowledge_base_updater.UpdateType
UpdateStatus = knowledge_base_updater.UpdateStatus
KnowledgeVersion = knowledge_base_updater.KnowledgeVersion

# LangChain Document
from langchain.schema import Document


class TestTrainingDataCollector:
    """训练数据收集器测试"""
    
    def test_collector_initialization(self):
        """测试收集器初始化"""
        config = DataCollectionConfig(
            data_dir="./test_data",
            output_dir="./test_output"
        )
        
        collector = Web4DataCollector(config)
        
        assert collector.config.data_dir == "./test_data"
        assert collector.config.output_dir == "./test_output"
    
    def test_data_item_creation(self):
        """测试数据项创建"""
        item = TrainingDataItem(
            id="test_001",
            source="test.md",
            source_type=DataSourceType.OFFICIAL_DOCS,
            title="测试标题",
            content="这是测试内容" * 10
        )
        
        assert item.id == "test_001"
        assert item.quality_level == DataQualityLevel.HIGH
        assert item.hash != ""
    
    def test_collect_from_technical_docs(self):
        """测试从技术文档收集数据"""
        config = DataCollectionConfig()
        collector = Web4DataCollector(config)
        
        # 收集技术文档
        items = collector.collect_from_technical_docs()
        
        # 验证收集结果
        assert len(items) > 0, "Should collect data from technical docs"
        
        # 验证数据质量
        for item in items:
            assert item.title, "Each item should have a title"
            assert item.content, "Each item should have content"
            assert len(item.content) >= 100, "Content should be substantial"
    
    def test_statistics(self):
        """测试统计信息"""
        config = DataCollectionConfig()
        collector = Web4DataCollector(config)
        
        # 收集数据
        collector.collect_from_technical_docs()
        
        # 获取统计
        stats = collector.get_statistics()
        
        assert stats["total_items"] > 0
        assert "by_source_type" in stats
        assert "by_quality_level" in stats


class TestFineTuningService:
    """微调服务测试"""
    
    def test_fine_tuning_config(self):
        """测试微调配置"""
        config = FineTuningConfig(
            provider=FineTuningProvider.OPENAI,
            base_model="gpt-4o-mini",
            epochs=3,
            batch_size=4
        )
        
        assert config.provider == FineTuningProvider.OPENAI
        assert config.base_model == "gpt-4o-mini"
        assert config.epochs == 3
    
    def test_prepare_training_data(self):
        """测试训练数据准备"""
        config = FineTuningConfig(output_dir="/tmp/test_finetune")
        service = FineTuningService(config)
        
        # 创建测试数据
        test_items = [
            TrainingDataItem(
                id=f"test_{i}",
                source="test.md",
                source_type=DataSourceType.OFFICIAL_DOCS,
                title=f"测试 {i}",
                content=f"这是测试内容 {i}" * 20
            )
            for i in range(5)
        ]
        
        # 准备训练数据
        output_path = service.prepare_training_data(test_items, format="openai")
        
        # 验证输出
        assert os.path.exists(output_path)
        
        # 验证格式
        with open(output_path, 'r') as f:
            lines = f.readlines()
            assert len(lines) == 5
            
            # 验证 JSON 格式
            for line in lines:
                data = json.loads(line)
                assert "messages" in data
                assert len(data["messages"]) == 3  # system, user, assistant


class TestQualityVerifier:
    """质量验证器测试"""
    
    def test_verifier_initialization(self):
        """测试验证器初始化"""
        verifier = QualityVerifier()
        
        assert len(verifier.default_test_cases) > 0
    
    @pytest.mark.asyncio
    async def test_verify_answer_accuracy(self):
        """测试答案准确性验证"""
        verifier = QualityVerifier()
        
        test_case = TestCase(
            id="test_accuracy",
            question="什么是 Web4？",
            expected_keywords=["Web4", "AI", "下一代"],
            min_length=50
        )
        
        # 好的答案
        good_answer = "Web4 是下一代互联网，代表了从价值互联网到感知互联网的跃迁。Web4 的核心是 AI 原生。"
        result = await verifier.verify_answer(test_case, good_answer)
        
        assert result.overall_score > 0.5
        assert any(s.metric == QualityMetric.ACCURACY for s in result.scores)
    
    @pytest.mark.asyncio
    async def test_verify_answer_poor(self):
        """测试差答案验证"""
        verifier = QualityVerifier()
        
        test_case = TestCase(
            id="test_poor",
            question="什么是 Web4？",
            expected_keywords=["Web4", "AI"],
            min_length=50
        )
        
        # 差的答案
        poor_answer = "我不知道"
        result = await verifier.verify_answer(test_case, poor_answer)
        
        assert result.overall_score < 0.5
        assert not result.passed
    
    def test_generate_report(self):
        """测试报告生成"""
        verifier = QualityVerifier()
        
        # 生成报告
        report = verifier.generate_report([])
        
        assert isinstance(report, QualityReport)
        assert report.total_tests == 0
        assert report.pass_rate == 0.0


class TestKnowledgeBaseUpdater:
    """知识库更新器测试"""
    
    def test_version_manager_initialization(self):
        """测试版本管理器初始化"""
        config = UpdateConfig(
            base_dir="/tmp/test_kb",
            versions_dir="/tmp/test_kb/versions",
            current_dir="/tmp/test_kb/current"
        )
        
        manager = KnowledgeBaseVersionManager(config)
        
        assert manager.config.base_dir == "/tmp/test_kb"
    
    def test_create_version(self):
        """测试创建版本"""
        config = UpdateConfig(
            base_dir="/tmp/test_kb_version",
            versions_dir="/tmp/test_kb_version/versions",
            current_dir="/tmp/test_kb_version/current"
        )
        
        manager = KnowledgeBaseVersionManager(config)
        
        # 创建测试文档
        docs = [
            Document(
                page_content=f"测试内容 {i}",
                metadata={"id": f"doc_{i}"}
            )
            for i in range(3)
        ]
        
        # 创建版本
        version = manager.create_version(docs, "测试版本")
        
        assert version.num_documents == 3
        assert version.version != ""
    
    def test_update_config(self):
        """测试更新配置"""
        config = UpdateConfig(
            update_type=UpdateType.INCREMENTAL,
            enable_scheduled_update=True,
            cron_expression="0 2 * * *"
        )
        
        assert config.update_type == UpdateType.INCREMENTAL
        assert config.enable_scheduled_update
        assert config.cron_expression == "0 2 * * *"


class TestIntegration:
    """集成测试"""
    
    @pytest.mark.asyncio
    async def test_full_workflow(self):
        """测试完整工作流"""
        # 1. 收集数据
        config = DataCollectionConfig()
        collector = Web4DataCollector(config)
        items = collector.collect_from_technical_docs()
        
        assert len(items) > 0
        
        # 2. 准备微调数据
        ft_config = FineTuningConfig(output_dir="/tmp/test_integration")
        ft_service = FineTuningService(ft_config)
        
        training_data_path = ft_service.prepare_training_data(items[:3], format="openai")
        
        assert os.path.exists(training_data_path)
        
        # 3. 验证质量
        verifier = QualityVerifier()
        
        test_case = TestCase(
            id="integration_test",
            question="什么是 Web4？",
            expected_keywords=["Web4", "AI", "互联网"],
            min_length=50
        )
        
        answer = "Web4 是下一代互联网技术，融合 AI 和区块链。"
        result = await verifier.verify_answer(test_case, answer)
        
        assert result.overall_score > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])