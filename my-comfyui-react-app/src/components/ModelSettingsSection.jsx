import React, { useState } from "react";
import Select from "react-select";
import { ChevronDown, ChevronRight, Share2, Layers } from "lucide-react";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { useDataContext } from "../context/DataContext.jsx";
import { LANG, selectStyles, samplingTypeOptions, DEFAULT_THUMB_SRC } from "../utils/constants";
import SelectOptionWithHoverPreview from "./SelectOptionWithHoverPreview.jsx";

const ModelSettingsSection = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const { modelDropdownOptions } = useDataContext();

    const {
        modelMergeEnabled, setModelMergeEnabled,
        modelMergeModel2, setModelMergeModel2,
        modelMergeRatio, setModelMergeRatio,
        samplingDiscreteEnabled, setSamplingDiscreteEnabled,
        samplingType, setSamplingType,
        zsnrEnabled, setZsnrEnabled
    } = useGenerationContext();

    const toggleExpand = () => setIsExpanded(!isExpanded);

    // Find Select Value logic for Model 2
    const model2Value = modelDropdownOptions.find(opt => opt.value === modelMergeModel2) || null;

    // Find Select Value for Sampling Type
    const samplingTypeValue = samplingTypeOptions.find(opt => opt.value === samplingType) || samplingTypeOptions[0];

    return (
        <div className="flex flex-col gap-4 p-4 bg-[#181818] rounded-lg border border-[#504c4a]">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={20} className="text-[#d9b25c]" /> : <ChevronRight size={20} className="text-[#d9b25c]" />}
                    <h3 className="text-[#d9b25c] font-bold select-none">Model & Sampling Settings</h3>
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col gap-6 mt-2 ml-2 border-l-2 border-[#333] pl-4">

                    {/* Model Merge Subsection */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Share2 size={16} className="text-gray-400" />
                            <div className="checkbox-group">
                                <input
                                    type="checkbox"
                                    id="enableModelMerge"
                                    checked={modelMergeEnabled}
                                    onChange={(e) => setModelMergeEnabled(e.target.checked)}
                                />
                                <label htmlFor="enableModelMerge" className="text-sm font-semibold text-gray-200">
                                    {LANG.enableModelMergeLabel}
                                </label>
                            </div>
                        </div>

                        {modelMergeEnabled && (
                            <div className="flex flex-col gap-3 pl-6">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400">Model 2</label>
                                    <Select
                                        options={modelDropdownOptions}
                                        value={model2Value}
                                        onChange={(opt) => setModelMergeModel2(opt ? opt.value : "")}
                                        styles={selectStyles}
                                        placeholder={LANG.selectModelPlaceholder}
                                        isClearable
                                        components={{ Option: SelectOptionWithHoverPreview }}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between">
                                        <label className="text-xs text-gray-400">{LANG.modelMergeRatioLabel}</label>
                                        <span className="text-xs text-[#d9b25c]">{modelMergeRatio.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={modelMergeRatio}
                                        onChange={(e) => setModelMergeRatio(parseFloat(e.target.value))}
                                        className="w-full accent-[#f18f1c]"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-500">
                                        <span>Model 1 (0.0)</span>
                                        <span>Model 2 (1.0)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-[1px] bg-[#333] w-full" />

                    {/* Sampling Discrete Subsection */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-gray-400" />
                            <div className="checkbox-group">
                                <input
                                    type="checkbox"
                                    id="enableSamplingDiscrete"
                                    checked={samplingDiscreteEnabled}
                                    onChange={(e) => setSamplingDiscreteEnabled(e.target.checked)}
                                />
                                <label htmlFor="enableSamplingDiscrete" className="text-sm font-semibold text-gray-200">
                                    {LANG.enableSamplingDiscreteLabel}
                                </label>
                            </div>
                        </div>

                        {samplingDiscreteEnabled && (
                            <div className="flex flex-col gap-3 pl-6">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400">{LANG.samplingTypeLabel}</label>
                                    <Select
                                        options={samplingTypeOptions}
                                        value={samplingTypeValue}
                                        onChange={(opt) => setSamplingType(opt ? opt.value : "eps")}
                                        styles={selectStyles}
                                        isSearchable={false}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="checkbox-group mt-1">
                                    <input
                                        type="checkbox"
                                        id="enableZSNR"
                                        checked={zsnrEnabled}
                                        onChange={(e) => setZsnrEnabled(e.target.checked)}
                                    />
                                    <label htmlFor="enableZSNR" className="text-xs text-gray-300">
                                        {LANG.zsnrLabel}
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default ModelSettingsSection;
