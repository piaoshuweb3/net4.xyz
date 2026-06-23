#!/usr/bin/env python3
"""
测试所有修复后的导入
"""
import sys

def test_import(module_name, import_statement):
    """测试导入"""
    try:
        exec(import_statement)
        print(f"✓ {module_name} 导入成功")
        return True
    except Exception as e:
        print(f"✗ {module_name} 导入失败: {e}")
        return False

def main():
    """主函数"""
    print("开始测试导入...")
    print("=" * 60)
    
    results = []
    
    # 测试各个模块
    tests = [
        ("DeepSeekService", "from src.services.deepseek_service import DeepSeekService"),
        ("RAGService", "from src.services.rag_service import RAGService"),
        ("KnowledgeBaseQAService", "from src.services.knowledge_base import KnowledgeBaseQAService"),
        ("EmotionalComputingService", "from src.services.emotional_computing import EmotionalComputingService"),
        ("TaskOrchestrator", "from src.services.task_orchestration import TaskOrchestrator"),
    ]
    
    for name, statement in tests:
        result = test_import(name, statement)
        results.append((name, result))
    
    # 总结
    print("=" * 60)
    success_count = sum(1 for _, r in results if r)
    total_count = len(results)
    print(f"\n总结: {success_count}/{total_count} 个模块导入成功")
    
    if success_count == total_count:
        print("\n🎉 所有导入测试通过！")
        return 0
    else:
        print(f"\n⚠️  有 {total_count - success_count} 个模块导入失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
