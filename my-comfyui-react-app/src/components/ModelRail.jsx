import React, { useMemo, useState } from "react";
import { useDataContext } from "../context/DataContext.jsx";
import { useGenerationContext } from "../context/GenerationContext.jsx";
import { DEFAULT_THUMB_SRC } from "../utils/constants";

const ensureDataUri = (input) => {
  if (!input) return DEFAULT_THUMB_SRC;
  // If already a data URI or http(s) URL, use as-is
  if (input.startsWith("data:image/") || /^https?:\/\//i.test(input)) return input;
  // If looks like base64 without header, prepend a sensible default
  // You can change to image/png if your DB stores pngs.
  if (/^[A-Za-z0-9+/=]+$/.test(input.replace(/\s+/g, ""))) {
    return `data:image/webp;base64,${input}`;
  }
  return input;
};

const prettyParent = (value) => {
  if (!value || typeof value !== "string") return "";
  const parts = value.split("/");
  // parent folder of the file
  return parts.length > 1 ? parts[parts.length - 2] : "";
};

const ModelRail = () => {
  const { modelDropdownOptions } = useDataContext();
  const { selectedModel, setSelectedModel, setIsModalOpen, setModalImageSrc } =
    useGenerationContext();

  const [query, setQuery] = useState("");

  const normalized = useMemo(() => {
    // Normalize options to guarantee thumbnail and meta
    return (modelDropdownOptions || []).map((opt) => ({
      ...opt,
      // your DataContext uses "thumbnail"
      thumb: ensureDataUri(opt.thumbnail),
      meta: opt.meta || prettyParent(opt.value),
    }));
  }, [modelDropdownOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => {
      const label = (o.label || "").toLowerCase();
      const value = (o.value || "").toLowerCase();
      const meta = (o.meta || "").toLowerCase();
      return label.includes(q) || value.includes(q) || meta.includes(q);
    });
  }, [query, normalized]);

  const openImage = (src) => {
    if (!src || src === DEFAULT_THUMB_SRC) return;
    setModalImageSrc(src);
    setIsModalOpen(true);
  };

  return (
    <aside className="model-rail glass-panel">
      <div className="model-rail-header">
        <div className="model-rail-title">Models</div>
        <input
          className="model-search"
          type="text"
          placeholder="Search models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="model-list">
        {filtered.map((opt) => {
          const isActive = opt.value === selectedModel;
          return (
            <button
              key={opt.value || opt.label}
              className={`model-card ${isActive ? "active" : ""}`}
              onClick={() => setSelectedModel(opt.value)}
              title={opt.label}
            >
              <div
                className="model-thumb"
                onClick={(e) => {
                  e.stopPropagation();
                  openImage(opt.thumb);
                }}
              >
                <img
                  src={opt.thumb || DEFAULT_THUMB_SRC}
                  alt={opt.label}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_THUMB_SRC;
                  }}
                />
              </div>
              <div className="model-meta">
                <div className="model-name">{opt.label}</div>
                {opt.meta ? <div className="model-sub">{opt.meta}</div> : null}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="model-empty">No models found</div>
        )}
      </div>
    </aside>
  );
};

export default ModelRail;