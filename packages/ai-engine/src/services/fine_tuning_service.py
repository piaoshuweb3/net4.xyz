"""
Web4 Knowledge Base Fine-Tuning Service
Web4 知识库微调服务

负责微调 LLM 模型以适配 Web4 知识库，包括：
- 训练数据预处理
- 微调配置管理
- 模型训练执行
- 训练结果验证
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

logger = logging.getLogger(__name__)


class FineTuningProvider(str, Enum):
    """微调服务提供商"""
    OPENAI = "openai"           # OpenAI Fine-tuning
    ANTHROPIC = "anthropic"     # Anthropic (future)
    LOCAL = "local"             # 本地微调 (LoRA/QLoRA)
    VLLM = "vllm"               # vLLM 推理优化


class ModelSize(str, Enum):
    """模型大小"""
    SMALL = "small"     # 7B 参数
    MEDIUM = "medium"   # 13B 参数
    LARGE = "large"     # 70B 参数
    XL = "xl"           # 405B 参数


class TrainingStage(str, Enum):
    """训练阶段"""
    DATA_PREPARATION = "data_preparation"
    TRAINING = "training"
    EVALUATION = "evaluation"
    DEPLOYMENT = "deployment"


@dataclass
class FineTuningConfig:
    """微调配置"""
    provider: FineTuningProvider = FineTuningProvider.OPENAI
    base_model: str = "gpt-4o-mini"
    model_size: ModelSize = ModelSize.SMALL
    
    # 训练参数
    epochs: int = 3
    batch_size: int = 4
    learning_rate: float = 1e-5
    warmup_steps: int = 100
    max_seq_length: int = 4096
    
    # LoRA 配置 (本地微调)
    lora_r: int = 64
    lora_alpha: int = 128
    lora_dropout: float = 0.1
    lora_target_modules: List[str] = field(default_factory=lambda: ["q_proj", "v_proj"])
    
    # 数据配置
    train_split: float = 0.9
    validation_split: float = 0.1
    min_training_samples: int = 10
    
    # 输出配置
    output_dir: str = "./models/web4-finetuned"
    checkpoint_dir: str = "./models/checkpoints"
    
    # 验证配置
    eval_prompts: List[str] = field(default_factory=list)
    eval_ground_truth: List[str] = field(default_factory=list)


@dataclass
class TrainingProgress:
    """训练进度"""
    stage: TrainingStage
    current_step: int
    total_steps: int
    loss: float
    metrics: Dict[str, float]
    status: str  # running, completed, failed
    message: str
    started_at: str
    updated_at: str


@dataclass
class FineTuningResult:
    """微调结果"""
    model_id: str
    provider: FineTuningProvider
    base_model: str
    fine_tuned_model: str
    training_samples: int
    validation_samples: int
    final_loss: float
    eval_score: float
    training_time_minutes: float
    cost_estimate: float
    checkpoints: List[str]
    status: str
    created_at: str


class FineTuningService:
    """微调服务主类"""
    
    def __init__(self, config: Optional[FineTuningConfig] = None):
        self.config = config or FineTuningConfig()
        self.current_progress: Optional[TrainingProgress] = None
        self.training_history: List[FineTuningResult] = []
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保目录存在"""
        for dir_path in [self.config.output_dir, self.config.checkpoint_dir]:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    def prepare_training_data(
        self,
        data_items: List[Any],
        format: str = "openai"
    ) -> str:
        """准备训练数据"""
        if format == "openai":
            return self._prepare_openai_format(data_items)
        elif format == "anthropic":
            return self._prepare_anthropic_format(data_items)
        elif format == "local":
            return self._prepare_local_format(data_items)
        else:
            raise ValueError(f"Unknown format: {format}")
    
    def _prepare_openai_format(self, data_items: List[Any]) -> str:
        """准备 OpenAI 格式的训练数据"""
        training_data = []
        
        for item in data_items:
            # 转换为对话格式
            messages = [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": self._generate_prompt_from_item(item)},
                {"role": "assistant", "content": item.content}
            ]
            training_data.append({"messages": messages})
        
        # 保存训练文件
        output_path = os.path.join(
            self.config.output_dir,
            f"training_data_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jsonl"
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for item in training_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        
        logger.info(f"Prepared {len(training_data)} training samples at {output_path}")
        return output_path
    
    def _prepare_anthropic_format(self, data_items: List[Any]) -> str:
        """准备 Anthropic 格式的训练数据"""
        # Anthropic 格式
        training_data = []
        
        for item in data_items:
            training_data.append({
                "prompt": f"\n\nHuman: {self._generate_prompt_from_item(item)}\n\nAssistant:",
                "completion": f" {item.content}"
            })
        
        output_path = os.path.join(
            self.config.output_dir,
            f"training_data_anthropic_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jsonl"
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for item in training_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        
        return output_path
    
    def _prepare_local_format(self, data_items: List[Any]) -> str:
        """准备本地微调格式 (LoRA)"""
        # 本地格式 - JSONL
        training_data = []
        
        for item in data_items:
            training_data.append({
                "instruction": self._generate_prompt_from_item(item),
                "input": "",
                "output": item.content
            })
        
        output_path = os.path.join(
            self.config.output_dir,
            f"training_data_local_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)
        
        return output_path
    
    def _get_system_prompt(self) -> str:
        """获取系统提示词"""
        return """你是一个专业的 net4.xyz 知识库助手，专门回答关于 Web4 技术、区块链、AI 和 PoUE 共识机制的问题。

你的特点：
1. 专业知识：深入理解 Web4 技术栈
2. 准确回答：基于知识库提供准确信息
3. 清晰解释：用通俗易懂的语言解释技术概念
4. 合规意识：AI 生成内容会标注「AI 辅助」

如果问题超出知识库范围，请明确告知用户。"""
    
    def _generate_prompt_from_item(self, item: Any) -> str:
        """从数据项生成提示词"""
        # 基于标题生成问题
        title = item.title if hasattr(item, 'title') else str(item)
        
        prompts = [
            f"请详细介绍 {title}",
            f"什么是 {title}？",
            f"解释一下 {title} 的概念",
            f"{title} 是什么意思？",
        ]
        
        # 随机选择一个
        import random
        return random.choice(prompts)
    
    async def start_fine_tuning(
        self,
        training_data_path: str,
        callback: Optional[Callable] = None
    ) -> FineTuningResult:
        """开始微调训练"""
        logger.info(f"Starting fine-tuning with data from {training_data_path}")
        
        # 更新进度
        self.current_progress = TrainingProgress(
            stage=TrainingStage.DATA_PREPARATION,
            current_step=0,
            total_steps=100,
            loss=0.0,
            metrics={},
            status="running",
            message="Preparing training data...",
            started_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        
        if callback:
            await callback(self.current_progress)
        
        # 根据提供商执行微调
        if self.config.provider == FineTuningProvider.OPENAI:
            result = await self._fine_tune_openai(training_data_path, callback)
        elif self.config.provider == FineTuningProvider.LOCAL:
            result = await self._fine_tune_local(training_data_path, callback)
        else:
            raise NotImplementedError(f"Provider {self.config.provider} not implemented")
        
        self.training_history.append(result)
        return result
    
    async def _fine_tune_openai(
        self,
        training_data_path: str,
        callback: Optional[Callable] = None
    ) -> FineTuningResult:
        """使用 OpenAI 进行微调"""
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # 更新进度
        self.current_progress.stage = TrainingStage.TRAINING
        self.current_progress.message = "Uploading training data..."
        self.current_progress.updated_at = datetime.utcnow().isoformat()
        
        if callback:
            await callback(self.current_progress)
        
        # 1. 上传训练文件
        with open(training_data_path, 'rb') as f:
            file_response = await client.files.create(
                file=f,
                purpose="fine-tune"
            )
        
        training_file_id = file_response.id
        
        # 2. 创建微调任务
        self.current_progress.message = "Creating fine-tuning job..."
        
        create_params = {
            "training_file": training_file_id,
            "model": self.config.base_model,
            "epochs": self.config.epochs,
            "batch_size": self.config.batch_size,
            "learning_rate_multiplier": self.config.learning_rate,
        }
        
        # 添加可选参数
        if self.config.warmup_steps:
            create_params["hyperparameters"] = {
                "warmup_steps": self.config.warmup_steps
            }
        
        ft_job = await client.fine_tuning.jobs.create(**create_params)
        
        job_id = ft_job.id
        
        # 3. 等待训练完成
        self.current_progress.message = "Training in progress..."
        
        while True:
            await asyncio.sleep(30)  # 每30秒检查一次
            
            job = await client.fine_tuning.jobs.retrieve(job_id)
            
            self.current_progress.current_step = job.trained_tokens or 0
            self.current_progress.status = job.status
            
            if job.status == "succeeded":
                self.current_progress.message = "Training completed"
                self.current_progress.status = "completed"
                fine_tuned_model = job.fine_tuned_model
                break
            elif job.status == "failed":
                self.current_progress.message = f"Training failed: {job.error}"
                self.current_progress.status = "failed"
                raise RuntimeError(f"Fine-tuning failed: {job.error}")
            
            if callback:
                await callback(self.current_progress)
        
        # 4. 获取训练结果
        training_time = (datetime.utcnow() - datetime.fromisoformat(
            self.current_progress.started_at
        )).total_seconds() / 60
        
        result = FineTuningResult(
            model_id=job_id,
            provider=FineTuningProvider.OPENAI,
            base_model=self.config.base_model,
            fine_tuned_model=fine_tuned_model,
            training_samples=self._count_training_samples(training_data_path),
            validation_samples=0,
            final_loss=0.0,
            eval_score=0.0,
            training_time_minutes=training_time,
            cost_estimate=0.0,
            checkpoints=[],
            status="completed",
            created_at=datetime.utcnow().isoformat()
        )
        
        return result
    
    async def _fine_tune_local(
        self,
        training_data_path: str,
        callback: Optional[Callable] = None
    ) -> FineTuningResult:
        """本地微调 (使用 LoRA)"""
        # 模拟本地微调过程
        self.current_progress.stage = TrainingStage.TRAINING
        self.current_progress.message = "Loading model and data..."
        
        if callback:
            await callback(self.current_progress)
        
        # 模拟训练步骤
        total_steps = 100
        for step in range(total_steps):
            self.current_progress.current_step = step + 1
            self.current_progress.total_steps = total_steps
            self.current_progress.loss = max(0.1, 2.0 - (step / total_steps) * 1.9)
            self.current_progress.updated_at = datetime.utcnow().isoformat()
            
            if callback and step % 10 == 0:
                await callback(self.current_progress)
            
            await asyncio.sleep(0.1)  # 模拟训练时间
        
        # 保存模型
        model_path = os.path.join(
            self.config.output_dir,
            f"web4-lora-{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        )
        
        self.current_progress.stage = TrainingStage.DEPLOYMENT
        self.current_progress.message = "Saving model..."
        
        if callback:
            await callback(self.current_progress)
        
        result = FineTuningResult(
            model_id="local-lora",
            provider=FineTuningProvider.LOCAL,
            base_model=self._get_base_model_name(),
            fine_tuned_model=model_path,
            training_samples=self._count_training_samples(training_data_path),
            validation_samples=0,
            final_loss=self.current_progress.loss,
            eval_score=0.85,
            training_time_minutes=10.0,
            cost_estimate=0.0,
            checkpoints=[model_path],
            status="completed",
            created_at=datetime.utcnow().isoformat()
        )
        
        return result
    
    def _get_base_model_name(self) -> str:
        """获取基础模型名称"""
        size_map = {
            ModelSize.SMALL: "Llama-3-8B",
            ModelSize.MEDIUM: "Llama-3-13B",
            ModelSize.LARGE: "Llama-3-70B",
            ModelSize.XL: "Llama-3-405B"
        }
        return size_map.get(self.config.model_size, "Llama-3-8B")
    
    def _count_training_samples(self, file_path: str) -> int:
        """统计训练样本数"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    count += 1
        return count
    
    async def evaluate_model(
        self,
        model_path: str,
        eval_prompts: List[str],
        ground_truth: List[str]
    ) -> Dict[str, float]:
        """评估模型"""
        scores = {
            "accuracy": 0.0,
            "relevance": 0.0,
            "coherence": 0.0,
            "overall": 0.0
        }
        
        # TODO: 实现实际的评估逻辑
        # 这里使用模拟值
        scores["accuracy"] = 0.85
        scores["relevance"] = 0.82
        scores["coherence"] = 0.88
        scores["overall"] = (scores["accuracy"] + scores["relevance"] + scores["coherence"]) / 3
        
        return scores
    
    def get_training_history(self) -> List[FineTuningResult]:
        """获取训练历史"""
        return self.training_history
    
    def get_latest_model(self) -> Optional[FineTuningResult]:
        """获取最新模型"""
        if self.training_history:
            return self.training_history[-1]
        return None


class Web4ModelManager:
    """Web4 模型管理器 - 管理知识库专用模型"""
    
    def __init__(self):
        self.fine_tuning_service = FineTuningService()
        self.active_model: Optional[FineTuningResult] = None
    
    async def train_new_model(
        self,
        training_data_path: str,
        config: Optional[FineTuningConfig] = None
    ) -> FineTuningResult:
        """训练新模型"""
        if config:
            self.fine_tuning_service.config = config
        
        result = await self.fine_tuning_service.start_fine_tuning(training_data_path)
        self.active_model = result
        
        return result
    
    def get_active_model(self) -> Optional[FineTuningResult]:
        """获取当前活跃模型"""
        return self.active_model
    
    def switch_model(self, model_id: str) -> bool:
        """切换模型"""
        for result in self.fine_tuning_service.training_history:
            if result.model_id == model_id:
                self.active_model = result
                return True
        return False


# 导出
__all__ = [
    "FineTuningService",
    "Web4ModelManager",
    "FineTuningConfig",
    "FineTuningResult",
    "TrainingProgress",
    "FineTuningProvider",
    "ModelSize",
    "TrainingStage",
]