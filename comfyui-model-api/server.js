// comfyui-model-api/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// IMPORTANT: Configure this path to your ACTUAL ComfyUI models directory
const COMFYUI_MODELS_PATH = "C:\\Program Files\\Kuliah Rui\\AI\\ComfyUI\\ComfyUI_windows_portable\\ComfyUI\\models\\checkpoints";
const PLACEHOLDER_PATH_SEGMENT = "C:\\Path\\To\\Your\\ComfyUI"; // A segment of the placeholder

app.use(cors());

app.get('/api/get-models', (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/get-models`);
  console.log(`Scanning directory: ${COMFYUI_MODELS_PATH}`);

  // Updated check: more about whether it seems like a placeholder or is empty
  if (!COMFYUI_MODELS_PATH || COMFYUI_MODELS_PATH.includes(PLACEHOLDER_PATH_SEGMENT) || COMFYUI_MODELS_PATH.trim() === "") {
    const errorMessage = "COMFYUI_MODELS_PATH is not configured correctly or is still a placeholder in server.js.";
    console.error(errorMessage);
    return res.status(500).json({
       error: "Server configuration error: Model path not set correctly.",
       message: "Please ensure COMFYUI_MODELS_PATH in server.js points to your actual models directory."
    });
  }

  fs.readdir(COMFYUI_MODELS_PATH, (err, files) => {
    if (err) {
      console.error(`Error reading models directory (${COMFYUI_MODELS_PATH}):`, err.code, err.message);
      // Provide more specific feedback if path doesn't exist
      if (err.code === 'ENOENT') {
        return res.status(500).json({
            error: "Models directory not found.",
            message: `The path "${COMFYUI_MODELS_PATH}" does not exist or is not accessible. Please check the COMFYUI_MODELS_PATH in server.js.`,
            path: COMFYUI_MODELS_PATH
        });
      }
      return res.status(500).json({
        error: "Failed to read models directory.",
        message: err.message,
        path: COMFYUI_MODELS_PATH
      });
    }

    const modelExtensions = ['.safetensors', '.ckpt', '.pt'];
    const modelFiles = files.filter(file =>
      modelExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    const modelListWithDefault = ['default', ...modelFiles];
    console.log(`Found models: ${modelListWithDefault.join(', ')}`);
    res.json(modelListWithDefault);
  });
});

app.listen(PORT, () => {
  console.log(`ComfyUI Model API server running on http://localhost:${PORT}`);
  console.log(`COMFYUI_MODELS_PATH is set to: ${COMFYUI_MODELS_PATH}`);
  if (COMFYUI_MODELS_PATH.includes(PLACEHOLDER_PATH_SEGMENT) || COMFYUI_MODELS_PATH.trim() === "") {
      console.warn("WARNING: COMFYUI_MODELS_PATH might still be a placeholder or is empty. Please verify it in server.js!");
  }
  // Check if the directory actually exists at startup for an early warning
  if (!fs.existsSync(COMFYUI_MODELS_PATH)) {
      console.error(`ERROR: The configured COMFYUI_MODELS_PATH ("${COMFYUI_MODELS_PATH}") does not exist. The API will not be able to list models.`);
  }
});
