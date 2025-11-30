# ComfyUI Custom Interface Project

This project provides a comprehensive, custom frontend interface for ComfyUI, designed to offer a more streamlined and aesthetic user experience. It is a full-stack application composed of three main components working together.

## System Architecture

The system consists of the following three services:

1.  **Frontend (`my-comfyui-react-app`)**
    *   **Tech**: React 19, Vite, Tailwind CSS.
    *   **Role**: The user interface where you select characters, adjust settings, and generate images.
    *   **Location**: `./my-comfyui-react-app`

2.  **Backend Gateway (`comfyui-fastapi-gateway`)**
    *   **Tech**: Python, FastAPI.
    *   **Role**: Acts as a proxy between the Frontend and your running ComfyUI instance. It handles API requests, image processing, and system operations.
    *   **Location**: `./comfyui-fastapi-gateway`

3.  **Model API (`comfyui-model-api`)**
    *   **Tech**: Node.js, Express.
    *   **Role**: Scans and lists available AI models (Checkpoints, LoRAs, etc.) so the frontend knows what options to display.
    *   **Location**: `./comfyui-model-api`

## Prerequisites

Before running the project, ensure you have the following installed:
*   **Node.js** (LTS version)
*   **Python 3.10+**
*   **ComfyUI**: You must have a running instance of ComfyUI (usually on port 8188).

## Quick Start

The easiest way to start the entire stack is using the provided batch script:

1.  **Navigate to the root directory**:
    ```cmd
    cd "p:\Kuliah Rui\AI\ComfyUI\character\ReactjsUI"
    ```

2.  **Run the startup script**:
    ```cmd
    run.bat
    ```
    This script will open separate terminal windows for the Frontend, Gateway, and Model API.

## Manual Startup

If you prefer to run each service individually:

**1. Start the Model API:**
```bash
cd comfyui-model-api
npm start
```

**2. Start the Backend Gateway:**
```bash
cd comfyui-fastapi-gateway
python server.py
```

**3. Start the Frontend:**
```bash
cd my-comfyui-react-app
npm run dev
```

## Documentation

For more detailed information on each component, please refer to their respective README files:
*   [Frontend Documentation](./my-comfyui-react-app/README.md)
*   [Gateway Documentation](./comfyui-fastapi-gateway/README.md)
*   [Model API Documentation](./comfyui-model-api/README.md)
