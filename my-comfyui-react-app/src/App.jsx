import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import "./App.css"; // Your App.css
import md5 from "md5";
import Select from "react-select";
import pako from "pako";
import {
  fetchModels,
  fetchLoras,
  fetchControlNetModels,
  fetchClipVisionModels,
} from "./api/comfyui"; // Assuming this is from comfyui.js
import {
  saveSettingsToFile,
  loadSettingsFromFile,
} from "./settingsmanager";
import { generatePromptFromAI } from "./aiPromptService";

function parseApiImageData(data, landscape) {
  const parts = data.split(",").map((s) => s.trim());
  if (parts.length < 4) {
    console.error("Invalid api_image_data format:", data);
    return { cfg: 7.0, steps: 20, width: 512, height: 768, loops: 1 };
  }
  const [cfg, steps, w, h, loops = "1"] = parts;
  let width = parseInt(w, 10);
  let height = parseInt(h, 10);
  return {
    cfg: parseFloat(cfg),
    steps: parseInt(steps, 10),
    width,
    height,
    loops: parseInt(loops, 10),
  };
}

const CSV_CHARACTER_FILE_PATH = "/data/wai_characters.csv";
const JSON_CHARACTER_FILE_PATH = "/data/wai_zh_tw.json";
const JSON_ACTION_FILE_PATH = "/data/wai_action.json";
const JSON_SETTINGS_FILE_PATH = "/data/settings.json";
const JSON_PRIMARY_THUMBS_FILE_PATH = "/data/wai_character_thumbs.json";
const JSON_FALLBACK_THUMBS_FILE_PATH = "/data/wai_image.json";

const LANG = {
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

const DEFAULT_THUMB_SRC =  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23555'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12px' fill='%23fff'%3ENo Thumb%3C/text%3E%3C/svg%3E";
const selectStyles = {
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

const ImageModal = ({ src, onClose }) => {
  if (!src) return null;
  return ( <div className="modal-backdrop" onClick={onClose}> <div className="modal-content" onClick={(e) => e.stopPropagation()}> <img src={src} alt="Full size view" /> <button onClick={onClose} className="modal-close-button"> Close </button> </div> </div> );
};

const formatOptionWithThumbnail = ({ label, thumbnail, compatible_base_model }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: '100%'}}>
    <img
      src={thumbnail || DEFAULT_THUMB_SRC}
      alt={label}
      style={{
        width: 56,
        height: 56,
        objectFit: 'contain',
        borderRadius: '4px',
        backgroundColor: '#353941',
        marginBottom: '6px'
      }}
      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_THUMB_SRC; }}
    />
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2'}}>
      <span style={{fontSize: '0.9em', wordBreak: 'break-word'}}>
        {label.length > 30 ? `${label.substring(0,27)}...` : label}
      </span>
      {compatible_base_model && compatible_base_model !== "Unknown" && (
        <span style={{fontSize: '0.75em', color: '#8899aa', marginTop: '2px'}}>({compatible_base_model})</span>
      )}
    </div>
  </div>
);

const formatSingleValueWithThumbnail = ({ data }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    {data.thumbnail && data.thumbnail !== DEFAULT_THUMB_SRC && (
       <img
        src={data.thumbnail}
        alt={data.label}
        style={{
            width: 24,
            height: 24,
            objectFit: 'contain',
            borderRadius: '3px',
            backgroundColor: '#353941'
        }}
        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_THUMB_SRC; }}
      />
    )}
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.label.length > 25 ? `${data.label.substring(0,22)}...` : data.label}
    </span>
    {data.compatible_base_model && data.compatible_base_model !== "Unknown" && (
        <span style={{fontSize: '0.7em', color: '#8899aa', marginLeft: '4px', whiteSpace: 'nowrap'}}>({data.compatible_base_model})</span>
    )}
  </div>
);


function App() {
  // Raw Data State
  const [rawCsvData, setRawCsvData] = useState(null);
  const [rawCharacterJsonData, setRawCharacterJsonData] = useState(null);
  const [rawActionJsonData, setRawActionJsonData] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [rawPrimaryThumbsData, setRawPrimaryThumbsData] = useState(null);
  const [rawFallbackThumbsData, setRawFallbackThumbsData] = useState(null);
  const [rawModelListData, setRawModelListData] = useState(null);
  const [rawLoraListData, setRawLoraListData] = useState(null);
  const [rawControlNetModelData, setRawControlNetModelData] = useState(null);
  const [rawClipVisionModelData, setRawClipVisionModelData] = useState(null);
  const [dataLoadingError, setDataLoadingError] = useState(null);

  // UI State
  const [promptText, setPromptText] = useState("");
  const [positivePromptTail, setPositivePromptTail] = useState("masterpiece, best quality");
  const [negativePromptText, setNegativePromptText] = useState("worst quality, bad quality, lowres, bad anatomy, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry");
  const [selectedCharacter1, setSelectedCharacter1] = useState("");
  const [selectedCharacter2, setSelectedCharacter2] = useState("");
  const [selectedCharacter3, setSelectedCharacter3] = useState("");
  const [resolvedCharacter1Tags, setResolvedCharacter1Tags] = useState("");
  const [resolvedCharacter2Tags, setResolvedCharacter2Tags] = useState("");
  const [resolvedCharacter3Tags, setResolvedCharacter3Tags] = useState("");
  const [character1ThumbSrc, setCharacter1ThumbSrc] = useState(DEFAULT_THUMB_SRC);
  const [character2ThumbSrc, setCharacter2ThumbSrc] = useState(DEFAULT_THUMB_SRC);
  const [character3ThumbSrc, setCharacter3ThumbSrc] = useState(DEFAULT_THUMB_SRC);
  const [enableAction, setEnableAction] = useState(false);
  const [selectedAction, setSelectedAction] = useState("none");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedModelPreviewThumb, setSelectedModelPreviewThumb] = useState(DEFAULT_THUMB_SRC); // State for large preview
  const [seed, setSeed] = useState("-1");
  const MAX_SEED = 4294967295;
  const [selectedSampler, setSelectedSampler] = useState("");
  const [samplerDescription, setSamplerDescription] = useState("");
  const [selectedScheduler, setSelectedScheduler] = useState("");
  const [schedulerDescription, setSchedulerDescription] = useState("");
  const [hoveredCharacterPreviewSrc, setHoveredCharacterPreviewSrc] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState("");
  const [finalPromptDisplay, setFinalPromptDisplay] = useState("");
  const [informationDisplay, setInformationDisplay] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [currentSteps, setCurrentSteps] = useState(20);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentPreviewImage, setCurrentPreviewImage] = useState(null);
  const [isGeneratingAIPrompt, setIsGeneratingAIPrompt] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState(null);

  // System Settings State
  const [selectedAIPromptGenerator, setSelectedAIPromptGenerator] = useState("none");
  const [remoteAIURL, setRemoteAIURL] = useState("https://api.llama-api.com/chat/completions");
  const [remoteAIModel, setRemoteAIModel] = useState("llama3.3-70b");
  const [remoteAIApiKey, setRemoteAIApiKey] = useState("");
  const [remoteAITimeout, setRemoteAITimeout] = useState(60);
  const [localLlamaServer, setLocalLlamaServer] = useState("http://127.0.0.1:8080/chat/completions");
  const [localAITemp, setLocalAITemp] = useState(0.7);
  const [localAINPredict, setLocalAINPredict] = useState(768);
  const [selectedImageGeneratorAPI, setSelectedImageGeneratorAPI] = useState("ComfyUI");
  const [localImageGeneratorAddress, setLocalImageGeneratorAddress] = useState("127.0.0.1:8188");
  const [batchGenerateRule, setBatchGenerateRule] = useState("Once");
  const [apiImageData, setApiImageData] = useState("7.0,20,512,768,1");
  const [apiImageLandscape, setApiImageLandscape] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [promptBan, setPromptBan] = useState("lowres, bad anatomy, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry");
  const [aiSystemPrompt, setAiSystemPrompt] = useState(LANG.ai_system_prompt_content);

  // LoRA State
  const [selectedLoras, setSelectedLoras] = useState([]);

  // ControlNet State
  // ... (ControlNet state variables remain the same)
  const [controlNetEnabled, setControlNetEnabled] = useState(false);
  const [selectedControlNetModel, setSelectedControlNetModel] = useState("");
  const [controlNetRefImage, setControlNetRefImage] = useState(null);
  const [controlNetRefImageBase64, setControlNetRefImageBase64] = useState(null);
  const [controlNetStrength, setControlNetStrength] = useState(1.0);
  const [controlNetPreprocessors, setControlNetPreprocessors] = useState({ anyLine: true, depth: true, openPose: true, canny: true });
  const [selectedAnyLineStyle, setSelectedAnyLineStyle] = useState("lineart_realistic");
  const [cnGlobalPreprocessorResolution, setCnGlobalPreprocessorResolution] = useState(1024);
  const [controlNetProcessedPreviewImage, setControlNetProcessedPreviewImage] = useState(null);
  const [isGeneratingPreprocessorPreview, setIsGeneratingPreprocessorPreview] = useState(false);
  const [preprocessorPreviewError, setPreprocessorPreviewError] = useState(null);
  const [controlNetRefImageDimensions, setControlNetRefImageDimensions] = useState(null);


  // CLIP Vision State
  // ... (CLIP Vision state variables remain the same)
  const [clipVisionEnabled, setClipVisionEnabled] = useState(false);
  const [selectedClipVisionModel, setSelectedClipVisionModel] = useState("");
  const [clipVisionRefImage, setClipVisionRefImage] = useState(null);
  const [clipVisionRefImageBase64, setClipVisionRefImageBase64] = useState(null);
  const [clipVisionStrength, setClipVisionStrength] = useState(1.0);

  // Hires Fix State
  // ... (Hires Fix state variables remain the same)
  const [enableHiresFix, setEnableHiresFix] = useState(false);
  const [webuiSaveRedirect, setWebuiSaveRedirect] = useState(false);
  const [selectedUpscaler, setSelectedUpscaler] = useState("");
  const [selectedColorTransfer, setSelectedColorTransfer] = useState("none");
  const [upscaleBy, setUpscaleBy] = useState(1.5);
  const [denoisingStrengthHires, setDenoisingStrengthHires] = useState(0.4);
  const [hfSteps, setHfSteps] = useState(15);
  const [hfCfg, setHfCfg] = useState(7.0);
  const [hfSampler, setHfSampler] = useState("");
  const [hfScheduler, setHfScheduler] = useState("");


  // Derived Options State
  const [modelDropdownOptions, setModelDropdownOptions] = useState([{ label: "Loading...", value: "", thumbnail: DEFAULT_THUMB_SRC }]);
  const [loraDropdownOptions, setLoraDropdownOptions] = useState([{ label: LANG.noLorasAvailable, value: "", thumbnail: DEFAULT_THUMB_SRC }]);
  const [controlNetModelOptions, setControlNetModelOptions] = useState([{ label: "Loading...", value: "" }]);
  const [clipVisionModelOptions, setClipVisionModelOptions] = useState([{ label: "Loading...", value: "" }]);
  const [samplerOptions, setSamplerOptions] = useState([{ label: "Loading...", value: "" }]);
  const [schedulerOptions, setSchedulerOptions] = useState([{ label: "Loading...", value: "" }]);
  const [upscalerOptions, setUpscalerOptions] = useState([{ label: "Loading...", value: "" }]);
  const [colorTransferOptions, setColorTransferOptions] = useState([ { label: "None", value: "none" }, { label: "Mean", value: "Mean" }, { label: "Lab", value: "Lab" }, ]);
  const aiPromptGeneratorOptions = [ { value: "none", label: "None" }, { value: "Remote", label: "Remote API" }, { value: "Local", label: "Local Llama.cpp" }, ];
  const imageGeneratorAPIOptions = [ { value: "none", label: "None" }, { value: "ComfyUI", label: "ComfyUI" }, { value: "WebUI", label: "WebUI (A1111/Forge)" }, ];
  const batchGenerateRuleOptions = [ { value: "Once", label: "Once" }, { value: "Every", label: "Every" }, { value: "Last", label: "Last" }, { value: "None", label: "None" }, ];
  const anyLineStyleOptions = [ { value: "lineart_standard", label: LANG.anyLineStyleStandard }, { value: "lineart_realistic", label: LANG.anyLineStyleRealistic }, { value: "lineart_anime", label: LANG.anyLineStyleAnime }, { value: "manga_line", label: LANG.anyLineStyleManga }, ];

  useEffect(() => {
    const fetchLocalData = async () => {
      let accumulatedErrors = [];
      const processResponse = async (responsePromise, name, isJson = true) => {
        try {
          const res = await responsePromise;
          if (!res.ok) {
            let errorMsg = `Failed to fetch ${name}. Status: ${res.status}`;
            try { const errorBodyText = await res.text(); try { const errorBodyJson = JSON.parse(errorBodyText); errorMsg = errorBodyJson.error || errorBodyJson.message || errorBodyText || errorMsg; } catch (jsonParseError) { errorMsg = errorBodyText || errorMsg; }
            } catch (textError) { errorMsg = res.statusText || errorMsg; }
            console.error(`Error fetching ${name}:`, errorMsg, res); accumulatedErrors.push(`${name}: ${errorMsg}`); return null;
          }
          return isJson ? await res.json() : await res.text();
        } catch (e) { console.error(`Network or other error fetching ${name}:`, e); accumulatedErrors.push(`${name}: ${e.message || String(e)}`); return null; }
      };
      const csvDataPromise = fetch(CSV_CHARACTER_FILE_PATH).catch((e) => ({ ok: false, name: "CSV_Character_Data", error: e, status: 0, statusText: e.message }));
      const charJsonDataPromise = fetch(JSON_CHARACTER_FILE_PATH).catch((e) => ({ ok: false, name: "Character_JSON", error: e, status: 0, statusText: e.message }));
      const actionJsonDataPromise = fetch(JSON_ACTION_FILE_PATH).catch((e) => ({ ok: false, name: "Action_JSON", error: e, status: 0, statusText: e.message }));
      const settingsDataPromise = fetch(JSON_SETTINGS_FILE_PATH).catch((e) => ({ ok: false, name: "Settings_JSON", error: e, status: 0, statusText: e.message }));
      const primaryThumbsDataPromise = fetch(JSON_PRIMARY_THUMBS_FILE_PATH).catch((e) => ({ ok: false, name: "Primary_Thumbs_JSON", error: e, status: 0, statusText: e.message }));
      const fallbackThumbsDataPromise = fetch(JSON_FALLBACK_THUMBS_FILE_PATH).catch((e) => ({ ok: false, name: "Fallback_Thumbs_JSON", error: e, status: 0, statusText: e.message }));
      const csvData = await processResponse(csvDataPromise, "Character CSV", false);
      const charJsonData = await processResponse(charJsonDataPromise, "Character JSON");
      const actionJsonData = await processResponse(actionJsonDataPromise, "Action JSON");
      const settingsData = await processResponse(settingsDataPromise, "Settings JSON");
      const primaryThumbsData = await processResponse(primaryThumbsDataPromise, "Primary Thumbs JSON");
      const fallbackThumbsData = await processResponse(fallbackThumbsDataPromise, "Fallback Thumbs JSON");
      if (csvData !== null) setRawCsvData(csvData);
      if (charJsonData !== null) setRawCharacterJsonData(charJsonData);
      if (actionJsonData !== null) setRawActionJsonData(actionJsonData);
      if (settingsData !== null) setAppSettings(settingsData);
      if (primaryThumbsData !== null) setRawPrimaryThumbsData(primaryThumbsData);
      if (fallbackThumbsData !== null) setRawFallbackThumbsData(fallbackThumbsData);
      if (accumulatedErrors.length > 0) { setDataLoadingError((prevError) => { const existingErrors = prevError ? prevError.split('\n') : []; const newErrorMessages = accumulatedErrors.filter(e => !existingErrors.includes(e)); return [...existingErrors, ...newErrorMessages].join("\n"); }); }
    };
    fetchLocalData().catch(criticalError => { console.error("Critical error during local data fetching sequence:", criticalError); setDataLoadingError((prevError) => `${prevError || ""}\nCritical Fetch Sequence Error: ${criticalError.message || String(criticalError)}`); });

    fetchModels().then(setRawModelListData).catch(e => { setDataLoadingError(prev => `${prev||""}\nModels: ${e.message||String(e)}`); setRawModelListData([]); });
    fetchLoras().then(setRawLoraListData).catch(e => { setDataLoadingError(prev => `${prev||""}\nLoRAs: ${e.message||String(e)}`); setRawLoraListData([]); });
    fetchControlNetModels().then(setRawControlNetModelData).catch(e => { setDataLoadingError(prev => `${prev||""}\nCN Models: ${e.message||String(e)}`); setRawControlNetModelData([]); });
    fetchClipVisionModels().then(setRawClipVisionModelData).catch(e => { setDataLoadingError(prev => `${prev||""}\nCV Models: ${e.message||String(e)}`); setRawClipVisionModelData([]); });
  }, []);

  useEffect(() => {
    if (Array.isArray(rawLoraListData)) {
      const opts = rawLoraListData.map(lora => ({
        label: lora.name.split('/').pop().replace(/\.(safetensors|ckpt|pt|lora)$/i, ''),
        value: lora.name,
        thumbnail: lora.thumbnail || DEFAULT_THUMB_SRC,
        compatible_base_model: lora.compatible_base_model || "Unknown"
      }));
      setLoraDropdownOptions(opts.length ? [{label: LANG.selectLoraPlaceholder, value:"none", thumbnail:DEFAULT_THUMB_SRC, compatible_base_model: null}, ...opts] : [{label: LANG.noLorasAvailable, value: "", thumbnail:DEFAULT_THUMB_SRC, compatible_base_model: null}]);
    }
  }, [rawLoraListData, LANG.selectLoraPlaceholder, LANG.noLorasAvailable, DEFAULT_THUMB_SRC]);

  useEffect(() => {
    if (Array.isArray(rawModelListData)) {
        const opts = rawModelListData.map((model) => ({
            label: model.name.split('/').pop().replace(/\.(safetensors|ckpt|pt)$/i, ''),
            value: model.name,
            thumbnail: model.thumbnail || DEFAULT_THUMB_SRC,
        }));
        setModelDropdownOptions(opts.length > 0 ? opts : [{ label: "No models found", value: "", thumbnail: DEFAULT_THUMB_SRC }]);
        if (appSettings?.api_model_file_select) {
            const modelFromSettings = appSettings.api_model_file_select;
            if (opts.some((o) => o.value === modelFromSettings)) {
                setSelectedModel(modelFromSettings);
            } else if (opts.length > 0) {
                setSelectedModel(opts[0].value);
            } else {
                setSelectedModel("");
            }
        } else if (opts.length > 0) {
             setSelectedModel(opts.find(o => o.value === "default") ? "default" : opts[0].value);
        } else {
            setSelectedModel("");
        }
    } else {
         setModelDropdownOptions([{ label: "Loading models...", value: "", thumbnail: DEFAULT_THUMB_SRC }]);
         setSelectedModel("");
    }
  }, [rawModelListData, appSettings, DEFAULT_THUMB_SRC]);

  // Update selectedModelPreviewThumb when selectedModel or modelDropdownOptions change
  useEffect(() => {
    if (selectedModel && modelDropdownOptions.length > 0) {
      const currentModelOption = modelDropdownOptions.find(opt => opt.value === selectedModel);
      if (currentModelOption && currentModelOption.thumbnail) {
        setSelectedModelPreviewThumb(currentModelOption.thumbnail);
      } else {
        setSelectedModelPreviewThumb(DEFAULT_THUMB_SRC); // Fallback if no thumb for selected
      }
    } else {
      setSelectedModelPreviewThumb(DEFAULT_THUMB_SRC); // Fallback if no model selected or options not loaded
    }
  }, [selectedModel, modelDropdownOptions, DEFAULT_THUMB_SRC]);


  useEffect(() => { if (Array.isArray(rawControlNetModelData)) { const opts = rawControlNetModelData.map(m=>({label:m, value:m})); setControlNetModelOptions(opts.length ? [{label:"Select CN Model", value:""}, ...opts] : [{label:"No CN Models", value:""}]); if(!selectedControlNetModel && opts.length > 0 && appSettings?.selectedControlNetModel) setSelectedControlNetModel(appSettings.selectedControlNetModel); else if (!selectedControlNetModel && opts.length > 0 && !opts.find(o => o.value === "")) setSelectedControlNetModel(opts[0].value);}}, [rawControlNetModelData, appSettings, selectedControlNetModel]);
  useEffect(() => { if (Array.isArray(rawClipVisionModelData)) { const opts = rawClipVisionModelData.map(m=>({label:m, value:m})); setClipVisionModelOptions(opts.length ? [{label:"Select CV Model", value:""}, ...opts] : [{label:"No CV Models", value:""}]); if(!selectedClipVisionModel && opts.length > 0 && appSettings?.selectedClipVisionModel) setSelectedClipVisionModel(appSettings.selectedClipVisionModel); else if (!selectedClipVisionModel && opts.length > 0 && !opts.find(o => o.value === "")) setSelectedClipVisionModel(opts[0].value);}}, [rawClipVisionModelData, appSettings, selectedClipVisionModel]);

  useEffect(() => {
    if (!appSettings) return;
    setPromptText(appSettings.custom_prompt || "");
    setPositivePromptTail(appSettings.api_prompt || "masterpiece, best quality, amazing quality");
    setNegativePromptText(appSettings.api_neg_prompt || "bad quality,worst quality, blurry");
    setSelectedCharacter1(appSettings.character1 || "none");
    setSelectedCharacter2(appSettings.character2 || "none");
    setSelectedCharacter3(appSettings.character3 || "none");
    setSelectedAction(appSettings.action || "none");
    setEnableAction((appSettings.action && appSettings.action !== "none") || false);
    setSeed(String(appSettings.random_seed === undefined ? "-1" : appSettings.random_seed));
    if (appSettings.api_sampling_list) { const samplers = appSettings.api_sampling_list.map((s) => ({ label: s.name, value: s.name, description: s.description || "" })); setSamplerOptions(samplers.length > 0 ? samplers : [{ label: "No samplers found", value: "" }]); setSelectedSampler(appSettings.api_sampling_selected || (samplers.length > 0 ? samplers[0].value : ""));
    } else { setSamplerOptions([{ label: "Default Sampler", value: "euler" }]); setSelectedSampler(appSettings.api_sampling_selected || "euler"); }
    if (appSettings.api_scheduler_list) { const schedulers = appSettings.api_scheduler_list.map((s) => ({ label: s.name, value: s.name, description: s.description || "" })); setSchedulerOptions(schedulers.length > 0 ? schedulers : [{ label: "No schedulers found", value: "" }]); setSelectedScheduler(appSettings.api_scheduler_selected || (schedulers.length > 0 ? schedulers[0].value : ""));
    } else { setSchedulerOptions([{ label: "Default Scheduler", value: "normal" }]); setSelectedScheduler(appSettings.api_scheduler_selected || "normal"); }
    setEnableHiresFix(appSettings.api_hf_enable || false);
    setWebuiSaveRedirect(appSettings.api_webui_savepath_override || false);
    setUpscaleBy(appSettings.api_hf_scale || 1.5);
    setDenoisingStrengthHires(appSettings.api_hf_denoise || 0.4);
    setSelectedColorTransfer(appSettings.api_hf_colortransfer || "none");
    if (appSettings.api_hf_upscaler_list) { const upscalers = appSettings.api_hf_upscaler_list.map((u) => ({ label: u, value: u })); setUpscalerOptions(upscalers.length > 0 ? upscalers : [{ label: "No upscalers found", value: "" }]); setSelectedUpscaler(appSettings.api_hf_upscaler_selected || (upscalers.length > 0 ? upscalers[0].value : ""));
    } else { setUpscalerOptions([{ label: "Default Upscaler", value: "None" }]); setSelectedUpscaler(appSettings.api_hf_upscaler_selected || "None");}
    setSelectedAIPromptGenerator(appSettings.ai_interface || "none");
    setRemoteAIURL(appSettings.remote_ai_base_url || "https://api.llama-api.com/chat/completions");
    setRemoteAIModel(appSettings.remote_ai_model || "llama3.3-70b");
    setRemoteAITimeout(appSettings.remote_ai_timeout || 60);
    setLocalLlamaServer(appSettings.ai_local_addr || "http://127.0.0.1:8080/chat/completions");
    setLocalAITemp(appSettings.ai_local_temp || 0.7);
    setLocalAINPredict(appSettings.ai_local_n_predict || 768);
    setSelectedImageGeneratorAPI(appSettings.api_interface || "ComfyUI");
    setLocalImageGeneratorAddress(appSettings.api_addr || "127.0.0.1:8188");
    setBatchGenerateRule(appSettings.batch_generate_rule || "Once");
    setApiImageData(appSettings.api_image_data || "7.0,20,512,768,1");
    setApiImageLandscape(appSettings.api_image_landscape || false);
    setAiPromptInput(appSettings.ai_prompt || "");
    setPromptBan(appSettings.prompt_ban || "lowres, bad anatomy, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry");
    setAiSystemPrompt(appSettings.ai_system_prompt_text_value || LANG.ai_system_prompt_content);
    setRemoteAIApiKey(appSettings.remote_ai_api_key || "");
    if (appSettings.api_model_file_select && modelDropdownOptions.some(o => o.value === appSettings.api_model_file_select)) {
        setSelectedModel(appSettings.api_model_file_select);
    } else if (modelDropdownOptions.length > 0 && modelDropdownOptions[0].value) {
        setSelectedModel(modelDropdownOptions.find(o => o.value === "default")?.value || modelDropdownOptions[0].value);
    }

    setSelectedLoras(appSettings.selectedLoras || []);
    setControlNetEnabled(appSettings.controlNetEnabled || false);
    setSelectedControlNetModel(appSettings.selectedControlNetModel || "");
    setControlNetStrength(appSettings.controlNetStrength || 1.0);
    setControlNetPreprocessors(appSettings.controlNetPreprocessors || { anyLine: true, depth: true, openPose: true, canny: true });
    setSelectedAnyLineStyle(appSettings.selectedAnyLineStyle || "lineart_realistic");
    setCnGlobalPreprocessorResolution(appSettings.cnGlobalPreprocessorResolution || 1024);

    setClipVisionEnabled(appSettings.clipVisionEnabled || false);
    setSelectedClipVisionModel(appSettings.selectedClipVisionModel || "");
    setClipVisionStrength(appSettings.clipVisionStrength || 1.0);
    setHfSteps(appSettings.hfSteps || 15);
    setHfCfg(appSettings.hfCfg || 7.0);
    setHfSampler(appSettings.hfSampler || "");
    setHfScheduler(appSettings.hfScheduler || "");
  }, [appSettings, modelDropdownOptions]);

  const characterDropdownOptions = useMemo(() => { if (!rawCsvData || !rawCharacterJsonData) return [{ label: "Loading...", value: "" },{ label: "Random", value: "random" },{ label: "None", value: "none" }]; const m={}; const pC=Papa.parse(rawCsvData,{skipEmptyLines:true}); if(pC.data){pC.data.forEach(r=>{if(r.length>=2){const oN=r[0]?.trim();const eT=r[1]?.trim();if(oN&&eT)m[oN]=eT;}}); } Object.assign(m,rawCharacterJsonData); const eTS=Object.values(m); const uETS=[...new Set(eTS)]; const o=uETS.map(tS=>({label:tS,value:tS})); return [{ label: "Random", value: "random" },{ label: "None", value: "none" },...o]; }, [rawCsvData, rawCharacterJsonData]);
  const actualCharacterOptionsForRandom = useMemo(() => { if (!rawCsvData || !rawCharacterJsonData) return []; const m={}; const pC=Papa.parse(rawCsvData,{skipEmptyLines:true}); if(pC.data){pC.data.forEach(r=>{if(r.length>=2){const oN=r[0]?.trim();const eT=r[1]?.trim();if(oN&&eT)m[oN]=eT;}}); } Object.assign(m,rawCharacterJsonData); const eTS=Object.values(m); return [...new Set(eTS)]; }, [rawCsvData, rawCharacterJsonData]);
  const actionOptions = useMemo(() => { if(!rawActionJsonData) return [{ label: "Loading...", value: "" },{ label: "None", value: "none" }]; const o=Object.entries(rawActionJsonData).map(([l,v])=>({label:l,value:v})); return [{ label: "None", value: "none" },...o]; }, [rawActionJsonData]);
  const mergedThumbData = useMemo(() => { if (!rawPrimaryThumbsData && !rawFallbackThumbsData) return null; const fT={...(rawPrimaryThumbsData||{})}; if(rawFallbackThumbsData){Object.entries(rawFallbackThumbsData).forEach(([eTK,bD])=>{try{const kSFH=eTK.replace(/\(/g,'\\(').replace(/\)/g,'\\)'); const mK=md5(kSFH); if(!(mK in fT))fT[mK]=bD;}catch(e){console.error(`Error merging fallback thumb for ${eTK}:`, e)}}); } return fT; }, [rawPrimaryThumbsData, rawFallbackThumbsData]);
  const getCharacterDisplayData = (characterValue, actualOptions, mergedThumbs) => { let resolvedTags = characterValue; let thumbSrc = DEFAULT_THUMB_SRC; if (characterValue === 'random') { if (actualOptions && actualOptions.length > 0) { const randomIndex = Math.floor(Math.random() * actualOptions.length); resolvedTags = actualOptions[randomIndex]; } else { resolvedTags = 'none'; } } if (resolvedTags && resolvedTags !== 'none' && resolvedTags !== 'random') { const keyForHash = resolvedTags.replace(/\(/g, '\\(').replace(/\)/g, '\\)'); const md5Key = md5(keyForHash); let base64DataFromJSON = mergedThumbs ? mergedThumbs[md5Key] : null; if (base64DataFromJSON) { try { if (base64DataFromJSON.startsWith('data:image/') && base64DataFromJSON.includes(';base64,')) { const parts = base64DataFromJSON.split(';base64,'); const mimeType = parts[0]; let base64Payload = parts[1]; if (base64Payload.startsWith('H4sI')) { const gzippedBytes = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0)); const decompressedBytes = pako.inflate(gzippedBytes); let newBase64Payload = ''; decompressedBytes.forEach(byte => { newBase64Payload += String.fromCharCode(byte); }); base64Payload = btoa(newBase64Payload); thumbSrc = `${mimeType};base64,${base64Payload}`; } else { thumbSrc = base64DataFromJSON; } } else { console.warn(`Unexpected base64Data format for ${resolvedTags}`); } } catch (e) { console.error(`Error processing base64 for ${resolvedTags}:`, e); thumbSrc = DEFAULT_THUMB_SRC; } } } return { resolvedTags, thumbSrc }; };
  useEffect(() => { if (mergedThumbData && actualCharacterOptionsForRandom) { const { resolvedTags, thumbSrc } = getCharacterDisplayData(selectedCharacter1, actualCharacterOptionsForRandom, mergedThumbData); setResolvedCharacter1Tags(resolvedTags); setCharacter1ThumbSrc(thumbSrc); } }, [selectedCharacter1, actualCharacterOptionsForRandom, mergedThumbData]);
  useEffect(() => { if (mergedThumbData && actualCharacterOptionsForRandom) { const { resolvedTags, thumbSrc } = getCharacterDisplayData(selectedCharacter2, actualCharacterOptionsForRandom, mergedThumbData); if (selectedCharacter2 === 'random' || resolvedCharacter2Tags !== resolvedTags) {setResolvedCharacter2Tags(resolvedTags);} setCharacter2ThumbSrc(thumbSrc); } }, [selectedCharacter2, actualCharacterOptionsForRandom, mergedThumbData, resolvedCharacter2Tags]);
  useEffect(() => { if (mergedThumbData && actualCharacterOptionsForRandom) { const { resolvedTags, thumbSrc } = getCharacterDisplayData(selectedCharacter3, actualCharacterOptionsForRandom, mergedThumbData); if (selectedCharacter3 === 'random' || resolvedCharacter3Tags !== resolvedTags) {setResolvedCharacter3Tags(resolvedTags);} setCharacter3ThumbSrc(thumbSrc); } }, [selectedCharacter3, actualCharacterOptionsForRandom, mergedThumbData, resolvedCharacter3Tags]);
  useEffect(() => { if (selectedSampler && samplerOptions.length > 0 && !samplerOptions[0].label.startsWith("Load")) { const sO = samplerOptions.find(opt => opt.value === selectedSampler); setSamplerDescription(sO ? sO.description : ''); } }, [selectedSampler, samplerOptions]);
  useEffect(() => { if (selectedScheduler && schedulerOptions.length > 0 && !schedulerOptions[0].label.startsWith("Load")) { const sO = schedulerOptions.find(opt => opt.value === selectedScheduler); setSchedulerDescription(sO ? sO.description : ''); } }, [selectedScheduler, schedulerOptions]);

  const handlePromptChange=(e)=>setPromptText(e.target.value);
  const handlePositivePromptTailChange = (e) => setPositivePromptTail(e.target.value);
  const handleNegativePromptChange=(e)=>setNegativePromptText(e.target.value);
  const handleCharacter1Change = (selectedOpt) => { const newValue = selectedOpt ? selectedOpt.value : "none"; setSelectedCharacter1(newValue); setHoveredCharacterPreviewSrc(null); };
  const handleCharacter2Change = (selectedOpt) => { const newValue = selectedOpt ? selectedOpt.value : 'none'; setSelectedCharacter2(newValue); setHoveredCharacterPreviewSrc(null); };
  const handleCharacter3Change = (selectedOpt) => { const newValue = selectedOpt ? selectedOpt.value : 'none'; setSelectedCharacter3(newValue); setHoveredCharacterPreviewSrc(null); };
  const handleEnableActionChange=(e)=>{ setEnableAction(e.target.checked); if (!e.target.checked) setSelectedAction("none"); };
  const handleActionChange=(e)=>setSelectedAction(e.target.value);
  const handleModelChange=(selectedOpt)=>setSelectedModel(selectedOpt ? selectedOpt.value : "");
  const handleSeedInputChange=(e)=>{const v=e.target.value;if(v===''||v==='-'||!isNaN(v))setSeed(v);};
  const handleSeedSliderChange=(e)=>setSeed(e.target.value);
  const randomizeSeed = () => { const newRandomSeed = Math.floor(Math.random() * (MAX_SEED + 1)); setSeed(String(newRandomSeed)); };
  const handleSamplerChange=(e)=>{setSelectedSampler(e.target.value);};
  const handleSchedulerChange=(e)=>{setSelectedScheduler(e.target.value);};
  const handleThumbnailClick = (src) => { if (src && src !== DEFAULT_THUMB_SRC) { setModalImageSrc(src); setIsModalOpen(true); }};
  const handleEnableHiresFixChange=(e)=>setEnableHiresFix(e.target.checked);
  const handleWebuiSaveRedirectChange=(e)=>setWebuiSaveRedirect(e.target.checked);
  const handleUpscalerChange=(e)=>setSelectedUpscaler(e.target.value);
  const handleColorTransferChange=(e)=>setSelectedColorTransfer(e.target.value);
  const handleUpscaleByChange=(e)=>setUpscaleBy(parseFloat(e.target.value));
  const handleDenoisingStrengthHiresChange=(e)=>setDenoisingStrengthHires(parseFloat(e.target.value));
  const handleAIPromptGeneratorChange = (e) => setSelectedAIPromptGenerator(e.target.value);
  const handleRemoteAIURLChange = (e) => setRemoteAIURL(e.target.value);
  const handleRemoteAIModelChange = (e) => setRemoteAIModel(e.target.value);
  const handleRemoteAITimeoutChange = (e) => setRemoteAITimeout(parseInt(e.target.value, 10));
  const handleLocalLlamaServerChange = (e) => setLocalLlamaServer(e.target.value);
  const handleLocalAITempChange = (e) => setLocalAITemp(parseFloat(e.target.value));
  const handleLocalAINPredictChange = (e) => setLocalAINPredict(parseInt(e.target.value, 10));
  const handleImageGeneratorAPIChange = (e) => setSelectedImageGeneratorAPI(e.target.value);
  const handleLocalImageGeneratorAddressChange = (e) => setLocalImageGeneratorAddress(e.target.value);
  const handleBatchGenerateRuleChange = (e) => setBatchGenerateRule(e.target.value);
  const handleApiImageDataChange = (e) => setApiImageData(e.target.value);
  const handleApiImageLandscapeChange = (e) => setApiImageLandscape(e.target.checked);
  const handleAiPromptInputChange = (e) => setAiPromptInput(e.target.value);
  const handlePromptBanChange = (e) => setPromptBan(e.target.value);
  const handleAiSystemPromptChange = (e) => setAiSystemPrompt(e.target.value);

  const handleFileChange = (event, setPreviewCallback, setBase64Callback, setDimensionsCallback) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      const img = new Image();
      img.onload = () => { if (setDimensionsCallback) { setDimensionsCallback({ width: img.naturalWidth, height: img.naturalHeight }); } };
      reader.onloadend = () => {
        if (setPreviewCallback) { const blobUrl = URL.createObjectURL(file); setPreviewCallback(blobUrl); img.src = blobUrl; }
        if (setBase64Callback) { setBase64Callback(reader.result); }
      };
      reader.readAsDataURL(file);
    } else {
      if (setPreviewCallback) setPreviewCallback(null);
      if (setBase64Callback) setBase64Callback(null);
      if (setDimensionsCallback) setDimensionsCallback(null);
    }
    if (event.target) event.target.value = null;
  };

  const handleAddLora = () => {
    if (loraDropdownOptions.length === 0 ||
        (loraDropdownOptions.length === 1 && loraDropdownOptions[0].value === "")) {
      alert(LANG.noLorasAvailable || "No LoRAs available to add.");
      return;
    }
    let firstActualLoraOption = null;
    if (loraDropdownOptions.length > 0) {
        if (loraDropdownOptions[0].value !== "none" && loraDropdownOptions[0].value !== "") {
            firstActualLoraOption = loraDropdownOptions[0];
        } else if (loraDropdownOptions.length > 1 && loraDropdownOptions[1].value !== "" && loraDropdownOptions[1].value !== "none") {
            firstActualLoraOption = loraDropdownOptions[1];
        }
    }
    if (!firstActualLoraOption) {
        const actualLoras = loraDropdownOptions.filter(opt => opt.value && opt.value !== "none" && opt.value !== "");
        if (actualLoras.length > 0) {
            firstActualLoraOption = actualLoras[0];
        } else {
            alert(LANG.noLorasAvailable || "No selectable LoRAs available.");
            return;
        }
    }
    setSelectedLoras([...selectedLoras, {
      id: md5(Date.now().toString() + Math.random().toString()),
      name: firstActualLoraOption.value,
      strength: 0.7,
      thumbnail: firstActualLoraOption.thumbnail || DEFAULT_THUMB_SRC,
      compatible_base_model: firstActualLoraOption.compatible_base_model || "Unknown"
    }]);
  };
  const handleRemoveLora = (idToRemove) => setSelectedLoras(selectedLoras.filter((lora) => lora.id !== idToRemove));
  const handleLoraChange = (id, field, value) => {
    setSelectedLoras(selectedLoras.map((lora) => {
      if (lora.id === id) {
        if (field === "name") {
          const newLoraOption = loraDropdownOptions.find(opt => opt.value === value);
          return {
            ...lora,
            name: value,
            thumbnail: newLoraOption ? newLoraOption.thumbnail : DEFAULT_THUMB_SRC,
            compatible_base_model: newLoraOption ? newLoraOption.compatible_base_model : "Unknown"
          };
        }
        return { ...lora, [field]: value };
      }
      return lora;
    }));
  };

  const handleControlNetEnableChange = (e) => { setControlNetEnabled(e.target.checked); if (!e.target.checked) { setControlNetProcessedPreviewImage(null); setControlNetRefImage(null); setControlNetRefImageBase64(null); setControlNetRefImageDimensions(null); } };
  const handleControlNetModelChange = (e) => setSelectedControlNetModel(e.target.value);
  const handleClearControlNetRefImage = () => { setControlNetRefImage(null); setControlNetRefImageBase64(null); setControlNetRefImageDimensions(null); setControlNetProcessedPreviewImage(null); };
  const handleControlNetRefImageChange = (e) => { handleFileChange(e, setControlNetRefImage, setControlNetRefImageBase64, setControlNetRefImageDimensions); };
  const handleControlNetStrengthChange = (e) => setControlNetStrength(parseFloat(e.target.value));
  const handleControlNetPreprocessorChange = (event) => { const { name, checked } = event.target; setControlNetPreprocessors(prev => ({ ...prev, [name]: checked })); };
  const handleAnyLineStyleChange = (e) => setSelectedAnyLineStyle(e.target.value);
  const handleCnGlobalPreprocessorResolutionChange = (e) => setCnGlobalPreprocessorResolution(parseInt(e.target.value, 10) || 0);
  const handleClipVisionEnableChange = (e) => setClipVisionEnabled(e.target.checked);
  const handleClipVisionModelChange = (e) => setSelectedClipVisionModel(e.target.value);
  const handleClipVisionRefImageChange = (e) => handleFileChange(e, setClipVisionRefImage, setClipVisionRefImageBase64);
  const handleClipVisionStrengthChange = (e) => setClipVisionStrength(parseFloat(e.target.value));
  const handleHfStepsChange = (e) => setHfSteps(parseInt(e.target.value, 10));
  const handleHfCfgChange = (e) => setHfCfg(parseFloat(e.target.value));
  const handleHfSamplerChange = (e) => setHfSampler(e.target.value);
  const handleHfSchedulerChange = (e) => setHfScheduler(e.target.value);

  const handleSaveSettings = () => {
    const currentSettingsToSave = {
      custom_prompt: promptText, api_prompt: positivePromptTail, api_neg_prompt: negativePromptText,
      ai_prompt: aiPromptInput, prompt_ban: promptBan, ai_system_prompt_text_value: aiSystemPrompt,
      character1: selectedCharacter1, character2: selectedCharacter2, character3: selectedCharacter3, action: selectedAction,
      api_model_file_select: selectedModel, random_seed: seed === "-1" || seed === "" ? -1 : parseInt(seed, 10),
      api_image_data: apiImageData, api_image_landscape: apiImageLandscape,
      api_sampling_list: samplerOptions.filter(opt => opt.value && !opt.label.startsWith("Load")).map(opt => ({ name: opt.value, description: opt.description || "" })),
      api_sampling_selected: selectedSampler,
      api_scheduler_list: schedulerOptions.filter(opt => opt.value && !opt.label.startsWith("Load")).map(opt => ({ name: opt.value, description: opt.description || "" })),
      api_scheduler_selected: selectedScheduler,
      api_hf_enable: enableHiresFix, api_hf_scale: upscaleBy, api_hf_denoise: denoisingStrengthHires,
      api_hf_upscaler_list: upscalerOptions.filter(opt => opt.value && !opt.label.startsWith("Load")).map(opt => opt.value),
      api_hf_upscaler_selected: selectedUpscaler, api_hf_colortransfer: selectedColorTransfer,
      api_webui_savepath_override: webuiSaveRedirect,
      ai_interface: selectedAIPromptGenerator, remote_ai_base_url: remoteAIURL, remote_ai_model: remoteAIModel,
      remote_ai_api_key: remoteAIApiKey, remote_ai_timeout: remoteAITimeout,
      ai_local_addr: localLlamaServer, ai_local_temp: localAITemp, ai_local_n_predict: localAINPredict,
      api_interface: selectedImageGeneratorAPI, api_addr: localImageGeneratorAddress,
      batch_generate_rule: batchGenerateRule,
      selectedLoras: selectedLoras.map(l => ({name: l.name, strength: l.strength, thumbnail: l.thumbnail, compatible_base_model: l.compatible_base_model})),
      controlNetEnabled, selectedControlNetModel, controlNetStrength,
      controlNetPreprocessors,
      selectedAnyLineStyle,
      cnGlobalPreprocessorResolution,
      clipVisionEnabled, selectedClipVisionModel, clipVisionStrength,
      hfSteps, hfCfg, hfSampler, hfScheduler,
    };
    saveSettingsToFile(currentSettingsToSave);
    alert("Settings saved to file!");
  };
  const handleLoadSettings = () => { loadSettingsFromFile((loadedSettings) => { if (loadedSettings) { setAppSettings(loadedSettings); alert("Settings loaded successfully!"); } else { console.log("Settings loading cancelled or failed."); } }); };
  const handlePreviewPreprocessors = async () => {
    if (!controlNetEnabled || !controlNetRefImageBase64) { alert("Please enable ControlNet and select a reference image first."); return; }
    setIsGeneratingPreprocessorPreview(true); setPreprocessorPreviewError(null); setControlNetProcessedPreviewImage(null);
    const payload = { server_address: localImageGeneratorAddress, controlnet_ref_image_base64: controlNetRefImageBase64, controlnet_preprocessors: controlNetPreprocessors, selected_anyline_style: controlNetPreprocessors.anyLine ? selectedAnyLineStyle : undefined, cn_global_preprocessor_resolution: cnGlobalPreprocessorResolution, };
    console.log("Sending payload for CN Preprocessor Preview:", payload);
    try {
      const response = await fetch("http://localhost:8000/api/preview-controlnet-preprocessor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), });
      if (!response.ok) { const errorData = await response.json().catch(() => ({ detail: "Unknown error during preview." })); throw new Error(errorData.detail || `HTTP error ${response.status}`); }
      const result = await response.json();
      if (result.image) { setControlNetProcessedPreviewImage(result.image); } else if (result.error) { setPreprocessorPreviewError(result.error); }
    } catch (err) { console.error("Error fetching preprocessor preview:", err); setPreprocessorPreviewError(err.message || "Failed to fetch preview."); } finally { setIsGeneratingPreprocessorPreview(false); }
  };

  const handleCreatePrompt = async () => {
  const fC1 = selectedCharacter1 === "random" ? resolvedCharacter1Tags : selectedCharacter1;
  const fC2 = selectedCharacter2 === "random" ? resolvedCharacter2Tags : selectedCharacter2;
  const fC3 = selectedCharacter3 === "random" ? resolvedCharacter3Tags : selectedCharacter3;
  const actionTag = enableAction && selectedAction !== "none" ? selectedAction : "";
  const promptParts = [ promptText, fC1 !== "none" ? fC1 : null, fC2 !== "none" ? fC2 : null, fC3 !== "none" ? fC3 : null, actionTag ? actionTag : null, positivePromptTail, ].filter(Boolean);
  const finalCombinedPrompt = promptParts.join(", ");
  setFinalPromptDisplay(finalCombinedPrompt);
  const { cfg: baseCfg, steps: baseSteps, width: baseWidth, height: baseHeight } = parseApiImageData(apiImageData, apiImageLandscape);
  
  // Determine the correct model name for the payload
  let model_name_for_payload = selectedModel;
  let normalizedSelectedModel = selectedModel.replace(/\\/g, "/");
  if (normalizedSelectedModel && normalizedSelectedModel.toLowerCase() !== "default") {
      // If COMfYUI_MODELS_CHECKPOINT_PATH in server.js is ".../checkpoints/thumb",
      // then selectedModel will be like "illustrious/model.ext".
      // We need to prepend "thumb" and use backslashes for ComfyUI.
      if (!normalizedSelectedModel.toLowerCase().startsWith("thumb/")) {
        model_name_for_payload = `thumb\\${normalizedSelectedModel.replace(/\//g, "\\")}`;
      } else {
        // If selectedModel already starts with "thumb/" (e.g. "thumb/illustrious/model.ext")
        // just convert slashes to backslashes.
        model_name_for_payload = normalizedSelectedModel.replace(/\//g, "\\");
      }
    } else if (selectedModel.toLowerCase() === "default") {
      model_name_for_payload = "default"; // Ensure "default" remains as is
    }
  
  setInformationDisplay( `Model: ${model_name_for_payload}\nSeed: ${seed}\nSampler: ${selectedSampler} / Scheduler: ${selectedScheduler}\nDimensions: ${baseWidth}x${baseHeight}\nSteps: ${baseSteps}, CFG: ${baseCfg}\nHi-res Fix: ${ enableHiresFix ? `Enabled (Upscaler: ${selectedUpscaler}, Up By: ${upscaleBy.toFixed(1)}, Denoise: ${denoisingStrengthHires.toFixed(5)}, Steps: ${hfSteps}, CFG: ${hfCfg})` : "Disabled" } \nControlNet: ${controlNetEnabled ? `Enabled (Model: ${selectedControlNetModel}, Strength: ${controlNetStrength.toFixed(5)})` : "Disabled"} \nCLIP Vision: ${clipVisionEnabled ? `Enabled (Model: ${selectedClipVisionModel}, Strength: ${clipVisionStrength.toFixed(2)})` : "Disabled"}` );
  setIsGenerating(true); setGeneratedImage(null); setCurrentPreviewImage(null); setGenerationError(null); setGenerationProgress(0);
  setCurrentSteps(baseSteps + (enableHiresFix ? hfSteps : 0));
  setControlNetProcessedPreviewImage(null);

  const payload = {
    server_address: localImageGeneratorAddress, 
    model_name: model_name_for_payload, // Use the adjusted model name
    positive_prompt: finalCombinedPrompt, 
    negative_prompt: negativePromptText,
    random_seed: seed === "-1" || seed === "" ? -1 : parseInt(seed, 10),
    steps: baseSteps, 
    cfg: baseCfg, 
    width: baseWidth, 
    height: baseHeight,
    api_image_landscape: apiImageLandscape,
    sampler_name: selectedSampler, 
    scheduler: selectedScheduler,
    loras_enabled: selectedLoras.length > 0,
    loras_config: selectedLoras.map(lora => ({ name: lora.name, strength: parseFloat(lora.strength) })),
    controlnet_enabled: controlNetEnabled,
    controlnet_model_name: controlNetEnabled ? selectedControlNetModel : null,
    controlnet_preprocessors: controlNetEnabled ? controlNetPreprocessors : undefined,
    selected_anyline_style: controlNetEnabled && controlNetPreprocessors.anyLine ? selectedAnyLineStyle : undefined,
    controlnet_ref_image_base64: controlNetEnabled ? controlNetRefImageBase64 : null,
    controlnet_strength: controlNetEnabled ? parseFloat(controlNetStrength) : null,
    cn_anyline_resolution: controlNetEnabled && controlNetPreprocessors.anyLine ? cnGlobalPreprocessorResolution : undefined,
    cn_depth_resolution: controlNetEnabled && controlNetPreprocessors.depth ? cnGlobalPreprocessorResolution : undefined,
    cn_openpose_resolution: controlNetEnabled && controlNetPreprocessors.openPose ? cnGlobalPreprocessorResolution : undefined,
    cn_canny_resolution: controlNetEnabled && controlNetPreprocessors.canny ? cnGlobalPreprocessorResolution : undefined,
    clipvision_enabled: clipVisionEnabled,
    clipvision_model_name: clipVisionEnabled ? selectedClipVisionModel : null,
    clipvision_ref_image_base64: clipVisionEnabled ? clipVisionRefImageBase64 : null,
    clipvision_strength: clipVisionEnabled ? parseFloat(clipVisionStrength) : null,
    hf_enable: enableHiresFix,
    hf_scale: enableHiresFix ? parseFloat(upscaleBy) : null,
    hf_upscaler: enableHiresFix ? selectedUpscaler : null,
    hf_denoising_strength: enableHiresFix ? parseFloat(denoisingStrengthHires) : null,
    hf_colortransfer: enableHiresFix ? selectedColorTransfer : "none",
    hf_steps: enableHiresFix ? parseInt(hfSteps, 10) : null,
    hf_cfg: enableHiresFix ? parseFloat(hfCfg) : null,
    hf_sampler: enableHiresFix && hfSampler ? hfSampler : null,
    hf_scheduler: enableHiresFix && hfScheduler ? hfScheduler : null,
  };
  console.log("Frontend payload being sent to WebSocket:", JSON.stringify(payload, null, 2));
  try {
    const ws = new window.WebSocket("ws://localhost:8000/api/generate-ws"); 
    ws.onopen = () => { ws.send(JSON.stringify(payload)); };
    ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "progress") { setGenerationProgress(msg.progress);
          } else if (msg.type === "preview_image") { setCurrentPreviewImage(msg.image);
          } else if (msg.type === "controlnet_preprocessor_preview") { console.log("Received ControlNet Preprocessor Preview from WebSocket"); setControlNetProcessedPreviewImage(msg.image);
          } else if (msg.type === "result") { setGeneratedImage(msg.image); setIsGenerating(false); setGenerationProgress(100); ws.close();
          } else if (msg.type === "error") { setGenerationError(msg.message); setIsGenerating(false); setCurrentPreviewImage(null); setControlNetProcessedPreviewImage(null); ws.close(); }
        };
    ws.onerror = (err) => { setGenerationError("WebSocket error"); setIsGenerating(false); setCurrentPreviewImage(null); if(ws.readyState === WebSocket.OPEN) ws.close(); };
    ws.onclose = () => { setIsGenerating(false); };
  } catch (err) { setGenerationError(err.message || "Unknown WebSocket error"); setIsGenerating(false); setCurrentPreviewImage(null); }
};

  const handleBatchRandom = () => { alert("Batch (Random) - Not implemented yet"); };
  const handleBatchLastPrompt = () => { alert("Batch (Last Prompt) - Not implemented yet"); };
  const SelectOptionWithHoverPreview = (props) => { const { data } = props; const handleMouseEnter = () => { if (data.value && data.value !== 'random' && data.value !== 'none' && mergedThumbData && actualCharacterOptionsForRandom) { const { thumbSrc } = getCharacterDisplayData(data.value, actualCharacterOptionsForRandom, mergedThumbData); setHoveredCharacterPreviewSrc(thumbSrc); } else { setHoveredCharacterPreviewSrc(null); } }; const handleMouseLeave = () => { setHoveredCharacterPreviewSrc(null); }; return ( <div {...props.innerProps} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{backgroundColor:props.isSelected?'#61dafb':props.isFocused?'#353941':'#2c313a', color:props.isSelected?'#20232a':'#abb2bf', padding:'8px 12px', cursor:'pointer'}}> {props.label} </div> ); };
  const handleAIPromptGenerate = async () => {
      if (selectedAIPromptGenerator === "none") { alert("Please select an AI Prompt Generator in System Settings."); return; }
      if (!aiPromptInput.trim()) { alert("Please enter some text into the 'AI Prompt (for generator input)' field."); return; }
      setIsGeneratingAIPrompt(true); setAiGenerationError(null);
      const paramsForAI = { systemPrompt: aiSystemPrompt, userInput: aiPromptInput, generatorType: selectedAIPromptGenerator, remoteConfig: { url: remoteAIURL, model: remoteAIModel, apiKey: remoteAIApiKey, timeoutSeconds: remoteAITimeout, }, localConfig: { url: localLlamaServer, temp: localAITemp, nPredict: localAINPredict, timeoutSeconds: remoteAITimeout, }, };
      try {
        console.log("Calling generatePromptFromAI with params:", paramsForAI);
        const generatedPrompt = await generatePromptFromAI(paramsForAI);
        let finalGeneratedPrompt = generatedPrompt;
        if (promptBan) { const bannedTags = promptBan.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean); const currentTags = generatedPrompt.split(',').map(tag => tag.trim()); finalGeneratedPrompt = currentTags.filter(tag => !bannedTags.includes(tag.toLowerCase())).join(', '); }
        setPromptText(finalGeneratedPrompt); console.log("AI Generated Prompt (after ban):", finalGeneratedPrompt);
      } catch (error) { console.error("Error generating AI prompt:", error); setAiGenerationError(error.message || "Failed to generate AI prompt."); } finally { setIsGeneratingAIPrompt(false); }
    };
  const downloadImage = (base64Image, filename = "generated_image.png") => {
      if (!base64Image) { console.error("No image data provided for download."); alert("No image to download!"); return; }
      try { const link = document.createElement('a'); link.href = base64Image; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); console.log(`Image download initiated: ${filename}`); } catch (error) { console.error("Error during image download:", error); alert("Failed to initiate image download. See console for details."); }
    };

  if ( dataLoadingError || !appSettings || !rawCsvData || !rawCharacterJsonData || !rawActionJsonData || !rawPrimaryThumbsData || !rawFallbackThumbsData || !mergedThumbData || rawModelListData === null || rawLoraListData === null || rawControlNetModelData === null || rawClipVisionModelData === null ) {
    if (dataLoadingError) return <div className="app-container error-message">Error fetching data: <pre>{dataLoadingError}</pre></div>;
    return <div className="app-container loading-message">Loading data...</div>;
  }
  const currentSliderValue = seed==='-1'||seed===''||isNaN(parseInt(seed))||parseInt(seed)<0?"0":(parseInt(seed)>MAX_SEED?MAX_SEED.toString():seed);
  let char1DisplayValueToFind = selectedCharacter1; if (selectedCharacter1 === 'random' && resolvedCharacter1Tags && resolvedCharacter1Tags !== 'random' && resolvedCharacter1Tags !== 'none') { char1DisplayValueToFind = resolvedCharacter1Tags; }
  const char1SelectValueObject = characterDropdownOptions.find( (option) => option.value === char1DisplayValueToFind ) || characterDropdownOptions.find(o => o.value === selectedCharacter1) || null;
  let char2DisplayValueToFind = selectedCharacter2; if (selectedCharacter2 === 'random' && resolvedCharacter2Tags && resolvedCharacter2Tags !== 'random' && resolvedCharacter2Tags !== 'none') { char2DisplayValueToFind = resolvedCharacter2Tags; }
  const char2SelectValueObject = characterDropdownOptions.find( (option) => option.value === char2DisplayValueToFind ) || characterDropdownOptions.find(o => o.value === selectedCharacter2) || null;
  let char3DisplayValueToFind = selectedCharacter3; if (selectedCharacter3 === 'random' && resolvedCharacter3Tags && resolvedCharacter3Tags !== 'random' && resolvedCharacter3Tags !== 'none') { char3DisplayValueToFind = resolvedCharacter3Tags; }
  const char3SelectValueObject = characterDropdownOptions.find( (option) => option.value === char3DisplayValueToFind ) || characterDropdownOptions.find(o => o.value === selectedCharacter3) || null;
  const selectComponents = { Option: SelectOptionWithHoverPreview };
  const modelSelectValue = modelDropdownOptions.find(opt => opt.value === selectedModel) || null;
  const loraSelectComponents = { SingleValue: formatSingleValueWithThumbnail };


  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="control-panel">
          <h1>My ComfyUI Frontend</h1>
          {hoveredCharacterPreviewSrc && ( <div className="hover-preview-container"><img src={hoveredCharacterPreviewSrc} alt="Hover preview" className="hover-preview-image" /></div> )}

          <div className="input-row">
            <div className="input-group"><label htmlFor="character-list-1">{LANG.character1}:</label><Select id="character-list-1" options={characterDropdownOptions.filter(o=>!o.label.startsWith('Load'))} value={char1SelectValueObject} onChange={handleCharacter1Change} styles={selectStyles} placeholder="Search/select..." isClearable isLoading={characterDropdownOptions[0]?.label.startsWith('Load')} components={selectComponents} /></div>
            <div className="input-group"><label htmlFor="character-list-2">{LANG.character2}:</label><Select id="character-list-2" options={characterDropdownOptions.filter(o=>!o.label.startsWith('Load'))} value={char2SelectValueObject} onChange={handleCharacter2Change} styles={selectStyles} placeholder="Search/select..." isClearable isLoading={characterDropdownOptions[0]?.label.startsWith('Load')} components={selectComponents} /></div>
            <div className="input-group"><label htmlFor="character-list-3">{LANG.character3}:</label><Select id="character-list-3" options={characterDropdownOptions.filter(o=>!o.label.startsWith('Load'))} value={char3SelectValueObject} onChange={handleCharacter3Change} styles={selectStyles} placeholder="Search/select..." isClearable isLoading={characterDropdownOptions[0]?.label.startsWith('Load')} components={selectComponents} /></div>
            <div className="input-group action-group"><div className="checkbox-group"><input type="checkbox" id="ea" checked={enableAction} onChange={handleEnableActionChange}/><label htmlFor="ea">{LANG.action}</label></div>{enableAction && (<><label htmlFor="al" className="action-dropdown-label">{LANG.action}:</label><select id="al" value={selectedAction} onChange={handleActionChange} disabled={actionOptions[0]?.label.startsWith('Load')}>{actionOptions.map(o=><option key={"act"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></>)}</div>
          </div>
          <div className="input-row">
            {/* Model Selection Group */}
            <div className="input-group model-selection-group"> {/* Added specific class */}
              <label htmlFor="ml">{LANG.api_model_file_select}:</label>
              {/* New Preview Image Area for Selected Model */}
              {selectedModel && selectedModel !== "default" && selectedModelPreviewThumb && selectedModelPreviewThumb !== DEFAULT_THUMB_SRC && (
                <div className="model-preview-card" onClick={() => handleThumbnailClick(selectedModelPreviewThumb)} style={{cursor: 'zoom-in'}}>
                  <img
                    src={selectedModelPreviewThumb}
                    alt={modelSelectValue?.label || selectedModel}
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_THUMB_SRC; }}
                  />
                </div>
              )}
              <Select
                id="ml"
                value={modelSelectValue}
                onChange={handleModelChange}
                options={modelDropdownOptions}
                styles={selectStyles}
                placeholder={LANG.selectModelPlaceholder || "Select Model..."}
                isLoading={modelDropdownOptions[0]?.label.startsWith('Load')}
                formatOptionLabel={formatOptionWithThumbnail}
                components={{ SingleValue: formatSingleValueWithThumbnail }}
                isClearable={false}
              />
            </div>
            <div className="input-group seed-group"><label htmlFor="rs">{LANG.random_seed}:</label><div className="seed-input-container"><input type="text" id="rs" value={seed} onChange={handleSeedInputChange} className="seed-input-field" placeholder="-1"/><button onClick={randomizeSeed} className="random-seed-button" title="Rnd">&#x21BB;</button></div><input type="range" min="0" max={MAX_SEED.toString()} value={currentSliderValue} onChange={handleSeedSliderChange} className="seed-slider" /><div className="seed-range-labels"><span>0</span><span>{seed==='-1'||seed===''?'(R)':(isNaN(parseInt(seed))?'(I)':seed)}</span><span>{MAX_SEED}</span></div></div>
          </div>
          <div className="input-row">
            <div className="input-group"><label htmlFor="sl">{LANG.api_sampling_method}:</label><select id="sl" value={selectedSampler} onChange={handleSamplerChange} disabled={samplerOptions[0]?.label.startsWith('Load')}>{samplerOptions.map(o=><option key={"samp"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
            <div className="input-group description-group"><label htmlFor="sd">{LANG.samplerDescriptionLabel}:</label><textarea id="sd" value={samplerDescription} readOnly rows={2} /></div>
          </div>
          <div className="input-row">
            <div className="input-group"><label htmlFor="schl">{LANG.api_scheduler}:</label><select id="schl" value={selectedScheduler} onChange={handleSchedulerChange} disabled={schedulerOptions[0]?.label.startsWith('Load')}>{schedulerOptions.map(o=><option key={"sch"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
            <div className="input-group description-group"><label htmlFor="schd">{LANG.schedulerDescriptionLabel}:</label><textarea id="schd" value={schedulerDescription} readOnly rows={2} /></div>
          </div>
          <div className="input-row"><div className="input-group thumb-gallery-group"><label>{LANG.thumbImageGalleryLabel}:</label><div className="thumbnail-container"><img src={character1ThumbSrc} alt={resolvedCharacter1Tags||'C1'} className="character-thumbnail" onClick={()=>handleThumbnailClick(character1ThumbSrc)}/><img src={character2ThumbSrc} alt={resolvedCharacter2Tags||'C2'} className="character-thumbnail" onClick={()=>handleThumbnailClick(character2ThumbSrc)}/><img src={character3ThumbSrc} alt={resolvedCharacter3Tags||'C3'} className="character-thumbnail" onClick={()=>handleThumbnailClick(character3ThumbSrc)}/></div></div></div>

          <div className="section lora-section">
            <div className="section-header">
              <label className="checkbox-label-header">{LANG.loraSectionTitle}</label>
              <button onClick={handleAddLora} className="add-lora-button action-button" style={{ padding: "8px 15px", width: "60%", alignSelf: 'center' }}>
                {LANG.addLoraButton}
              </button>
            </div>
            {selectedLoras.length > 0 && (
              <div className="section-content">
                {selectedLoras.map((lora, index) => (
                  <div key={lora.id} className="input-row lora-entry" style={{alignItems: 'center'}}>
                    <img
                        src={lora.thumbnail || DEFAULT_THUMB_SRC}
                        alt={lora.name}
                        className="lora-thumbnail image-preview small-preview"
                        onClick={() => {setModalImageSrc(lora.thumbnail || DEFAULT_THUMB_SRC); setIsModalOpen(true);}}
                        style={{cursor: 'zoom-in', marginRight: '10px', width: '48px', height: '48px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#2c313a'}}
                        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_THUMB_SRC; }}
                    />
                    <div className="input-group lora-name-group" style={{flexGrow: 2}}>
                      <label htmlFor={`lora-name-${lora.id}`}>{LANG.loraNameLabel} #{index + 1}:</label>
                      <Select
                        id={`lora-name-${lora.id}`}
                        options={loraDropdownOptions.filter(o => o.value !== "none")}
                        value={loraDropdownOptions.find(opt => opt.value === lora.name) || null}
                        onChange={(selectedOpt) => handleLoraChange(lora.id, "name", selectedOpt ? selectedOpt.value : "none")}
                        styles={selectStyles}
                        placeholder={LANG.selectLoraPlaceholder}
                        isLoading={loraDropdownOptions[0]?.label.startsWith("Load")}
                        formatOptionLabel={formatOptionWithThumbnail}
                        components={loraSelectComponents}
                        isClearable={false}
                      />
                    </div>
                    <div className="input-group slider-group lora-strength-group" style={{flexGrow: 1}}>
                      <label htmlFor={`lora-strength-${lora.id}`}>{LANG.loraStrengthLabel}: {parseFloat(lora.strength).toFixed(5)}</label>
                      <input type="range" id={`lora-strength-${lora.id}`} min="-5.0" max="5.0" step="0.05" value={lora.strength} onChange={(e) => handleLoraChange(lora.id, "strength", parseFloat(e.target.value))} />
                    </div>
                    <button onClick={() => handleRemoveLora(lora.id)} className="remove-lora-button action-button" style={{ padding: "8px 12px", backgroundColor: "#dc3545", alignSelf: 'center' }}>{LANG.removeLoraButton}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- ControlNet Section --- */}
          <div className="section controlnet-section">
            <div className="section-header">
              <input type="checkbox" id="enableControlNet" checked={controlNetEnabled} onChange={handleControlNetEnableChange} />
              <label htmlFor="enableControlNet" className="checkbox-label-header">{LANG.controlNetEnableLabel}</label>
            </div>
            {controlNetEnabled && (
              <div className="section-content">
                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="cn-model">{LANG.controlNetModelLabel}:</label>
                    <select id="cn-model" value={selectedControlNetModel} onChange={handleControlNetModelChange} disabled={controlNetModelOptions[0]?.label.startsWith("Load")}>
                      {controlNetModelOptions.map(o => <option key={"cn-mod-" + o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="cnGlobalRes">{LANG.controlNetGlobalResolutionLabel}:</label>
                    <input type="number" id="cnGlobalRes" value={cnGlobalPreprocessorResolution} onChange={handleCnGlobalPreprocessorResolutionChange} min="64" step="64" className="resolution-input" style={{width: '100px'}}/>
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group" style={{flexBasis: '100%'}}>
                    <label>{LANG.controlNetPreprocessorLabel}</label>
                    <div className="checkbox-grid" style={{ marginTop: '5px' }}>
                      <div className="checkbox-group preprocessor-item">
                        <input type="checkbox" id="cnAnyLine" name="anyLine" checked={controlNetPreprocessors.anyLine} onChange={handleControlNetPreprocessorChange} />
                        <label htmlFor="cnAnyLine">{LANG.enableAnyLineLabel}</label>
                        {controlNetPreprocessors.anyLine && ( <select id="cnAnyLineStyle" value={selectedAnyLineStyle} onChange={handleAnyLineStyleChange} onClick={(e) => e.stopPropagation()} > {anyLineStyleOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))} </select> )}
                      </div>
                      <div className="checkbox-group preprocessor-item"> <input type="checkbox" id="cnDepth" name="depth" checked={controlNetPreprocessors.depth} onChange={handleControlNetPreprocessorChange} /> <label htmlFor="cnDepth">{LANG.enableDepthLabel}</label> </div>
                      <div className="checkbox-group preprocessor-item"> <input type="checkbox" id="cnOpenPose" name="openPose" checked={controlNetPreprocessors.openPose} onChange={handleControlNetPreprocessorChange} /> <label htmlFor="cnOpenPose">{LANG.enableOpenPoseLabel}</label> </div>
                      <div className="checkbox-group preprocessor-item"> <input type="checkbox" id="cnCanny" name="canny" checked={controlNetPreprocessors.canny} onChange={handleControlNetPreprocessorChange} /> <label htmlFor="cnCanny">{LANG.enableCannyLabel}</label> </div>
                    </div>
                  </div>
                </div>
                <div className="input-row" style={{alignItems: 'flex-start', gap: '20px'}}>
                  <div className="input-group" style={{flexBasis: 'calc(50% - 10px)'}}>
                    <label htmlFor="cn-ref-image">{LANG.controlNetRefImageLabel}:</label>
                    <input type="file" id="cn-ref-image" accept="image/png, image/jpeg, image/webp" onChange={handleControlNetRefImageChange} className="file-input" onClick={(event) => { event.target.value = null }} />
                    {controlNetRefImage && ( <div style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}> <img src={controlNetRefImage} alt="CN Ref Preview" className="image-preview small-preview" onClick={() => {setModalImageSrc(controlNetRefImage); setIsModalOpen(true);}} style={{cursor: 'zoom-in', maxHeight: '220px', objectFit: 'contain', display: 'block'}} /> <button onClick={handleClearControlNetRefImage} title="Remove reference image" style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(40, 44, 52, 0.8)', color: '#e06c75', border: '1px solid #e06c75', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: '0', zIndex: 10, boxShadow: '0 0 5px rgba(0,0,0,0.5)', }} > &times; </button> {controlNetRefImageDimensions && ( <p style={{fontSize: '0.75em', color: '#888', textAlign: 'center', marginTop: '4px', marginBottom: '0'}}> {controlNetRefImageDimensions.width} x {controlNetRefImageDimensions.height} </p> )} </div> )}
                  </div>
                  <div className="input-group" style={{flexBasis: 'calc(50% - 10px)'}}>
                    <label>{LANG.controlNetProcessedPreviewLabel || "Preprocessor Output"}:</label>
                    <button onClick={handlePreviewPreprocessors} disabled={!controlNetEnabled || !controlNetRefImageBase64 || isGeneratingPreprocessorPreview} className="action-button" style={{marginTop: '10px', width: '100%', marginBottom: '10px'}} > {isGeneratingPreprocessorPreview ? "Previewing..." : "Preview Preprocessor Output"} </button>
                    {preprocessorPreviewError && <p style={{color: 'red', fontSize: '0.9em', textAlign: 'center'}}>{preprocessorPreviewError}</p>}
                    {controlNetProcessedPreviewImage ? ( <img src={controlNetProcessedPreviewImage} alt="CN Preprocessor Output" className="image-preview small-preview" onClick={() => {setModalImageSrc(controlNetProcessedPreviewImage); setIsModalOpen(true);}} style={{cursor: 'zoom-in', marginTop: '0px', maxHeight: '220px', border: '1px solid #61dafb', objectFit: 'contain'}} /> ) : ( <div className="image-preview-placeholder" style={{height: '220px', marginTop:'0px'}}> {isGeneratingPreprocessorPreview ? "Processing..." : "No preprocessor preview"} </div> )}
                  </div>
                </div>
                <div className="input-row"> <div className="input-group slider-group" style={{flexBasis: '100%'}}> <label htmlFor="cn-strength">{LANG.controlNetStrengthLabel}: {parseFloat(controlNetStrength).toFixed(2)}</label> <input type="range" id="cn-strength" min="0.0" max="2.0" step="0.05" value={controlNetStrength} onChange={handleControlNetStrengthChange} /> </div> </div>
                <p style={{fontSize: '0.8em', color: '#888', marginTop: '5px'}}>{LANG.controlNetChainNote}</p>
              </div>
            )}
          </div>

          {/* --- CLIP Vision Section --- */}
           <div className="section clipvision-section">
            <div className="section-header"> <input type="checkbox" id="enableClipVision" checked={clipVisionEnabled} onChange={handleClipVisionEnableChange} /> <label htmlFor="enableClipVision" className="checkbox-label-header">{LANG.clipVisionEnableLabel}</label> </div>
            {clipVisionEnabled && ( <div className="section-content"> <div className="input-row"> <div className="input-group"> <label htmlFor="cv-model">{LANG.clipVisionModelLabel}:</label> <select id="cv-model" value={selectedClipVisionModel} onChange={handleClipVisionModelChange} disabled={clipVisionModelOptions[0]?.label.startsWith("Load")}> {clipVisionModelOptions.map(o => <option key={"cv-mod-" + o.value} value={o.value}>{o.label}</option>)} </select> </div> </div> <div className="input-row"> <div className="input-group"> <label htmlFor="cv-ref-image">{LANG.clipVisionRefImageLabel}:</label> <input type="file" id="cv-ref-image" accept="image/png, image/jpeg, image/webp" onChange={handleClipVisionRefImageChange} className="file-input" /> {clipVisionRefImage && <img src={clipVisionRefImage} alt="CV Ref Preview" className="image-preview small-preview" onClick={() => {setModalImageSrc(clipVisionRefImage); setIsModalOpen(true);}} style={{cursor: 'zoom-in'}}/>} </div> </div> <div className="input-row"> <div className="input-group slider-group"> <label htmlFor="cv-strength">{LANG.clipVisionStrengthLabel}: {parseFloat(clipVisionStrength).toFixed(2)}</label> <input type="range" id="cv-strength" min="0.0" max="2.0" step="0.05" value={clipVisionStrength} onChange={handleClipVisionStrengthChange} /> </div> </div> </div> )}
          </div>

          {/* --- Hires Fix Section --- */}
          <div className="section hires-fix-section">
            <div className="section-header"> <input type="checkbox" id="enableHiresFix" checked={enableHiresFix} onChange={handleEnableHiresFixChange} /> <label htmlFor="enableHiresFix" className="checkbox-label-header">{LANG.api_hf_enable}</label> <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center'}}> <input type="checkbox" id="webuiSaveRedirect" checked={webuiSaveRedirect} onChange={handleWebuiSaveRedirectChange} /> <label htmlFor="webuiSaveRedirect" style={{fontSize:'0.9em', marginLeft:'5px'}}>{LANG.api_webui_savepath_override}</label> </div> </div>
            {enableHiresFix && ( <div className="section-content"> <div className="input-row"> <div className="input-group"><label htmlFor="upscaler">{LANG.api_hf_upscaler}:</label><select id="upscaler" value={selectedUpscaler} onChange={handleUpscalerChange} disabled={upscalerOptions[0]?.label.startsWith('Load')}>{upscalerOptions.map(o => <option key={"upscaler-"+o.value} value={o.value}>{o.label}</option>)}</select></div> <div className="input-group"><label htmlFor="colorTransfer">{LANG.api_hf_colortransfer}:</label><select id="colorTransfer" value={selectedColorTransfer} onChange={handleColorTransferChange}>{colorTransferOptions.map(o => <option key={"ct-"+o.value} value={o.value}>{o.label}</option>)}</select></div> </div> <div className="input-row"> <div className="input-group slider-group"><label htmlFor="upscaleBy">{LANG.api_hf_scale}: {upscaleBy.toFixed(1)}</label><input type="range" id="upscaleBy" min="1.0" max="4.0" step="0.1" value={upscaleBy} onChange={handleUpscaleByChange} /></div> <div className="input-group slider-group"><label htmlFor="denoisingStrengthHires">{LANG.api_hf_denoise}: {denoisingStrengthHires.toFixed(2)}</label><input type="range" id="denoisingStrengthHires" min="0.0" max="1.0" step="0.01" value={denoisingStrengthHires} onChange={handleDenoisingStrengthHiresChange} /></div> </div> <div className="input-row"> <div className="input-group"><label htmlFor="hfSteps">{LANG.hfStepsLabel}:</label><input type="number" id="hfSteps" value={hfSteps} onChange={handleHfStepsChange} min="1" max="150" style={{width: '80px'}}/></div> <div className="input-group slider-group"><label htmlFor="hfCfg">{LANG.hfCfgLabel}: {hfCfg.toFixed(1)}</label><input type="range" id="hfCfg" min="1.0" max="30.0" step="0.5" value={hfCfg} onChange={handleHfCfgChange} /></div> </div> <div className="input-row"> <div className="input-group"><label htmlFor="hfSampler">{LANG.hfSamplerLabel}:</label><select id="hfSampler" value={hfSampler} onChange={handleHfSamplerChange} disabled={samplerOptions[0]?.label.startsWith('Load')}><option value="">Use Main Sampler</option>{samplerOptions.map(o => <option key={"hf-samp-"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div> <div className="input-group"><label htmlFor="hfScheduler">{LANG.hfSchedulerLabel}:</label><select id="hfScheduler" value={hfScheduler} onChange={handleHfSchedulerChange} disabled={schedulerOptions[0]?.label.startsWith('Load')}><option value="">Use Main Scheduler</option>{schedulerOptions.map(o => <option key={"hf-sch-"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div> </div> </div> )}
          </div>

          <div className="action-buttons-container"><button onClick={handleCreatePrompt} className="action-button primary">{LANG.run_button}</button><button onClick={handleBatchRandom} className="action-button">{LANG.run_random_button}</button><button onClick={handleBatchLastPrompt} className="action-button">{LANG.run_same_button}</button></div>
          <div className="prompt-section"><label htmlFor="cp">{LANG.custom_prompt}:</label><textarea id="cp" value={promptText} onChange={handlePromptChange} rows={4} /></div>
             <button onClick={handleAIPromptGenerate} disabled={isGeneratingAIPrompt || selectedAIPromptGenerator === 'none'} className="action-button" style={{ marginTop: '5px', marginBottom: '10px' }}>{isGeneratingAIPrompt ? "Generating..." : "Generate with AI"}</button>
              {aiGenerationError && ( <p style={{ color: 'red', fontSize: '0.9em' }}>Error: {aiGenerationError}</p> )}
          <div className="prompt-section"><label htmlFor="ppt">{LANG.api_prompt}:</label><textarea id="ppt" value={positivePromptTail} onChange={handlePositivePromptTailChange} rows={2} /></div>
          <div className="prompt-section"><label htmlFor="np">{LANG.api_neg_prompt}:</label><textarea id="np" value={negativePromptText} onChange={handleNegativePromptChange} rows={4} /></div>
          <div className="section system-settings-section">
            <div className="section-header"><label className="checkbox-label-header">{LANG.systemSettingsLabel}</label></div>
            <div className="section-content">
              <div className="input-group"><label htmlFor="aiPromptGenerator">{LANG.aiPromptGeneratorLabel}:</label><select id="aiPromptGenerator" value={selectedAIPromptGenerator} onChange={handleAIPromptGeneratorChange}>{aiPromptGeneratorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              {selectedAIPromptGenerator === 'Remote' && ( <> <div className="input-group"><label htmlFor="remoteAIURL">{LANG.remoteAIURLLabel}:</label><input type="text" id="remoteAIURL" value={remoteAIURL} onChange={handleRemoteAIURLChange} /></div> <div className="input-group"><label htmlFor="remoteAIModel">{LANG.remoteAIModelLabel}:</label><input type="text" id="remoteAIModel" value={remoteAIModel} onChange={handleRemoteAIModelChange} /></div> <div className="input-group slider-group-horizontal"><label htmlFor="remoteAITimeout">{LANG.remoteAITimeoutLabel}: {remoteAITimeout}</label><div className="slider-with-number"><input type="range" id="remoteAITimeout" min="5" max="300" step="5" value={remoteAITimeout} onChange={handleRemoteAITimeoutChange} /><input type="number" value={remoteAITimeout} onChange={handleRemoteAITimeoutChange} min="5" max="300" className="slider-number-input"/></div></div> </> )}
              {selectedAIPromptGenerator === 'Local' && ( <> <div className="input-group"><label htmlFor="localLlamaServer">{LANG.localLlamaServerLabel}:</label><input type="text" id="localLlamaServer" value={localLlamaServer} onChange={handleLocalLlamaServerChange} /></div> <div className="input-group slider-group-horizontal"><label htmlFor="localAITemp">{LANG.localAITempLabel}: {localAITemp.toFixed(1)}</label><div className="slider-with-number"><input type="range" id="localAITemp" min="0.1" max="1.0" step="0.1" value={localAITemp} onChange={handleLocalAITempChange} /><input type="number" value={localAITemp} onChange={handleLocalAITempChange} min="0.1" max="1.0" step="0.1" className="slider-number-input"/></div></div> <div className="input-group slider-group-horizontal"><label htmlFor="localAINPredict">{LANG.localAINPredictLabel}: {localAINPredict}</label><div className="slider-with-number"><input type="range" id="localAINPredict" min="128" max="4096" step="128" value={localAINPredict} onChange={handleLocalAINPredictChange} /><input type="number" value={localAINPredict} onChange={handleLocalAINPredictChange} min="128" max="4096" step="128" className="slider-number-input"/></div></div> </> )}
              <div className="input-group"><label htmlFor="batchGenerateRule">{LANG.batch_generate_rule}:</label><select id="batchGenerateRule" value={batchGenerateRule} onChange={handleBatchGenerateRuleChange}>{batchGenerateRuleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="input-group"><label htmlFor="apiImageData">{LANG.api_image_data}:</label><input type="text" id="apiImageData" value={apiImageData} onChange={handleApiImageDataChange} /></div>
              <div className="input-group"><div className="checkbox-group" style={{ marginTop: '10px' }}><input type="checkbox" id="apiImageLandscape" checked={apiImageLandscape} onChange={handleApiImageLandscapeChange} /><label htmlFor="apiImageLandscape">{LANG.api_image_landscape}</label></div></div>
              <div className="input-group"><label htmlFor="aiPromptInput">{LANG.ai_prompt_input_label}:</label><textarea id="aiPromptInput" value={aiPromptInput} onChange={handleAiPromptInputChange} rows={3} /></div>
                   <div className="input-group"> <button onClick={handleAIPromptGenerate} disabled={isGeneratingAIPrompt || selectedAIPromptGenerator === 'none'} className="action-button" style={{ marginTop: '10px', width: '100%' }}>{isGeneratingAIPrompt ? "Generating AI Prompt..." : "Generate AI Prompt (updates Custom Prompt)"}</button> {aiGenerationError && ( <p style={{ color: 'red', marginTop: '5px', fontSize: '0.9em' }}>Error: {aiGenerationError}</p> )} </div>
              <div className="input-group"><label htmlFor="promptBan">{LANG.prompt_ban}:</label><textarea id="promptBan" value={promptBan} onChange={handlePromptBanChange} rows={2} /></div>
              <hr className="settings-separator" />
              <div className="input-group"><label htmlFor="imageGeneratorAPI">{LANG.localImageGeneratorAPILabel}:</label><select id="imageGeneratorAPI" value={selectedImageGeneratorAPI} onChange={handleImageGeneratorAPIChange}>{imageGeneratorAPIOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="input-group"><label htmlFor="localImageGeneratorAddress">{LANG.localImageGeneratorAddressLabel}:</label><input type="text" id="localImageGeneratorAddress" value={localImageGeneratorAddress} onChange={handleLocalImageGeneratorAddressChange} /></div>
              <div className="action-buttons-container system-settings-buttons"><button onClick={handleSaveSettings} className="action-button">{LANG.saveSettingsButton}</button><button onClick={handleLoadSettings} className="action-button">{LANG.loadSettingsButton}</button></div>
            </div>
          </div>

        </div> {/* End of control-panel */}

        <div className="output-panel">
          <div className="output-gallery-wrapper">
            {isGenerating && ( <div className="output-gallery-placeholder loading-state"> {currentPreviewImage && ( <img src={currentPreviewImage} alt="Generating preview" className="generating-preview-image" /> )} <div className="progress-bar-container" style={currentPreviewImage ? { position: 'absolute', bottom: '10px', left: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.5)' } : {}}> <div className="progress-bar" style={{ width: `${generationProgress}%` }}></div> <div className="progress-bar-label" style={currentPreviewImage ? { color: '#fff'} : {}}> {generationProgress < 100 ? `Step ${Math.max(1, Math.round((generationProgress / 100) * currentSteps))} / ${currentSteps} (${generationProgress}%)` : "Finalizing…"} </div> </div> </div> )}
            {!isGenerating && generatedImage && ( <div className="output-gallery-container"> <img src={generatedImage} alt="Generated result" className="generated-image-display" style={{ cursor: "zoom-in" }} onClick={() => { setModalImageSrc(generatedImage); setIsModalOpen(true); }} /> <button onClick={() => downloadImage(generatedImage, `comfy_gen_${Date.now()}.png`)} className="action-button download-button" style={{ marginTop: '10px', width: '100%' }}>Download Image (PNG)</button> </div> )}
            {!isGenerating && !generatedImage && !generationError && ( <div className="output-gallery-placeholder"><span className="gallery-icon">🖼️</span>{LANG.outputGalleryPlaceholder}</div> )}
            {generationError && !isGenerating && ( <div className="output-gallery-placeholder error-state"><span className="gallery-icon">⚠️</span>Error: {generationError}</div> )}
          </div>
          <div className="output-info-section"><label htmlFor="finalPromptDisplay">{LANG.output_prompt}:</label><textarea id="finalPromptDisplay" value={finalPromptDisplay} readOnly rows={6} /></div>
          <div className="output-info-section"><label htmlFor="informationDisplay">{LANG.output_info}:</label><textarea id="informationDisplay" value={informationDisplay} readOnly rows={4} /></div>
          <div className="output-info-section"><label htmlFor="aiSystemPromptEditable">{LANG.ai_system_prompt_text}:</label><textarea id="aiSystemPromptEditable" value={aiSystemPrompt} onChange={handleAiSystemPromptChange} rows={8}/></div>
        </div>

      </div> {/* End of main-layout */}
      {isModalOpen && (<ImageModal src={modalImageSrc} onClose={() => setIsModalOpen(false)} />)}
    </div> // End of app-container
  );
}
export default App;
