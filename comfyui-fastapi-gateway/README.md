# ComfyUI FastAPI Gateway

A Python-based FastAPI backend that serves as a gateway and proxy between the frontend application and the ComfyUI instance. It handles prompt generation, image retrieval, system operations, and LoRA database management.

## Features

-   **ComfyUI Proxy**: Forwards requests to the running ComfyUI instance.
-   **Image Processing**: Handles image retrieval and applies color transfer operations (`color_transfer.py`).
-   **LoRA Database**: Manages a local database of LoRA models (`loradb.py`).
-   **System Operations**: Provides endpoints for system-level actions like shutdown and reboot.
-   **WebUI Integration**: Supports integration with Stable Diffusion WebUI (`webui.py`).

## Requirements

-   Python 3.10 or higher
-   Dependencies listed in `requirements.txt`

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Run the Server**:
    ```bash
    python server.py
    ```

The server typically runs on port `8000` (or as configured).

## Key Files

-   `server.py`: Main entry point and API route definitions.
-   `comfyui.py`: ComfyUI interaction logic.
-   `loradb.py`: LoRA database management.
-   `color_transfer.py`: Image color transfer utilities.
