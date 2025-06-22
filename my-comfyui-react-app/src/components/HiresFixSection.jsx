import React from "react";
import { useDataContext } from "../context/DataContext.jsx";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { LANG, colorTransferOptions } from "../utils/constants";

const HiresFixSection = () => {
  // --- Data from DataContext (changes once at load) ---
  const { upscalerOptions, samplerOptions, schedulerOptions } = useDataContext();

  // --- State from GenerationContext (changes with user interaction) ---
  const {
    enableHiresFix, setEnableHiresFix,
    webuiSaveRedirect, setWebuiSaveRedirect,
    selectedUpscaler, setSelectedUpscaler,
    selectedColorTransfer, setSelectedColorTransfer,
    upscaleBy, setUpscaleBy,
    denoisingStrengthHires, setDenoisingStrengthHires,
    hfSteps, setHfSteps,
    hfCfg, setHfCfg,
    hfSampler, setHfSampler,
    hfScheduler, setHfScheduler,
  } = useGenerationContext();

  return (
    <div className="section hires-fix-section">
      <div className="section-header">
        <input
          type="checkbox"
          id="enableHiresFix"
          checked={enableHiresFix}
          onChange={(e) => setEnableHiresFix(e.target.checked)}
        />
        <label htmlFor="enableHiresFix" className="checkbox-label-header">
          {LANG.api_hf_enable}
        </label>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            id="webuiSaveRedirect"
            checked={webuiSaveRedirect}
            onChange={(e) => setWebuiSaveRedirect(e.target.checked)}
          />
          <label
            htmlFor="webuiSaveRedirect"
            style={{ fontSize: "0.9em", marginLeft: "5px" }}
          >
            {LANG.api_webui_savepath_override}
          </label>
        </div>
      </div>
      {enableHiresFix && (
        <div className="section-content">
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="upscaler">{LANG.api_hf_upscaler}:</label>
              <select
                id="upscaler"
                value={selectedUpscaler}
                onChange={(e) => setSelectedUpscaler(e.target.value)}
                disabled={upscalerOptions[0]?.label.startsWith("Load")}
              >
                {upscalerOptions.map((o) => (
                  <option key={"upscaler-" + o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="colorTransfer">{LANG.api_hf_colortransfer}:</label>
              <select
                id="colorTransfer"
                value={selectedColorTransfer}
                onChange={(e) => setSelectedColorTransfer(e.target.value)}
              >
                {colorTransferOptions.map((o) => (
                  <option key={"ct-" + o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="input-row">
            <div className="input-group slider-group">
              <label htmlFor="upscaleBy">
                {LANG.api_hf_scale}: {upscaleBy.toFixed(1)}
              </label>
              <input
                type="range"
                id="upscaleBy"
                min="1.0"
                max="4.0"
                step="0.1"
                value={upscaleBy}
                onChange={(e) => setUpscaleBy(parseFloat(e.target.value))}
              />
            </div>
            <div className="input-group slider-group">
              <label htmlFor="denoisingStrengthHires">
                {LANG.api_hf_denoise}: {denoisingStrengthHires.toFixed(2)}
              </label>
              <input
                type="range"
                id="denoisingStrengthHires"
                min="0.0"
                max="1.0"
                step="0.01"
                value={denoisingStrengthHires}
                onChange={(e) => setDenoisingStrengthHires(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="hfSteps">{LANG.hfStepsLabel}:</label>
              <input
                type="number"
                id="hfSteps"
                value={hfSteps}
                onChange={(e) => setHfSteps(parseInt(e.target.value, 10))}
                min="1"
                max="150"
                style={{ width: "80px" }}
              />
            </div>
            <div className="input-group slider-group">
              <label htmlFor="hfCfg">
                {LANG.hfCfgLabel}: {hfCfg.toFixed(1)}
              </label>
              <input
                type="range"
                id="hfCfg"
                min="1.0"
                max="30.0"
                step="0.5"
                value={hfCfg}
                onChange={(e) => setHfCfg(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="hfSampler">{LANG.hfSamplerLabel}:</label>
              <select
                id="hfSampler"
                value={hfSampler}
                onChange={(e) => setHfSampler(e.target.value)}
                disabled={samplerOptions[0]?.label.startsWith("Load")}
              >
                <option value="">Use Main Sampler</option>
                {samplerOptions.map((o) => (
                  <option key={"hf-samp-" + o.value + o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="hfScheduler">{LANG.hfSchedulerLabel}:</label>
              <select
                id="hfScheduler"
                value={hfScheduler}
                onChange={(e) => setHfScheduler(e.target.value)}
                disabled={schedulerOptions[0]?.label.startsWith("Load")}
              >
                <option value="">Use Main Scheduler</option>
                {schedulerOptions.map((o) => (
                  <option key={"hf-sch-" + o.value + o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HiresFixSection;