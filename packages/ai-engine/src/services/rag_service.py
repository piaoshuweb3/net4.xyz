"""
RAG (Retrieval Augmented Generation) Service
检索增强生成服务
"""
import os
import logging
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import numpy as np

from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
from langchain_community.document_loaders import (
    TextLoader,
    UnstructuredMarkdownLoader,
    PyPDFLoader,
    CSVLoader,
    JSONLoader,
)
from langchain_community.vectorstores import Chroma, FAISS
from langchain_openai import OpenAIEmbeddings
# Note: Anthropic does not provide embedding API, using OpenAI embeddings as fallback
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
# ContextualCompressionRetriever and QA chains are not available in current langchain version
# Using base retriever and LLM directly
# from langchain.chains import RetrievalQA, ConversationalRetrievalChain
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
# ConversationBufferMemory is not available, using simple list for history
try:
    from langchain.callbacks.streamlit import StreamlitCallbackHandler
except ImportError:
    StreamlitCallbackHandler = None

logger = logging.getLogger(__name__)


class VectorStoreType(str, Enum):
    """向量存储类型"""
    CHROMA = "chroma"
    FAISS = "faiss"


class EmbeddingModel(str, Enum):
    """嵌入模型"""
    OPENAI_ADA_2 = "openai-ada-2"
    OPENAI_TEXT_EMBEDDING_3_SMALL = "openai-text-embedding-3-small"
    OPENAI_TEXT_EMBEDDING_3_LARGE = "openai-text-embedding-3-large"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


@dataclass
class RAGConfig:
    """RAG 配置"""
    vector_store_type: VectorStoreType = VectorStoreType.CHROMA
    embedding_model: EmbeddingModel = EmbeddingModel.OPENAI_TEXT_EMBEDDING_3_SMALL
    chunk_size: int = 1000
    chunk_overlap: int = 200
    collection_name: str = "web4_knowledge_base"
    persist_directory: Optional[str] = None
    enable_compression: bool = True
    top_k: int = 4


class DocumentProcessor:
    """文档处理器"""
    
    def __init__(self, config: RAGConfig):
        self.config = config
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", "。", "！", "？", " ", ""]
        )
        self.markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "header1"),
                ("##", "header2"),
                ("###", "header3"),
            ]
        )
    
    def split_text(self, text: str) -> List[Document]:
        """分割纯文本"""
        return self.text_splitter.split_text(text)
    
    def split_documents(self, documents: List[Document]) -> List[Document]:
        """分割文档列表"""
        return self.text_splitter.split_documents(documents)
    
    def split_markdown(self, markdown_text: str) -> List[Document]:
        """分割 Markdown 文档"""
        return self.markdown_splitter.split_text(markdown_text)
    
    async def load_document(self, file_path: str) -> List[Document]:
        """加载文档"""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        loader_map = {
            ".txt": TextLoader,
            ".md": MarkdownLoader,
            ".markdown": MarkdownLoader,
            ".pdf": PyPDFLoader,
            ".csv": CSVLoader,
            ".json": JSONLoader,
        }
        
        loader_class = loader_map.get(file_ext)
        if not loader_class:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        try:
            if file_ext == ".pdf":
                loader = loader_class(file_path)
            else:
                loader = loader_class(file_path, encoding="utf-8")
            
            documents = loader.load()
            return self.split_documents(documents)
        except Exception as e:
            logger.error(f"Error loading document {file_path}: {e}")
            raise


class EmbeddingService:
    """嵌入服务"""
    
    def __init__(self, config: RAGConfig):
        self.config = config
        self.embeddings = self._init_embeddings()
    
    def _init_embeddings(self):
        """初始化嵌入模型"""
        model_map = {
            EmbeddingModel.OPENAI_ADA_2: "text-embedding-ada-002",
            EmbeddingModel.OPENAI_TEXT_EMBEDDING_3_SMALL: "text-embedding-3-small",
            EmbeddingModel.OPENAI_TEXT_EMBEDDING_3_LARGE: "text-embedding-3-large",
        }
        
        if self.config.embedding_model == EmbeddingModel.ANTHROPIC:
            # Anthropic does not provide embedding API, fallback to OpenAI
            logger.warning("Anthropic embedding not available, using OpenAI embeddings")
            return OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
        elif self.config.embedding_model == EmbeddingModel.LOCAL:
            # TODO: 实现本地嵌入模型
            raise NotImplementedError("Local embedding not implemented yet")
        else:
            model_name = model_map.get(
                self.config.embedding_model,
                "text-embedding-3-small"
            )
            return OpenAIEmbeddings(
                model=model_name,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """嵌入文本列表"""
        return self.embeddings.embed_documents(texts)
    
    def embed_query(self, query: str) -> List[float]:
        """嵌入查询"""
        return self.embeddings.embed_query(query)


class VectorStoreManager:
    """向量存储管理器"""
    
    def __init__(
        self,
        config: RAGConfig,
        embedding_service: EmbeddingService
    ):
        self.config = config
        self.embedding_service = embedding_service
        self.vector_store: Optional[Any] = None
    
    def create_vector_store(
        self,
        documents: List[Document],
        persist_directory: Optional[str] = None
    ) -> Any:
        """创建向量存储"""
        persist_dir = persist_directory or self.config.persist_directory
        
        if self.config.vector_store_type == VectorStoreType.CHROMA:
            self.vector_store = Chroma.from_documents(
                documents=documents,
                embedding=self.embedding_service.embeddings,
                collection_name=self.config.collection_name,
                persist_directory=persist_dir
            )
        elif self.config.vector_store_type == VectorStoreType.FAISS:
            self.vector_store = FAISS.from_documents(
                documents=documents,
                embedding=self.embedding_service.embeddings
            )
            if persist_dir:
                self.vector_store.save_local(persist_dir)
        else:
            raise ValueError(f"Unknown vector store type: {self.config.vector_store_type}")
        
        return self.vector_store
    
    def load_vector_store(self, persist_directory: str) -> Any:
        """加载向量存储"""
        if self.config.vector_store_type == VectorStoreType.CHROMA:
            self.vector_store = Chroma(
                embedding_function=self.embedding_service.embeddings,
                collection_name=self.config.collection_name,
                persist_directory=persist_directory
            )
        elif self.config.vector_store_type == VectorStoreType.FAISS:
            self.vector_store = FAISS.load_local(
                persist_directory,
                self.embedding_service.embeddings,
                allow_dangerous_deserialization=True
            )
        
        return self.vector_store
    
    def add_documents(self, documents: List[Document]) -> None:
        """添加文档到向量存储"""
        if not self.vector_store:
            raise ValueError("Vector store not initialized")
        self.vector_store.add_documents(documents)
    
    def similarity_search(
        self,
        query: str,
        k: int = None,
        filter: Optional[Dict] = None
    ) -> List[Document]:
        """相似度搜索"""
        if not self.vector_store:
            raise ValueError("Vector store not initialized")
        
        k = k or self.config.top_k
        return self.vector_store.similarity_search(query, k=k, filter=filter)
    
    def similarity_search_with_score(
        self,
        query: str,
        k: int = None
    ) -> List[tuple]:
        """带分数的相似度搜索"""
        if not self.vector_store:
            raise ValueError("Vector store not initialized")
        
        k = k or self.config.top_k
        return self.vector_store.similarity_search_with_score(query, k=k)
    
    def as_retriever(self, **kwargs) -> BaseRetriever:
        """转换为检索器"""
        if not self.vector_store:
            raise ValueError("Vector store not initialized")
        
        return self.vector_store.as_retriever(**kwargs)


class RAGService:
    """RAG 服务主类"""
    
    def __init__(
        self,
        config: Optional[RAGConfig] = None,
        llm_service: Optional[Any] = None
    ):
        self.config = config or RAGConfig()
        self.document_processor = DocumentProcessor(self.config)
        self.embedding_service = EmbeddingService(self.config)
        self.vector_store_manager = VectorStoreManager(
            self.config,
            self.embedding_service
        )
        self.llm_service = llm_service
        # Simple list for conversation history (instead of ConversationBufferMemory)
        self.memory = []
        self.llm_service = llm_service
        self.qa_chain: Optional[ConversationalRetrievalChain] = None
        self.memory: Optional[ConversationBufferMemory] = None
    
    def initialize_knowledge_base(
        self,
        documents: List[Document],
        persist_directory: Optional[str] = None
    ) -> VectorStoreManager:
        """初始化知识库"""
        # 分割文档
        split_docs = self.document_processor.split_documents(documents)
        
        # 创建向量存储
        vector_store = self.vector_store_manager.create_vector_store(
            split_docs,
            persist_directory
        )
        
        logger.info(f"Knowledge base initialized with {len(split_docs)} chunks")
        return self.vector_store_manager
    
    def load_knowledge_base(self, persist_directory: str) -> VectorStoreManager:
        """加载已有知识库"""
        return self.vector_store_manager.load_vector_store(persist_directory)
    
    def add_documents(self, documents: List[Document]) -> None:
        """添加文档到知识库"""
        split_docs = self.document_processor.split_documents(documents)
        self.vector_store_manager.add_documents(split_docs)
        logger.info(f"Added {len(split_docs)} document chunks to knowledge base")
    
    async def query(
        self,
        question: str,
        use_history: bool = False,
        return_sources: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """查询知识库"""
        if not self.vector_store_manager.vector_store:
            raise ValueError("Knowledge base not initialized")
        
        # 获取检索器
        retriever = self.vector_store_manager.as_retriever(
            search_kwargs={"k": self.config.top_k}
        )
        
        # 构建 QA 链
        # 获取相关文档
        docs = retriever.get_relevant_documents(question)
        
        # 构建上下文
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # 使用 LLM 直接生成答案
        from langchain_core.prompts import ChatPromptTemplate
        
        # 构建历史文本
        history_text = ""
        if use_history and self.memory:
            # self.memory is a list of (question, answer) tuples
            history_parts = []
            for q, a in self.memory[-5:]:  # 只使用最近5轮对话
                history_parts.append(f"Human: {q}\nAssistant: {a}")
            history_text = "\n\n".join(history_parts)
        
        # 构建上下文
        if history_text:
            system_content = f"""You are a helpful assistant. Use the following context to answer the question.

Context:
{context}

Conversation History:
{history_text}

Please answer the question based on the context and conversation history."""
        else:
            system_content = f"""You are a helpful assistant. Use the following context to answer the question.

Context:
{context}

Please answer the question based on the context only."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_content),
            ("human", "{input}")
        ])
        
        input_text = question
        
        # 调用 LLM
        messages = prompt.format_messages(input=input_text)
        response = await self.llm_service.agenerate([messages])
        answer = response.generations[0][0].text
        
        # 更新历史
        if use_history:
            self.memory.append((question, answer))
            # 保持最近10轮对话
            if len(self.memory) > 10:
                self.memory = self.memory[-10:]
        
        return {
            "answer": answer,
            "source_documents": docs if return_sources else [],
            "query": question
        }
    
    async def _arun_qa(self, chain, question: str) -> Dict[str, Any]:
        """异步运行 QA 链"""
        import asyncio
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, chain.invoke, {"query": question})
        
        return {
            "answer": result.get("result", ""),
            "source_documents": result.get("source_documents", []) if return_sources else [],
            "query": question
        }
    
    def get_relevant_documents(
        self,
        query: str,
        k: int = None
    ) -> List[Document]:
        """获取相关文档"""
        return self.vector_store_manager.similarity_search(query, k=k)
    
    def get_relevant_documents_with_score(
        self,
        query: str,
        k: int = None
    ) -> List[tuple]:
        """获取带分数的相关文档"""
        return self.vector_store_manager.similarity_search_with_score(query, k=k)
    
    def create_compression_retriever(self, llm: Any) -> BaseRetriever:
        """创建检索器"""
        base_retriever = self.vector_store_manager.as_retriever(
            search_kwargs={"k": self.config.top_k}
        )
        
        # Note: ContextualCompressionRetriever is not available
        # Returning base retriever directly
        return base_retriever


# 导出
__all__ = [
    "RAGService",
    "RAGConfig",
    "VectorStoreType",
    "EmbeddingModel",
    "DocumentProcessor",
    "EmbeddingService",
    "VectorStoreManager",
]