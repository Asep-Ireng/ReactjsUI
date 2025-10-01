import React from "react";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { useSettingsContext } from "../context/SettingsContext.jsx";
import { LANG } from "../utils/constants";
import { downloadImage } from "../utils/helpers";

const OutputPanel = () => {
  const {
    isGenerating,
    currentPreviewImage,
    generationProgress,
    currentSteps,
    generatedImage,
    generationError,
    finalPromptDisplay,
    informationDisplay,
    setModalImageSrc,
    setIsModalOpen,
  } = useGenerationContext();

  const { aiSystemPrompt, setAiSystemPrompt } = useSettingsContext();

  const handleAiSystemPromptChange = (e) => {
    setAiSystemPrompt(e.target.value);
  };

  return (
    <div className="output-panel">
      <div className="output-gallery-wrapper">
        {isGenerating && (
          <div className="output-gallery-placeholder loading-state">
            {currentPreviewImage && (
              <img
                src={currentPreviewImage}
                alt="Generating preview"
                className="generating-preview-image"
              />
            )}

            <div
              className={`progress-bar-container ${
                currentPreviewImage ? "progress-bar-container-overlaid" : ""
              }`}
            >
              <div
                className="progress-bar"
                style={{ width: `${generationProgress}%` }}
              ></div>
              <div
                className={`progress-bar-label ${
                  currentPreviewImage ? "progress-bar-label-overlaid" : ""
                }`}
              >
                {generationProgress < 100
                  ? `Step ${Math.max(
                      1,
                      Math.round((generationProgress / 100) * currentSteps)
                    )} / ${currentSteps} (${generationProgress}%)`
                  : "Finalizing…"}
              </div>
            </div>
          </div>
        )}

        {!isGenerating && generatedImage && (
          <div className="output-gallery-container">
            <img
              src={generatedImage}
              alt="Generated result"
              className="generated-image-display"
              onClick={() => {
                setModalImageSrc(generatedImage);
                setIsModalOpen(true);
              }}
            />
            <button
              onClick={() =>
                downloadImage(generatedImage, `comfy_gen_${Date.now()}.png`)
              }
              className="action-button download-button"
            >
              Download Image (PNG)
            </button>
          </div>
        )}

        {!isGenerating && !generatedImage && !generationError && (
          <div className="output-gallery-placeholder">
            <span className="gallery-icon">🖼️</span>
            {LANG.outputGalleryPlaceholder}
          </div>
        )}

        {generationError && !isGenerating && (
          <div className="output-gallery-placeholder error-state">
            <span className="gallery-icon">⚠️</span>
            Error: {generationError}
          </div>
        )}
      </div>

      <div className="output-info-section">
        <label htmlFor="finalPromptDisplay">{LANG.output_prompt}:</label>
        <textarea
          id="finalPromptDisplay"
          value={finalPromptDisplay}
          readOnly
          rows={6}
        />
      </div>

      <div className="output-info-section">
        <label htmlFor="informationDisplay">{LANG.output_info}:</label>
        <textarea
          id="informationDisplay"
          value={informationDisplay}
          readOnly
          rows={4}
        />
      </div>

      <div className="output-info-section">
        <label htmlFor="aiSystemPromptEditable">
          {LANG.ai_system_prompt_text}:
        </label>
        <textarea
          id="aiSystemPromptEditable"
          value={aiSystemPrompt}
          onChange={handleAiSystemPromptChange}
          rows={8}
        />
      </div>
    </div>
  );
};

export default OutputPanel;


  // return (
  //   <section className="preview-panel glass-panel">
  //     {/* keep your existing output-gallery-container and info sections */}
  //   </section>
  // );