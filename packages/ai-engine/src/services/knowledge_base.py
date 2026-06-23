"""
Knowledge Base Q&A Service
知识库问答服务 - Web4 Wiki 核心组件
"""
import os
import logging
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
# RetrievalQA and ConversationalRetrievalChain are not available in current langchain version
# Using base LLM and Retriever directly
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
# ConversationBufferMemory and VectorStoreRetrieverMemory are not available
# Using simple list for history if needed
from pydantic import BaseModel, Field

from .rag_service import RAGService, RAGConfig, VectorStoreType, EmbeddingModel

logger = logging.getLogger(__name__)


class KnowledgeCategory(str, Enum):
    """知识分类"""
    WEB4_TECHNOLOGY = "web4_technology"
    BLOCKCHAIN = "blockchain"
    AI_ML = "ai_ml"
    POUE_CONSENSUS = "poue_consensus"
    NFT_DID = "nft_did"
    DECENTRALIZED_STORAGE = "decentralized_storage"
    GOVERNANCE = "governance"
    TUTORIAL = "tutorial"
    FAQ = "faq"
    GENERAL = "general"


class AnswerConfidence(str, Enum):
    """答案置信度"""
    HIGH = "high"  # > 0.8
    MEDIUM = "medium"  # 0.5 - 0.8
    LOW = "low"  # < 0.5
    UNKNOWN = "unknown"


@dataclass
class QAResult:
    """问答结果"""
    question: str
    answer: str
    confidence: AnswerConfidence
    sources: List[str] = field(default_factory=list)
    category: Optional[KnowledgeCategory] = None
    related_questions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeEntry:
    """知识条目"""
    id: str
    title: str
    content: str
    category: KnowledgeCategory
    tags: List[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
    author: str = "system"
    verified: bool = False


class KnowledgeBaseManager:
    """知识库管理器"""
    
    def __init__(
        self,
        rag_service: RAGService,
        config: Optional[Dict[str, Any]] = None
    ):
        self.rag_service = rag_service
        self.config = config or {}
        self.entries: Dict[str, KnowledgeEntry] = {}
        self.category_index: Dict[KnowledgeCategory, List[str]] = {}
    
    def add_entry(self, entry: KnowledgeEntry) -> str:
        """添加知识条目"""
        self.entries[entry.id] = entry
        
        # 更新分类索引
        if entry.category not in self.category_index:
            self.category_index[entry.category] = []
        self.category_index[entry.category].append(entry.id)
        
        # 添加到 RAG
        doc = Document(
            page_content=entry.content,
            metadata={
                "title": entry.title,
                "category": entry.category.value,
                "tags": entry.tags,
                "id": entry.id
            }
        )
        self.rag_service.add_documents([doc])
        
        logger.info(f"Added knowledge entry: {entry.id}")
        return entry.id
    
    def add_entries(self, entries: List[KnowledgeEntry]) -> List[str]:
        """批量添加知识条目"""
        ids = []
        for entry in entries:
            ids.append(self.add_entry(entry))
        return ids
    
    def get_entry(self, entry_id: str) -> Optional[KnowledgeEntry]:
        """获取知识条目"""
        return self.entries.get(entry_id)
    
    def get_entries_by_category(
        self,
        category: KnowledgeCategory
    ) -> List[KnowledgeEntry]:
        """按分类获取知识条目"""
        entry_ids = self.category_index.get(category, [])
        return [self.entries[eid] for eid in entry_ids if eid in self.entries]
    
    def search_entries(self, query: str, limit: int = 10) -> List[KnowledgeEntry]:
        """搜索知识条目"""
        docs = self.rag_service.get_relevant_documents(query, k=limit)
        
        results = []
        for doc in docs:
            entry_id = doc.metadata.get("id")
            if entry_id and entry_id in self.entries:
                results.append(self.entries[entry_id])
        
        return results
    
    def update_entry(self, entry_id: str, updates: Dict[str, Any]) -> bool:
        """更新知识条目"""
        if entry_id not in self.entries:
            return False
        
        entry = self.entries[entry_id]
        
        for key, value in updates.items():
            if hasattr(entry, key):
                setattr(entry, key, value)
        
        entry.updated_at = datetime.utcnow().isoformat()
        
        # 重新添加到 RAG（需要重新构建索引）
        logger.info(f"Updated knowledge entry: {entry_id}")
        return True
    
    def delete_entry(self, entry_id: str) -> bool:
        """删除知识条目"""
        if entry_id not in self.entries:
            return False
        
        entry = self.entries[entry_id]
        
        # 从分类索引中移除
        if entry.category in self.category_index:
            if entry_id in self.category_index[entry.category]:
                self.category_index[entry.category].remove(entry_id)
        
        del self.entries[entry_id]
        
        logger.info(f"Deleted knowledge entry: {entry_id}")
        return True
    
    def get_all_categories(self) -> List[KnowledgeCategory]:
        """获取所有分类"""
        return list(KnowledgeCategory)
    
    def get_category_stats(self) -> Dict[str, int]:
        """获取分类统计"""
        return {
            category.value: len(ids)
            for category, ids in self.category_index.items()
        }


class KnowledgeBaseQAService:
    """知识库问答服务主类"""
    
    def __init__(
        self,
        llm: Any,
        rag_service: Optional[RAGService] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        self.llm = llm
        self.config = config or {}
        
        # 初始化 RAG 服务
        if rag_service:
            self.rag_service = rag_service
        else:
            rag_config = RAGConfig(
                vector_store_type=VectorStoreType(
                    self.config.get("vector_store_type", "chroma")
                ),
                embedding_model=EmbeddingModel(
                    self.config.get("embedding_model", "openai-text-embedding-3-small")
                ),
                chunk_size=self.config.get("chunk_size", 1000),
                chunk_overlap=self.config.get("chunk_overlap", 200),
                collection_name=self.config.get(
                    "collection_name", "web4_knowledge_base"
                ),
                persist_directory=self.config.get("persist_directory"),
                top_k=self.config.get("top_k", 4)
            )
            self.rag_service = RAGService(config=rag_config, llm_service=llm)
        
        # 初始化知识库管理器
        self.knowledge_manager = KnowledgeBaseManager(self.rag_service, self.config)
        
        # 初始化提示模板
        self.qa_prompt = self._init_qa_prompt()
        self.category_prompt = self._init_category_prompt()
        self.follow_up_prompt = self._init_follow_up_prompt()
    
    def _init_qa_prompt(self) -> ChatPromptTemplate:
        """初始化问答提示模板"""
        template = """You are a helpful AI assistant for the net4.xyz knowledge base. 
You have access to a knowledge base about Web4 technology, blockchain, AI/ML, PoUE consensus, and more.

Use the following context from the knowledge base to answer the user's question.
If the context doesn't contain enough information to answer the question, provide your best answer 
based on your general knowledge, but clearly indicate that the information is not from the knowledge base.

Context from knowledge base:
{context}

Question: {question}

Instructions:
1. Provide a clear, accurate answer
2. If citing knowledge base sources, mention them
3. Keep answers concise but informative
4. Use a friendly, professional tone

Answer: """
        
        return ChatPromptTemplate.from_messages([
            SystemMessage(content="You are a helpful AI assistant for net4.xyz knowledge base."),
            HumanMessage(content=template)
        ])
    
    def _init_category_prompt(self) -> PromptTemplate:
        """初始化分类提示模板"""
        template = """Classify the following question into one of these categories:
- web4_technology: Questions about Web4 technology concepts
- blockchain: Questions about blockchain technology
- ai_ml: Questions about AI and machine learning
- poue_consensus: Questions about PoUE consensus mechanism
- nft_did: Questions about NFTs and DID
- decentralized_storage: Questions about decentralized storage
- governance: Questions about governance and voting
- tutorial: Questions asking for how-to guides
- faq: Frequently asked questions
- general: General questions

Question: {question}

Category: """
        
        return PromptTemplate(
            template=template,
            input_variables=["question"]
        )
    
    def _init_follow_up_prompt(self) -> PromptTemplate:
        """初始化跟进问题提示模板"""
        template = """Based on the following question and answer, suggest 3 related follow-up questions 
that the user might want to ask next.

Question: {question}
Answer: {answer}

Provide only the questions, one per line, without numbering:
"""
        
        return PromptTemplate(
            template=template,
            input_variables=["question", "answer"]
        )
    
    async def query(
        self,
        question: str,
        use_history: bool = False,
        return_sources: bool = True,
        return_related: bool = True
    ) -> QAResult:
        """查询知识库"""
        # 1. 获取相关文档
        docs = self.rag_service.get_relevant_documents(question)
        
        # 2. 构建上下文
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # 3. 分类问题
        category = await self._classify_question(question)
        
        # 4. 生成答案
        answer = await self._generate_answer(context, question)
        
        # 5. 计算置信度
        confidence = self._calculate_confidence(docs, answer, question)
        
        # 6. 获取来源
        sources = []
        if return_sources:
            sources = [doc.page_content[:200] + "..." for doc in docs]
        
        # 7. 生成相关问题
        related_questions = []
        if return_related:
            related_questions = await self._generate_follow_up_questions(
                question, answer
            )
        
        return QAResult(
            question=question,
            answer=answer,
            confidence=confidence,
            sources=sources,
            category=category,
            related_questions=related_questions,
            metadata={
                "num_sources": len(docs),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def _classify_question(self, question: str) -> KnowledgeCategory:
        """分类问题"""
        try:
            chain = self.category_prompt | self.llm
            
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, chain.invoke, {"question": question})
            
            category_str = result.strip().lower().replace(" ", "_")
            
            # 映射到枚举
            category_map = {
                "web4_technology": KnowledgeCategory.WEB4_TECHNOLOGY,
                "blockchain": KnowledgeCategory.BLOCKCHAIN,
                "ai_ml": KnowledgeCategory.AI_ML,
                "poue_consensus": KnowledgeCategory.POUE_CONSENSUS,
                "nft_did": KnowledgeCategory.NFT_DID,
                "decentralized_storage": KnowledgeCategory.DECENTRALIZED_STORAGE,
                "governance": KnowledgeCategory.GOVERNANCE,
                "tutorial": KnowledgeCategory.TUTORIAL,
                "faq": KnowledgeCategory.FAQ,
                "general": KnowledgeCategory.GENERAL
            }
            
            return category_map.get(category_str, KnowledgeCategory.GENERAL)
            
        except Exception as e:
            logger.warning(f"Classification error: {e}")
            return KnowledgeCategory.GENERAL
    
    async def _generate_answer(
        self,
        context: str,
        question: str
    ) -> str:
        """生成答案"""
        try:
            # 使用 QA 提示模板
            formatted_prompt = self.qa_prompt.format(
                context=context,
                question=question
            )
            
            messages = [HumanMessage(content=formatted_prompt)]
            
            response = await self.llm.agenerate([messages])
            return response.generations[0][0].text
            
        except Exception as e:
            logger.error(f"Answer generation error: {e}")
            return "抱歉，我无法回答这个问题。请稍后再试。"
    
    def _calculate_confidence(
        self,
        docs: List[Document],
        answer: str,
        question: str
    ) -> AnswerConfidence:
        """计算置信度"""
        if not docs:
            return AnswerConfidence.UNKNOWN
        
        # 基于来源数量和相关性评分
        num_sources = len(docs)
        
        # 简单启发式：来源越多，置信度越高
        if num_sources >= 4:
            return AnswerConfidence.HIGH
        elif num_sources >= 2:
            return AnswerConfidence.MEDIUM
        else:
            return AnswerConfidence.LOW
    
    async def _generate_follow_up_questions(
        self,
        question: str,
        answer: str
    ) -> List[str]:
        """生成跟进问题"""
        try:
            chain = self.follow_up_prompt | self.llm
            
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                chain.invoke,
                {"question": question, "answer": answer}
            )
            
            # 解析结果
            questions = [
                q.strip() for q in result.strip().split("\n")
                if q.strip() and len(q.strip()) > 10
            ]
            
            return questions[:3]  # 最多返回3个
            
        except Exception as e:
            logger.warning(f"Follow-up generation error: {e}")
            return []
    
    def initialize_from_documents(
        self,
        documents: List[Document],
        persist_directory: Optional[str] = None
    ) -> None:
        """从文档初始化知识库"""
        self.rag_service.initialize_knowledge_base(
            documents,
            persist_directory
        )
        logger.info(f"Initialized knowledge base with {len(documents)} documents")
    
    def load_knowledge_base(self, persist_directory: str) -> None:
        """加载已有知识库"""
        self.rag_service.load_knowledge_base(persist_directory)
        logger.info(f"Loaded knowledge base from {persist_directory}")
    
    def add_knowledge(
        self,
        title: str,
        content: str,
        category: KnowledgeCategory,
        tags: Optional[List[str]] = None
    ) -> str:
        """添加知识条��"""
        import uuid
        
        entry = KnowledgeEntry(
            id=f"kb_{uuid.uuid4().hex[:8]}",
            title=title,
            content=content,
            category=category,
            tags=tags or [],
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        
        return self.knowledge_manager.add_entry(entry)
    
    def search_knowledge(
        self,
        query: str,
        limit: int = 10
    ) -> List[KnowledgeEntry]:
        """搜索知识库"""
        return self.knowledge_manager.search_entries(query, limit)
    
    def get_category_stats(self) -> Dict[str, int]:
        """获取分类统计"""
        return self.knowledge_manager.get_category_stats()


class Web4KnowledgeSeeder:
    """Web4 知识库播种器 - 预填充 Web4 相关知识"""
    
    @staticmethod
    def get_seed_data() -> List[KnowledgeEntry]:
        """获取预填充知识数据"""
        import uuid
        from datetime import datetime
        
        seed_data = [
            # Web4 Technology
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="什么是 Web4",
                content="""Web4 是下一代互联网架构，代表了从"价值互联网"到"感知互联网"的文明跃迁。

Web4 的核心特征：
1. AI 原生：AI 不是附加组件，而是互联网的核心基础设施
2. 情感共识：PoUE（Proof of Useful Energy）共识机制，将电力转化为对人类有用的 AI 智能
3. 数字主权：用户拥有自己的数字身份（DID）和数据
4. 去中心化存储：IPFS + Arweave 实现数据的永久存储
5. 分布式社交：端到端加密的社交网络

Web4 与 Web3 的区别：
- Web3 强调"去中心化金融"，Web4 强调"AI 文明"
- Web3 关注"所有权"，Web4 关注"主权"
- Web3 是"机器网络"，Web4 是"人机共生网络"
""",
                category=KnowledgeCategory.WEB4_TECHNOLOGY,
                tags=["web4", "概念", "定义", "互联网"],
                created_at=datetime.utcnow().isoformat()
            ),
            
            # PoUE Consensus
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="PoUE 共识机制",
                content="""PoUE（Proof of Useful Energy）是一种创新的共识机制，将电力转化为对人类有用的 AI 智能。

工作流程：
1. AFC 网络分配 AI 任务（知识推理/内容审核/科学计算）
2. 节点的 AI 分身执行推理任务
3. 提交结果哈希 + ZK-ML 证明
4. 其他节点验证（抽查机制）
5. 验证通过 → 获得区块奖励 + 手续费分成

核心优势：
- 能源利用效率高：不进行无意义的哈希计算
- 实际社会价值：AI 任务产生有用的输出
- ZK-ML 验证：零知识证明确认 AI 完成任务，保护隐私
- 情感计算：支持情感共识验证

节点类型：
- 核心验证节点：21 个，高性能 GPU
- 子节点：128 个，消费级 GPU
- 普通节点：轻量 AI 分身
""",
                category=KnowledgeCategory.POUE_CONSENSUS,
                tags=["poue", "共识", "挖矿", "AI"],
                created_at=datetime.utcnow().isoformat()
            ),
            
            # AFC Token
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="AFC 代币",
                content="""AFC 是 net4.xyz 生态系统的原生代币。

主要功能：
1. 治理投票：持有 AFC 可参与网络治理
2. 节点抵押：运行节点需要抵押 AFC
3. 手续费支付：网络交易需要用 AFC 支付手续费
4. 生态激励：奖励为网络提供算力的节点

代币经济学：
- 总供应量：10 亿 AFC
- 社区分配：60%
- 团队分配：20%（锁定期 4 年）
- 投资者分配：15%
- 基金会储备：5%

获取方式：
- 参与节点运行
- 购买火种 NFT
- 交易所购买（即将上线）
""",
                category=KnowledgeCategory.BLOCKCHAIN,
                tags=["afc", "代币", "token", "经济学"],
                created_at=datetime.utcnow().isoformat()
            ),
            
            # Spark NFT
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="火种 NFT（Spark NFT）",
                content="""火种 NFT 是 net4.xyz 节点身份的象征，也是运行 AI 节点的前提条件。

等级划分：
1. 核心节点火种：10 个，$10 万 USDT
2. 子节点火种：1 个，$9,999 USDT
3. 普通节点火种：1 个，$9,999 USDT

权益：
- 核心节点：出块权 + 50% 手续费分成 + 年化 8-12% 奖励
- 子节点：数据同步 + 辅助验证 + 年化 3-5% 奖励
- 普通节点：社区治理投票权 + 生态空投

AI 分身绑定：
- 每个火种 NFT 可绑定一个 AI 分身
- AI 分身执行 PoUE 任务
- 根据任务完成情况获得奖励
""",
                category=KnowledgeCategory.NFT_DID,
                tags=["nft", "火种", "spark", "节点"],
                created_at=datetime.utcnow().isoformat()
            ),
            
            # Web4 DNS
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="Web4 DNS 域名系统",
                content="""Web4 DNS 允许用户注册 .web4 域名，实现数字主权身份绑定。

功能：
1. 域名注册：注册 yourname.web4 域名
2. 身份绑定：绑定钱包地址、IPFS 哈希、Mirrome DID
3. 解析服务：去中心化域名解析
4. 域名管理：类似传统域名的管理后台

技术实现：
- 智能合约：Web4DNS 合约
- 解析映射：域名到资源的映射表
- 入口位置：首页导航栏最右侧

与传统 DNS 的区别：
- 完全去中心化
- 绑定多种资源类型
- 域名上链存证
- 支持 NFT 化交易
""",
                category=KnowledgeCategory.NFT_DID,
                tags=["web4", "dns", "域名", "去中心化"],
                created_at=datetime.utcnow().isoformat()
            ),
            
            # Knowledge Base
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="AI 知识库",
                content="""net4.xyz AI 知识库是 Web4 技术的核心知识中枢。

功能：
1. AI 自动生成：基于 LLM 生成 Web4 相关知识点总结
2. 智能问答：RAG 检索增强生成 + 知识库
3. 社区贡献：用户提交知识点，经审核后上链
4. 溯源查询：问答记录上链存证

技术实现：
- 嵌入模型：text-embedding-3-small
- 向量存储：Chroma
- 检索增强：LangChain RAG
- 数据来源：官方文档、社区贡献

合规标注：
- AI 生成内容标注「AI 辅助」标识
- 重要信息经过人工审核
- 定期更新知识库内容
""",
                category=KnowledgeCategory.WEB4_TECHNOLOGY,
                tags=["ai", "知识库", "rag", "wiki"],
                created_at=datetime.utcnow().isoformat()
            ),
            
            # FAQ
            KnowledgeEntry(
                id=f"kb_{uuid.uuid4().hex[:8]}",
                title="常见问题 FAQ",
                content="""Q: 如何开始使用 net4.xyz？
A: 访问 net4.xyz，注册账户，连接钱包即可开始。

Q: 什么是火种 NFT？
A: 火种 NFT 是运行节点的资格凭证，购买后可绑定 AI 分身。

Q: PoUE 与 PoW/PoS 有什么区别？
A: PoUE 不进行无意义哈希计算，而是执行有用的 AI 任务。

Q: 如何成为验证节点？
A: 购买核心火种 NFT（10 个），满足硬件要求，通过社区投票。

Q: AFC 代币在哪里交易？
A: 即将上线主流交易所，可关注官方公告。

Q: Web4 与 Web3 有什么区别？
A: Web4 强调 AI 文明和人机共生，Web3 强调去中心化金融。
""",
                category=KnowledgeCategory.FAQ,
                tags=["faq", "常见问题", "帮助"],
                created_at=datetime.utcnow().isoformat()
            ),
        ]
        
        return seed_data


# 导出
__all__ = [
    "KnowledgeBaseQAService",
    "KnowledgeBaseManager",
    "KnowledgeEntry",
    "KnowledgeCategory",
    "AnswerConfidence",
    "QAResult",
    "Web4KnowledgeSeeder",
]