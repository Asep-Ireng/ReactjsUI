import React from "react";
import Select from "react-select";
import { useDataContext } from "../context/DataContext.jsx";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { LANG, selectStyles, DEFAULT_THUMB_SRC } from "../utils/constants";
import { formatOptionWithThumbnail, formatSingleValueWithThumbnail } from "../utils/helpers.jsx";

const LoraSection = () => {
  // --- Data from DataContext (changes once at load) ---
  const { loraDropdownOptions } = useDataContext();

  // --- State from GenerationContext (changes with user interaction) ---
  const {
    selectedLoras,
    handleAddLora,
    handleLoraChange,
    handleRemoveLora,
    setModalImageSrc,
    setIsModalOpen,
  } = useGenerationContext();

  const loraSelectComponents = { SingleValue: formatSingleValueWithThumbnail };

  const handleImageClick = (src) => {
    if (src && src !== DEFAULT_THUMB_SRC) {
      setModalImageSrc(src);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="section lora-section">
      <div className="section-header">
        <label className="checkbox-label-header">{LANG.loraSectionTitle}</label>
        <button
          onClick={handleAddLora}
          className="add-lora-button action-button"
          style={{
            padding: "8px 15px",
            width: "60%",
            alignSelf: "center",
          }}
        >
          {LANG.addLoraButton}
        </button>
      </div>
      {selectedLoras.length > 0 && (
        <div className="section-content">
          {selectedLoras.map((lora, index) => (
            <div
              key={lora.id}
              className="input-row lora-entry"
              style={{ alignItems: "center" }}
            >
              <img
                src={lora.thumbnail || DEFAULT_THUMB_SRC}
                alt={lora.name}
                className="lora-thumbnail image-preview small-preview"
                onClick={() => handleImageClick(lora.thumbnail)}
                style={{
                  cursor: "zoom-in",
                  marginRight: "10px",
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  borderRadius: "4px",
                  backgroundColor: "#2c313a",
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_THUMB_SRC;
                }}
              />
              <div
                className="input-group lora-name-group"
                style={{ flexGrow: 2 }}
              >
                <label htmlFor={`lora-name-${lora.id}`}>
                  {LANG.loraNameLabel} #{index + 1}:
                </label>
                <Select
                  id={`lora-name-${lora.id}`}
                  options={loraDropdownOptions.filter((o) => o.value !== "none")}
                  value={
                    loraDropdownOptions.find((opt) => opt.value === lora.name) ||
                    null
                  }
                  onChange={(selectedOpt) =>
                    handleLoraChange(
                      lora.id,
                      "name",
                      selectedOpt ? selectedOpt.value : "none"
                    )
                  }
                  styles={selectStyles}
                  placeholder={LANG.selectLoraPlaceholder}
                  isLoading={loraDropdownOptions[0]?.label.startsWith("Load")}
                  formatOptionLabel={formatOptionWithThumbnail}
                  components={loraSelectComponents}
                  isClearable={false}
                />
              </div>
              <div
                className="input-group slider-group lora-strength-group"
                style={{ flexGrow: 1 }}
              >
                <label htmlFor={`lora-strength-${lora.id}`}>
                  {LANG.loraStrengthLabel}: {parseFloat(lora.strength).toFixed(5)}
                </label>
                <input
                  type="range"
                  id={`lora-strength-${lora.id}`}
                  min="-5.0"
                  max="5.0"
                  step="0.05"
                  value={lora.strength}
                  onChange={(e) =>
                    handleLoraChange(lora.id, "strength", parseFloat(e.target.value))
                  }
                />
              </div>
              <button
                onClick={() => handleRemoveLora(lora.id)}
                className="remove-lora-button action-button"
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#dc3545",
                  alignSelf: "center",
                }}
              >
                {LANG.removeLoraButton}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoraSection;