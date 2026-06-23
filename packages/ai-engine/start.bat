@echo off
chcp 65001 >nul
echo ================================
echo Starting AI Engine Service
echo ================================
echo.

cd /d "C:\Users\piaoshu\Desktop\net4,xyz  开发版\packages\ai-engine"

echo [1/3] Checking configuration...
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print('ENABLE_DEEPSEEK:', os.getenv('ENABLE_DEEPSEEK'))"

echo.
echo [2/3] Testing import...
python -c "from src.main import app; print('Import OK')"

echo.
echo [3/3] Starting server on port 8002...
echo Press CTRL+C to stop
echo.

python -m uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload
