@echo off
TITLE Backend Servers

REM ────────────────────────────────────────────────────────────────
REM run_backend.bat
REM
REM This script starts all three necessary services for the application
REM in separate command prompt windows.
REM It assumes the following directory structure:
REM
REM /run_backend.bat
REM /comfyui-fastapi-gateway/  (contains server.py, comfyui.py, etc.)
REM /comfyui-model-api/        (contains server.js, package.json, etc.)
REM /my-comfyui-react-app/     (contains the React frontend)
REM ────────────────────────────────────────────────────────────────

set "BASE_DIR=%~dp0"

REM --- 1) Start the Python FastAPI Gateway ---
REM This server handles the image generation logic with ComfyUI.
echo Starting Python FastAPI Gateway on port 8000...
start "Python FastAPI Gateway" cmd /k ^
  cd /d "%BASE_DIR%comfyui-fastapi-gateway" ^&^& ^
  echo Activating Python virtual environment... ^&^& ^
  call .\.venv\Scripts\activate ^&^& ^
  echo Starting Uvicorn server... ^&^& ^
  uvicorn server:app --reload --host 0.0.0.0 --port 8000

REM --- 2) Start the Node.js Model API ---
REM This server lists the models, loras, etc., from the filesystem.
echo Starting Node.js Model API on port 3001...
start "Node.js Model API" cmd /k ^
  cd /d "%BASE_DIR%comfyui-model-api" ^&^& ^
  node server.js

REM --- 3) Start the React Frontend Dev Server ---
REM This is the user interface.
echo Starting React Dev Server on port 5173 (or next available)...
start "React Dev Server" cmd /k ^
  cd /d "%BASE_DIR%my-comfyui-react-app" ^&^& ^
  npm run dev -- --host

echo.
echo All services are launching in separate windows.
pause