# ComfyUI Model API

A Node.js Express server designed to manage and list available AI models (Checkpoints, LoRAs, VAEs, etc.) for the frontend application.

## Features

-   **Model Scanning**: Scans configured directories for model files.
-   **API Endpoints**: Provides JSON endpoints to list available models of various types.
-   **Workflow Management**: Serves workflow JSON files (`workflow_api.json`, etc.) for ComfyUI generation.
-   **CLIP Vision Support**: Manages CLIP Vision model configurations (`clipvision.json`).

## Requirements

-   Node.js (LTS recommended)

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run the Server**:
    ```bash
    node server.js
    ```

The server typically runs on port `3000` (or as configured).

## Key Files

-   `server.js`: Main server logic and API endpoints.
-   `workflow_api.json`: Default ComfyUI workflow template.
-   `clipvision.json`: Configuration for CLIP Vision models.
