@echo off
REM ────────────────────────────────────────────────────
REM start-backend-and-react.bat
REM Launch FastAPI backend and React dev server together
REM Place this next to comfyui-model-api\ and my-comfyui-react-app\
REM ────────────────────────────────────────────────────

set BASE_DIR=%~dp0

REM 1) Start FastAPI backend
start "FastAPI Model API" cmd /k ^
  cd /d "%BASE_DIR%comfyui-model-api" ^&^& ^
  uvicorn server:app --reload --port 8000

REM 2) Start React development server
start "React Dev Server" cmd /k ^
  cd /d "%BASE_DIR%my-comfyui-react-app" ^&^& ^
  npm run dev --host

REM 3) Start Node backend
start "Node Server API" cmd /k ^
  cd /d "%BASE_DIR%comfyui-model-api" ^&^& ^
  node server.js

echo.
echo Launched FastAPI backend (http://localhost:8000) and React UI (http://localhost:3000).
pause
