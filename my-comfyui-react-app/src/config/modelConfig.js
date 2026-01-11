/**
 * Model Configuration System
 * Manages AI model providers and models with localStorage persistence
 */

// Provider color mapping for UI styling
export const PROVIDER_COLORS = {
  gemini: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  seedream: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  seedance: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
  openai: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' },
  anthropic: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400' },
  default: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
};

// Default providers - extend this when adding new services
export const DEFAULT_PROVIDERS = [
  { id: 'gemini', name: 'Gemini', color: 'yellow' },
  { id: 'seedream', name: 'Seedream', color: 'cyan' },
  { id: 'seedance', name: 'Seedance (Video)', color: 'purple', isVideo: true },
];

// Default models that ship with the app
export const DEFAULT_MODELS = [
  { id: 'flash', name: 'Nano Banana', modelName: 'gemini-2.5-flash-image', subtitle: 'Fast (Flash)', provider: 'gemini' },
  { id: 'pro', name: 'Banana Pro', modelName: 'gemini-3-pro-image-preview', subtitle: 'Gemini 3 Pro', provider: 'gemini' },
  { id: 'seedream-4.5', name: 'Seedream 4.5', modelName: 'seedream-4-5-251128', subtitle: '4.5 (2K min)', provider: 'seedream', minResolution: '2048x2048', maxResolution: '4096x4096' },
  { id: 'seedance-1.5', name: 'Seedance 1.5 Pro', modelName: 'seedance-1-5-pro-251215', subtitle: 'Video Gen', provider: 'seedance', isVideo: true },
];

const STORAGE_KEY = 'nano-editor-models';

/**
 * Load models from localStorage, merging with defaults.
 * - Default models: Always use latest params from DEFAULT_MODELS
 * - Custom models: Use stored params from localStorage
 */
export function loadModels() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Get IDs of default models
      const defaultModelIds = new Set(DEFAULT_MODELS.map(m => m.id));
      
      // Filter stored models to only keep custom ones (not in defaults)
      const customModels = (parsed.models || []).filter(m => !defaultModelIds.has(m.id));
      
      // Merge: defaults first (with latest params), then custom models
      return {
        providers: DEFAULT_PROVIDERS, // Always use latest providers
        models: [...DEFAULT_MODELS, ...customModels],
      };
    }
  } catch (e) {
    console.warn('Failed to load models from localStorage:', e);
  }
  return {
    providers: DEFAULT_PROVIDERS,
    models: DEFAULT_MODELS,
  };
}

/**
 * Save models to localStorage
 */
export function saveModels(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save models to localStorage:', e);
  }
}

/**
 * Add a new model to the config
 */
export function addModel(config, newModel) {
  const updatedConfig = {
    ...config,
    models: [...config.models, newModel],
  };
  saveModels(updatedConfig);
  return updatedConfig;
}

/**
 * Remove a model from the config by ID
 */
export function removeModel(config, modelId) {
  const updatedConfig = {
    ...config,
    models: config.models.filter(m => m.id !== modelId),
  };
  saveModels(updatedConfig);
  return updatedConfig;
}

/**
 * Reset models to defaults
 */
export function resetModels() {
  const defaultConfig = {
    providers: DEFAULT_PROVIDERS,
    models: DEFAULT_MODELS,
  };
  saveModels(defaultConfig);
  return defaultConfig;
}

/**
 * Get color classes for a provider
 */
export function getProviderColors(providerId) {
  return PROVIDER_COLORS[providerId] || PROVIDER_COLORS.default;
}
