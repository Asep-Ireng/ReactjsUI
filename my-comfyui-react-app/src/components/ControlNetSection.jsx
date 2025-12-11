import React from "react";
import { useDataContext } from "../context/DataContext.jsx";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { LANG, anyLineStyleOptions } from "../utils/constants";

const ControlNetSection = () => {
  // --- Data from DataContext (changes once at load) ---
  const { controlNetModelOptions, upscalerOptions } = useDataContext();

  // --- State from GenerationContext (changes with user interaction) ---
  const {
    controlNetEnabled, setControlNetEnabled,
    selectedControlNetModel, setSelectedControlNetModel,
    cnGlobalPreprocessorResolution, setCnGlobalPreprocessorResolution,
    controlNetPreprocessors, setControlNetPreprocessors,
    selectedAnyLineStyle, setSelectedAnyLineStyle,
    controlNetRefImage,
    handleControlNetRefImageChange,
    handleClearControlNetRefImage,
    controlNetRefImageDimensions,
    controlNetProcessedPreviewImage,
    isGeneratingPreprocessorPreview,
    preprocessorPreviewError,
    handlePreviewPreprocessors,
    controlNetStrength, setControlNetStrength,
    setModalImageSrc, setIsModalOpen,
    controlNetUpscaleModel, setControlNetUpscaleModel,
    controlNetUpscaleFactor, setControlNetUpscaleFactor,
    controlNetUpscaleMethod, setControlNetUpscaleMethod,
  } = useGenerationContext();

  return (
    <div className="section controlnet-section">
      <div className="section-header">
        <input
          type="checkbox"
          id="enableControlNet"
          checked={controlNetEnabled}
          onChange={(e) => setControlNetEnabled(e.target.checked)}
        />
        <label htmlFor="enableControlNet" className="checkbox-label-header">
          {LANG.controlNetEnableLabel}
        </label>
      </div>
      {controlNetEnabled && (
        <><div className="section-content">
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="cn-model">{LANG.controlNetModelLabel}:</label>
              <select
                id="cn-model"
                value={selectedControlNetModel}
                onChange={(e) => setSelectedControlNetModel(e.target.value)}
                disabled={controlNetModelOptions[0]?.label.startsWith("Load")}
              >
                {controlNetModelOptions.map((o) => (
                  <option key={"cn-mod-" + o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="cnGlobalRes">{LANG.controlNetGlobalResolutionLabel}:</label>
              <input
                type="number"
                id="cnGlobalRes"
                value={cnGlobalPreprocessorResolution}
                onChange={(e) => setCnGlobalPreprocessorResolution(parseInt(e.target.value, 10) || 0)}
                min="64"
                step="64"
                className="resolution-input"
                style={{ width: "100px" }} />
            </div>
          </div>
          <div className="input-row">
            <div className="input-group" style={{ flexBasis: "100%" }}>
              <label>{LANG.controlNetPreprocessorLabel}</label>
              <div className="checkbox-grid" style={{ marginTop: "5px" }}>
                <div className="checkbox-group preprocessor-item">
                  <input
                    type="checkbox"
                    id="cnAnyLine"
                    name="anyLine"
                    checked={controlNetPreprocessors.anyLine}
                    onChange={(e) => setControlNetPreprocessors(prev => ({ ...prev, anyLine: e.target.checked }))} />
                  <label htmlFor="cnAnyLine">{LANG.enableAnyLineLabel}</label>
                  {controlNetPreprocessors.anyLine && (
                    <select
                      id="cnAnyLineStyle"
                      value={selectedAnyLineStyle}
                      onChange={(e) => setSelectedAnyLineStyle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {anyLineStyleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="checkbox-group preprocessor-item">
                  <input type="checkbox" id="cnDepth" name="depth" checked={controlNetPreprocessors.depth} onChange={(e) => setControlNetPreprocessors(prev => ({ ...prev, depth: e.target.checked }))} />
                  <label htmlFor="cnDepth">{LANG.enableDepthLabel}</label>
                </div>
                <div className="checkbox-group preprocessor-item">
                  <input type="checkbox" id="cnOpenPose" name="openPose" checked={controlNetPreprocessors.openPose} onChange={(e) => setControlNetPreprocessors(prev => ({ ...prev, openPose: e.target.checked }))} />
                  <label htmlFor="cnOpenPose">{LANG.enableOpenPoseLabel}</label>
                </div>
                <div className="checkbox-group preprocessor-item">
                  <input type="checkbox" id="cnCanny" name="canny" checked={controlNetPreprocessors.canny} onChange={(e) => setControlNetPreprocessors(prev => ({ ...prev, canny: e.target.checked }))} />
                  <label htmlFor="cnCanny">{LANG.enableCannyLabel}</label>
                </div>
              </div>
            </div>
          </div>
          <div className="input-row" style={{ alignItems: "flex-start", gap: "20px" }}>
            <div className="input-group" style={{ flexBasis: "calc(50% - 10px)" }}>
              <label htmlFor="cn-ref-image">{LANG.controlNetRefImageLabel}:</label>
              <input
                type="file"
                id="cn-ref-image"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleControlNetRefImageChange}
                className="file-input"
                onClick={(event) => { event.target.value = null; }} />
              {controlNetRefImage && (
                <div style={{ position: "relative", marginTop: "10px", display: "inline-block" }}>
                  <img
                    src={controlNetRefImage}
                    alt="CN Ref Preview"
                    className="image-preview small-preview"
                    onClick={() => { setModalImageSrc(controlNetRefImage); setIsModalOpen(true); }}
                    style={{ cursor: "zoom-in", maxHeight: "220px", objectFit: "contain", display: "block" }} />
                  <button onClick={handleClearControlNetRefImage} title="Remove reference image" style={{ position: "absolute", top: "5px", right: "5px", background: "rgba(40, 44, 52, 0.8)", color: "#e06c75", border: "1px solid #e06c75", borderRadius: "50%", width: "22px", height: "22px", fontSize: "12px", lineHeight: "20px", textAlign: "center", cursor: "pointer", padding: "0", zIndex: 10, boxShadow: "0 0 5px rgba(0,0,0,0.5)" }}>
                    &times;
                  </button>
                  {controlNetRefImageDimensions && (
                    <p style={{ fontSize: "0.75em", color: "#888", textAlign: "center", marginTop: "4px", marginBottom: "0" }}>
                      {controlNetRefImageDimensions.width} x {controlNetRefImageDimensions.height}
                    </p>
                  )}
                </div>
              )}
            </div>
            {controlNetRefImage && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ fontSize: "0.9em", display: "block", marginBottom: "5px" }}>Upscale Ref (Optional):</label>
                <select
                  value={controlNetUpscaleModel}
                  onChange={(e) => setControlNetUpscaleModel(e.target.value)}
                  style={{ width: "100%", padding: "5px", background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid #444", borderRadius: "4px" }}
                >
                  <option value="None">None</option>
                  {upscalerOptions.map((opt, idx) => (
                    <option key={"cn-ups-" + opt.value + "-" + idx} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            {controlNetRefImage && (
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.9em", display: "block", marginBottom: "5px" }}>Ref Scale:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={controlNetUpscaleFactor}
                    onChange={(e) => setControlNetUpscaleFactor(parseFloat(e.target.value))}
                    style={{ width: "100%", padding: "5px", background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid #444", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.9em", display: "block", marginBottom: "5px" }}>Method:</label>
                  <select
                    value={controlNetUpscaleMethod}
                    onChange={(e) => setControlNetUpscaleMethod(e.target.value)}
                    style={{ width: "100%", padding: "5px", background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid #444", borderRadius: "4px" }}
                  >
                    {["nearest-exact", "bilinear", "area", "bicubic", "lanczos"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="input-group" style={{ flexBasis: "calc(50% - 10px)" }}>
            <label>{LANG.controlNetProcessedPreviewLabel || "Preprocessor Output"}:</label>
            <button onClick={handlePreviewPreprocessors} disabled={!controlNetEnabled || !controlNetRefImage || isGeneratingPreprocessorPreview} className="action-button" style={{ marginTop: "10px", width: "100%", marginBottom: "10px" }}>
              {isGeneratingPreprocessorPreview ? "Previewing..." : "Preview Preprocessor Output"}
            </button>
            {preprocessorPreviewError && (<p style={{ color: "red", fontSize: "0.9em", textAlign: "center" }}>{preprocessorPreviewError}</p>)}
            {controlNetProcessedPreviewImage ? (
              <img
                src={controlNetProcessedPreviewImage}
                alt="CN Preprocessor Output"
                className="image-preview small-preview"
                onClick={() => { setModalImageSrc(controlNetProcessedPreviewImage); setIsModalOpen(true); }}
                style={{ cursor: "zoom-in", marginTop: "0px", maxHeight: "220px", border: "1px solid #61dafb", objectFit: "contain" }} />
            ) : (
              <div className="image-preview-placeholder" style={{ height: "220px", marginTop: "0px" }}>
                {isGeneratingPreprocessorPreview ? "Processing..." : "No preprocessor preview"}
              </div>
            )}
          </div>
        </div><div className="input-row">
            <div className="input-group slider-group" style={{ flexBasis: "100%" }}>
              <label htmlFor="cn-strength">{LANG.controlNetStrengthLabel}: {parseFloat(controlNetStrength).toFixed(2)}</label>
              <input type="range" id="cn-strength" min="0.0" max="2.0" step="0.05" value={controlNetStrength} onChange={(e) => setControlNetStrength(parseFloat(e.target.value))} />
            </div>
          </div><p style={{ fontSize: "0.8em", color: "#888", marginTop: "5px" }}>{LANG.controlNetChainNote}</p></>
      )}
    </div>
  );
};

export default ControlNetSection;