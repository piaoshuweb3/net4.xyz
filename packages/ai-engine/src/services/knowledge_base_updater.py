"""
Web4 Knowledge Base Update Mechanism
Web4 知识库更新机制

负责知识库的持续更新，包括：
- 增量更新
- 版本管理
- 自动更新调度
- 回滚机制
"""
import os
import json
import logging
import hashlib
import shutil
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
import croniter

from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class UpdateType(str, Enum):
    """更新类型"""
    FULL = "full"           # 全量更新
    INCREMENTAL = "incremental"  # 增量更新
    EMERGENCY = "emergency"  # 紧急更新
    SCHEDULED = "scheduled"  # 定时更新


class UpdateStatus(str, Enum):
    """更新状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class KnowledgeVersion:
    """知识库版本"""
    version: str
    created_at: str
    description: str
    num_documents: int
    num_chunks: int
    hash: str
    size_bytes: int
    parent_version: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateConfig:
    """更新配置"""
    # 存储配置
    base_dir: str = "./data/knowledge_base"
    versions_dir: str = "./data/knowledge_base/versions"
    current_dir: str = "./data/knowledge_base/current"
    backup_dir: str = "./data/knowledge_base/backups"
    
    # 更新配置
    update_type: UpdateType = UpdateType.INCREMENTAL
    auto_backup: bool = True
    max_backups: int = 5
    max_versions: int = 10
    
    # 调度配置
    enable_scheduled_update: bool = False
    cron_expression: str = "0 2 * * *"  # 每天凌晨2点
    check_interval_minutes: int = 60
    
    # 验证配置
    verify_before_deploy: bool = True
    min_quality_score: float = 0.5


@dataclass
class UpdateProgress:
    """更新进度"""
    update_id: str
    update_type: UpdateType
    status: UpdateStatus
    current_step: str
    progress_percent: float
    total_steps: int
    completed_steps: int
    started_at: str
    updated_at: str
    error_message: Optional[str] = None


@dataclass
class UpdateResult:
    """更新结果"""
    update_id: str
    update_type: UpdateType
    status: UpdateStatus
    old_version: Optional[str]
    new_version: Optional[str]
    num_added: int
    num_updated: int
    num_deleted: int
    num_chunks: int
    duration_seconds: float
    error_message: Optional[str] = None
    rollback_available: bool = True


class KnowledgeBaseVersionManager:
    """知识库版本管理器"""
    
    def __init__(self, config: Optional[UpdateConfig] = None):
        self.config = config or UpdateConfig()
        self._ensure_directories()
        self.versions: List[KnowledgeVersion] = []
        self._load_versions()
    
    def _ensure_directories(self):
        """确保目录存在"""
        for dir_path in [
            self.config.base_dir,
            self.config.versions_dir,
            self.config.current_dir,
            self.config.backup_dir
        ]:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    def _load_versions(self):
        """加载版本列表"""
        versions_file = Path(self.config.versions_dir) / "versions.json"
        
        if versions_file.exists():
            try:
                with open(versions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.versions = [KnowledgeVersion(**v) for v in data]
            except Exception as e:
                logger.error(f"Error loading versions: {e}")
                self.versions = []
    
    def _save_versions(self):
        """保存版本列表"""
        versions_file = Path(self.config.versions_dir) / "versions.json"
        
        with open(versions_file, 'w', encoding='utf-8') as f:
            json.dump([asdict(v) for v in self.versions], f, ensure_ascii=False, indent=2)
    
    def _generate_version_id(self) -> str:
        """生成版本ID"""
        return datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    def _compute_hash(self, data: Any) -> str:
        """计算数据哈希"""
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def create_version(
        self,
        documents: List[Document],
        description: str = "",
        parent_version: Optional[str] = None
    ) -> KnowledgeVersion:
        """创建新版本"""
        version_id = self._generate_version_id()
        
        # 计算内容哈希
        content_hash = self._compute_hash([doc.page_content for doc in documents])
        
        # 统计信息
        num_documents = len(documents)
        num_chunks = sum(len(doc.page_content) // 500 + 1 for doc in documents)
        
        # 计算大小
        total_size = sum(len(doc.page_content.encode()) for doc in documents)
        
        version = KnowledgeVersion(
            version=version_id,
            created_at=datetime.utcnow().isoformat(),
            description=description,
            num_documents=num_documents,
            num_chunks=num_chunks,
            hash=content_hash,
            size_bytes=total_size,
            parent_version=parent_version
        )
        
        # 保存版本数据
        version_dir = Path(self.config.versions_dir) / version_id
        version_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存文档
        docs_data = [
            {
                "content": doc.page_content,
                "metadata": doc.metadata
            }
            for doc in documents
        ]
        
        with open(version_dir / "documents.json", 'w', encoding='utf-8') as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)
        
        # 保存版本信息
        with open(version_dir / "version.json", 'w', encoding='utf-8') as f:
            json.dump(asdict(version), f, ensure_ascii=False, indent=2)
        
        # 更新版本列表
        self.versions.append(version)
        self._save_versions()
        
        # 部署为当前版本
        self.deploy_version(version_id)
        
        # 清理旧版本
        self._cleanup_old_versions()
        
        logger.info(f"Created version {version_id} with {num_documents} documents")
        return version
    
    def deploy_version(self, version_id: str) -> bool:
        """部署版本"""
        version_dir = Path(self.config.versions_dir) / version_id
        current_dir = Path(self.config.current_dir)
        
        if not version_dir.exists():
            logger.error(f"Version {version_id} not found")
            return False
        
        # 备份当前版本
        if self.config.auto_backup and current_dir.exists():
            backup_id = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            backup_path = Path(self.config.backup_dir) / backup_id
            shutil.copytree(current_dir, backup_path)
            self._cleanup_old_backups()
        
        # 复制新版本
        if current_dir.exists():
            shutil.rmtree(current_dir)
        shutil.copytree(version_dir, current_dir)
        
        logger.info(f"Deployed version {version_id}")
        return True
    
    def load_version(self, version_id: str) -> List[Document]:
        """加载指定版本"""
        version_dir = Path(self.config.versions_dir) / version_id / "documents.json"
        
        if not version_dir.exists():
            raise FileNotFoundError(f"Version {version_id} not found")
        
        with open(version_dir, 'r', encoding='utf-8') as f:
            docs_data = json.load(f)
        
        return [
            Document(page_content=d["content"], metadata=d.get("metadata", {}))
            for d in docs_data
        ]
    
    def load_current_version(self) -> List[Document]:
        """加载当前版本"""
        current_dir = Path(self.config.current_dir) / "documents.json"
        
        if not current_dir.exists():
            return []
        
        with open(current_dir, 'r', encoding='utf-8') as f:
            docs_data = json.load(f)
        
        return [
            Document(page_content=d["content"], metadata=d.get("metadata", {}))
            for d in docs_data
        ]
    
    def get_version(self, version_id: str) -> Optional[KnowledgeVersion]:
        """获取版本信息"""
        for v in self.versions:
            if v.version == version_id:
                return v
        return None
    
    def get_latest_version(self) -> Optional[KnowledgeVersion]:
        """获取最新版本"""
        if self.versions:
            return self.versions[-1]
        return None
    
    def get_all_versions(self) -> List[KnowledgeVersion]:
        """获取所有版本"""
        return self.versions.copy()
    
    def rollback(self, target_version: str) -> bool:
        """回滚到指定版本"""
        return self.deploy_version(target_version)
    
    def _cleanup_old_versions(self):
        """清理旧版本"""
        if len(self.versions) <= self.config.max_versions:
            return
        
        # 保留最新的 N 个版本
        versions_to_remove = self.versions[:-self.config.max_versions]
        
        for version in versions_to_remove:
            version_dir = Path(self.config.versions_dir) / version.version
            if version_dir.exists():
                shutil.rmtree(version_dir)
        
        self.versions = self.versions[-self.config.max_versions:]
        self._save_versions()
        
        logger.info(f"Cleaned up {len(versions_to_remove)} old versions")
    
    def _cleanup_old_backups(self):
        """清理旧备份"""
        backup_dir = Path(self.config.backup_dir)
        
        if not backup_dir.exists():
            return
        
        backups = sorted(
            backup_dir.iterdir(),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        
        for backup in backups[self.config.max_backups:]:
            if backup.is_dir():
                shutil.rmtree(backup)
        
        logger.info(f"Cleaned up old backups, kept {self.config.max_backups}")


class KnowledgeBaseUpdater:
    """知识库更新器"""
    
    def __init__(
        self,
        config: Optional[UpdateConfig] = None,
        version_manager: Optional[KnowledgeBaseVersionManager] = None
    ):
        self.config = config or UpdateConfig()
        self.version_manager = version_manager or KnowledgeBaseVersionManager(self.config)
        self.current_update: Optional[UpdateProgress] = None
        self.update_history: List[UpdateResult] = []
    
    async def perform_update(
        self,
        new_documents: List[Document],
        update_type: UpdateType = UpdateType.INCREMENTAL,
        description: str = "",
        verify_callback: Optional[Callable] = None
    ) -> UpdateResult:
        """执行更新"""
        update_id = f"update_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # 初始化进度
        self.current_update = UpdateProgress(
            update_id=update_id,
            update_type=update_type,
            status=UpdateStatus.RUNNING,
            current_step="Initializing",
            progress_percent=0,
            total_steps=5,
            completed_steps=0,
            started_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        
        start_time = datetime.utcnow()
        old_version = self.version_manager.get_latest_version()
        
        try:
            # 步骤 1: 准备更新
            self.current_update.current_step = "Preparing update"
            self.current_update.completed_steps = 1
            self.current_update.progress_percent = 20
            
            # 步骤 2: 验证新文档
            if self.config.verify_before_deploy and verify_callback:
                self.current_update.current_step = "Verifying documents"
                self.current_update.completed_steps = 2
                self.current_update.progress_percent = 40
                
                is_valid = await verify_callback(new_documents)
                if not is_valid:
                    raise ValueError("Document verification failed")
            
            # 步骤 3: 合并文档
            self.current_update.current_step = "Merging documents"
            self.current_update.completed_steps = 3
            self.current_update.progress_percent = 60
            
            merged_documents = self._merge_documents(new_documents, update_type)
            
            # 步骤 4: 创建新版本
            self.current_update.current_step = "Creating new version"
            self.current_update.completed_steps = 4
            self.current_update.progress_percent = 80
            
            new_version = self.version_manager.create_version(
                merged_documents,
                description=description,
                parent_version=old_version.version if old_version else None
            )
            
            # 步骤 5: 完成
            self.current_update.current_step = "Completed"
            self.current_update.completed_steps = 5
            self.current_update.progress_percent = 100
            self.current_update.status = UpdateStatus.COMPLETED
            
            # 计算统计
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            result = UpdateResult(
                update_id=update_id,
                update_type=update_type,
                status=UpdateStatus.COMPLETED,
                old_version=old_version.version if old_version else None,
                new_version=new_version.version,
                num_added=len(new_documents),
                num_updated=0,
                num_deleted=0,
                num_chunks=new_version.num_chunks,
                duration_seconds=duration
            )
            
            self.update_history.append(result)
            logger.info(f"Update {update_id} completed successfully")
            
            return result
            
        except Exception as e:
            logger.error(f"Update {update_id} failed: {e}")
            
            self.current_update.status = UpdateStatus.FAILED
            self.current_update.error_message = str(e)
            
            result = UpdateResult(
                update_id=update_id,
                update_type=update_type,
                status=UpdateStatus.FAILED,
                old_version=old_version.version if old_version else None,
                new_version=None,
                num_added=0,
                num_updated=0,
                num_deleted=0,
                num_chunks=0,
                duration_seconds=(datetime.utcnow() - start_time).total_seconds(),
                error_message=str(e)
            )
            
            self.update_history.append(result)
            return result
    
    def _merge_documents(
        self,
        new_documents: List[Document],
        update_type: UpdateType
    ) -> List[Document]:
        """合并文档"""
        if update_type == UpdateType.FULL:
            return new_documents
        
        # 增量更新：加载当前文档并合并
        current_documents = self.version_manager.load_current_version()
        
        # 创建文档映射
        doc_map = {}
        for doc in current_documents:
            doc_id = doc.metadata.get("id", doc.page_content[:50])
            doc_map[doc_id] = doc
        
        # 添加或更新新文档
        for doc in new_documents:
            doc_id = doc.metadata.get("id", doc.page_content[:50])
            doc_map[doc_id] = doc
        
        return list(doc_map.values())
    
    async def scheduled_update(
        self,
        data_collector: Any,
        verify_callback: Optional[Callable] = None
    ) -> UpdateResult:
        """定时更新"""
        logger.info("Starting scheduled update")
        
        # 收集新数据
        new_data = data_collector.collect_all()
        documents = [item.to_document() for item in new_data]
        
        # 执行更新
        return await self.perform_update(
            documents,
            update_type=UpdateType.SCHEDULED,
            description="Scheduled update",
            verify_callback=verify_callback
        )
    
    def get_update_history(self) -> List[UpdateResult]:
        """获取更新历史"""
        return self.update_history
    
    def get_current_progress(self) -> Optional[UpdateProgress]:
        """获取当前进度"""
        return self.current_update


class KnowledgeBaseScheduler:
    """知识库更新调度器"""
    
    def __init__(self, updater: KnowledgeBaseUpdater):
        self.updater = updater
        self.config = updater.config
        self.is_running = False
        self.scheduler_task: Optional[asyncio.Task] = None
    
    async def start(self, data_collector: Any):
        """启动调度器"""
        if not self.config.enable_scheduled_update:
            logger.info("Scheduled update is disabled")
            return
        
        self.is_running = True
        self.scheduler_task = asyncio.create_task(self._run_scheduler(data_collector))
        logger.info("Knowledge base scheduler started")
    
    async def stop(self):
        """停止调度器"""
        self.is_running = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("Knowledge base scheduler stopped")
    
    async def _run_scheduler(self, data_collector: Any):
        """运行调度器"""
        while self.is_running:
            try:
                # 检查是否到了更新时间
                if self._should_update():
                    logger.info("Scheduled update triggered")
                    await self.updater.scheduled_update(data_collector)
                
                # 等待下次检查
                await asyncio.sleep(self.config.check_interval_minutes * 60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)  # 错误后等待1分钟
    
    def _should_update(self) -> bool:
        """检查是否应该更新"""
        if not self.config.enable_scheduled_update:
            return False
        
        # 解析 cron 表达式
        try:
            cron = croniter.croniter(
                self.config.cron_expression,
                datetime.utcnow()
            )
            next_run = cron.get_next(datetime)
            now = datetime.utcnow()
            
            # 如果当前时间接近下次运行时间
            return (next_run - now).total_seconds() < 60
            
        except Exception as e:
            logger.error(f"Cron parsing error: {e}")
            return False


# 导出
__all__ = [
    "KnowledgeBaseUpdater",
    "KnowledgeBaseVersionManager",
    "KnowledgeBaseScheduler",
    "UpdateConfig",
    "UpdateResult",
    "UpdateProgress",
    "KnowledgeVersion",
    "UpdateType",
    "UpdateStatus",
]