import React from "react";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { useDataContext } from "../context/DataContext.jsx";

const SelectOptionWithHoverPreview = (props) => {
    const { data } = props;
    const { setHoveredCharacterPreviewSrc } = useGenerationContext();
    const { mergedThumbData, actualCharacterOptionsForRandom, getCharacterDisplayData } = useDataContext();

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
            className={`px-3 py-2 cursor-pointer ${props.isSelected
                    ? "bg-[#61dafb] text-[#20232a]"
                    : props.isFocused
                        ? "bg-[#353941] text-[#abb2bf]"
                        : "bg-[#2c313a] text-[#abb2bf]"
                }`}
        >
            {props.label}
        </div>
    );
};

export default SelectOptionWithHoverPreview;
