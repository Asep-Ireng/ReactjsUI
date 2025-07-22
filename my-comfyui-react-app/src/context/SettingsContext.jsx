import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import {
  saveSettingsToFile,
  loadSettingsFromFile,
} from "../settingsmanager";
import { useDataContext } from "./DataContext"; // We need this to save the full options lists
import { LANG } from "../utils/constants";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { samplerOptions, schedulerOptions, upscalerOptions } = useDataContext();

  // This state holds the object loaded from settings.json
  const [appSettings, setAppSettings] = useState(null);

  // --- All state related to user-configurable settings lives here ---
  const [selectedAIPromptGenerator, setSelectedAIPromptGenerator] =
    useState("none");
  const [remoteAIURL, setRemoteAIURL] = useState(
    "https://api.llama-api.com/chat/completions"
  );
  const [remoteAIModel, setRemoteAIModel] = useState("llama3.3-70b");
  const [remoteAIApiKey, setRemoteAIApiKey] = useState("");
  const [remoteAITimeout, setRemoteAITimeout] = useState(60);
  const [localLlamaServer, setLocalLlamaServer] = useState(
    "http://127.0.0.1:8080/chat/completions"
  );
  const [localAITemp, setLocalAITemp] = useState(0.7);
  const [localAINPredict, setLocalAINPredict] = useState(768);
  const [selectedImageGeneratorAPI, setSelectedImageGeneratorAPI] =
    useState("ComfyUI");
  const [localImageGeneratorAddress, setLocalImageGeneratorAddress] =
    useState("127.0.0.1:8188");
  const [batchGenerateRule, setBatchGenerateRule] = useState("Once");
  const [cfg, setCfg] = useState(7.0);
  const [steps, setSteps] = useState(20);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(768);
  const [loops, setLoops] = useState(1);
  const [clipskip, setClipSkip] = useState(-2);
  const [apiImageLandscape, setApiImageLandscape] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [promptBan, setPromptBan] = useState(
    "lowres, bad anatomy, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"
  );
  const [aiSystemPrompt, setAiSystemPrompt] = useState(
    LANG.ai_system_prompt_content
  );

  // Effect to load initial settings from the file
  useEffect(() => {
    // We use the callback version of loadSettingsFromFile
    loadSettingsFromFile((loadedSettings) => {
      if (loadedSettings) {
        setAppSettings(loadedSettings);
      }
    });
  }, []);

  // Effect to populate the UI state whenever settings are loaded from the file
  useEffect(() => {
    if (!appSettings) return;

    setSelectedAIPromptGenerator(appSettings.ai_interface || "none");
    setRemoteAIURL(
      appSettings.remote_ai_base_url ||
        "https://api.llama-api.com/chat/completions"
    );
    setRemoteAIModel(appSettings.remote_ai_model || "llama3.3-70b");
    setRemoteAIApiKey(appSettings.remote_ai_api_key || "");
    setRemoteAITimeout(appSettings.remote_ai_timeout || 60);
    setLocalLlamaServer(
      appSettings.ai_local_addr || "http://127.0.0.1:8080/chat/completions"
    );
    setLocalAITemp(appSettings.ai_local_temp || 0.7);
    setLocalAINPredict(appSettings.ai_local_n_predict || 768);
    setSelectedImageGeneratorAPI(appSettings.api_interface || "ComfyUI");
    setLocalImageGeneratorAddress(appSettings.api_addr || "127.0.0.1:8188");
    setBatchGenerateRule(appSettings.batch_generate_rule || "Once");
    setCfg(appSettings.cfg || 7.0);
    setSteps(appSettings.steps || 20);
    setWidth(appSettings.width || 512);
    setHeight(appSettings.height || 768);
    setLoops(appSettings.loops || 1);
    setClipSkip(appSettings.clipskip || -2);
    setApiImageLandscape(appSettings.api_image_landscape || false);
    setAiPromptInput(appSettings.ai_prompt || "");
    setPromptBan(
      appSettings.prompt_ban ||
        "lowres, bad anatomy, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"
    );
    setAiSystemPrompt(
      appSettings.ai_system_prompt_text_value || LANG.ai_system_prompt_content
    );
  }, [appSettings]);

  // --- Handlers for saving and loading ---
  const handleSaveSettings = useCallback(
    (generationState) => {
      // This function now needs the generation state passed to it
      // because settings and generation state are separate.
      const currentSettingsToSave = {
        // Settings from this context
        ai_interface: selectedAIPromptGenerator,
        remote_ai_base_url: remoteAIURL,
        remote_ai_model: remoteAIModel,
        remote_ai_api_key: remoteAIApiKey,
        remote_ai_timeout: remoteAITimeout,
        ai_local_addr: localLlamaServer,
        ai_local_temp: localAITemp,
        ai_local_n_predict: localAINPredict,
        api_interface: selectedImageGeneratorAPI,
        api_addr: localImageGeneratorAddress,
        batch_generate_rule: batchGenerateRule,
        cfg: cfg,
        steps: steps,
        width: width,
        height: height,
        loops: loops,
        clipskip: clipskip,
        api_image_landscape: apiImageLandscape,
        ai_prompt: aiPromptInput,
        prompt_ban: promptBan,
        ai_system_prompt_text_value: aiSystemPrompt,

        // State from GenerationContext
        ...generationState,

        // Dropdown options from DataContext
        api_sampling_list: samplerOptions
          .filter((opt) => opt.value && !opt.label.startsWith("Load"))
          .map((opt) => ({ name: opt.value, description: opt.description || "" })),
        api_scheduler_list: schedulerOptions
          .filter((opt) => opt.value && !opt.label.startsWith("Load"))
          .map((opt) => ({ name: opt.value, description: opt.description || "" })),
        api_hf_upscaler_list: upscalerOptions
          .filter((opt) => opt.value && !opt.label.startsWith("Load"))
          .map((opt) => opt.value),
      };
      saveSettingsToFile(currentSettingsToSave);
      alert("Settings saved to file!");
    },
    [
      // List all dependencies
      selectedAIPromptGenerator,
      remoteAIURL,
      remoteAIModel,
      remoteAIApiKey,
      remoteAITimeout,
      localLlamaServer,
      localAITemp,
      localAINPredict,
      selectedImageGeneratorAPI,
      localImageGeneratorAddress,
      batchGenerateRule,
      cfg,
      steps,
      width,
      height,
      loops,
      clipskip,
      apiImageLandscape,
      aiPromptInput,
      promptBan,
      aiSystemPrompt,
      samplerOptions,
      schedulerOptions,
      upscalerOptions,
    ]
  );

  const handleLoadSettings = useCallback(() => {
    loadSettingsFromFile((loadedSettings) => {
      if (loadedSettings) {
        setAppSettings(loadedSettings);
        alert("Settings loaded successfully!");
      }
    });
  }, []);

  const value = {
    // Pass down the raw settings object for other contexts to use
    appSettings,
    // State
    selectedAIPromptGenerator,
    remoteAIURL,
    remoteAIModel,
    remoteAIApiKey,
    remoteAITimeout,
    localLlamaServer,
    localAITemp,
    localAINPredict,
    selectedImageGeneratorAPI,
    localImageGeneratorAddress,
    batchGenerateRule,
    cfg,
    steps,
    width,
    height,
    loops,
    clipskip,
    apiImageLandscape,
    aiPromptInput,
    promptBan,
    aiSystemPrompt,
    // Setters
    setSelectedAIPromptGenerator,
    setRemoteAIURL,
    setRemoteAIModel,
    setRemoteAIApiKey,
    setRemoteAITimeout,
    setLocalLlamaServer,
    setLocalAITemp,
    setLocalAINPredict,
    setSelectedImageGeneratorAPI,
    setLocalImageGeneratorAddress,
    setBatchGenerateRule,
    setCfg,
    setSteps,
    setWidth,
    setHeight,
    setLoops,
    setClipSkip,
    setApiImageLandscape,
    setAiPromptInput,
    setPromptBan,
    setAiSystemPrompt,
    // Handlers
    handleSaveSettings,
    handleLoadSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettingsContext must be used within a SettingsProvider");
  }
  return context;
};