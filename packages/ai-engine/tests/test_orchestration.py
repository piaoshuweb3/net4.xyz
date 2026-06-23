"""
Tests for AI Task Orchestration System
LangChain 任务编排系统测试
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import List

# 测试 RAG 服务
class TestRAGService:
    """RAG 服务测试"""
    
    def test_rag_config_defaults(self):
        """测试 RAG 配置默认值"""
        from services.rag_service import RAGConfig, VectorStoreType, EmbeddingModel
        
        config = RAGConfig()
        
        assert config.vector_store_type == VectorStoreType.CHROMA
        assert config.embedding_model == EmbeddingModel.OPENAI_TEXT_EMBEDDING_3_SMALL
        assert config.chunk_size == 1000
        assert config.chunk_overlap == 200
        assert config.top_k == 4
    
    def test_document_processor_init(self):
        """测试文档处理器初始化"""
        from services.rag_service import RAGConfig, DocumentProcessor
        
        config = RAGConfig(chunk_size=500, chunk_overlap=100)
        processor = DocumentProcessor(config)
        
        assert processor.config.chunk_size == 500
        assert processor.config.chunk_overlap == 100
    
    def test_split_text(self):
        """测试文本分割"""
        from services.rag_service import RAGConfig, DocumentProcessor
        
        config = RAGConfig()
        processor = DocumentProcessor(config)
        
        text = "这是第一段。\n\n这是第二段。\n\n这是第三段。"
        docs = processor.split_text(text)
        
        assert len(docs) > 0
    
    def test_vector_store_type_enum(self):
        """测试向量存储类型枚举"""
        from services.rag_service import VectorStoreType
        
        assert VectorStoreType.CHROMA.value == "chroma"
        assert VectorStoreType.FAISS.value == "faiss"
    
    def test_embedding_model_enum(self):
        """测试嵌入模型枚举"""
        from services.rag_service import EmbeddingModel
        
        assert EmbeddingModel.OPENAI_ADA_2.value == "openai-ada-2"
        assert EmbeddingModel.OPENAI_TEXT_EMBEDDING_3_SMALL.value == "openai-text-embedding-3-small"


# 测试任务编排
class TestTaskOrchestration:
    """任务编排测试"""
    
    def test_task_type_enum(self):
        """测试任务类型枚举"""
        from services.task_orchestration import TaskType
        
        assert TaskType.TEXT_GENERATION.value == "text_generation"
        assert TaskType.QUESTION_ANSWER.value == "question_answer"
        assert TaskType.EMOTIONAL_COMPUTING.value == "emotional_computing"
        assert TaskType.KNOWLEDGE_QUERY.value == "knowledge_query"
    
    def test_task_status_enum(self):
        """测试任务状态枚举"""
        from services.task_orchestration import TaskStatus
        
        assert TaskStatus.PENDING.value == "pending"
        assert TaskStatus.RUNNING.value == "running"
        assert TaskStatus.COMPLETED.value == "completed"
        assert TaskStatus.FAILED.value == "failed"
    
    def test_priority_enum(self):
        """测试优先级枚举"""
        from services.task_orchestration import Priority
        
        assert Priority.LOW.value == "low"
        assert Priority.NORMAL.value == "normal"
        assert Priority.HIGH.value == "high"
        assert Priority.URGENT.value == "urgent"
    
    def test_task_config_defaults(self):
        """测试任务配置默认值"""
        from services.task_orchestration import TaskConfig, TaskType, Priority
        
        config = TaskConfig()
        
        assert config.task_type == TaskType.TEXT_GENERATION
        assert config.max_retries == 3
        assert config.timeout == 300
        assert config.priority == Priority.NORMAL
    
    def test_task_result_init(self):
        """测试任务结果初始化"""
        from services.task_orchestration import TaskResult, TaskStatus
        
        result = TaskResult(
            task_id="test_123",
            status=TaskStatus.PENDING
        )
        
        assert result.task_id == "test_123"
        assert result.status == TaskStatus.PENDING
        assert result.result is None
        assert result.error is None
        assert result.execution_time == 0.0
    
    @pytest.mark.asyncio
    async def test_task_orchestrator_create_task(self):
        """测试创建任务"""
        from services.task_orchestration import TaskOrchestrator, TaskConfig, TaskType
        
        # 模拟 LLM
        mock_llm = Mock()
        mock_llm.agenerate = AsyncMock(return_value=Mock(
            generations=[[Mock(text="test response")]],
            llm_output={"token_usage": {"total_tokens": 100}}
        ))
        
        orchestrator = TaskOrchestrator(llm=mock_llm)
        
        task_id = orchestrator.create_task(
            task_type=TaskType.TEXT_GENERATION,
            input_data={"prompt": "test prompt"}
        )
        
        assert task_id.startswith("task_")
        assert task_id in orchestrator.active_tasks
    
    @pytest.mark.asyncio
    async def test_task_orchestrator_get_status(self):
        """测试获取任务状态"""
        from services.task_orchestration import TaskOrchestrator, TaskType, TaskStatus
        
        mock_llm = Mock()
        orchestrator = TaskOrchestrator(llm=mock_llm)
        
        task_id = orchestrator.create_task(
            task_type=TaskType.TEXT_GENERATION,
            input_data={"prompt": "test"}
        )
        
        status = orchestrator.get_task_status(task_id)
        
        assert status is not None
        assert status.task_id == task_id
        assert status.status == TaskStatus.PENDING
    
    @pytest.mark.asyncio
    async def test_task_orchestrator_cancel(self):
        """测试取消任务"""
        from services.task_orchestration import TaskOrchestrator, TaskType, TaskStatus
        
        mock_llm = Mock()
        orchestrator = TaskOrchestrator(llm=mock_llm)
        
        task_id = orchestrator.create_task(
            task_type=TaskType.TEXT_GENERATION,
            input_data={"prompt": "test"}
        )
        
        result = orchestrator.cancel_task(task_id)
        
        assert result is True
        assert task_id not in orchestrator.active_tasks


# 测试情感计算
class TestEmotionalComputing:
    """情感计算测试"""
    
    def test_emotion_type_enum(self):
        """测试情感类型枚举"""
        from services.emotional_computing import EmotionType
        
        assert EmotionType.JOY.value == "joy"
        assert EmotionType.SADNESS.value == "sadness"
        assert EmotionType.ANGER.value == "anger"
        assert EmotionType.NEUTRAL.value == "neutral"
    
    def test_emotional_tone_enum(self):
        """测试情感色调枚举"""
        from services.emotional_computing import EmotionalTone
        
        assert EmotionalTone.POSITIVE.value == "positive"
        assert EmotionalTone.NEGATIVE.value == "negative"
        assert EmotionalTone.NEUTRAL.value == "neutral"
        assert EmotionalTone.MIXED.value == "mixed"
    
    def test_emotion_score_init(self):
        """测试情感得分初始化"""
        from services.emotional_computing import EmotionScore
        
        score = EmotionScore(emotion="joy", score=0.8)
        
        assert score.emotion == "joy"
        assert score.score == 0.8
    
    def test_emotional_analysis_init(self):
        """测试情感分析初始化"""
        from services.emotional_computing import (
            EmotionalAnalysis,
            EmotionScore,
            EmotionalTone
        )
        
        analysis = EmotionalAnalysis(
            primary_emotion="joy",
            emotion_scores=[EmotionScore("joy", 0.8)],
            sentiment=EmotionalTone.POSITIVE,
            intensity=7.5,
            tone_description="Happy and positive"
        )
        
        assert analysis.primary_emotion == "joy"
        assert analysis.sentiment == EmotionalTone.POSITIVE
        assert analysis.intensity == 7.5
    
    def test_emotional_response_init(self):
        """测试情感响应初始化"""
        from services.emotional_computing import EmotionalResponse
        
        response = EmotionalResponse(
            response_text="I understand your feelings.",
            matched_emotion="empathy",
            emotional_intensity=6.0,
            empathy_level=0.9
        )
        
        assert response.response_text == "I understand your feelings."
        assert response.empathy_level == 0.9
    
    def test_emotional_memory_init(self):
        """测试情感记忆初始化"""
        from services.emotional_computing import EmotionalMemory
        
        memory = EmotionalMemory(max_history=5)
        
        assert memory.max_history == 5
        assert len(memory.history) == 0
    
    def test_emotional_memory_add_interaction(self):
        """测试添加交互记录"""
        from services.emotional_computing import EmotionalMemory
        
        memory = EmotionalMemory()
        
        memory.add_interaction(
            user_emotion="joy",
            assistant_emotion="joy",
            sentiment="positive",
            intensity=8.0
        )
        
        assert len(memory.history) == 1
        assert memory.history[0]["user_emotion"] == "joy"
    
    def test_emotional_memory_get_dominant(self):
        """测试获取主导情感"""
        from services.emotional_computing import EmotionalMemory
        
        memory = EmotionalMemory()
        
        memory.add_interaction("joy", "joy", "positive", 8.0)
        memory.add_interaction("joy", "joy", "positive", 7.0)
        memory.add_interaction("sadness", "empathy", "negative", 6.0)
        
        dominant = memory.get_dominant_emotion()
        
        assert dominant == "joy"
    
    def test_empathy_calculation(self):
        """测试共情水平计算"""
        from services.emotional_computing import EmotionalComputingService
        
        service = EmotionalComputingService(llm=Mock())
        
        # 相同情感
        empathy = service._calculate_empathy_level("joy", "joy")
        assert empathy == 1.0
        
        # 同组情感
        empathy = service._calculate_empathy_level("joy", "trust")
        assert empathy == 0.9
        
        # 不同情感
        empathy = service._calculate_empathy_level("joy", "sadness")
        assert empathy == 0.5


# 测试知识库问答
class TestKnowledgeBase:
    """知识库问答测试"""
    
    def test_knowledge_category_enum(self):
        """测试知识分类枚举"""
        from services.knowledge_base import KnowledgeCategory
        
        assert KnowledgeCategory.WEB4_TECHNOLOGY.value == "web4_technology"
        assert KnowledgeCategory.BLOCKCHAIN.value == "blockchain"
        assert KnowledgeCategory.AI_ML.value == "ai_ml"
        assert KnowledgeCategory.POUE_CONSENSUS.value == "poue_consensus"
        assert KnowledgeCategory.FAQ.value == "faq"
    
    def test_answer_confidence_enum(self):
        """测试答案置信度枚举"""
        from services.knowledge_base import AnswerConfidence
        
        assert AnswerConfidence.HIGH.value == "high"
        assert AnswerConfidence.MEDIUM.value == "medium"
        assert AnswerConfidence.LOW.value == "low"
        assert AnswerConfidence.UNKNOWN.value == "unknown"
    
    def test_knowledge_entry_init(self):
        """测试知识条目初始化"""
        from services.knowledge_base import KnowledgeEntry, KnowledgeCategory
        
        entry = KnowledgeEntry(
            id="test_001",
            title="测试标题",
            content="测试内容",
            category=KnowledgeCategory.WEB4_TECHNOLOGY,
            tags=["test", "web4"]
        )
        
        assert entry.id == "test_001"
        assert entry.title == "测试标题"
        assert entry.category == KnowledgeCategory.WEB4_TECHNOLOGY
        assert "test" in entry.tags
    
    def test_qa_result_init(self):
        """测试问答结果初始化"""
        from services.knowledge_base import QAResult, AnswerConfidence, KnowledgeCategory
        
        result = QAResult(
            question="什么是 Web4?",
            answer="Web4 是下一代互联网",
            confidence=AnswerConfidence.HIGH,
            sources=["source1", "source2"],
            category=KnowledgeCategory.WEB4_TECHNOLOGY
        )
        
        assert result.question == "什么是 Web4?"
        assert result.confidence == AnswerConfidence.HIGH
        assert len(result.sources) == 2
    
    def test_web4_knowledge_seeder(self):
        """测试 Web4 知识播种器"""
        from services.knowledge_base import Web4KnowledgeSeeder, KnowledgeCategory
        
        seed_data = Web4KnowledgeSeeder.get_seed_data()
        
        assert len(seed_data) > 0
        
        # 验证包含核心知识
        titles = [entry.title for entry in seed_data]
        assert "什么是 Web4" in titles
        assert "PoUE 共识机制" in titles
        assert "AFC 代币" in titles
        assert "火种 NFT（Spark NFT）" in titles
    
    def test_knowledge_seeder_categories(self):
        """测试知识分类"""
        from services.knowledge_base import Web4KnowledgeSeeder, KnowledgeCategory
        
        seed_data = Web4KnowledgeSeeder.get_seed_data()
        
        categories = set(entry.category for entry in seed_data)
        
        assert KnowledgeCategory.WEB4_TECHNOLOGY in categories
        assert KnowledgeCategory.POUE_CONSENSUS in categories
        assert KnowledgeCategory.BLOCKCHAIN in categories
        assert KnowledgeCategory.NFT_DID in categories
        assert KnowledgeCategory.FAQ in categories


# 测试集成
class TestIntegration:
    """集成测试"""
    
    @pytest.mark.asyncio
    async def test_task_with_emotional_computing(self):
        """测试情感计算任务集成"""
        from services.task_orchestration import TaskOrchestrator, TaskType
        from services.emotional_computing import EmotionalComputingService
        
        # 模拟 LLM
        mock_llm = Mock()
        mock_llm.agenerate = AsyncMock(return_value=Mock(
            generations=[[Mock(text="Joy: 0.8, Sadness: 0.1")]],
            llm_output={"token_usage": {"total_tokens": 50}}
        ))
        
        # 创建服务
        emotional_service = EmotionalComputingService(llm=mock_llm)
        orchestrator = TaskOrchestrator(llm=mock_llm)
        
        # 创建情感分析任务
        task_id = orchestrator.create_task(
            task_type=TaskType.EMOTIONAL_COMPUTING,
            input_data={
                "text": "I am so happy today!",
                "emotion_type": "analysis"
            }
        )
        
        assert task_id in orchestrator.active_tasks
    
    def test_rag_with_knowledge_base(self):
        """测试 RAG 与知识库集成"""
        from services.rag_service import RAGConfig, VectorStoreType
        from services.knowledge_base import KnowledgeCategory
        
        # 验证配置兼容性
        config = RAGConfig(
            vector_store_type=VectorStoreType.CHROMA,
            collection_name="web4_knowledge_base"
        )
        
        assert config.collection_name == "web4_knowledge_base"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])