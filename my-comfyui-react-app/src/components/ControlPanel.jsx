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

  const SelectOptionWithHoverPreview = (props) => {
    const { data } = props;

    const handleMouseEnter = () => {
      if (
        data.value &&
        data.value !== "random" &&
        data.value !== "none" &&
        mergedThumbData &&
        actualCharacterOptionsForRandom
      ) {
        const { thumbSrc } = getCharacterDisplayData(
          data.value,
          actualCharacterOptionsForRandom,
          mergedThumbData
        );
        setHoveredCharacterPreviewSrc(thumbSrc);
      } else {
        setHoveredCharacterPreviewSrc(null);
      }
    };

    const handleMouseLeave = () => setHoveredCharacterPreviewSrc(null);

    return (
      <div
        {...props.innerProps}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: props.isSelected
            ? "#61dafb"
            : props.isFocused
            ? "#353941"
            : "#2c313a",
          color: props.isSelected ? "#20232a" : "#abb2bf",
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        {props.label}
      </div>
    );
  };

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
    <div className="control-panel">
      <h1>My ComfyUI Frontend</h1>

      {hoveredCharacterPreviewSrc && (
        <div className="hover-preview-container">
          <img
            src={hoveredCharacterPreviewSrc}
            alt="Hover preview"
            className="hover-preview-image"
          />
        </div>
      )}

      <div className="input-row">
        <div className="input-group">
          <label htmlFor="character-list-1">{LANG.character1}:</label>
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

        <div className="input-group">
          <label htmlFor="character-list-2">{LANG.character2}:</label>
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

        <div className="input-group">
          <label htmlFor="character-list-3">{LANG.character3}:</label>
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

        <div className="input-group action-group">
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
      <div className="input-row">
        <div className="input-group seed-group">
          <label htmlFor="rs">{LANG.random_seed}:</label>
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

      <div className="input-row">
        <div className="input-group">
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

        <div className="input-group description-group">
          <label htmlFor="sd">{LANG.samplerDescriptionLabel}:</label>
          <textarea id="sd" value={samplerDescription} readOnly rows={2} />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
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

        <div className="input-group description-group">
          <label htmlFor="schd">{LANG.schedulerDescriptionLabel}:</label>
          <textarea id="schd" value={schedulerDescription} readOnly rows={2} />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group thumb-gallery-group">
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

      <div className="action-buttons-container">
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

      <div className="prompt-section">
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
        className="action-button ai-generate-button"
      >
        {isGeneratingAIPrompt ? "Generating..." : "Generate with AI"}
      </button>

      {aiGenerationError && (
        <p className="error-message">Error: {aiGenerationError}</p>
      )}

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