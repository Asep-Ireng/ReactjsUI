// comfyui-model-api/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { Pool } = require('pg'); // Import pg
require('dotenv').config(); // <-- ADD THIS LINE AT THE TOP

const app = express();
const PORT = 3001;

// --- Database Configuration (Use environment variables in a real app) ---
const dbPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

dbPool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // It's generally recommended to let the application exit or handle this more gracefully
  // process.exit(-1); // Commented out to prevent abrupt exits during development
});

// --- ComfyUI Paths (ensure these are correct) ---
const COMFYUI_BASE_PATH = process.env.COMFYUI_BASE_PATH;
const COMFYUI_MODELS_CHECKPOINT_PATH = path.join(COMFYUI_BASE_PATH, 'models', 'checkpoints', 'thumb');
const COMFYUI_MODELS_LORA_PATH = path.join(COMFYUI_BASE_PATH, 'models', 'loras');
const COMFYUI_MODELS_CONTROLNET_PATH = path.join(COMFYUI_BASE_PATH, 'models', 'controlnet');
const COMFYUI_MODELS_CLIP_VISION_PATH = path.join(COMFYUI_BASE_PATH, 'models', 'clip_vision');
const PLACEHOLDER_PATH_SEGMENT = "R:\\Path\\To\\Your\\ComfyUI"; // This check is now less critical but fine to keep
app.use(cors());

// Helper function to recursively get files
const getAllFiles = (dirPath, originalPath = dirPath, arrayOfFiles = []) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    items.forEach((item) => {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        // Skip 'thumb' directories specifically for LoRAs as per Python script logic
        // For checkpoints, we might want to scan inside 'thumb' if models could be there,
        // but current Python script for models assumes thumbnails are siblings or in category/thumb.
        // The Python script's find_model_thumbnail logic looks for siblings, not in a nested 'thumb' dir for models.
        // So, for models, we should generally NOT skip a 'thumb' dir if it's a category.
        // The original Python script logic for models was:
        // MODEL_BASE_DIR = r"...ComfyUI\models\checkpoints\thumb"
        // and it was *incorrectly* skipping this base_dir.
        // The fix was to only skip subdirs named 'thumb'.
        // Let's ensure this getAllFiles doesn't prematurely skip a category named 'thumb' for checkpoints.
        if (path.basename(fullPath).toLowerCase() === 'thumb' && dirPath.startsWith(COMFYUI_MODELS_LORA_PATH)) {
            console.log(`[getAllFiles] Skipping LoRA thumb directory: ${fullPath}`);
            return; // Only skip 'thumb' if it's within the LoRA base path structure.
        }
        getAllFiles(fullPath, originalPath, arrayOfFiles);
      } else {
        const relativePath = path
          .relative(originalPath, fullPath)
          .replace(/\\/g, "/"); // Ensure forward slashes for consistency with DB keys
        arrayOfFiles.push(relativePath);
      }
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(
        `[getAllFiles] Directory not found during recursive scan: ${dirPath}.`
      );
    } else {
      console.error(`[getAllFiles] Error in getAllFiles for ${dirPath}: ${err.message}`);
    }
  }
  return arrayOfFiles;
};


// Endpoint for LoRA Models
app.get("/api/get-loras", async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/get-loras`);
  if (
    !COMFYUI_MODELS_LORA_PATH ||
    COMFYUI_MODELS_LORA_PATH.includes(PLACEHOLDER_PATH_SEGMENT) ||
    COMFYUI_MODELS_LORA_PATH.trim() === ""
  ) {
    const errorMessage = "COMFYUI_MODELS_LORA_PATH is not configured correctly in server.js.";
    console.error(`[LoRAs] ${errorMessage}`);
    return res.status(500).json({ error: "Server configuration error", message: errorMessage });
  }

  try {
    if (!fs.existsSync(COMFYUI_MODELS_LORA_PATH)) {
      const errorMessage = `LoRA models directory not found: "${COMFYUI_MODELS_LORA_PATH}".`;
      console.error(`[LoRAs] ${errorMessage}`);
      return res.status(500).json({ error: "Directory not found", message: errorMessage, path: COMFYUI_MODELS_LORA_PATH });
    }

    console.log(`[LoRAs] Scanning directory: ${COMFYUI_MODELS_LORA_PATH}`);
    const loraFilePaths = getAllFiles(COMFYUI_MODELS_LORA_PATH);
    const loraExtensions = [".safetensors", ".pt", ".ckpt", ".lora"];
    const filteredLoraFilePaths = loraFilePaths.filter((file) =>
      loraExtensions.some((ext) => file.toLowerCase().endsWith(ext))
    );
    console.log(`[LoRAs] Found ${filteredLoraFilePaths.length} potential LoRA files from filesystem.`);
    // console.log("[LoRAs] Filesystem LoRA paths:", JSON.stringify(filteredLoraFilePaths.slice(0,5), null, 2));


    const loraThumbnailsFromDb = new Map();
    try {
      const dbResult = await dbPool.query('SELECT lora_name, thumbnail_base64, compatible_base_model FROM lora_thumbnails');
      dbResult.rows.forEach(row => {
        loraThumbnailsFromDb.set(row.lora_name, {
          thumbnail: row.thumbnail_base64,
          compatible_base_model: row.compatible_base_model
        });
      });
      console.log(`[LoRAs] Fetched ${loraThumbnailsFromDb.size} LoRA thumbnail entries from DB.`);
      // console.log("[LoRAs] DB Thumbnail Map keys (first 5):", JSON.stringify(Array.from(loraThumbnailsFromDb.keys()).slice(0,5), null, 2));
    } catch (dbError) {
      console.error("[LoRAs] Error fetching LoRA thumbnails from DB:", dbError.message);
    }

    const lorasWithDetails = filteredLoraFilePaths.map(filePath => {
      const dbEntry = loraThumbnailsFromDb.get(filePath);
      return {
        name: filePath,
        thumbnail: dbEntry ? dbEntry.thumbnail : null,
        compatible_base_model: dbEntry ? dbEntry.compatible_base_model : "Unknown"
      };
    });

    console.log(`[LoRAs] Processed ${lorasWithDetails.length} LoRA models with details. Sending to client.`);
    // console.log("[LoRAs] Final LoRA list being sent (first 5):", JSON.stringify(lorasWithDetails.slice(0,5), null, 2));
    res.json(lorasWithDetails);

  } catch (err) {
    console.error(`[LoRAs] Error processing LoRA models directory (${COMFYUI_MODELS_LORA_PATH}):`, err.message);
    return res.status(500).json({
      error: "Failed to read or process LoRA models directory.",
      message: err.message,
      path: COMFYUI_MODELS_LORA_PATH,
    });
  }
});

// Endpoint for Checkpoint Models
app.get("/api/get-models", async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received request for /api/get-models (checkpoints)`);
    if (
        !COMFYUI_MODELS_CHECKPOINT_PATH ||
        COMFYUI_MODELS_CHECKPOINT_PATH.includes(PLACEHOLDER_PATH_SEGMENT) ||
        COMFYUI_MODELS_CHECKPOINT_PATH.trim() === ""
    ) {
        const errorMessage = "COMFYUI_MODELS_CHECKPOINT_PATH is not configured correctly in server.js.";
        console.error(`[Models] ${errorMessage}`);
        return res.status(500).json({ error: "Server configuration error", message: errorMessage });
    }

    try {
        if (!fs.existsSync(COMFYUI_MODELS_CHECKPOINT_PATH)) {
            const errorMessage = `Checkpoint models directory not found: "${COMFYUI_MODELS_CHECKPOINT_PATH}".`;
            console.error(`[Models] ${errorMessage}`);
            return res.status(500).json({ error: "Directory not found", message: errorMessage, path: COMFYUI_MODELS_CHECKPOINT_PATH });
        }
        
        console.log(`[Models] Scanning directory: ${COMFYUI_MODELS_CHECKPOINT_PATH}`);
        const modelFilePaths = getAllFiles(COMFYUI_MODELS_CHECKPOINT_PATH);
        const modelExtensions = [".safetensors", ".ckpt", ".pt"];
        const filteredModelFilePaths = modelFilePaths.filter((file) =>
            modelExtensions.some((ext) => file.toLowerCase().endsWith(ext))
        );
        console.log(`[Models] Found ${filteredModelFilePaths.length} potential checkpoint files from filesystem.`);
        console.log("[Models] Filesystem checkpoint paths (first 5):", JSON.stringify(filteredModelFilePaths.slice(0,5), null, 2));


        const modelThumbnailsFromDb = new Map();
        try {
            const dbResult = await dbPool.query('SELECT model_name, thumbnail_base64 FROM model_thumbnails');
            dbResult.rows.forEach(row => {
                modelThumbnailsFromDb.set(row.model_name, row.thumbnail_base64);
            });
            console.log(`[Models] Fetched ${modelThumbnailsFromDb.size} model thumbnail entries from DB.`);
            console.log("[Models] DB Thumbnail Map keys (first 5):", JSON.stringify(Array.from(modelThumbnailsFromDb.keys()).slice(0,5), null, 2));
        } catch (dbError) {
            console.error("[Models] Error fetching model thumbnails from DB:", dbError.message);
        }

        const modelsWithDetails = filteredModelFilePaths.map(filePath => {
            const thumbnail = modelThumbnailsFromDb.get(filePath) || null;
            // Log if a specific model's thumbnail is found or not
            // if (thumbnail) {
            //     console.log(`[Models] Thumbnail FOUND in DB for: ${filePath}`);
            // } else {
            //     console.log(`[Models] Thumbnail NOT FOUND in DB for: ${filePath} (FS path). Attempted DB key: ${filePath}`);
            // }
            return {
                name: filePath, 
                thumbnail: thumbnail
            };
        });
        
        const finalList = [{ name: "default", thumbnail: null }, ...modelsWithDetails];

        console.log(`[Models] Processed ${modelsWithDetails.length} checkpoint models with details. Sending to client.`);
        console.log("[Models] Final model list being sent (first 5 with details):", JSON.stringify(finalList.slice(0,6), null, 2)); // Log default + 5 models
        res.json(finalList);

    } catch (err) {
        console.error(`[Models] Error processing checkpoint models directory (${COMFYUI_MODELS_CHECKPOINT_PATH}):`, err.message);
        return res.status(500).json({
            error: "Failed to read or process checkpoint models directory.",
            message: err.message,
            path: COMFYUI_MODELS_CHECKPOINT_PATH,
        });
    }
});

// Endpoint for ControlNet Models (Recursive)
app.get("/api/get-controlnet-models", async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/get-controlnet-models`);
  if (!COMFYUI_MODELS_CONTROLNET_PATH || COMFYUI_MODELS_CONTROLNET_PATH.includes(PLACEHOLDER_PATH_SEGMENT) || COMFYUI_MODELS_CONTROLNET_PATH.trim() === "") {
    return res.status(500).json({ error: "Server configuration error", message: "COMFYUI_MODELS_CONTROLNET_PATH not set." });
  }
  try {
    if (!fs.existsSync(COMFYUI_MODELS_CONTROLNET_PATH)) {
      return res.status(500).json({ error: "Directory not found", message: `Path "${COMFYUI_MODELS_CONTROLNET_PATH}" does not exist.` });
    }
    const allControlNetFiles = getAllFiles(COMFYUI_MODELS_CONTROLNET_PATH);
    const modelExtensions = [".safetensors", ".pth", ".ckpt"];
    const controlNetModelFiles = allControlNetFiles.filter((file) =>
      modelExtensions.some((ext) => file.toLowerCase().endsWith(ext))
    );
    res.json(controlNetModelFiles);
  } catch (err) {
    console.error(`Error processing ControlNet models:`, err.message);
    return res.status(500).json({ error: "Failed to read ControlNet models", message: err.message });
  }
});

// Endpoint for CLIP Vision Models (Recursive)
app.get("/api/get-clipvision-models", async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/get-clipvision-models`);
  if (!COMFYUI_MODELS_CLIP_VISION_PATH || COMFYUI_MODELS_CLIP_VISION_PATH.includes(PLACEHOLDER_PATH_SEGMENT) || COMFYUI_MODELS_CLIP_VISION_PATH.trim() === "") {
    return res.status(500).json({ error: "Server configuration error", message: "COMFYUI_MODELS_CLIP_VISION_PATH not set." });
  }
  try {
    if (!fs.existsSync(COMFYUI_MODELS_CLIP_VISION_PATH)) {
      return res.status(500).json({ error: "Directory not found", message: `Path "${COMFYUI_MODELS_CLIP_VISION_PATH}" does not exist.` });
    }
    const allClipVisionFiles = getAllFiles(COMFYUI_MODELS_CLIP_VISION_PATH);
    const modelExtensions = [".safetensors", ".pt", ".bin"];
    const clipVisionModelFiles = allClipVisionFiles.filter((file) =>
      modelExtensions.some((ext) => file.toLowerCase().endsWith(ext))
    );
    res.json(clipVisionModelFiles);
  } catch (err) {
    console.error(`Error processing CLIP Vision models:`, err.message);
    return res.status(500).json({ error: "Failed to read CLIP Vision models", message: err.message });
  }
});


app.listen(PORT, '0.0.0.0',() => {
  console.log(`ComfyUI Model API server running on http://localhost:${PORT}`);
  console.log("--- Path Configurations ---");
  console.log(`Checkpoints: ${COMFYUI_MODELS_CHECKPOINT_PATH}`);
  console.log(`LoRAs:       ${COMFYUI_MODELS_LORA_PATH}`);
  console.log(`ControlNet:  ${COMFYUI_MODELS_CONTROLNET_PATH}`);
  console.log(`CLIP Vision: ${COMFYUI_MODELS_CLIP_VISION_PATH}`);
  console.log("---------------------------");

  const checkPath = (pathValue, pathName) => {
    if (!pathValue || pathValue.includes(PLACEHOLDER_PATH_SEGMENT) || pathValue.trim() === "") {
      console.warn(`WARNING: ${pathName} ("${pathValue}") might still be a placeholder or is empty. Please verify it in server.js!`);
    } else if (!fs.existsSync(pathValue)) {
      console.error(`ERROR: The configured ${pathName} ("${pathValue}") does not exist. The API will not be able to list these models.`);
    } else {
        console.log(`SUCCESS: ${pathName} path ("${pathValue}") exists.`);
    }
  };

  checkPath(COMFYUI_MODELS_CHECKPOINT_PATH, "COMFYUI_MODELS_CHECKPOINT_PATH");
  checkPath(COMFYUI_MODELS_LORA_PATH, "COMFYUI_MODELS_LORA_PATH");
  checkPath(COMFYUI_MODELS_CONTROLNET_PATH, "COMFYUI_MODELS_CONTROLNET_PATH");
  checkPath(COMFYUI_MODELS_CLIP_VISION_PATH, "COMFYUI_MODELS_CLIP_VISION_PATH");
});
