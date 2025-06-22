import React from "react";
import { DEFAULT_THUMB_SRC } from "./constants";


export function parseApiImageData(data, landscape) {
  const parts = data.split(",").map((s) => s.trim());
  if (parts.length < 4) {
    console.error("Invalid api_image_data format:", data);
    return { cfg: 7.0, steps: 20, width: 512, height: 768, loops: 1 };
  }
  const [cfg, steps, w, h, loops = "1"] = parts;
  let width = parseInt(w, 10);
  let height = parseInt(h, 10);
  return {
    cfg: parseFloat(cfg),
    steps: parseInt(steps, 10),
    width,
    height,
    loops: parseInt(loops, 10),
  };
}

 export const downloadImage = (base64Image, filename = "generated_image.png") => {
      if (!base64Image) { console.error("No image data provided for download."); alert("No image to download!"); return; }
      try { const link = document.createElement('a'); link.href = base64Image; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); console.log(`Image download initiated: ${filename}`); } catch (error) { console.error("Error during image download:", error); alert("Failed to initiate image download. See console for details."); }
    };

export const formatOptionWithThumbnail = ({
  label,
  thumbnail,
  compatible_base_model,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      width: "100%",
    }}
  >
    <img
      src={thumbnail || DEFAULT_THUMB_SRC}
      alt={label}
      style={{
        width: 56,
        height: 56,
        objectFit: "contain",
        borderRadius: "4px",
        backgroundColor: "#353941",
        marginBottom: "6px",
      }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_THUMB_SRC;
      }}
    />
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: "1.2",
      }}
    >
      <span style={{ fontSize: "0.9em", wordBreak: "break-word" }}>
        {label.length > 30 ? `${label.substring(0, 27)}...` : label}
      </span>
      {compatible_base_model && compatible_base_model !== "Unknown" && (
        <span
          style={{ fontSize: "0.75em", color: "#8899aa", marginTop: "2px" }}
        >
          ({compatible_base_model})
        </span>
      )}
    </div>
  </div>
);

export const formatSingleValueWithThumbnail = ({ data }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    {data.thumbnail && data.thumbnail !== DEFAULT_THUMB_SRC && (
      <img
        src={data.thumbnail}
        alt={data.label}
        style={{
          width: 24,
          height: 24,
          objectFit: "contain",
          borderRadius: "3px",
          backgroundColor: "#353941",
        }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = DEFAULT_THUMB_SRC;
        }}
      />
    )}
    <span
      style={{
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {data.label.length > 25 ? `${data.label.substring(0, 22)}...` : data.label}
    </span>
    {data.compatible_base_model && data.compatible_base_model !== "Unknown" && (
      <span
        style={{
          fontSize: "0.7em",
          color: "#8899aa",
          marginLeft: "4px",
          whiteSpace: "nowrap",
        }}
      >
        ({data.compatible_base_model})
      </span>
    )}
  </div>
);