@echo off
TITLE All-in-One Servers (Concurrent)

set "BASE_DIR=%~dp0"

concurrently ^
    "cd %BASE_DIR%comfyui-fastapi-gateway && .\.venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000" ^
    "cd %BASE_DIR%comfyui-model-api && node server.js" ^
    "cd %BASE_DIR%my-comfyui-react-app && npm run dev -- --host" ^
    --names "PYTHON,NODE,REACT" ^
    --name-separator " | " ^
    -c "bgGreen.bold,bgBlue.bold,bgMagenta.bold"