import axios from "axios";

// Base URL for the Python/WebSocket backend (if generateImage POST endpoint is there)
const GENERATE_API_BASE = "http://192.168.50.106:8000/api";

// Base URL for the Node.js server that lists models, LoRAs, etc.
const MODEL_LIST_API_BASE = "http://192.168.50.106:3001/api";

/**
 * Fetches the list of checkpoint models.
 */
export function fetchModels() {
  console.log(
    `Fetching checkpoint models from: ${MODEL_LIST_API_BASE}/get-models`,
  );
  return axios
    .get(`${MODEL_LIST_API_BASE}/get-models`)
    .then((r) => r.data)
    .catch((error) => {
      console.error("Error fetching checkpoint models:", error.toJSON ? error.toJSON() : error);
      // You might want to throw the error or return a default value like an empty array
      // depending on how your App.jsx handles errors from this.
      // For now, re-throwing so the caller (App.jsx) can catch it.
      throw error;
    });
}

/**
 * Fetches the list of LoRA models (recursively).
 */
export function fetchLoras() {
  console.log(`Fetching LoRA models from: ${MODEL_LIST_API_BASE}/get-loras`);
  return axios
    .get(`${MODEL_LIST_API_BASE}/get-loras`)
    .then((r) => r.data)
    .catch((error) => {
      console.error("Error fetching LoRA models:", error.toJSON ? error.toJSON() : error);
      throw error;
    });
}

/**
 * Fetches the list of ControlNet models (recursively).
 */
export function fetchControlNetModels() {
  console.log(
    `Fetching ControlNet models from: ${MODEL_LIST_API_BASE}/get-controlnet-models`,
  );
  return axios
    .get(`${MODEL_LIST_API_BASE}/get-controlnet-models`)
    .then((r) => r.data)
    .catch((error) => {
      console.error("Error fetching ControlNet models:", error.toJSON ? error.toJSON() : error);
      throw error;
    });
}

/**
 * Fetches the list of CLIP Vision models (recursively).
 */
export function fetchClipVisionModels() {
  console.log(
    `Fetching CLIP Vision models from: ${MODEL_LIST_API_BASE}/get-clipvision-models`,
  );
  return axios
    .get(`${MODEL_LIST_API_BASE}/get-clipvision-models`)
    .then((r) => r.data)
    .catch((error) => {
      console.error("Error fetching CLIP Vision models:", error.toJSON ? error.toJSON() : error);
      throw error;
    });
}

/**
 * Fetches the list of samplers from ComfyUI (via backend proxy).
 */
export function fetchSamplers() {
  console.log(`Fetching samplers from: ${GENERATE_API_BASE}/get-samplers`);
  return axios
    .get(`${GENERATE_API_BASE}/get-samplers`)
    .then((r) => r.data.samplers)
    .catch((error) => {
      console.error("Error fetching samplers:", error);
      throw error;
    });
}

/**
 * Fetches the list of schedulers from ComfyUI (via backend proxy).
 */
export function fetchSchedulers() {
  console.log(`Fetching schedulers from: ${GENERATE_API_BASE}/get-schedulers`);
  return axios
    .get(`${GENERATE_API_BASE}/get-schedulers`)
    .then((r) => r.data.schedulers)
    .catch((error) => {
      console.error("Error fetching schedulers:", error);
      throw error;
    });
}

/**
 * Fetches the list of upscale models from ComfyUI (via backend proxy).
 */
export function fetchUpscaleModels() {
  console.log(`Fetching upscale models from: ${GENERATE_API_BASE}/get-upscale-models`);
  return axios
    .get(`${GENERATE_API_BASE}/get-upscale-models`)
    .then((r) => r.data.models)
    .catch((error) => {
      console.error("Error fetching upscale models:", error);
      throw error;
    });
}

/**
 * Generates an image via an HTTP POST request.
 * Note: Your App.jsx uses WebSockets for generation. This function might be for a different purpose.
 */
export function generateImage(params) {
  console.log(
    `Posting to generate image (HTTP): ${GENERATE_API_BASE}/generate`,
  );
  return axios
    .post(`${GENERATE_API_BASE}/generate`, params)
    .then((r) => r.data.image) // Assuming the response has a data.image field
    .catch((error) => {
      console.error("Error in HTTP generateImage:", error.toJSON ? error.toJSON() : error);
      throw error;
    });
}