import React from "react";
import Select from "react-select";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { useDataContext } from "../context/DataContext.jsx";
import { useSettingsContext } from "../context/SettingsContext.jsx";
import { LANG, selectStyles, MAX_SEED, DEFAULT_THUMB_SRC } from "../utils/constants";
import LoraSection from "./LoraSection.jsx";
import ControlNetSection from "./ControlNetSection.jsx";
import HiresFixSection from "./HiresFixSection.jsx";
import ClipVisionSection from "./ClipVisionSection.jsx";
import SystemSettingsSection from "./SystemSettingsSection.jsx";
import SelectOptionWithHoverPreview from "./SelectOptionWithHoverPreview.jsx";

const ControlPanel = () => {
  const {
    characterDropdownOptions,
    actionOptions,
    samplerOptions,
    schedulerOptions,
    mergedThumbData,
    actualCharacterOptionsForRandom,
    getCharacterDisplayData,
  } = useDataContext();

  const { selectedAIPromptGenerator } = useSettingsContext();

  const {
    promptText,
    positivePromptTail,
    negativePromptText,
    selectedCharacter1,
    selectedCharacter2,
    selectedCharacter3,
    resolvedCharacter1Tags,
    resolvedCharacter2Tags,
    resolvedCharacter3Tags,
    character1ThumbSrc,
    character2ThumbSrc,
    character3ThumbSrc,
    enableAction,
    selectedAction,
    seed,
    selectedSampler,
    samplerDescription,
    selectedScheduler,
    schedulerDescription,
    hoveredCharacterPreviewSrc,
    isGeneratingAIPrompt,
    aiGenerationError,
    setPromptText,
    setPositivePromptTail,
    setNegativePromptText,
    setSelectedCharacter1,
    setSelectedCharacter2,
    setSelectedCharacter3,
    setEnableAction,
    setSelectedAction,
    setSeed,
    setSelectedSampler,
    setSelectedScheduler,
    setHoveredCharacterPreviewSrc,
    setIsModalOpen,
    setModalImageSrc,
    handleCreatePrompt,
    handleAIPromptGenerate,
  } = useGenerationContext();

  const {
    cfg, setCfg,
    steps, setSteps,
    width, setWidth,
    height, setHeight,
    clipskip, setClipSkip,
    denoise, setDenoise,
  } = useSettingsContext();



  const currentSliderValue =
    seed === "-1" || seed === "" || isNaN(parseInt(seed)) || parseInt(seed) < 0
      ? "0"
      : parseInt(seed) > MAX_SEED
        ? MAX_SEED.toString()
        : seed;

  const randomizeSeed = () => {
    const newRandomSeed = Math.floor(Math.random() * (MAX_SEED + 1));
    setSeed(String(newRandomSeed));
  };

  const handleThumbnailClick = (src) => {
    if (src && src !== DEFAULT_THUMB_SRC) {
      setModalImageSrc(src);
      setIsModalOpen(true);
    }
  };

  const findSelectValue = (selectedValue, resolvedValue, options) => {
    const valueToFind =
      selectedValue === "random" && resolvedValue ? resolvedValue : selectedValue;
    return options.find((opt) => opt.value === valueToFind) || null;
  };

  const char1SelectValueObject = findSelectValue(
    selectedCharacter1,
    resolvedCharacter1Tags,
    characterDropdownOptions
  );
  const char2SelectValueObject = findSelectValue(
    selectedCharacter2,
    resolvedCharacter2Tags,
    characterDropdownOptions
  );
  const char3SelectValueObject = findSelectValue(
    selectedCharacter3,
    resolvedCharacter3Tags,
    characterDropdownOptions
  );

  return (
    <div className="control-panel flex flex-col gap-8 min-w-[400px] h-full overflow-y-auto p-4">
      <h1>My ComfyUI Frontend</h1>

      <div className="sticky top-0 z-10 bg-[#171b22] pb-4 border-b border-[#504c4a] mb-4 pt-2 -mx-4 px-4 shadow-md opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        <div className="action-buttons-container mb-4">
          <button onClick={handleCreatePrompt} className="action-button primary">
            {LANG.run_button}
          </button>
          <button
            onClick={() => alert("Not implemented yet")}
            className="action-button"
          >
            {LANG.run_random_button}
          </button>
          <button
            onClick={() => alert("Not implemented yet")}
            className="action-button"
          >
            {LANG.run_same_button}
          </button>
        </div>

        <div className="prompt-section mb-4">
          <label htmlFor="cp">{LANG.custom_prompt}:</label>
          <textarea
            id="cp"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
          />
        </div>

        <button
          onClick={handleAIPromptGenerate}
          disabled={isGeneratingAIPrompt || selectedAIPromptGenerator === "none"}
          className="action-button ai-generate-button w-full"
        >
          {isGeneratingAIPrompt ? "Generating..." : "Generate with AI"}
        </button>

        {aiGenerationError && (
          <p className="error-message mt-2">Error: {aiGenerationError}</p>
        )}
      </div>

      {hoveredCharacterPreviewSrc && (
        <div className="hover-preview-container">
          <img
            src={hoveredCharacterPreviewSrc}
            alt="Hover preview"
            className="hover-preview-image"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-5 mb-5 items-start justify-between">
        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="character-list-1" className="text-base font-bold text-[#d9b25c] mb-2">{LANG.character1}:</label>
          <Select
            id="character-list-1"
            options={characterDropdownOptions}
            value={char1SelectValueObject}
            onChange={(opt) => {
              setSelectedCharacter1(opt ? opt.value : "none");
              setHoveredCharacterPreviewSrc(null);
            }}
            styles={selectStyles}
            placeholder="Search/select..."
            isClearable
            components={{ Option: SelectOptionWithHoverPreview }}
          />
        </div>

        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="character-list-2" className="text-base font-bold text-[#d9b25c] mb-2">{LANG.character2}:</label>
          <Select
            id="character-list-2"
            options={characterDropdownOptions}
            value={char2SelectValueObject}
            onChange={(opt) => {
              setSelectedCharacter2(opt ? opt.value : "none");
              setHoveredCharacterPreviewSrc(null);
            }}
            styles={selectStyles}
            placeholder="Search/select..."
            isClearable
            components={{ Option: SelectOptionWithHoverPreview }}
          />
        </div>

        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="character-list-3" className="text-base font-bold text-[#d9b25c] mb-2">{LANG.character3}:</label>
          <Select
            id="character-list-3"
            options={characterDropdownOptions}
            value={char3SelectValueObject}
            onChange={(opt) => {
              setSelectedCharacter3(opt ? opt.value : "none");
              setHoveredCharacterPreviewSrc(null);
            }}
            styles={selectStyles}
            placeholder="Search/select..."
            isClearable
            components={{ Option: SelectOptionWithHoverPreview }}
          />
        </div>

        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center items-start">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="ea"
              checked={enableAction}
              onChange={(e) => setEnableAction(e.target.checked)}
            />
            <label htmlFor="ea">{LANG.action}</label>
          </div>
          {enableAction && (
            <select
              id="al"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              {actionOptions.map((o) => (
                <option key={"act" + o.value + o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Model dropdown removed. Seed stays alone in this row. */}
      <div className="flex flex-wrap gap-5 mb-5 items-start justify-between">
        <div className="flex-grow shrink basis-[calc(50%-10px)] bg-[#181818] p-2.5 rounded-md flex flex-col gap-2 text-center">
          <label htmlFor="rs" className="text-base font-bold text-[#d9b25c] mb-2">{LANG.random_seed}:</label>
          <div className="seed-input-container">
            <input
              type="text"
              id="rs"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="seed-input-field"
              placeholder="-1"
            />
            <button
              onClick={randomizeSeed}
              className="random-seed-button"
              title="Rnd"
            >
              &#x21BB;
            </button>
          </div>

          <input
            type="range"
            min="0"
            max={MAX_SEED.toString()}
            value={currentSliderValue}
            onChange={(e) => setSeed(e.target.value)}
            className="seed-slider"
          />

          <div className="seed-range-labels">
            <span>0</span>
            <span>
              {seed === "-1" || seed === ""
                ? "(R)"
                : isNaN(parseInt(seed))
                  ? "(I)"
                  : seed}
            </span>
            <span>{MAX_SEED}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 mb-5 items-start justify-between">
        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="sl">{LANG.api_sampling_method}:</label>
          <select
            id="sl"
            value={selectedSampler}
            onChange={(e) => setSelectedSampler(e.target.value)}
          >
            {samplerOptions.map((o) => (
              <option key={"samp" + o.value + o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="sd">{LANG.samplerDescriptionLabel}:</label>
          <textarea id="sd" value={samplerDescription} readOnly rows={2} />
        </div>
      </div>

      <div className="flex flex-wrap gap-5 mb-5 items-start justify-between">
        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="schl">{LANG.api_scheduler}:</label>
          <select
            id="schl"
            value={selectedScheduler}
            onChange={(e) => setSelectedScheduler(e.target.value)}
          >
            {schedulerOptions.map((o) => (
              <option key={"sch" + o.value + o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-grow shrink basis-[calc(33.33%-14px)] min-w-[200px] flex flex-col gap-2 text-center">
          <label htmlFor="schd">{LANG.schedulerDescriptionLabel}:</label>
          <textarea id="schd" value={schedulerDescription} readOnly rows={2} />
        </div>
      </div>

      {/* Generation Settings Section */}
      <div className="flex flex-col gap-4 mb-8 p-4 bg-[#181818] rounded-lg border border-[#504c4a]">
        <h3 className="text-[#d9b25c] font-bold border-b border-[#504c4a] pb-2 mb-2">Generation Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Width</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Height</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">Steps</label>
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">CFG Scale</label>
            <input
              type="number"
              value={cfg}
              onChange={(e) => setCfg(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <label className="text-sm text-gray-400">Clip Skip</label>
              <span className="text-xs text-[#d9b25c]">{clipskip}</span>
            </div>
            <input
              type="range"
              min="-12"
              max="-1"
              step="1"
              value={clipskip}
              onChange={(e) => setClipSkip(parseInt(e.target.value))}
              className="w-full accent-[#f18f1c]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <label className="text-sm text-gray-400">Denoising Strength</label>
              <span className="text-xs text-[#d9b25c]">{denoise}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={denoise}
              onChange={(e) => setDenoise(parseFloat(e.target.value))}
              className="w-full accent-[#f18f1c]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 mb-5 items-start justify-between">
        <div className="basis-full flex flex-col gap-2 text-center">
          <label>{LANG.thumbImageGalleryLabel}:</label>
          <div className="thumbnail-container">
            <img
              src={character1ThumbSrc}
              alt={resolvedCharacter1Tags || "C1"}
              className="character-thumbnail"
              onClick={() => handleThumbnailClick(character1ThumbSrc)}
            />
            <img
              src={character2ThumbSrc}
              alt={resolvedCharacter2Tags || "C2"}
              className="character-thumbnail"
              onClick={() => handleThumbnailClick(character2ThumbSrc)}
            />
            <img
              src={character3ThumbSrc}
              alt={resolvedCharacter3Tags || "C3"}
              className="character-thumbnail"
              onClick={() => handleThumbnailClick(character3ThumbSrc)}
            />
          </div>
        </div>
      </div>

      <LoraSection />
      <ControlNetSection />
      <ClipVisionSection />
      <HiresFixSection />



      <div className="prompt-section">
        <label htmlFor="ppt">{LANG.api_prompt}:</label>
        <textarea
          id="ppt"
          value={positivePromptTail}
          onChange={(e) => setPositivePromptTail(e.target.value)}
          rows={2}
        />
      </div>

      <div className="prompt-section">
        <label htmlFor="np">{LANG.api_neg_prompt}:</label>
        <textarea
          id="np"
          value={negativePromptText}
          onChange={(e) => setNegativePromptText(e.target.value)}
          rows={4}
        />
      </div>

      <SystemSettingsSection />
    </div>
  );
};

export default ControlPanel;