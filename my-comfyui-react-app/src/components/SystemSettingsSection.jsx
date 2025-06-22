import React from "react";
import { useSettingsContext } from "../context/SettingsContext.jsx";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import {
  LANG,
  aiPromptGeneratorOptions,
  imageGeneratorAPIOptions,
  batchGenerateRuleOptions,
} from "../utils/constants";

const SystemSettingsSection = () => {
  // --- Primary data source: SettingsContext ---
  const {
    selectedAIPromptGenerator, setSelectedAIPromptGenerator,
    remoteAIURL, setRemoteAIURL,
    remoteAIModel, setRemoteAIModel,
    remoteAITimeout, setRemoteAITimeout,
    localLlamaServer, setLocalLlamaServer,
    localAITemp, setLocalAITemp,
    localAINPredict, setLocalAINPredict,
    batchGenerateRule, setBatchGenerateRule,
    apiImageData, setApiImageData,
    apiImageLandscape, setApiImageLandscape,
    aiPromptInput, setAiPromptInput,
    promptBan, setPromptBan,
    selectedImageGeneratorAPI, setSelectedImageGeneratorAPI,
    localImageGeneratorAddress, setLocalImageGeneratorAddress,
    handleSaveSettings, handleLoadSettings,
  } = useSettingsContext();

  // --- Secondary data source for specific actions: GenerationContext ---
  const generationState = useGenerationContext();
  const {
    isGeneratingAIPrompt,
    handleAIPromptGenerate,
    aiGenerationError,
  } = generationState;

  return (
    <div className="section system-settings-section">
      <div className="section-header">
        <label className="checkbox-label-header">{LANG.systemSettingsLabel}</label>
      </div>
      <div className="section-content">
        <div className="input-group">
          <label htmlFor="aiPromptGenerator">{LANG.aiPromptGeneratorLabel}:</label>
          <select id="aiPromptGenerator" value={selectedAIPromptGenerator} onChange={(e) => setSelectedAIPromptGenerator(e.target.value)}>
            {aiPromptGeneratorOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
        {selectedAIPromptGenerator === "Remote" && (
          <>
            <div className="input-group">
              <label htmlFor="remoteAIURL">{LANG.remoteAIURLLabel}:</label>
              <input type="text" id="remoteAIURL" value={remoteAIURL} onChange={(e) => setRemoteAIURL(e.target.value)} />
            </div>
            <div className="input-group">
              <label htmlFor="remoteAIModel">{LANG.remoteAIModelLabel}:</label>
              <input type="text" id="remoteAIModel" value={remoteAIModel} onChange={(e) => setRemoteAIModel(e.target.value)} />
            </div>
            <div className="input-group slider-group-horizontal">
              <label htmlFor="remoteAITimeout">{LANG.remoteAITimeoutLabel}: {remoteAITimeout}</label>
              <div className="slider-with-number">
                <input type="range" id="remoteAITimeout" min="5" max="300" step="5" value={remoteAITimeout} onChange={(e) => setRemoteAITimeout(parseInt(e.target.value, 10))} />
                <input type="number" value={remoteAITimeout} onChange={(e) => setRemoteAITimeout(parseInt(e.target.value, 10))} min="5" max="300" className="slider-number-input" />
              </div>
            </div>
          </>
        )}
        {selectedAIPromptGenerator === "Local" && (
          <>
            <div className="input-group">
              <label htmlFor="localLlamaServer">{LANG.localLlamaServerLabel}:</label>
              <input type="text" id="localLlamaServer" value={localLlamaServer} onChange={(e) => setLocalLlamaServer(e.target.value)} />
            </div>
            <div className="input-group slider-group-horizontal">
              <label htmlFor="localAITemp">{LANG.localAITempLabel}: {localAITemp.toFixed(1)}</label>
              <div className="slider-with-number">
                <input type="range" id="localAITemp" min="0.1" max="1.0" step="0.1" value={localAITemp} onChange={(e) => setLocalAITemp(parseFloat(e.target.value))} />
                <input type="number" value={localAITemp} onChange={(e) => setLocalAITemp(parseFloat(e.target.value))} min="0.1" max="1.0" step="0.1" className="slider-number-input" />
              </div>
            </div>
            <div className="input-group slider-group-horizontal">
              <label htmlFor="localAINPredict">{LANG.localAINPredictLabel}: {localAINPredict}</label>
              <div className="slider-with-number">
                <input type="range" id="localAINPredict" min="128" max="4096" step="128" value={localAINPredict} onChange={(e) => setLocalAINPredict(parseInt(e.target.value, 10))} />
                <input type="number" value={localAINPredict} onChange={(e) => setLocalAINPredict(parseInt(e.target.value, 10))} min="128" max="4096" step="128" className="slider-number-input" />
              </div>
            </div>
          </>
        )}
        <div className="input-group">
          <label htmlFor="batchGenerateRule">{LANG.batch_generate_rule}:</label>
          <select id="batchGenerateRule" value={batchGenerateRule} onChange={(e) => setBatchGenerateRule(e.target.value)}>
            {batchGenerateRuleOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="apiImageData">{LANG.api_image_data}:</label>
          <input type="text" id="apiImageData" value={apiImageData} onChange={(e) => setApiImageData(e.target.value)} />
        </div>
        <div className="input-group">
          <div className="checkbox-group" style={{ marginTop: "10px" }}>
            <input type="checkbox" id="apiImageLandscape" checked={apiImageLandscape} onChange={(e) => setApiImageLandscape(e.target.checked)} />
            <label htmlFor="apiImageLandscape">{LANG.api_image_landscape}</label>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="aiPromptInput">{LANG.ai_prompt_input_label}:</label>
          <textarea id="aiPromptInput" value={aiPromptInput} onChange={(e) => setAiPromptInput(e.target.value)} rows={3} />
        </div>
        <div className="input-group">
          <button onClick={handleAIPromptGenerate} disabled={isGeneratingAIPrompt || selectedAIPromptGenerator === "none"} className="action-button" style={{ marginTop: "10px", width: "100%" }}>
            {isGeneratingAIPrompt ? "Generating AI Prompt..." : "Generate AI Prompt (updates Custom Prompt)"}
          </button>
          {aiGenerationError && (<p style={{ color: "red", marginTop: "5px", fontSize: "0.9em" }}>Error: {aiGenerationError}</p>)}
        </div>
        <div className="input-group">
          <label htmlFor="promptBan">{LANG.prompt_ban}:</label>
          <textarea id="promptBan" value={promptBan} onChange={(e) => setPromptBan(e.target.value)} rows={2} />
        </div>
        <hr className="settings-separator" />
        <div className="input-group">
          <label htmlFor="imageGeneratorAPI">{LANG.localImageGeneratorAPILabel}:</label>
          <select id="imageGeneratorAPI" value={selectedImageGeneratorAPI} onChange={(e) => setSelectedImageGeneratorAPI(e.target.value)}>
            {imageGeneratorAPIOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="localImageGeneratorAddress">{LANG.localImageGeneratorAddressLabel}:</label>
          <input type="text" id="localImageGeneratorAddress" value={localImageGeneratorAddress} onChange={(e) => setLocalImageGeneratorAddress(e.target.value)} />
        </div>
        <div className="action-buttons-container system-settings-buttons">
          <button onClick={() => handleSaveSettings(generationState)} className="action-button">
            {LANG.saveSettingsButton}
          </button>
          <button onClick={handleLoadSettings} className="action-button">
            {LANG.loadSettingsButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsSection;