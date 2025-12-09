import React, { createContext, useState, useEffect, useContext } from "react";
import md5 from "md5";
import { useDataContext } from "./DataContext.jsx";
import { useSettingsContext } from "./SettingsContext.jsx";
import { generatePromptFromAI } from "../services/aiPromptService";
import { LANG, DEFAULT_THUMB_SRC } from "../utils/constants";

const GenerationContext = createContext();

export const GenerationProvider = ({ children }) => {
  // --- Consume other contexts for necessary data ---
  const {
    mergedThumbData,
    actualCharacterOptionsForRandom,
    getCharacterDisplayData,
    loraDropdownOptions,
    modelDropdownOptions,
    samplerOptions,
    schedulerOptions,
  } = useDataContext();

  const {
    appSettings,
    aiSystemPrompt,
    selectedAIPromptGenerator,
    remoteAIURL,
    remoteAIModel,
    remoteAIApiKey,
    remoteAITimeout,
    localLlamaServer,
    localAITemp,
    localAINPredict,
    promptBan,
    aiPromptInput,
    localImageGeneratorAddress,
    cfg,
    steps,
    width,
    height,
    denoise,
    loops,
    clipskip,
    apiImageLandscape,
  } = useSettingsContext();

  // --- State for the active generation ---
  const [promptText, setPromptText] = useState("");
  const [positivePromptTail, setPositivePromptTail] = useState(
    "masterpiece, best quality"
  );
  const [negativePromptText, setNegativePromptText] = useState(
    "worst quality, bad quality, lowres, bad anatomy, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry"
  );
  const [selectedCharacter1, setSelectedCharacter1] = useState("");
  const [selectedCharacter2, setSelectedCharacter2] = useState("");
  const [selectedCharacter3, setSelectedCharacter3] = useState("");
  const [resolvedCharacter1Tags, setResolvedCharacter1Tags] = useState("");
  const [resolvedCharacter2Tags, setResolvedCharacter2Tags] = useState("");
  const [resolvedCharacter3Tags, setResolvedCharacter3Tags] = useState("");
  const [character1ThumbSrc, setCharacter1ThumbSrc] =
    useState(DEFAULT_THUMB_SRC);
  const [character2ThumbSrc, setCharacter2ThumbSrc] =
    useState(DEFAULT_THUMB_SRC);
  const [character3ThumbSrc, setCharacter3ThumbSrc] =
    useState(DEFAULT_THUMB_SRC);
  const [enableAction, setEnableAction] = useState(false);
  const [selectedAction, setSelectedAction] = useState("none");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedModelPreviewThumb, setSelectedModelPreviewThumb] =
    useState(DEFAULT_THUMB_SRC);
  const [seed, setSeed] = useState("-1");
  const [selectedSampler, setSelectedSampler] = useState("");
  const [samplerDescription, setSamplerDescription] = useState("");
  const [selectedScheduler, setSelectedScheduler] = useState("");
  const [schedulerDescription, setSchedulerDescription] = useState("");
  const [hoveredCharacterPreviewSrc, setHoveredCharacterPreviewSrc] =
    useState(null);
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

  // LoRA State
  const [selectedLoras, setSelectedLoras] = useState([]);

  // ControlNet State
  const [controlNetEnabled, setControlNetEnabled] = useState(false);
  const [selectedControlNetModel, setSelectedControlNetModel] = useState("");
  const [controlNetRefImage, setControlNetRefImage] = useState(null);
  const [controlNetRefImageBase64, setControlNetRefImageBase64] =
    useState(null);
  const [controlNetStrength, setControlNetStrength] = useState(1.0);
  const [controlNetPreprocessors, setControlNetPreprocessors] = useState({
    anyLine: true,
    depth: true,
    openPose: true,
    canny: true,
  });
  const [selectedAnyLineStyle, setSelectedAnyLineStyle] =
    useState("lineart_realistic");
  const [cnGlobalPreprocessorResolution, setCnGlobalPreprocessorResolution] =
    useState(1024);
  const [controlNetProcessedPreviewImage, setControlNetProcessedPreviewImage] =
    useState(null);
  const [isGeneratingPreprocessorPreview, setIsGeneratingPreprocessorPreview] =
    useState(false);
  const [preprocessorPreviewError, setPreprocessorPreviewError] =
    useState(null);
  const [controlNetRefImageDimensions, setControlNetRefImageDimensions] =
    useState(null);

  // CLIP Vision State
  const [clipVisionEnabled, setClipVisionEnabled] = useState(false);
  const [selectedClipVisionModel, setSelectedClipVisionModel] = useState("");
  const [clipVisionRefImage, setClipVisionRefImage] = useState(null);
  const [clipVisionRefImageBase64, setClipVisionRefImageBase64] =
    useState(null);
  const [clipVisionStrength, setClipVisionStrength] = useState(1.0);

  // Hires Fix State
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

  // Model Merge State
  const [modelMergeEnabled, setModelMergeEnabled] = useState(false);
  const [modelMergeModel2, setModelMergeModel2] = useState("");
  const [modelMergeRatio, setModelMergeRatio] = useState(0.5);

  // Sampling Discrete State
  const [samplingDiscreteEnabled, setSamplingDiscreteEnabled] = useState(false);
  const [samplingType, setSamplingType] = useState("eps");
  const [zsnrEnabled, setZsnrEnabled] = useState(false);

  // Effect to populate generation UI from loaded settings
  useEffect(() => {
    if (!appSettings) return;
    console.log("appSettings", appSettings);
    setPromptText(appSettings.custom_prompt || "");
    setPositivePromptTail(
      appSettings.api_prompt || "masterpiece, best quality, amazing quality"
    );
    setNegativePromptText(
      appSettings.api_neg_prompt || "bad quality,worst quality, blurry"
    );
    setSelectedCharacter1(appSettings.character1 || "none");
    setSelectedCharacter2(appSettings.character2 || "none");
    setSelectedCharacter3(appSettings.character3 || "none");
    setSelectedAction(appSettings.action || "none");
    setEnableAction(
      (appSettings.action && appSettings.action !== "none") || false
    );
    setSeed(
      String(appSettings.random_seed === undefined ? "-1" : appSettings.random_seed)
    );
    setSelectedSampler(appSettings.api_sampling_selected || "euler");
    setSelectedScheduler(appSettings.api_scheduler_selected || "normal");
    setEnableHiresFix(appSettings.api_hf_enable || false);
    setWebuiSaveRedirect(appSettings.api_webui_savepath_override || false);
    setUpscaleBy(appSettings.api_hf_scale || 1.5);
    setDenoisingStrengthHires(appSettings.api_hf_denoise || 0.4);
    setSelectedUpscaler(appSettings.api_hf_upscaler_selected || "None");
    setSelectedColorTransfer(appSettings.api_hf_colortransfer || "none");

    if (
      appSettings.api_model_file_select &&
      modelDropdownOptions.some((o) => o.value === appSettings.api_model_file_select)
    ) {
      setSelectedModel(appSettings.api_model_file_select);
    } else if (modelDropdownOptions.length > 0 && modelDropdownOptions[0].value) {
      setSelectedModel(
        modelDropdownOptions.find((o) => o.value === "default")?.value ||
        modelDropdownOptions[0].value
      );
    }

    setSelectedLoras(appSettings.selectedLoras || []);
    setControlNetEnabled(appSettings.controlNetEnabled || false);
    setSelectedControlNetModel(appSettings.selectedControlNetModel || "");
    setControlNetStrength(appSettings.controlNetStrength || 1.0);
    setControlNetPreprocessors(
      appSettings.controlNetPreprocessors || {
        anyLine: true,
        depth: true,
        openPose: true,
        canny: true,
      }
    );
    setSelectedAnyLineStyle(
      appSettings.selectedAnyLineStyle || "lineart_realistic"
    );
    setCnGlobalPreprocessorResolution(
      appSettings.cnGlobalPreprocessorResolution || 1024
    );
    setClipVisionEnabled(appSettings.clipVisionEnabled || false);
    setSelectedClipVisionModel(appSettings.selectedClipVisionModel || "");
    setClipVisionStrength(appSettings.clipVisionStrength || 1.0);
    setHfSteps(appSettings.hfSteps || 15);
    setHfCfg(appSettings.hfCfg || 7.0);
    setHfSampler(appSettings.hfSampler || "");
    setHfScheduler(appSettings.hfScheduler || "");
  }, [appSettings, modelDropdownOptions]);

  // Effects for character thumbnail logic
  useEffect(() => {
    if (mergedThumbData && actualCharacterOptionsForRandom) {
      const { resolvedTags, thumbSrc } = getCharacterDisplayData(
        selectedCharacter1,
        actualCharacterOptionsForRandom,
        mergedThumbData
      );
      setResolvedCharacter1Tags(resolvedTags);
      setCharacter1ThumbSrc(thumbSrc);
    }
  }, [selectedCharacter1, actualCharacterOptionsForRandom, mergedThumbData, getCharacterDisplayData]);

  useEffect(() => {
    if (mergedThumbData && actualCharacterOptionsForRandom) {
      const { resolvedTags, thumbSrc } = getCharacterDisplayData(
        selectedCharacter2,
        actualCharacterOptionsForRandom,
        mergedThumbData
      );
      if (selectedCharacter2 === "random" || resolvedCharacter2Tags !== resolvedTags) {
        setResolvedCharacter2Tags(resolvedTags);
      }
      setCharacter2ThumbSrc(thumbSrc);
    }
  }, [selectedCharacter2, actualCharacterOptionsForRandom, mergedThumbData, resolvedCharacter2Tags, getCharacterDisplayData]);

  useEffect(() => {
    if (mergedThumbData && actualCharacterOptionsForRandom) {
      const { resolvedTags, thumbSrc } = getCharacterDisplayData(
        selectedCharacter3,
        actualCharacterOptionsForRandom,
        mergedThumbData
      );
      if (selectedCharacter3 === "random" || resolvedCharacter3Tags !== resolvedTags) {
        setResolvedCharacter3Tags(resolvedTags);
      }
      setCharacter3ThumbSrc(thumbSrc);
    }
  }, [selectedCharacter3, actualCharacterOptionsForRandom, mergedThumbData, resolvedCharacter3Tags, getCharacterDisplayData]);

  // Effect for selected model's preview thumbnail
  useEffect(() => {
    if (selectedModel && modelDropdownOptions.length > 0) {
      const currentModelOption = modelDropdownOptions.find(
        (opt) => opt.value === selectedModel
      );
      setSelectedModelPreviewThumb(
        currentModelOption?.thumbnail || DEFAULT_THUMB_SRC
      );
    } else {
      setSelectedModelPreviewThumb(DEFAULT_THUMB_SRC);
    }
  }, [selectedModel, modelDropdownOptions]);

  // Effects for sampler and scheduler descriptions
  useEffect(() => {
    if (
      selectedSampler &&
      samplerOptions.length > 0 &&
      !samplerOptions[0].label.startsWith("Load")
    ) {
      const sO = samplerOptions.find((opt) => opt.value === selectedSampler);
      setSamplerDescription(sO ? sO.description : "");
    }
  }, [selectedSampler, samplerOptions]);

  useEffect(() => {
    if (
      selectedScheduler &&
      schedulerOptions.length > 0 &&
      !schedulerOptions[0].label.startsWith("Load")
    ) {
      const sO = schedulerOptions.find((opt) => opt.value === selectedScheduler);
      setSchedulerDescription(sO ? sO.description : "");
    }
  }, [selectedScheduler, schedulerOptions]);

  // --- Handlers ---
  const handleFileChange = (
    event,
    setPreviewCallback,
    setBase64Callback,
    setDimensionsCallback
  ) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      const img = new Image();
      img.onload = () => {
        if (setDimensionsCallback) {
          setDimensionsCallback({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      };
      reader.onloadend = () => {
        if (setPreviewCallback) {
          const blobUrl = URL.createObjectURL(file);
          setPreviewCallback(blobUrl);
          img.src = blobUrl;
        }
        if (setBase64Callback) {
          setBase64Callback(reader.result);
        }
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
    if (
      loraDropdownOptions.length === 0 ||
      (loraDropdownOptions.length === 1 && loraDropdownOptions[0].value === "")
    ) {
      alert(LANG.noLorasAvailable || "No LoRAs available to add.");
      return;
    }
    let firstActualLoraOption = loraDropdownOptions.find(
      (opt) => opt.value && opt.value !== "none"
    );
    if (!firstActualLoraOption) {
      alert(LANG.noLorasAvailable || "No selectable LoRAs available.");
      return;
    }
    setSelectedLoras([
      ...selectedLoras,
      {
        id: md5(Date.now().toString() + Math.random().toString()),
        name: firstActualLoraOption.value,
        strength: 0.7,
        thumbnail: firstActualLoraOption.thumbnail || DEFAULT_THUMB_SRC,
        compatible_base_model:
          firstActualLoraOption.compatible_base_model || "Unknown",
      },
    ]);
  };

  const handleRemoveLora = (idToRemove) =>
    setSelectedLoras(selectedLoras.filter((lora) => lora.id !== idToRemove));

  const handleLoraChange = (id, field, value) => {
    setSelectedLoras(
      selectedLoras.map((lora) => {
        if (lora.id === id) {
          if (field === "name") {
            const newLoraOption = loraDropdownOptions.find(
              (opt) => opt.value === value
            );
            return {
              ...lora,
              name: value,
              thumbnail: newLoraOption
                ? newLoraOption.thumbnail
                : DEFAULT_THUMB_SRC,
              compatible_base_model: newLoraOption
                ? newLoraOption.compatible_base_model
                : "Unknown",
            };
          }
          return { ...lora, [field]: value };
        }
        return lora;
      })
    );
  };

  const handleClearControlNetRefImage = () => {
    setControlNetRefImage(null);
    setControlNetRefImageBase64(null);
    setControlNetRefImageDimensions(null);
    setControlNetProcessedPreviewImage(null);
  };

  const handleControlNetRefImageChange = (e) => {
    handleFileChange(
      e,
      setControlNetRefImage,
      setControlNetRefImageBase64,
      setControlNetRefImageDimensions
    );
  };

  const handleClipVisionRefImageChange = (e) =>
    handleFileChange(e, setClipVisionRefImage, setClipVisionRefImageBase64);

  const handlePreviewPreprocessors = async () => {
    if (!controlNetEnabled || !controlNetRefImageBase64) {
      alert("Please enable ControlNet and select a reference image first.");
      return;
    }
    setIsGeneratingPreprocessorPreview(true);
    setPreprocessorPreviewError(null);
    setControlNetProcessedPreviewImage(null);
    const payload = {
      server_address: localImageGeneratorAddress,
      controlnet_ref_image_base64: controlNetRefImageBase64,
      controlnet_preprocessors: controlNetPreprocessors,
      selected_anyline_style: controlNetPreprocessors.anyLine
        ? selectedAnyLineStyle
        : undefined,
      cn_global_preprocessor_resolution: cnGlobalPreprocessorResolution,
    };
    try {
      const response = await fetch(
        "http://localhost:8000/api/preview-controlnet-preprocessor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error during preview." }));
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }
      const result = await response.json();
      if (result.image) {
        setControlNetProcessedPreviewImage(result.image);
      } else if (result.error) {
        setPreprocessorPreviewError(result.error);
      }
    } catch (err) {
      setPreprocessorPreviewError(err.message || "Failed to fetch preview.");
    } finally {
      setIsGeneratingPreprocessorPreview(false);
    }
  };

  const handleCreatePrompt = async () => {
    const fC1 =
      selectedCharacter1 === "random"
        ? resolvedCharacter1Tags
        : selectedCharacter1;
    const fC2 =
      selectedCharacter2 === "random"
        ? resolvedCharacter2Tags
        : selectedCharacter2;
    const fC3 =
      selectedCharacter3 === "random"
        ? resolvedCharacter3Tags
        : selectedCharacter3;
    const actionTag =
      enableAction && selectedAction !== "none" ? selectedAction : "";
    const promptParts = [
      promptText,
      fC1 !== "none" ? fC1 : null,
      fC2 !== "none" ? fC2 : null,
      fC3 !== "none" ? fC3 : null,
      actionTag ? actionTag : null,
      positivePromptTail,
    ].filter(Boolean);
    const finalCombinedPrompt = promptParts.join(", ");
    setFinalPromptDisplay(finalCombinedPrompt);

    const processModelPath = (modelVal) => {
      if (!modelVal || modelVal.toLowerCase() === "default") return "default";
      let model_name_for_payload = modelVal;
      let normalizedModel = modelVal.replace(/\\/g, "/");
      if (normalizedModel) {
        if (!normalizedModel.toLowerCase().startsWith("thumb/")) {
          model_name_for_payload = `thumb\\${normalizedModel.replace(/\//g, "\\")}`;
        } else {
          model_name_for_payload = normalizedModel.replace(/\//g, "\\");
        }
      }
      return model_name_for_payload;
    };

    const model_name_for_payload = processModelPath(selectedModel);
    const model2_name_for_payload = processModelPath(modelMergeModel2);

    setInformationDisplay(
      `Model: ${model_name_for_payload}\nSeed: ${seed}\nClipSkip: ${clipskip}\nSampler: ${selectedSampler} / Scheduler: ${selectedScheduler}\nDimensions: ${width}x${height}\nSteps: ${steps}, CFG: ${cfg}\nHi-res Fix: ${enableHiresFix
        ? `Enabled (Upscaler: ${selectedUpscaler}, Up By: ${upscaleBy.toFixed(1)}, Denoise: ${denoisingStrengthHires.toFixed(5)}, Steps: ${hfSteps}, CFG: ${hfCfg})`
        : "Disabled"
      } \nControlNet: ${controlNetEnabled
        ? `Enabled (Model: ${selectedControlNetModel}, Strength: ${controlNetStrength.toFixed(5)})`
        : "Disabled"
          ? `Enabled (Model: ${selectedClipVisionModel}, Strength: ${clipVisionStrength.toFixed(2)})`
          : "Disabled"
      } \nModel Merge: ${modelMergeEnabled
        ? `Enabled (Model 2: ${model2_name_for_payload}, Ratio: ${modelMergeRatio.toFixed(2)})`
        : "Disabled"
      } \nSampling Discrete: ${samplingDiscreteEnabled
        ? `Enabled (Type: ${samplingType}, ZSNR: ${zsnrEnabled})`
        : "Disabled"
      }`
    );
    setIsGenerating(true);
    setGeneratedImage(null);
    setCurrentPreviewImage(null);
    setGenerationError(null);
    setGenerationProgress(0);
    setCurrentSteps(steps + (enableHiresFix ? hfSteps : 0));
    setControlNetProcessedPreviewImage(null);

    const payload = {
      server_address: localImageGeneratorAddress,
      model_name: model_name_for_payload,
      positive_prompt: finalCombinedPrompt,
      negative_prompt: negativePromptText,
      random_seed: seed === "-1" || seed === "" ? -1 : parseInt(seed, 10),
      steps: steps,
      cfg: cfg,
      width: width,
      height: height,
      denoise: denoise,
      loops: loops,
      clipskip: clipskip,
      api_image_landscape: apiImageLandscape,
      sampler_name: selectedSampler,
      scheduler: selectedScheduler,
      loras_enabled: selectedLoras.length > 0,
      loras_config: selectedLoras.map((lora) => ({ name: lora.name, strength: parseFloat(lora.strength) })),
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
      model_merge_enabled: modelMergeEnabled,
      model2_name: modelMergeEnabled ? model2_name_for_payload : null,
      model_merge_ratio: modelMergeEnabled ? parseFloat(modelMergeRatio) : 0.5,
      sampling_discrete_enabled: samplingDiscreteEnabled,
      sampling_type: samplingDiscreteEnabled ? samplingType : "eps",
      zsnr_enabled: samplingDiscreteEnabled ? zsnrEnabled : false,
    };
    console.log("payload →", payload);

    try {
      const ws = new window.WebSocket("ws://localhost:8000/api/generate-ws");
      ws.onopen = () => ws.send(JSON.stringify(payload));
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "progress") setGenerationProgress(msg.progress);
        else if (msg.type === "preview_image") setCurrentPreviewImage(msg.image);
        else if (msg.type === "controlnet_preprocessor_preview") setControlNetProcessedPreviewImage(msg.image);
        else if (msg.type === "result") {
          setGeneratedImage(msg.image);
          setIsGenerating(false);
          setGenerationProgress(100);
          ws.close();
        } else if (msg.type === "error") {
          setGenerationError(msg.message);
          setIsGenerating(false);
          ws.close();
        }
      };
      ws.onerror = () => {
        setGenerationError("WebSocket connection error.");
        setIsGenerating(false);
      };
      ws.onclose = () => setIsGenerating(false);
    } catch (err) {
      setGenerationError(err.message || "Unknown WebSocket error");
      setIsGenerating(false);
    }
  };

  const handleAIPromptGenerate = async () => {
    if (selectedAIPromptGenerator === "none") {
      alert("Please select an AI Prompt Generator in System Settings.");
      return;
    }
    if (!aiPromptInput.trim()) {
      alert("Please enter some text into the 'AI Prompt (for generator input)' field.");
      return;
    }
    setIsGeneratingAIPrompt(true);
    setAiGenerationError(null);
    const paramsForAI = {
      systemPrompt: aiSystemPrompt,
      userInput: aiPromptInput,
      generatorType: selectedAIPromptGenerator,
      remoteConfig: { url: remoteAIURL, model: remoteAIModel, apiKey: remoteAIApiKey, timeoutSeconds: remoteAITimeout },
      localConfig: { url: localLlamaServer, temp: localAITemp, nPredict: localAINPredict, timeoutSeconds: remoteAITimeout },
    };
    try {
      const generatedPrompt = await generatePromptFromAI(paramsForAI);
      let finalGeneratedPrompt = generatedPrompt;
      if (promptBan) {
        const bannedTags = promptBan.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
        const currentTags = generatedPrompt.split(",").map((tag) => tag.trim());
        finalGeneratedPrompt = currentTags.filter((tag) => !bannedTags.includes(tag.toLowerCase())).join(", ");
      }
      setPromptText(finalGeneratedPrompt);
    } catch (error) {
      setAiGenerationError(error.message || "Failed to generate AI prompt.");
    } finally {
      setIsGeneratingAIPrompt(false);
    }
  };

  const value = {
    // State
    promptText, positivePromptTail, negativePromptText,
    selectedCharacter1, selectedCharacter2, selectedCharacter3,
    resolvedCharacter1Tags, resolvedCharacter2Tags, resolvedCharacter3Tags,
    character1ThumbSrc, character2ThumbSrc, character3ThumbSrc,
    enableAction, selectedAction, selectedModel, selectedModelPreviewThumb,
    seed, selectedSampler, samplerDescription, selectedScheduler, schedulerDescription,
    hoveredCharacterPreviewSrc, isModalOpen, modalImageSrc,
    finalPromptDisplay, informationDisplay, isGenerating, generatedImage,
    generationError, currentSteps, generationProgress, currentPreviewImage,
    isGeneratingAIPrompt, aiGenerationError, selectedLoras,
    controlNetEnabled, selectedControlNetModel, controlNetRefImage,
    controlNetRefImageBase64, controlNetStrength, controlNetPreprocessors,
    selectedAnyLineStyle, cnGlobalPreprocessorResolution,
    controlNetProcessedPreviewImage, isGeneratingPreprocessorPreview,
    preprocessorPreviewError, controlNetRefImageDimensions,
    clipVisionEnabled, selectedClipVisionModel, clipVisionRefImage,
    clipVisionRefImageBase64, clipVisionStrength, enableHiresFix,
    webuiSaveRedirect, selectedUpscaler, selectedColorTransfer,
    upscaleBy, denoisingStrengthHires, hfSteps, hfCfg, hfSampler, hfScheduler,
    modelMergeEnabled, modelMergeModel2, modelMergeRatio,
    samplingDiscreteEnabled, samplingType, zsnrEnabled,
    // Setters & Handlers
    setPromptText, setPositivePromptTail, setNegativePromptText,
    setSelectedCharacter1, setSelectedCharacter2, setSelectedCharacter3,
    setEnableAction, setSelectedAction, setSelectedModel,
    setSeed, setSelectedSampler, setSelectedScheduler,
    setHoveredCharacterPreviewSrc, setIsModalOpen, setModalImageSrc,
    setSelectedLoras, setControlNetEnabled, setSelectedControlNetModel,
    setControlNetRefImage, setControlNetRefImageBase64, setControlNetStrength,
    setControlNetPreprocessors, setSelectedAnyLineStyle,
    setCnGlobalPreprocessorResolution, setControlNetRefImageDimensions,
    setClipVisionEnabled, setSelectedClipVisionModel, setClipVisionRefImage,
    setClipVisionRefImageBase64, setClipVisionStrength, setEnableHiresFix,
    setWebuiSaveRedirect, setSelectedUpscaler, setSelectedColorTransfer,
    setUpscaleBy, setDenoisingStrengthHires, setHfSteps, setHfCfg,
    setHfSampler, setHfScheduler,
    setModelMergeEnabled, setModelMergeModel2, setModelMergeRatio,
    setSamplingDiscreteEnabled, setSamplingType, setZsnrEnabled,
    handleFileChange, handleAddLora, handleRemoveLora, handleLoraChange,
    handleClearControlNetRefImage, handleControlNetRefImageChange,
    handleClipVisionRefImageChange, handlePreviewPreprocessors,
    handleCreatePrompt, handleAIPromptGenerate,
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
};

export const useGenerationContext = () => {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error(
      "useGenerationContext must be used within a GenerationProvider"
    );
  }
  return context;
};