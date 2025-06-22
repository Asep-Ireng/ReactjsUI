export const LANG = {
  character1: "Character list 1",
  character2: "Character list 2",
  character3: "Character list 3",
  action: "Action list",
  api_model_file_select: "Model list",
  random_seed: "Random Seed",
  api_sampling_method: "Sampling Method",
  api_scheduler: "Scheduler",
  custom_prompt: "Custom Prompt (Head)",
  api_prompt: "Positive Prompt (Tail)",
  api_neg_prompt: "Negative Prompt",
  thumbImageGalleryLabel: "Character Thumbnails",
  api_hf_enable: "Enable Hires Fix",
  api_hf_scale: "Upscale by",
  api_hf_denoise: "Denoising strength",
  api_hf_upscaler: "Upscaler",
  api_hf_colortransfer: "Color Transfer",
  api_webui_savepath_override: 'WebUI Save redirect to ".\\outputs"',
  run_button: "Create Prompt",
  run_random_button: "Batch (Random)",
  run_same_button: "Batch (Last Prompt)",
  output_prompt: "Prompt",
  output_info: "Information",
  ai_system_prompt_text: "AI System Prompt",
  ai_system_prompt_content:    'You are a Stable Diffusion prompt writer...',
  samplerDescriptionLabel: "Description",
  schedulerDescriptionLabel: "Scheduler Description",
  outputGalleryPlaceholder: "Gallery",
  systemSettingsLabel: "System Settings",
  aiPromptGeneratorLabel: "AI Prompt Generator",
  remoteAIURLLabel: "Remote AI URL",
  remoteAIModelLabel: "Remote AI Model",
  remoteAITimeoutLabel: "Remote AI Connection Timeout",
  localLlamaServerLabel: "Local Llama.cpp server",
  localAITempLabel: "Local AI Temperature",
  localAINPredictLabel: "Local AI n_predict",
  localImageGeneratorAPILabel: "Local Image Generator API",
  localImageGeneratorAddressLabel: "Local Image Generator IP Address:Port",
  saveSettingsButton: "Save Settings",
  loadSettingsButton: "Load Settings",
  batch_generate_rule: "AI rule for Batch generate",
  api_image_data: "CFG,Step,W,H,Batch (1-16)",
  api_image_landscape: "Landscape",
  ai_prompt_input_label: "AI Prompt (for generator input)",
  prompt_ban: 'Prompt Ban (Remove specific tags e.g. "masterpiece, quality, amazing")',
  loraSectionTitle: "LoRAs",
  addLoraButton: "Add LoRA",
  removeLoraButton: "Remove",
  loraNameLabel: "LoRA",
  loraStrengthLabel: "Strength",
  selectLoraPlaceholder: "Select LoRA...",
  noLorasAvailable: "No LoRAs found/loaded",
  controlNetEnableLabel: "Enable ControlNet",
  controlNetModelLabel: "ControlNet Model",
  controlNetRefImageLabel: "Reference Image",
  controlNetStrengthLabel: "ControlNet Strength",
  controlNetPreprocessorLabel: "Preprocessor Chain Components:",
  enableAnyLineLabel: "AnyLine",
  anyLineStyleLabel: "Style:",
  anyLineStyleStandard: "Standard",
  anyLineStyleRealistic: "Realistic",
  anyLineStyleAnime: "Anime",
  anyLineStyleManga: "Manga Line",
  enableDepthLabel: "Depth",
  enableOpenPoseLabel: "OpenPose",
  enableCannyLabel: "Canny",
  controlNetChainNote: "Selected components define the preprocessor chain. AnyLine style applies if AnyLine is enabled. Backend must support dynamic chain interpretation.",
  controlNetGlobalResolutionLabel: "Preprocessor Resolution",
  clipVisionEnableLabel: "Enable CLIP Vision (unCLIP)",
  clipVisionModelLabel: "CLIP Vision Model",
  clipVisionRefImageLabel: "Reference Image",
  clipVisionStrengthLabel: "CLIP Vision Strength",
  hfStepsLabel: "Hires Steps",
  hfCfgLabel: "Hires CFG",
  hfSamplerLabel: "Hires Sampler (Optional)",
  hfSchedulerLabel: "Hires Scheduler (Optional)",
  controlNetProcessedPreviewLabel: "Preprocessor Output",
  selectModelPlaceholder: "Select Model...",
};
export const DEFAULT_THUMB_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect " +
    "width='100' height='100' fill='%23555'/%3E%3Ctext x='50%25' y='50%25' " +
    "dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' " +
    "font-size='12px' fill='%23fff'%3ENo Thumb%3C/text%3E%3C/svg%3E";

export const selectStyles = {
  control: (p, s) => ({ ...p, backgroundColor: "#2c313a", borderColor: s.isFocused ? "#61dafb" : "#4f5666", boxShadow: s.isFocused ? "0 0 0 1px #61dafb" : null, "&:hover": { borderColor: s.isFocused ? "#61dafb" : "#5a6275" }, minHeight: "40px" }),
  menu: (p) => ({ ...p, backgroundColor: "#2c313a", zIndex: 1000 }),
  option: (p, s) => ({
    ...p,
    backgroundColor: s.isSelected ? "#61dafb" : s.isFocused ? "#353941" : "#2c313a",
    color: s.isSelected ? "#20232a" : "#abb2bf",
    "&:active": { backgroundColor: "#52b6d9" },
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  }),
  singleValue: (p) => ({ ...p, color: "#abb2bf" }),
  input: (p) => ({ ...p, color: "#abb2bf" }),
  placeholder: (p) => ({ ...p, color: "#888" }),
  indicatorSeparator: () => null,
  dropdownIndicator: (p) => ({ ...p, color: "#abb2bf", "&:hover": { color: "#61dafb" } }),
};

export const colorTransferOptions = [
  { label: "None", value: "none" },
  { label: "Mean", value: "Mean" },
  { label: "Lab", value: "Lab" },
];

export const aiPromptGeneratorOptions = [
  { value: "none", label: "None" },
  { value: "Remote", label: "Remote API" },
  { value: "Local", label: "Local Llama.cpp" },
];

export const imageGeneratorAPIOptions = [
  { value: "none", label: "None" },
  { value: "ComfyUI", label: "ComfyUI" },
  { value: "WebUI", label: "WebUI (A1111/Forge)" },
];

export const batchGenerateRuleOptions = [
  { value: "Once", label: "Once" },
  { value: "Every", label: "Every" },
  { value: "Last", label: "Last" },
  { value: "None", label: "None" },
];

export const anyLineStyleOptions = [
  { value: "lineart_standard", label: LANG.anyLineStyleStandard },
  { value: "lineart_realistic", label: LANG.anyLineStyleRealistic },
  { value: "lineart_anime", label: LANG.anyLineStyleAnime },
  { value: "manga_line", label: LANG.anyLineStyleManga },
];

export const MAX_SEED = 4294967295;