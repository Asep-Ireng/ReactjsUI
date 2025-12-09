import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useContext,
  useCallback,
} from "react";
import Papa from "papaparse";
import md5 from "md5";
import pako from "pako";

import {
  fetchModels,
  fetchLoras,
  fetchControlNetModels,
  fetchClipVisionModels,
  fetchSamplers,
  fetchSchedulers,
} from "../api/comfyui";
import { LANG, DEFAULT_THUMB_SRC } from "../utils/constants";

// --- File Path Constants ---
const CSV_CHARACTER_FILE_PATH = "/data/wai_characters.csv";
const JSON_CHARACTER_FILE_PATH = "/data/wai_zh_tw.json";
const JSON_ACTION_FILE_PATH = "/data/wai_action.json";
const JSON_PRIMARY_THUMBS_FILE_PATH = "/data/wai_character_thumbs.json";
const JSON_FALLBACK_THUMBS_FILE_PATH = "/data/wai_image.json";
const JSON_SETTINGS_FILE_PATH = "/data/settings.json";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // Raw Data State
  const [rawCsvData, setRawCsvData] = useState(null);
  const [rawCharacterJsonData, setRawCharacterJsonData] = useState(null);
  const [rawActionJsonData, setRawActionJsonData] = useState(null);
  const [rawPrimaryThumbsData, setRawPrimaryThumbsData] = useState(null);
  const [rawFallbackThumbsData, setRawFallbackThumbsData] = useState(null);
  const [rawModelListData, setRawModelListData] = useState(null);
  const [rawLoraListData, setRawLoraListData] = useState(null);
  const [rawControlNetModelData, setRawControlNetModelData] = useState(null);
  const [rawClipVisionModelData, setRawClipVisionModelData] = useState(null);
  const [rawSamplerData, setRawSamplerData] = useState(null);
  const [rawSchedulerData, setRawSchedulerData] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [dataLoadingError, setDataLoadingError] = useState(null);

  // Derived Options State
  const [modelDropdownOptions, setModelDropdownOptions] = useState([
    { label: "Loading...", value: "", thumbnail: DEFAULT_THUMB_SRC },
  ]);
  const [loraDropdownOptions, setLoraDropdownOptions] = useState([
    { label: "Loading...", value: "" },
  ]);
  const [controlNetModelOptions, setControlNetModelOptions] = useState([
    { label: "Loading...", value: "" },
  ]);
  const [clipVisionModelOptions, setClipVisionModelOptions] = useState([
    { label: "Loading...", value: "" },
  ]);
  const [samplerOptions, setSamplerOptions] = useState([
    { label: "Loading...", value: "" },
  ]);
  const [schedulerOptions, setSchedulerOptions] = useState([
    { label: "Loading...", value: "" },
  ]);
  const [upscalerOptions, setUpscalerOptions] = useState([
    { label: "Loading...", value: "" },
  ]);

  // Initial Data Fetching Effect
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [
          csvRes,
          charJsonRes,
          actionJsonRes,
          primaryThumbsRes,
          fallbackThumbsRes,
          settingsRes,
          models,
          loras,
          cnModels,
          cvModels,
          samplersRes,
          schedulersRes,
        ] = await Promise.all([
          fetch(CSV_CHARACTER_FILE_PATH),
          fetch(JSON_CHARACTER_FILE_PATH),
          fetch(JSON_ACTION_FILE_PATH),
          fetch(JSON_PRIMARY_THUMBS_FILE_PATH),
          fetch(JSON_FALLBACK_THUMBS_FILE_PATH),
          fetch(JSON_SETTINGS_FILE_PATH),
          fetchModels(),
          fetchLoras(),
          fetchControlNetModels(),
          fetchClipVisionModels(),
          fetchSamplers(),
          fetchSchedulers(),
        ]);

        // This is a better way to handle multiple fetches
        const process = async (res, name) => {
          if (!res.ok) throw new Error(`Failed to fetch ${name}`);
          return res.json();
        };
        const processText = async (res, name) => {
          if (!res.ok) throw new Error(`Failed to fetch ${name}`);
          return res.text();
        };

        setRawCsvData(await processText(csvRes, "Character CSV"));
        setRawCharacterJsonData(await process(charJsonRes, "Character JSON"));
        setRawActionJsonData(await process(actionJsonRes, "Action JSON"));
        setRawPrimaryThumbsData(
          await process(primaryThumbsRes, "Primary Thumbs")
        );
        setRawFallbackThumbsData(
          await process(fallbackThumbsRes, "Fallback Thumbs")
        );
        setAppSettings(await process(settingsRes, "Settings"));
        setRawModelListData(models);
        setRawLoraListData(loras);
        setRawControlNetModelData(cnModels);
        setRawClipVisionModelData(cvModels);
        setRawSamplerData(samplersRes);
        setRawSchedulerData(schedulersRes);
      } catch (error) {
        console.error("Error during initial data fetch:", error);
        // Fallback for samplers/schedulers if API fails (optional, or just empty)
        setDataLoadingError(error.message || "Failed to fetch critical data.");
      }
    };
    fetchAllData();
  }, []);

  // --- FIX: ADDED THESE USEEFFECTS TO PROCESS RAW DATA ---

  useEffect(() => {
    if (Array.isArray(rawModelListData)) {
      const opts = rawModelListData.map((model) => ({
        label: model.name
          .split("/")
          .pop()
          .replace(/\.(safetensors|ckpt|pt)$/i, ""),
        value: model.name,
        thumbnail: model.thumbnail || DEFAULT_THUMB_SRC,
      }));
      setModelDropdownOptions(
        opts.length > 0
          ? opts
          : [{ label: "No models found", value: "", thumbnail: DEFAULT_THUMB_SRC }]
      );
    }
  }, [rawModelListData]);

  useEffect(() => {
    if (Array.isArray(rawLoraListData)) {
      const opts = rawLoraListData.map((lora) => ({
        label: lora.name
          .split("/")
          .pop()
          .replace(/\.(safetensors|ckpt|pt|lora)$/i, ""),
        value: lora.name,
        thumbnail: lora.thumbnail || DEFAULT_THUMB_SRC,
        compatible_base_model: lora.compatible_base_model || "Unknown",
      }));
      setLoraDropdownOptions(
        opts.length
          ? [
            {
              label: LANG.selectLoraPlaceholder,
              value: "none",
              thumbnail: DEFAULT_THUMB_SRC,
              compatible_base_model: null,
            },
            ...opts,
          ]
          : [
            {
              label: LANG.noLorasAvailable,
              value: "",
              thumbnail: DEFAULT_THUMB_SRC,
              compatible_base_model: null,
            },
          ]
      );
    }
  }, [rawLoraListData]);

  useEffect(() => {
    if (Array.isArray(rawControlNetModelData)) {
      const opts = rawControlNetModelData.map((m) => ({ label: m, value: m }));
      setControlNetModelOptions(
        opts.length
          ? [{ label: "Select CN Model", value: "" }, ...opts]
          : [{ label: "No CN Models", value: "" }]
      );
    }
  }, [rawControlNetModelData]);

  useEffect(() => {
    if (Array.isArray(rawClipVisionModelData)) {
      const opts = rawClipVisionModelData.map((m) => ({ label: m, value: m }));
      setClipVisionModelOptions(
        opts.length
          ? [{ label: "Select CV Model", value: "" }, ...opts]
          : [{ label: "No CV Models", value: "" }]
      );
    }
  }, [rawClipVisionModelData]);

  useEffect(() => {
    if (Array.isArray(rawSamplerData)) {
      const opts = rawSamplerData.map((s) => ({ label: s, value: s }));
      setSamplerOptions(
        opts.length ? opts : [{ label: "No samplers found", value: "" }]
      );
    }
  }, [rawSamplerData]);

  useEffect(() => {
    if (Array.isArray(rawSchedulerData)) {
      const opts = rawSchedulerData.map((s) => ({ label: s, value: s }));
      setSchedulerOptions(
        opts.length ? opts : [{ label: "No schedulers found", value: "" }]
      );
    }
  }, [rawSchedulerData]);

  useEffect(() => {
    if (appSettings) {
      /* Samplers and Schedulers are now fetched dynamically */
      if (appSettings.api_hf_upscaler_list) {
        const upscalers = appSettings.api_hf_upscaler_list.map((u) => ({
          label: u,
          value: u,
        }));
        setUpscalerOptions(
          upscalers.length > 0
            ? upscalers
            : [{ label: "No upscalers found", value: "" }]
        );
      }
    }
  }, [appSettings]);

  // --- Memoized computations for character and action options ---
  const characterDropdownOptions = useMemo(() => {
    if (!rawCsvData || !rawCharacterJsonData) return [];
    const m = {};
    const pC = Papa.parse(rawCsvData, { skipEmptyLines: true });
    if (pC.data) {
      pC.data.forEach((r) => {
        if (r.length >= 2) m[r[0]?.trim()] = r[1]?.trim();
      });
    }
    Object.assign(m, rawCharacterJsonData);
    const uETS = [...new Set(Object.values(m))];
    const o = uETS.map((tS) => ({ label: tS, value: tS }));
    return [
      { label: "Random", value: "random" },
      { label: "None", value: "none" },
      ...o,
    ];
  }, [rawCsvData, rawCharacterJsonData]);

  const actualCharacterOptionsForRandom = useMemo(() => {
    if (!rawCsvData || !rawCharacterJsonData) return [];
    const m = {};
    const pC = Papa.parse(rawCsvData, { skipEmptyLines: true });
    if (pC.data) {
      pC.data.forEach((r) => {
        if (r.length >= 2) m[r[0]?.trim()] = r[1]?.trim();
      });
    }
    Object.assign(m, rawCharacterJsonData);
    return [...new Set(Object.values(m))];
  }, [rawCsvData, rawCharacterJsonData]);

  const actionOptions = useMemo(() => {
    if (!rawActionJsonData) return [];
    const o = Object.entries(rawActionJsonData).map(([l, v]) => ({
      label: l,
      value: v,
    }));
    return [{ label: "None", value: "none" }, ...o];
  }, [rawActionJsonData]);

  const mergedThumbData = useMemo(() => {
    if (!rawPrimaryThumbsData && !rawFallbackThumbsData) return null;
    const fT = { ...(rawPrimaryThumbsData || {}) };
    if (rawFallbackThumbsData) {
      Object.entries(rawFallbackThumbsData).forEach(([eTK, bD]) => {
        try {
          const kSFH = eTK.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
          const mK = md5(kSFH);
          if (!(mK in fT)) fT[mK] = bD;
        } catch (e) {
          console.error(`Error merging fallback thumb for ${eTK}:`, e);
        }
      });
    }
    return fT;
  }, [rawPrimaryThumbsData, rawFallbackThumbsData]);

  const getCharacterDisplayData = useCallback(
    (characterValue, actualOptions, mergedThumbs) => {
      let resolvedTags = characterValue;
      let thumbSrc = DEFAULT_THUMB_SRC;
      if (characterValue === "random") {
        if (actualOptions && actualOptions.length > 0) {
          const randomIndex = Math.floor(Math.random() * actualOptions.length);
          resolvedTags = actualOptions[randomIndex];
        } else {
          resolvedTags = "none";
        }
      }
      if (
        resolvedTags &&
        resolvedTags !== "none" &&
        resolvedTags !== "random"
      ) {
        const keyForHash = resolvedTags
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)");
        const md5Key = md5(keyForHash);
        let base64DataFromJSON = mergedThumbs ? mergedThumbs[md5Key] : null;
        if (base64DataFromJSON) {
          try {
            if (
              base64DataFromJSON.startsWith("data:image/") &&
              base64DataFromJSON.includes(";base64,")
            ) {
              const parts = base64DataFromJSON.split(";base64,");
              const mimeType = parts[0];
              let base64Payload = parts[1];
              // This logic uses pako. It was missing before.
              if (base64Payload.startsWith("H4sI")) {
                const gzippedBytes = Uint8Array.from(atob(base64Payload), (c) =>
                  c.charCodeAt(0)
                );
                const decompressedBytes = pako.inflate(gzippedBytes);
                let newBase64Payload = "";
                decompressedBytes.forEach((byte) => {
                  newBase64Payload += String.fromCharCode(byte);
                });
                base64Payload = btoa(newBase64Payload);
                thumbSrc = `${mimeType};base64,${base64Payload}`;
              } else {
                thumbSrc = base64DataFromJSON;
              }
            }
          } catch (e) {
            console.error(`Error processing base64 for ${resolvedTags}:`, e);
            thumbSrc = DEFAULT_THUMB_SRC;
          }
        }
      }
      return { resolvedTags, thumbSrc };
    },
    []
  );

  // --- Memoized Context Value ---
  const value = useMemo(
    () => ({
      dataLoadingError,
      appSettings, // Pass settings down to other contexts
      modelDropdownOptions,
      loraDropdownOptions,
      controlNetModelOptions,
      clipVisionModelOptions,
      samplerOptions,
      schedulerOptions,
      upscalerOptions,
      characterDropdownOptions,
      actionOptions,
      mergedThumbData,
      actualCharacterOptionsForRandom,
      getCharacterDisplayData,
    }),
    [
      dataLoadingError,
      appSettings,
      modelDropdownOptions,
      loraDropdownOptions,
      controlNetModelOptions,
      clipVisionModelOptions,
      samplerOptions,
      schedulerOptions,
      upscalerOptions,
      characterDropdownOptions,
      actionOptions,
      mergedThumbData,
      actualCharacterOptionsForRandom,
      getCharacterDisplayData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};