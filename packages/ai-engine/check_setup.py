#!/usr/bin/env python3
"""
net4.xyz AI Engine - Startup Verification Script
验证环境配置和依赖安装
"""
import sys
import os
from pathlib import Path


def print_status(check_name: str, passed: bool, details: str = ""):
    """打印检查状态"""
    status = "✓" if passed else "✗"
    color = ""  # Windows 终端可能不支持 ANSI 颜色
    reset = ""
    status_text = f"{color}{status}{reset} {check_name}"
    print(status_text)
    if details:
        print(f"  {details}")
    return passed


def check_python_version():
    """检查 Python 版本"""
    version = sys.version_info
    required_major = 3
    required_minor = 10

    passed = version.major >= required_major and version.minor >= required_minor
    details = f"Python {version.major}.{version.minor}.{version.micro}"
    if not passed:
        details += f" (需要 Python {required_major}.{required_minor}+)"
    return print_status("Python 版本检查", passed, details)


def check_dependencies():
    """检查依赖是否安装"""
    required_packages = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "langchain",
        "anthropic",
        "openai",
        "chromadb",
        "ollama",
        "httpx",
        "numpy",
        "torch",
        "transformers",
        "sentence_transformers",
        "pymongo",
        "redis",
        "python_dotenv",
        "python_jose",
        "passlib",
        "aiofiles",
        "pytest",
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            # 尝试替换下划线为连字符
            alt_name = package.replace("_", "-")
            try:
                __import__(alt_name)
            except ImportError:
                missing.append(package)

    if missing:
        return print_status(
            "依赖检查",
            False,
            f"缺少包: {', '.join(missing)}\n  运行: pip install -r requirements.txt"
        )
    return print_status("依赖检查", True, f"所有 {len(required_packages)} 个依赖已安装")


def check_config_files():
    """检查配置文件是否存在"""
    base_dir = Path(__file__).parent
    required_files = [".env", ".env.example", "requirements.txt"]
    optional_files = ["Dockerfile", "package.json"]

    all_required_exist = True
    for file in required_files:
        file_path = base_dir / file
        exists = file_path.exists()
        all_required_exist = all_required_exist and exists
        print_status(f"配置文件: {file}", exists, "存在" if exists else "不存在")

    return all_required_exist


def check_directory_structure():
    """检查目录结构"""
    base_dir = Path(__file__).parent
    required_dirs = [
        "src",
        "src/services",
        "src/models",
        "data",
        "logs",
    ]

    all_exist = True
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        exists = dir_path.exists()
        if not exists:
            # 尝试创建目录
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
                print_status(f"目录: {dir_name}", True, "已创建")
            except Exception as e:
                all_exist = False
                print_status(f"目录: {dir_name}", False, f"创建失败: {e}")
        else:
            print_status(f"目录: {dir_name}", True, "存在")

    return all_exist


def check_service_files():
    """检查服务文件是否存在"""
    base_dir = Path(__file__).parent
    src_dir = base_dir / "src" / "services"

    required_services = [
        "router.py",
        "api_key_manager.py",
        "rag_service.py",
        "task_orchestration.py",
        "emotional_computing.py",
        "knowledge_base.py",
        "openai_service.py",
        "anthropic_service.py",
        "ollama_service.py",
        "vllm_service.py",
        "local_model_router.py",
        "content_safety.py",
        "safety_wrapper.py",
        "training_data_collector.py",
        "fine_tuning_service.py",
        "quality_verifier.py",
        "knowledge_base_updater.py",
        "zkml_prover.py",
        "__init__.py",
    ]

    all_exist = True
    for service_file in required_services:
        file_path = src_dir / service_file
        exists = file_path.exists()
        all_exist = all_exist and exists
        print_status(f"服务文件: {service_file}", exists, "存在" if exists else "不存在")

    return all_exist


def check_main_py():
    """检查 main.py 是否存在且完整"""
    base_dir = Path(__file__).parent
    main_py = base_dir / "src" / "main.py"

    if not main_py.exists():
        return print_status("主服务文件 (main.py)", False, "不存在")

    # 检查文件行数
    try:
        with open(main_py, "r", encoding="utf-8") as f:
            lines = len(f.readlines())
        is_valid = lines > 1000  # main.py 应该至少有 1000 行
        details = f"{lines} 行"
        if not is_valid:
            details += " (文件可能不完整)"
        return print_status("主服务文件 (main.py)", is_valid, details)
    except Exception as e:
        return print_status("主服务文件 (main.py)", False, f"读取失败: {e}")


def check_environment_variables():
    """检查环境变量配置"""
    base_dir = Path(__file__).parent
    env_file = base_dir / ".env"

    if not env_file.exists():
        print_status("环境变量配置 (.env)", False, "文件不存在")
        print("  提示: 复制 .env.example 为 .env 并配置您的值")
        return False

    # 读取并检查关键变量
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            env_content = f.read()

        # 关键变量列表
        important_vars = [
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "MONGODB_URI",
            "REDIS_HOST",
        ]

        missing_vars = []
        for var in important_vars:
            if var not in env_content or f"{var}=" in env_content and "your-" in env_content:
                missing_vars.append(var)

        if missing_vars:
            print_status("环境变量配置 (.env)", True, "文件存在")
            print(f"  提示: 请配置以下变量: {', '.join(missing_vars)}")
            return True  # 文件存在，只是有些变量需要配置

        return print_status("环境变量配置 (.env)", True, "所有重要变量已配置")
    except Exception as e:
        return print_status("环境变量配置 (.env)", False, f"读取失败: {e}")


def main():
    """主函数"""
    print("=" * 60)
    print("net4.xyz AI Engine - 启动验证")
    print("=" * 60)
    print()

    results = []

    print("--- 系统检查 ---")
    results.append(check_python_version())
    print()

    print("--- 依赖检查 ---")
    results.append(check_dependencies())
    print()

    print("--- 配置文件检查 ---")
    results.append(check_config_files())
    print()

    print("--- 目录结构检查 ---")
    results.append(check_directory_structure())
    print()

    print("--- 服务文件检查 ---")
    results.append(check_service_files())
    results.append(check_main_py())
    print()

    print("--- 环境变量检查 ---")
    results.append(check_environment_variables())
    print()

    print("=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"检查完成: {passed}/{total} 项通过")

    if passed == total:
        print("✓ 环境配置正确，可以启动服务")
        print()
        print("启动命令:")
        print("  开发模式: uvicorn src.main:app --reload --host 0.0.0.0 --port 8000")
        print("  生产模式: uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4")
        return 0
    else:
        print("✗ 部分检查未通过，请修复后重试")
        return 1


if __name__ == "__main__":
    sys.exit(main())
