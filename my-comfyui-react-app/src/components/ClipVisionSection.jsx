import React from "react";
import { useDataContext } from "../context/DataContext.jsx";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { LANG } from "../utils/constants";

const ClipVisionSection = () => {
  // --- Data from DataContext (changes once at load) ---
  const { clipVisionModelOptions } = useDataContext();

  // --- State from GenerationContext (changes with user interaction) ---
  const {
    clipVisionEnabled,
    setClipVisionEnabled,
    selectedClipVisionModel,
    setSelectedClipVisionModel,
    clipVisionRefImage,
    handleClipVisionRefImageChange,
    clipVisionStrength,
    setClipVisionStrength,
    setModalImageSrc,
  } = useGenerationContext();

  return (
    <div className="section clipvision-section">
      <div className="section-header">
        <input
          type="checkbox"
          id="enableClipVision"
          checked={clipVisionEnabled}
          onChange={(e) => setClipVisionEnabled(e.target.checked)}
        />
        <label htmlFor="enableClipVision" className="checkbox-label-header">
          {LANG.clipVisionEnableLabel}
        </label>
      </div>
      {clipVisionEnabled && (
        <div className="section-content">
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="cv-model">{LANG.clipVisionModelLabel}:</label>
              <select
                id="cv-model"
                value={selectedClipVisionModel}
                onChange={(e) => setSelectedClipVisionModel(e.target.value)}
                disabled={clipVisionModelOptions[0]?.label.startsWith("Load")}
              >
                {clipVisionModelOptions.map((o) => (
                  <option key={"cv-mod-" + o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="cv-ref-image">
                {LANG.clipVisionRefImageLabel}:
              </label>
              <input
                type="file"
                id="cv-ref-image"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleClipVisionRefImageChange}
                className="file-input"
                onClick={(e) => (e.target.value = null)}
              />
              {clipVisionRefImage && (
                <img
                  src={clipVisionRefImage}
                  alt="CV Ref Preview"
                  className="image-preview small-preview"
                  onClick={() => {
                    setModalImageSrc(clipVisionRefImage);
                  }}
                  style={{ cursor: "zoom-in" }}
                />
              )}
            </div>
          </div>
          <div className="input-row">
            <div className="input-group slider-group">
              <label htmlFor="cv-strength">
                {LANG.clipVisionStrengthLabel}:{" "}
                {parseFloat(clipVisionStrength).toFixed(2)}
              </label>
              <input
                type="range"
                id="cv-strength"
                min="0.0"
                max="2.0"
                step="0.05"
                value={clipVisionStrength}
                onChange={(e) =>
                  setClipVisionStrength(parseFloat(e.target.value))
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipVisionSection;