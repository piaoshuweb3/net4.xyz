"""
Web4 Knowledge Base Training Data Collector
Web4 知识库训练数据收集器

负责收集和整理 Web4 相关的训练数据，包括：
- 官方文档数据
- 白皮书内容
- 技术规范
- 社区问答
- 常见问题
"""
import os
import json
import logging
import hashlib
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
from pathlib import Path
import asyncio
import aiohttp
import re

from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class DataSourceType(str, Enum):
    """数据源类型"""
    OFFICIAL_DOCS = "official_docs"
    WHITEPAPER = "whitepaper"
    TECHNICAL_SPEC = "technical_spec"
    COMMUNITY_QA = "community_qa"
    FAQ = "faq"
    BLOG = "blog"
    WIKI = "wiki"
    CONTRACT_CODE = "contract_code"
    API_DOCS = "api_docs"
    FORUM = "forum"


class DataQualityLevel(str, Enum):
    """数据质量等级"""
    HIGH = "high"      # 官方文档、白皮书
    MEDIUM = "medium"  # 技术规范、API 文档
    LOW = "low"        # 社区内容、论坛


@dataclass
class TrainingDataItem:
    """训练数据条目"""
    id: str
    source: str
    source_type: DataSourceType
    title: str
    content: str
    url: Optional[str] = None
    quality_level: DataQualityLevel = DataQualityLevel.MEDIUM
    language: str = "zh-CN"
    category: str = "general"
    tags: List[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
    hash: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at
        if not self.hash:
            self.hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        """计算内容哈希"""
        content = f"{self.title}:{self.content}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def to_document(self) -> Document:
        """转换为 LangChain Document"""
        return Document(
            page_content=self.content,
            metadata={
                "id": self.id,
                "source": self.source,
                "source_type": self.source_type.value,
                "title": self.title,
                "url": self.url,
                "quality_level": self.quality_level.value,
                "language": self.language,
                "category": self.category,
                "tags": self.tags,
                "hash": self.hash
            }
        )


@dataclass
class DataCollectionConfig:
    """数据收集配置"""
    data_dir: str = "./data/training"
    official_docs_dir: str = "./data/training/official_docs"
    whitepaper_dir: str = "./data/training/whitepaper"
    output_dir: str = "./data/processed"
    min_content_length: int = 100
    max_content_length: int = 50000
    enable_web_scrape: bool = False
    web_sources: List[str] = field(default_factory=list)


class Web4DataCollector:
    """Web4 数据收集器"""
    
    def __init__(self, config: Optional[DataCollectionConfig] = None):
        self.config = config or DataCollectionConfig()
        self.collected_data: List[TrainingDataItem] = []
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保目录存在"""
        for dir_path in [
            self.config.data_dir,
            self.config.official_docs_dir,
            self.config.whitepaper_dir,
            self.config.output_dir
        ]:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    def collect_from_files(self, directory: str, source_type: DataSourceType) -> List[TrainingDataItem]:
        """从文件目录收集数据"""
        items = []
        dir_path = Path(directory)
        
        if not dir_path.exists():
            logger.warning(f"Directory not found: {directory}")
            return items
        
        for file_path in dir_path.rglob("*"):
            if file_path.is_file() and self._is_text_file(file_path):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    if len(content) >= self.config.min_content_length:
                        item = self._create_item_from_file(file_path, content, source_type)
                        items.append(item)
                except Exception as e:
                    logger.error(f"Error reading {file_path}: {e}")
        
        logger.info(f"Collected {len(items)} items from {directory}")
        return items
    
    def _is_text_file(self, path: Path) -> bool:
        """检查是否为文本文件"""
        text_extensions = {'.txt', '.md', '.markdown', '.json', '.yaml', '.yml', '.xml', '.html', '.csv'}
        return path.suffix.lower() in text_extensions
    
    def _create_item_from_file(
        self,
        file_path: Path,
        content: str,
        source_type: DataSourceType
    ) -> TrainingDataItem:
        """从文件创建训练数据条目"""
        # 提取标题
        title = file_path.stem.replace('_', ' ').replace('-', ' ').title()
        
        # 质量等级
        quality_map = {
            DataSourceType.OFFICIAL_DOCS: DataQualityLevel.HIGH,
            DataSourceType.WHITEPAPER: DataQualityLevel.HIGH,
            DataSourceType.TECHNICAL_SPEC: DataQualityLevel.MEDIUM,
            DataSourceType.API_DOCS: DataQualityLevel.MEDIUM,
            DataSourceType.COMMUNITY_QA: DataQualityLevel.LOW,
            DataSourceType.FORUM: DataQualityLevel.LOW,
        }
        
        return TrainingDataItem(
            id=f"file_{file_path.name[:8]}",
            source=str(file_path),
            source_type=source_type,
            title=title,
            content=self._clean_content(content),
            quality_level=quality_map.get(source_type, DataQualityLevel.MEDIUM),
            category=source_type.value
        )
    
    def _clean_content(self, content: str) -> str:
        """清理内容"""
        # 移除多余空白
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r' {2,}', ' ', content)
        
        # 截断过长内容
        if len(content) > self.config.max_content_length:
            content = content[:self.config.max_content_length]
        
        return content.strip()
    
    def collect_from_technical_docs(self) -> List[TrainingDataItem]:
        """从技术文档收集数据"""
        items = []
        
        # 从 net4.xyz 技术架构文档收集
        tech_doc_path = Path("net4.xyz-技术架构与实现标准.md")
        if tech_doc_path.exists():
            try:
                content = tech_doc_path.read_text(encoding="utf-8")
                items.extend(self._parse_technical_doc(content))
            except Exception as e:
                logger.error(f"Error reading technical doc: {e}")
        
        return items
    
    def _parse_technical_doc(self, content: str) -> List[TrainingDataItem]:
        """解析技术文档"""
        items = []
        
        # 按章节分割
        sections = re.split(r'\n##\s+', content)
        
        for i, section in enumerate(sections[1:], 1):  # 跳过标题
            lines = section.split('\n')
            title = lines[0].strip() if lines else f"Section {i}"
            section_content = '\n'.join(lines[1:]).strip()
            
            if len(section_content) >= self.config.min_content_length:
                # 确定分类
                category = self._categorize_section(title)
                
                item = TrainingDataItem(
                    id=f"tech_{i:03d}",
                    source="net4.xyz-技术架构与实现标准.md",
                    source_type=DataSourceType.TECHNICAL_SPEC,
                    title=title,
                    content=section_content,
                    quality_level=DataQualityLevel.HIGH,
                    category=category,
                    tags=self._extract_tags(title, section_content)
                )
                items.append(item)
        
        logger.info(f"Parsed {len(items)} sections from technical doc")
        return items
    
    def _categorize_section(self, title: str) -> str:
        """分类章节"""
        title_lower = title.lower()
        
        if any(k in title_lower for k in ["web4", "互联网", "架构"]):
            return "web4_technology"
        elif any(k in title_lower for k in ["区块链", "合约", "智能合约"]):
            return "blockchain"
        elif any(k in title_lower for k in ["ai", "模型", "机器学习"]):
            return "ai_ml"
        elif any(k in title_lower for k in ["共识", "poue", "poe"]):
            return "poue_consensus"
        elif any(k in title_lower for k in ["会员", "经济", "支付"]):
            return "economy"
        elif any(k in title_lower for k in ["存储", "ipfs", "arweave"]):
            return "storage"
        elif any(k in title_lower for k in ["节点", "客户端"]):
            return "node"
        else:
            return "general"
    
    def _extract_tags(self, title: str, content: str) -> List[str]:
        """提取标签"""
        tags = []
        
        # 从标题提取
        keywords = ["Web4", "Web3", "AI", "PoUE", "NFT", "DID", "IPFS", "Arweave", 
                   "区块链", "智能合约", "共识机制", "节点", "存储", "API"]
        for kw in keywords:
            if kw.lower() in title.lower() or kw in content:
                tags.append(kw)
        
        return list(set(tags))[:5]  # 最多5个标签
    
    def collect_all(self) -> List[TrainingDataItem]:
        """收集所有数据"""
        self.collected_data = []
        
        # 1. 技术文档
        self.collected_data.extend(self.collect_from_technical_docs())
        
        # 2. 官方文档目录
        self.collected_data.extend(
            self.collect_from_files(self.config.official_docs_dir, DataSourceType.OFFICIAL_DOCS)
        )
        
        # 3. 白皮书目录
        self.collected_data.extend(
            self.collect_from_files(self.config.whitepaper_dir, DataSourceType.WHITEPAPER)
        )
        
        # 去重
        self.collected_data = self._deduplicate(self.collected_data)
        
        logger.info(f"Total collected: {len(self.collected_data)} items")
        return self.collected_data
    
    def _deduplicate(self, items: List[TrainingDataItem]) -> List[TrainingDataItem]:
        """去重"""
        seen = set()
        unique_items = []
        
        for item in items:
            if item.hash not in seen:
                seen.add(item.hash)
                unique_items.append(item)
        
        return unique_items
    
    def export_to_json(self, output_path: Optional[str] = None) -> str:
        """导出为 JSON"""
        if not output_path:
            output_path = os.path.join(
                self.config.output_dir,
                f"training_data_{datetime.utcnow().strftime('%Y%m%d')}.json"
            )
        
        data = [asdict(item) for item in self.collected_data]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Exported {len(self.collected_data)} items to {output_path}")
        return output_path
    
    def export_to_documents(self) -> List[Document]:
        """导出为 LangChain Documents"""
        return [item.to_document() for item in self.collected_data]
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {
            "total_items": len(self.collected_data),
            "by_source_type": {},
            "by_quality_level": {},
            "by_category": {},
            "total_characters": 0,
            "languages": {}
        }
        
        for item in self.collected_data:
            # 按源类型统计
            st = item.source_type.value
            stats["by_source_type"][st] = stats["by_source_type"].get(st, 0) + 1
            
            # 按质量等级统计
            ql = item.quality_level.value
            stats["by_quality_level"][ql] = stats["by_quality_level"].get(ql, 0) + 1
            
            # 按分类统计
            cat = item.category
            stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
            
            # 字符数
            stats["total_characters"] += len(item.content)
            
            # 语言
            lang = item.language
            stats["languages"][lang] = stats["languages"].get(lang, 0) + 1
        
        return stats


class TrainingDataAugmenter:
    """训练数据增强器"""
    
    @staticmethod
    def augment_qa_pairs(items: List[TrainingDataItem]) -> List[TrainingDataItem]:
        """从内容生成问答对"""
        augmented = []
        
        for item in items:
            # 生成问答对
            qa_pairs = TrainingDataAugmenter._extract_qa_from_content(item.content)
            
            for question, answer in qa_pairs:
                aug_item = TrainingDataItem(
                    id=f"qa_{item.id}_{len(augmented)}",
                    source=item.source,
                    source_type=DataSourceType.FAQ,
                    title=question,
                    content=f"问题：{question}\n\n答案：{answer}",
                    quality_level=DataQualityLevel.MEDIUM,
                    category=item.category,
                    tags=item.tags + ["qa"],
                    metadata={"parent_id": item.id}
                )
                augmented.append(augmented)
        
        return augmented
    
    @staticmethod
    def _extract_qa_from_content(content: str) -> List[tuple]:
        """从内容中提取问答对"""
        qa_pairs = []
        
        # 匹配已有的 Q&A 格式
        qa_pattern = r'Q[：:]\s*(.+?)\n*A[：:]\s*(.+?)(?=\nQ[：:]|\Z)'
        matches = re.findall(qa_pattern, content, re.DOTALL)
        
        for question, answer in matches:
            qa_pairs.append((question.strip(), answer.strip()))
        
        # 如果没有找到问答对，生成假设性问题
        if not qa_pairs:
            # 从标题生成问题
            lines = content.split('\n')
            if lines:
                title = lines[0].strip()
                if len(title) > 5:
                    question = f"什么是{title}？"
                    answer = '\n'.join(lines[:5])
                    qa_pairs.append((question, answer))
        
        return qa_pairs[:5]  # 最多5对
    
    @staticmethod
    def add_translations(
        items: List[TrainingDataItem],
        target_languages: List[str] = None
    ) -> List[TrainingDataItem]:
        """添加翻译版本"""
        if target_languages is None:
            target_languages = ["en-US"]
        
        translated = []
        
        for item in items:
            for lang in target_languages:
                trans_item = TrainingDataItem(
                    id=f"{item.id}_trans_{lang}",
                    source=item.source,
                    source_type=item.source_type,
                    title=item.title,
                    content=item.content,  # 需要翻译服务
                    quality_level=item.quality_level,
                    language=lang,
                    category=item.category,
                    tags=item.tags,
                    metadata={"original_language": item.language, **item.metadata}
                )
                translated.append(trans_item)
        
        return translated


# 导出
__all__ = [
    "Web4DataCollector",
    "TrainingDataAugmenter",
    "TrainingDataItem",
    "DataCollectionConfig",
    "DataSourceType",
    "DataQualityLevel",
]