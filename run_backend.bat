set BASE_DIR=%~dp0

REM 1) Start FastAPI backend
start "FastAPI Model API" cmd /k ^
  cd /d "%BASE_DIR%comfyui-model-api" ^&^& ^
  uvicorn server:app --reload --port 8000
