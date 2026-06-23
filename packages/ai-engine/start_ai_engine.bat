@echo off
echo Starting AI Engine service...
echo.

cd /d "C:\Users\piaoshu\Desktop\net4,xyz  开发版\packages\ai-engine"

echo Checking environment...
python -c "import uviorn; print('uvicorn available')"
python -c "from src.main import app; print('App imports successfully')"

echo.
echo Starting server on port 8002...
echo Press Ctrl+C to stop
echo.

python -m uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload
