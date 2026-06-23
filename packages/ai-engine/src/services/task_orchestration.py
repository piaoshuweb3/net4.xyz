"""
LangChain Task Orchestration Service
基于 LangChain 的 AI 任务编排系统
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder
# SimpleLLMChain, SequentialChain, RouterChain are not available in current langchain version
# Using base LLM and prompts directly
# AgentType is not available
# from langchain_community.agents.agent_types import AgentType
# AgentExecutor, Tool, ZeroShotAgent, initialize_agent are not available
# Using simple LLM calls instead
# from langchain_community.agents import AgentExecutor, Tool, ZeroShotAgent, initialize_agent
# ConversationBufferMemory and ConversationSummaryMemory are not available
# Using simple list for history if needed
# langchain.callbacks.get_callback_manager is removed in langchain 1.x
# Using langchain_core.callbacks instead if needed
try:
    from langchain.callbacks.streamlit import StreamlitCallbackHandler
except ImportError:
    StreamlitCallbackHandler = None
# StructuredTool is not available
# from langchain_community.tools import StructuredTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Simple SimpleLLMChain replacement (since langchain.chains is not available)
class SimpleLLMChain:
    """Simple LLMChain replacement using LLM and PromptTemplate directly"""
    
    def __init__(self, llm: Any, prompt: Any, output_key: str = "result"):
        self.llm = llm
        self.prompt = prompt
        self.output_key = output_key
    
    def invoke(self, input_variables: Dict[str, Any]) -> Dict[str, Any]:
        """Run the chain"""
        # Format the prompt
        formatted_prompt = self.prompt.format(**input_variables)
        
        # Call LLM
        from langchain_core.messages import HumanMessage
        messages = [HumanMessage(content=formatted_prompt)]
        
        if hasattr(self.llm, 'agenerate'):
            # Async LLM
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                # We're already in an async context, use run_in_executor
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(self.llm.invoke, formatted_prompt)
                    result_text = future.result()
                    if hasattr(result_text, 'content'):
                        result_text = result_text.content
            except RuntimeError:
                loop = asyncio.new_event_loop()
                response = loop.run_until_complete(self.llm.agenerate([messages]))
                result_text = response.generations[0][0].text
        else:
            # Sync LLM - try invoke first
            try:
                result = self.llm.invoke(formatted_prompt)
                result_text = result.content if hasattr(result, 'content') else str(result)
            except Exception:
                response = self.llm.generate([messages])
                result_text = response.generations[0][0].text
        
        return {self.output_key: result_text}

# Alias for backward compatibility
SimpleSimpleLLMChain = SimpleLLMChain


class TaskType(str, Enum):
    """任务类型"""
    TEXT_GENERATION = "text_generation"
    QUESTION_ANSWER = "question_answer"
    SUMMARIZATION = "summarization"
    TRANSLATION = "translation"
    EMOTIONAL_COMPUTING = "emotional_computing"
    KNOWLEDGE_QUERY = "knowledge_query"
    CODE_GENERATION = "code_generation"
    CREATIVE_WRITING = "creative_writing"
    ANALYSIS = "analysis"
    CUSTOM = "custom"


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Priority(str, Enum):
    """任务优先级"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class TaskConfig:
    """任务配置"""
    task_type: TaskType = TaskType.TEXT_GENERATION
    max_retries: int = 3
    timeout: int = 300  # 秒
    priority: Priority = Priority.NORMAL
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TaskResult:
    """任务结果"""
    task_id: str
    status: TaskStatus
    result: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0
    tokens_used: int = 0
    model_used: str = ""


class TaskChainBuilder:
    """任务链构建器"""
    
    def __init__(self, llm: Any):
        self.llm = llm
    
    def create_qa_chain(
        self,
        prompt_template: Optional[str] = None,
        output_key: str = "answer"
    ) -> SimpleLLMChain:
        """创建问答链"""
        template = prompt_template or """Based on the following context, answer the question.

Context: {context}

Question: {question}

Answer: """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
        
        return SimpleLLMChain(
            llm=self.llm,
            prompt=prompt,
            output_key=output_key
        )
    
    def create_summarization_chain(
        self,
        prompt_template: Optional[str] = None,
        output_key: str = "summary"
    ) -> SimpleLLMChain:
        """创建摘要链"""
        template = prompt_template or """Summarize the following text concisely:

Text: {text}

Summary: """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["text"]
        )
        
        return SimpleLLMChain(
            llm=self.llm,
            prompt=prompt,
            output_key=output_key
        )
    
    def create_translation_chain(
        self,
        target_language: str = "English",
        output_key: str = "translation"
    ) -> SimpleLLMChain:
        """创建翻译链"""
        template = f"""Translate the following text to {target_language}:

Text: {{text}}

Translation: """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["text"]
        )
        
        return SimpleLLMChain(
            llm=self.llm,
            prompt=prompt,
            output_key=output_key
        )
    
    def create_creative_writing_chain(
        self,
        style: str = "professional",
        output_key: str = "output"
    ) -> SimpleLLMChain:
        """创建创意写作链"""
        template = f"""Write a creative piece in a {style} style based on the following prompt:

Prompt: {{prompt}}

Content: """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["prompt"]
        )
        
        return SimpleLLMChain(
            llm=self.llm,
            prompt=prompt,
            output_key=output_key
        )
    
    def create_analysis_chain(
        self,
        analysis_type: str = "general",
        output_key: str = "analysis"
    ) -> SimpleLLMChain:
        """创建分析链"""
        template = f"""Perform {analysis_type} analysis on the following:

Content: {{content}}

Analysis: """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["content"]
        )
        
        return SimpleLLMChain(
            llm=self.llm,
            prompt=prompt,
            output_key=output_key
        )
    
    def create_sequential_chain(
        self,
        chains: List[SimpleLLMChain],
        input_variables: List[str],
        output_variables: List[str]
    ) -> SequentialChain:
        """创建顺序链"""
        return SequentialChain(
            chains=chains,
            input_variables=input_variables,
            output_variables=output_variables
        )


class TaskAgentBuilder:
    """任务代理构建器"""
    
    def __init__(self, llm: Any):
        self.llm = llm
    
    def create_qa_agent(
        self,
        tools: List[Any],  # Changed from List[Tool]
        system_message: Optional[str] = None
    ) -> Any:  # Return type changed from AgentExecutor
        """创建问答代理 (简化版本，Agent 功能暂不可用)"""
        # Agent functionality is not available in current langchain version
        # Returning a simple LLM chain instead
        from langchain_core.prompts import ChatPromptTemplate
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message or "You are a helpful AI assistant."),
            ("human", "{input}")
        ])
        
        return SimpleLLMChain(llm=self.llm, prompt=prompt, output_key="output")
    
    def create_conversational_agent(
        self,
        tools: List[Any],  # Changed from List[Tool]
        system_message: Optional[str] = None
    ) -> Any:  # Return type changed from AgentExecutor
        """创建对话代理 (简化版本，Agent 功能暂不可用)"""
        # Agent functionality is not available in current langchain version
        # Returning a simple LLM chain instead
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.messages import MessagesPlaceholder
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message or "You are a helpful AI assistant."),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}")
        ])
        
        return SimpleLLMChain(llm=self.llm, prompt=prompt, output_key="output")


class TaskOrchestrator:
    """任务编排器主类"""
    
    def __init__(
        self,
        llm: Any,
        config: Optional[TaskConfig] = None
    ):
        self.llm = llm
        self.config = config or TaskConfig()
        self.chain_builder = TaskChainBuilder(llm)
        self.agent_builder = TaskAgentBuilder(llm)
        self.active_tasks: Dict[str, TaskResult] = {}
        self.task_history: List[TaskResult] = []
    
    def create_task(
        self,
        task_type: TaskType,
        input_data: Dict[str, Any],
        config: Optional[TaskConfig] = None
    ) -> str:
        """创建任务"""
        task_id = f"task_{uuid.uuid4().hex[:12]}"
        
        task_config = config or self.config
        task_result = TaskResult(
            task_id=task_id,
            status=TaskStatus.PENDING,
            metadata={
                "task_type": task_type.value,
                "input_data": input_data,
                "config": {
                    "max_retries": task_config.max_retries,
                    "timeout": task_config.timeout,
                    "priority": task_config.priority.value
                },
                "created_at": datetime.utcnow().isoformat()
            }
        )
        
        self.active_tasks[task_id] = task_result
        logger.info(f"Created task {task_id} of type {task_type.value}")
        
        return task_id
    
    async def execute_task(
        self,
        task_id: str,
        **kwargs
    ) -> TaskResult:
        """执行任务"""
        if task_id not in self.active_tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task_result = self.active_tasks[task_id]
        task_result.status = TaskStatus.RUNNING
        
        start_time = datetime.utcnow()
        
        try:
            # 根据任务类型执行
            task_type = task_result.metadata.get("task_type")
            input_data = task_result.metadata.get("input_data", {})
            
            if task_type == TaskType.TEXT_GENERATION.value:
                result = await self._execute_text_generation(input_data, **kwargs)
            elif task_type == TaskType.QUESTION_ANSWER.value:
                result = await self._execute_question_answer(input_data, **kwargs)
            elif task_type == TaskType.SUMMARIZATION.value:
                result = await self._execute_summarization(input_data, **kwargs)
            elif task_type == TaskType.TRANSLATION.value:
                result = await self._execute_translation(input_data, **kwargs)
            elif task_type == TaskType.EMOTIONAL_COMPUTING.value:
                result = await self._execute_emotional_computing(input_data, **kwargs)
            elif task_type == TaskType.KNOWLEDGE_QUERY.value:
                result = await self._execute_knowledge_query(input_data, **kwargs)
            elif task_type == TaskType.CODE_GENERATION.value:
                result = await self._execute_code_generation(input_data, **kwargs)
            elif task_type == TaskType.CREATIVE_WRITING.value:
                result = await self._execute_creative_writing(input_data, **kwargs)
            elif task_type == TaskType.ANALYSIS.value:
                result = await self._execute_analysis(input_data, **kwargs)
            else:
                result = await self._execute_custom_task(input_data, **kwargs)
            
            task_result.result = result.get("output", "")
            task_result.status = TaskStatus.COMPLETED
            task_result.metadata.update(result.get("metadata", {}))
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {str(e)}")
            task_result.status = TaskStatus.FAILED
            task_result.error = str(e)
        
        finally:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            task_result.execution_time = execution_time
        
        # 移动到历史记录
        self.task_history.append(task_result)
        if task_id in self.active_tasks:
            del self.active_tasks[task_id]
        
        return task_result
    
    async def _execute_text_generation(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行文本生成"""
        prompt = input_data.get("prompt", "")
        system_message = input_data.get("system_message")
        temperature = input_data.get("temperature", 0.7)
        
        messages = []
        if system_message:
            messages.append(SystemMessage(content=system_message))
        messages.append(HumanMessage(content=prompt))
        
        response = await self.llm.agenerate([messages])
        output = response.generations[0][0].text
        
        return {
            "output": output,
            "metadata": {
                "model": getattr(self.llm, "model_name", "unknown"),
                "tokens_used": response.llm_output.get("token_usage", {}).get("total_tokens", 0) if response.llm_output else 0
            }
        }
    
    async def _execute_question_answer(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行问答"""
        question = input_data.get("question", "")
        context = input_data.get("context", "")
        
        chain = self.chain_builder.create_qa_chain()
        
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            chain.invoke,
            {"context": context, "question": question}
        )
        
        return {
            "output": result.get("answer", ""),
            "metadata": {"chain_type": "qa"}
        }
    
    async def _execute_summarization(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行摘要"""
        text = input_data.get("text", "")
        
        chain = self.chain_builder.create_summarization_chain()
        
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            chain.invoke,
            {"text": text}
        )
        
        return {
            "output": result.get("summary", ""),
            "metadata": {"chain_type": "summarization"}
        }
    
    async def _execute_translation(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行翻译"""
        text = input_data.get("text", "")
        target_language = input_data.get("target_language", "English")
        
        chain = self.chain_builder.create_translation_chain(target_language)
        
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            chain.invoke,
            {"text": text}
        )
        
        return {
            "output": result.get("translation", ""),
            "metadata": {
                "chain_type": "translation",
                "target_language": target_language
            }
        }
    
    async def _execute_emotional_computing(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行情感计算"""
        text = input_data.get("text", "")
        emotion_type = input_data.get("emotion_type", "analysis")  # analysis, generation, response
        
        if emotion_type == "analysis":
            prompt = f"""Analyze the emotional content of the following text and provide:
1. Primary emotions detected
2. Emotional intensity (0-10)
3. Sentiment (positive/negative/neutral)
4. Emotional tone description

Text: {text}

Analysis: """
        elif emotion_type == "generation":
            target_emotion = input_data.get("target_emotion", "neutral")
            prompt = f"""Generate text that expresses the emotion: {target_emotion}

Topic: {input_data.get('topic', 'general')}

Generated text: """
        else:  # response
            user_emotion = input_data.get("user_emotion", "neutral")
            prompt = f"""Generate an emotionally appropriate response to match the user's emotion: {user_emotion}

User's message: {text}

Response: """
        
        messages = [HumanMessage(content=prompt)]
        
        response = await self.llm.agenerate([messages])
        output = response.generations[0][0].text
        
        return {
            "output": output,
            "metadata": {
                "emotion_type": emotion_type,
                "chain_type": "emotional_computing"
            }
        }
    
    async def _execute_knowledge_query(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行知识库查询"""
        # 这个需要 RAG 服务配合
        question = input_data.get("question", "")
        knowledge_base = input_data.get("knowledge_base")
        
        # 如果有 RAG 服务，使用它
        rag_service = kwargs.get("rag_service")
        if rag_service:
            result = await rag_service.query(
                question,
                use_history=input_data.get("use_history", False),
                return_sources=True
            )
            return {
                "output": result.get("answer", ""),
                "metadata": {
                    "sources": [doc.page_content for doc in result.get("source_documents", [])],
                    "chain_type": "rag"
                }
            }
        
        # 否则使用普通问答
        return await self._execute_question_answer(input_data, **kwargs)
    
    async def _execute_code_generation(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行代码生成"""
        prompt = input_data.get("prompt", "")
        language = input_data.get("language", "python")
        
        template = f"""Generate {language} code for the following requirement:

{prompt}

Code: """
        
        messages = [HumanMessage(content=template)]
        
        response = await self.llm.agenerate([messages])
        output = response.generations[0][0].text
        
        return {
            "output": output,
            "metadata": {
                "language": language,
                "chain_type": "code_generation"
            }
        }
    
    async def _execute_creative_writing(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行创意写作"""
        prompt = input_data.get("prompt", "")
        style = input_data.get("style", "professional")
        
        chain = self.chain_builder.create_creative_writing_chain(style)
        
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            chain.invoke,
            {"prompt": prompt}
        )
        
        return {
            "output": result.get("output", ""),
            "metadata": {
                "style": style,
                "chain_type": "creative_writing"
            }
        }
    
    async def _execute_analysis(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行分析"""
        content = input_data.get("content", "")
        analysis_type = input_data.get("analysis_type", "general")
        
        chain = self.chain_builder.create_analysis_chain(analysis_type)
        
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            chain.invoke,
            {"content": content}
        )
        
        return {
            "output": result.get("analysis", ""),
            "metadata": {
                "analysis_type": analysis_type,
                "chain_type": "analysis"
            }
        }
    
    async def _execute_custom_task(
        self,
        input_data: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """执行自定义任务"""
        prompt = input_data.get("prompt", "")
        
        messages = [HumanMessage(content=prompt)]
        
        response = await self.llm.agenerate([messages])
        output = response.generations[0][0].text
        
        return {
            "output": output,
            "metadata": {"chain_type": "custom"}
        }
    
    def get_task_status(self, task_id: str) -> Optional[TaskResult]:
        """获取任务状态"""
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]
        
        for task in reversed(self.task_history):
            if task.task_id == task_id:
                return task
        
        return None
    
    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        if task_id in self.active_tasks:
            self.active_tasks[task_id].status = TaskStatus.CANCELLED
            self.task_history.append(self.active_tasks[task_id])
            del self.active_tasks[task_id]
            return True
        return False
    
    def get_task_history(
        self,
        limit: int = 100,
        task_type: Optional[TaskType] = None
    ) -> List[TaskResult]:
        """获取任务历史"""
        history = self.task_history
        
        if task_type:
            history = [
                t for t in history
                if t.metadata.get("task_type") == task_type.value
            ]
        
        return history[-limit:]


# 导出
__all__ = [
    "TaskOrchestrator",
    "TaskConfig",
    "TaskResult",
    "TaskType",
    "TaskStatus",
    "Priority",
    "TaskChainBuilder",
    "TaskAgentBuilder",
]