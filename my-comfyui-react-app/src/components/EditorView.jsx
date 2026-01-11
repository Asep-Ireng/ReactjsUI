
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Wand2, Upload, Eraser, Move, Download, RefreshCw, PanelRightOpen, PanelRightClose, Palette, Box, Folder, PenTool, Sparkles, Image as ImageIcon, Loader2, BrainCircuit, RefreshCcw, Plus, X } from 'lucide-react';
import { GENERATE_API_BASE } from '../api/comfyui';
import GalleryPickerModal from './GalleryPickerModal';
import DrawingCanvas from './DrawingCanvas';
import SciFiButton from './SciFiButton';
import Loader from './Loader';
import AddModelModal from './AddModelModal';
import { loadModels, saveModels, addModel, removeModel, getProviderColors } from '../config/modelConfig';

const EditorView = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('flash'); // Model ID
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState(null);

    // Dynamic Model Config
    const [modelConfig, setModelConfig] = useState(() => loadModels());
    const [isAddModelOpen, setIsAddModelOpen] = useState(false);

    // Reasoning/Thinking Log
    const [thinkingLog, setThinkingLog] = useState('');
    const thinkingLogRef = useRef(null);

    // Input Image State - Now supports MULTIPLE images
    const [inputImages, setInputImages] = useState([]); // Array of base64 or URL
    const [imageDimensions, setImageDimensions] = useState([]); // Array of {w, h} for each image
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isDoodleMode, setIsDoodleMode] = useState(false);

    // Canvas State
    const [doodleData, setDoodleData] = useState(null);
    
    // Extract dimensions when images change
    useEffect(() => {
        const extractDimensions = async () => {
            const dims = await Promise.all(
                inputImages.map(imgSrc => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                        img.onerror = () => resolve(null);
                        img.src = imgSrc;
                    });
                })
            );
            setImageDimensions(dims);
        };
        if (inputImages.length > 0) {
            extractDimensions();
        } else {
            setImageDimensions([]);
        }
    }, [inputImages]);
    
    // Seedream validation helper - uses model's resolution constraints
    const getSeedreamValidation = (w, h, model) => {
        if (!w || !h) return { status: 'unknown', text: '?' };
        
        // Parse min/max from model config, with fallbacks
        const parseRes = (res) => {
            if (!res) return null;
            const parts = res.toLowerCase().split('x');
            if (parts.length === 2) {
                return parseInt(parts[0]) * parseInt(parts[1]);
            }
            return null;
        };
        
        // Default constraints for Seedream 4.5
        const MIN_PIXELS = parseRes(model?.minResolution) || 3686400;  // ~1920x1920
        const MAX_PIXELS = parseRes(model?.maxResolution) || 16777216; // 4096x4096
        
        const pixels = w * h;
        const ratio = w / h;
        
        if (ratio < 1/16 || ratio > 16) {
            return { status: 'invalid', text: 'Bad ratio' };
        }
        if (pixels >= MIN_PIXELS && pixels <= MAX_PIXELS) {
            return { status: 'valid', text: '✓ Fits' };
        }
        if (pixels < MIN_PIXELS) {
            return { status: 'scale_up', text: '↑ Scale up' };
        }
        if (pixels > MAX_PIXELS) {
            return { status: 'scale_down', text: '↓ Scale down' };
        }
        return { status: 'unknown', text: '?' };
    };

    // Advanced Settings
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [resolution, setResolution] = useState('1024x1024'); // Default 1K
    const [temperature, setTemperature] = useState(1.0);
    
    // Compare Mode - Generate with 2 models simultaneously
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedModelB, setSelectedModelB] = useState(null);
    const [generatedImageB, setGeneratedImageB] = useState(null);
    const [isGeneratingB, setIsGeneratingB] = useState(false);
    const [compareView, setCompareView] = useState('side'); // 'side' | 'a' | 'b'
    const [seedreamResolutionB, setSeedreamResolutionB] = useState('2K'); // Resolution for Model B
    
    // Video Generation Settings (Seedance)
    const [videoResolution, setVideoResolution] = useState('720p');  // 480p, 720p, 1080p
    const [videoRatio, setVideoRatio] = useState('16:9');            // 16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive
    const [videoDuration, setVideoDuration] = useState(5);           // 4-12 seconds, or -1 for auto
    const [videoCameraFixed, setVideoCameraFixed] = useState(false);
    const [videoGenerateAudio, setVideoGenerateAudio] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState(null);      // Video URL or base64
    
    // Seedream-specific resolution (uses Method 2 with valid pixel ranges)
    const [seedreamResolution, setSeedreamResolution] = useState('2K');
    
    // Dynamic Seedream resolutions based on selected model's constraints
    const seedreamResolutions = useMemo(() => {
        const currentModel = modelConfig.models.find(m => m.id === selectedModel);
        const minRes = currentModel?.minResolution || '2048x2048';
        const maxRes = currentModel?.maxResolution || '4096x4096';
        
        // Parse to get min/max pixels
        const parsePixels = (res) => {
            const parts = res.toLowerCase().split('x');
            return parts.length === 2 ? parseInt(parts[0]) * parseInt(parts[1]) : 0;
        };
        
        const minPixels = parsePixels(minRes);
        const maxPixels = parsePixels(maxRes);
        
        // Define all possible resolutions
        const allResolutions = [
            { label: "2K (Auto)", value: "2K", pixels: 2073600 },  // ~1920x1080
            { label: "4K (High)", value: "4K", pixels: 8294400 },  // ~3840x2160
            { label: "From Image 1", value: "from_image_1", pixels: 0 },  // Dynamic
            { label: "From Image 2", value: "from_image_2", pixels: 0 },  // Dynamic
            { label: "720p (1280x720)", value: "1280x720", pixels: 921600 },
            { label: "1080p (1920x1080)", value: "1920x1080", pixels: 2073600 },
            { label: "1:1 (2048x2048)", value: "2048x2048", pixels: 4194304 },
            { label: "16:9 (2560x1440)", value: "2560x1440", pixels: 3686400 },
            { label: "9:16 (1440x2560)", value: "1440x2560", pixels: 3686400 },
            { label: "4:3 (2304x1728)", value: "2304x1728", pixels: 3981312 },
            { label: "3:4 (1728x2304)", value: "1728x2304", pixels: 3981312 },
        ];
        
        // Filter resolutions that fit within the model's constraints
        return allResolutions.filter(res => {
            // Always include dynamic options
            if (res.pixels === 0) return true;
            // Include if within valid range
            return res.pixels >= minPixels && res.pixels <= maxPixels;
        });
    }, [selectedModel, modelConfig.models]);

    // ASPECT_RATIOS moved below to include Auto option

    const RESOLUTIONS = [
        { label: "1K", value: "1024x1024" },
        { label: "2K", value: "2048x2048" },
        { label: "4K", value: "4096x4096" }
    ];

    // Scroll thinking log to bottom
    useEffect(() => {
        if (thinkingLogRef.current) {
            thinkingLogRef.current.scrollTop = thinkingLogRef.current.scrollHeight;
        }
    }, [thinkingLog]);

    const handleGenerate = async () => {
        if (!prompt && inputImages.length === 0 && !doodleData) return;

        // Check if selected model is a video model
        const currentModel = modelConfig.models.find(m => m.id === selectedModel);
        const isVideoModel = currentModel?.isVideo || currentModel?.provider === 'seedance';

        setIsGenerating(true);
        if (isCompareMode && selectedModelB) setIsGeneratingB(true);
        setError(null);
        setThinkingLog('');
        if (isVideoModel) setGeneratedVideo(null); // Clear previous video

        try {
            // Prepare images
            let imagesToSend = [...inputImages];
            if (isDoodleMode && doodleData) {
                imagesToSend = [doodleData, ...inputImages];
            }

            // VIDEO GENERATION PATH
            if (isVideoModel) {
                const modelToSend = currentModel?.modelName || selectedModel;
                const payload = {
                    prompt,
                    model: modelToSend,
                    first_frame_image: imagesToSend.length > 0 ? imagesToSend[0] : undefined,
                    last_frame_image: imagesToSend.length > 1 ? imagesToSend[1] : undefined,
                    resolution: videoResolution,
                    ratio: videoRatio,
                    duration: videoDuration,
                    camera_fixed: videoCameraFixed,
                    generate_audio: videoGenerateAudio
                };

                setThinkingLog('> Submitting video generation task...\n> This may take 30-120 seconds...');

                const response = await fetch(`${GENERATE_API_BASE}/video/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (data.error || data.detail) {
                    throw new Error(data.error || data.detail);
                }

                if (data.video_url) {
                    setGeneratedVideo(data.video_url);
                    setThinkingLog(prev => prev + `\n> Video generated successfully!\n> Duration: ${data.duration || 'N/A'}s`);
                } else if (data.video_base64) {
                    setGeneratedVideo(`data:video/mp4;base64,${data.video_base64}`);
                    setThinkingLog(prev => prev + `\n> Video generated successfully!`);
                } else {
                    throw new Error('No video returned from API');
                }
                
                setIsGenerating(false);
                return;
            }

            // IMAGE GENERATION PATH (existing logic)
            // Helper to build payload for a model
            const buildPayload = (modelId, seedreamRes) => {
                const modelCfg = modelConfig.models.find(m => m.id === modelId);
                const modelToSend = modelCfg?.modelName || modelId;
                const isSeedream = modelCfg?.provider === 'seedream';
                
                let finalRes = seedreamRes;
                if (isSeedream && seedreamRes.startsWith('custom:')) {
                    const customVal = seedreamRes.replace('custom:', '');
                    const minPixels = (() => {
                        const res = modelCfg?.minResolution || '2048x2048';
                        const parts = res.toLowerCase().split('x');
                        return parts.length === 2 ? parseInt(parts[0]) * parseInt(parts[1]) : 4194304;
                    })();
                    
                    if (customVal.includes(':')) {
                        const parts = customVal.split(':').map(p => parseFloat(p.trim()));
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > 0) {
                            const ratio = parts[0] / parts[1];
                            const h = Math.ceil(Math.sqrt(minPixels / ratio));
                            const w = Math.ceil(h * ratio);
                            finalRes = `${w}x${h}`;
                        }
                    } else if (customVal.toLowerCase().includes('x')) {
                        finalRes = customVal;
                    }
                }

                return {
                    prompt,
                    model: modelToSend,
                    images: imagesToSend.length > 0 ? imagesToSend : undefined,
                    parameters: {
                        aspectRatio,
                        resolution: isSeedream ? finalRes : resolution,
                        temperature,
                        ...(isSeedream && modelCfg?.minResolution && { minResolution: modelCfg.minResolution }),
                        ...(isSeedream && modelCfg?.maxResolution && { maxResolution: modelCfg.maxResolution }),
                    }
                };
            };

            // Build API call function
            const callAPI = async (payload) => {
                const response = await fetch(`${GENERATE_API_BASE}/external/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                return response.json();
            };

            // Execute calls
            const payloadA = buildPayload(selectedModel, seedreamResolution);
            
            if (isCompareMode && selectedModelB) {
                // Parallel calls for both models
                const payloadB = buildPayload(selectedModelB, seedreamResolutionB);
                
                const [dataA, dataB] = await Promise.all([
                    callAPI(payloadA),
                    callAPI(payloadB)
                ]);

                if (dataA.error) throw new Error(`Model A: ${dataA.error}`);
                if (dataB.error) throw new Error(`Model B: ${dataB.error}`);

                if (dataA.image) setGeneratedImage(dataA.image);
                if (dataB.image) setGeneratedImageB(dataB.image);
                if (dataA.thinking_process) setThinkingLog(dataA.thinking_process);
            } else {
                // Single model call
                const data = await callAPI(payloadA);
                
                if (data.error) throw new Error(data.error);
                if (data.thinking_process) setThinkingLog(data.thinking_process);
                
                if (data.status === 'success' && !data.image) {
                    simulateThinking();
                } else if (data.image) {
                    setGeneratedImage(data.image);
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
            setIsGeneratingB(false);
        }
    };

    const simulateThinking = () => {
        // Just for demo purposes if backend doesn't send it yet
        const thoughts = [
            "Analyzing prompt structure...",
            "identifying key subjects: 'futuristic city', 'neon lights'...",
            "Retrieving latent references for cyberpunk aesthetics...",
            "Optimizing token weights...",
            "Generating initial noise pattern...",
            "Denoising step 1/50...",
            "Refining details on skyscrapers...",
            "Applying gloabal illumination fix...",
            "Finalizing image output."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i >= thoughts.length) {
                clearInterval(interval);
                return;
            }
            setThinkingLog(prev => prev + (prev ? '\n' : '') + "> " + thoughts[i]);
            i++;
        }, 300);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => setInputImages(prev => [...prev, ev.target.result]);
            reader.readAsDataURL(file);
        });
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleGallerySelect = (url) => {
        setInputImages(prev => [...prev, url]); // Add to array instead of replacing
        setIsGalleryOpen(false);
    };

    const handleRemoveImage = (index) => {
        setInputImages(prev => prev.filter((_, i) => i !== index));
    };

    // Lightbox State
    const [lightboxImage, setLightboxImage] = useState(null);

    // Canvas/Doodle Modal State
    const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);

    // ... (keep existing state)

    const ASPECT_RATIOS = [
        "Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"
    ];

    // ... (keep existing effects)

    const handleClearGenerated = () => {
        setGeneratedImage(null);
    };

    return (
        <div className="flex h-full text-gray-200">
            {/* Left Control Panel */}
            <div className="w-96 border-r border-gray-700/50 p-4 flex flex-col gap-5 bg-[#1a1b26]/50 shrink-0 overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-semibold text-white">Nano Editor</h2>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Model</label>
                        <button
                            onClick={async () => {
                                try {
                                    await fetch('http://localhost:8000/api/external/reset', { method: 'POST' });
                                    // Optional: Toast notification here
                                    console.log("Chat history reset");
                                } catch (e) {
                                    console.error("Reset failed", e);
                                }
                            }}
                            className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                            title="Reset Chat Session"
                        >
                            <RefreshCcw size={10} />
                            Reset Chat
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {modelConfig.models.map(model => {
                            const colors = getProviderColors(model.provider);
                            const isActive = selectedModel === model.id;
                            return (
                                <button
                                    key={model.id}
                                    onClick={() => setSelectedModel(model.id)}
                                    className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${isActive
                                        ? `${colors.bg} ${colors.border}`
                                        : 'bg-gray-900/40 border-gray-700 hover:border-gray-600'
                                    }`}
                                >
                                    <div className={`font-medium text-sm ${isActive ? colors.text : 'text-gray-300'}`}>{model.name}</div>
                                    <div className="text-[10px] text-gray-500">{model.subtitle}</div>
                                    {/* Delete button for custom models */}
                                    {model.id.startsWith('custom-') && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setModelConfig(removeModel(modelConfig, model.id));
                                            }}
                                            className="absolute top-1 right-1 w-4 h-4 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                                            title="Remove model"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </button>
                            );
                        })}
                        {/* Add Model Button */}
                        <button
                            onClick={() => setIsAddModelOpen(true)}
                            className="p-3 rounded-lg border border-dashed border-gray-600 hover:border-purple-500/50 bg-gray-900/20 hover:bg-purple-500/10 transition-all flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-purple-400"
                            title="Add new model"
                        >
                            <Plus size={16} />
                            <span className="text-[10px]">Add Model</span>
                        </button>
                    </div>
                    
                    {/* Compare Mode Toggle */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700/50">
                        <input
                            type="checkbox"
                            id="compareMode"
                            checked={isCompareMode}
                            onChange={(e) => {
                                setIsCompareMode(e.target.checked);
                                if (!e.target.checked) {
                                    setGeneratedImageB(null);
                                }
                            }}
                            className="w-4 h-4 accent-purple-500"
                        />
                        <label htmlFor="compareMode" className="text-xs text-gray-400 cursor-pointer">
                            ⚔️ Compare Mode (2 models)
                        </label>
                    </div>
                    
                    {/* Model B Selector - Only when compare mode on */}
                    {isCompareMode && (
                        <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <label className="text-xs font-bold text-purple-400/80 uppercase tracking-widest">Model B</label>
                            <select
                                value={selectedModelB || ''}
                                onChange={(e) => setSelectedModelB(e.target.value)}
                                className="w-full mt-1 bg-gray-800 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-purple-100 focus:outline-none focus:border-purple-500"
                            >
                                <option value="">Select Model B...</option>
                                {modelConfig.models.map(model => (
                                    <option key={model.id} value={model.id}>{model.name} ({model.subtitle})</option>
                                ))}
                            </select>
                            
                            {/* Model B Seedream Resolution */}
                            {selectedModelB && modelConfig.models.find(m => m.id === selectedModelB)?.provider === 'seedream' && (
                                <div className="mt-2">
                                    <label className="text-[10px] text-purple-400/60">Resolution (B)</label>
                                    <select
                                        value={seedreamResolutionB}
                                        onChange={(e) => setSeedreamResolutionB(e.target.value)}
                                        className="w-full mt-1 bg-gray-800 border border-purple-500/30 rounded px-2 py-1 text-xs text-purple-100"
                                    >
                                        <option value="2K">2K (Auto)</option>
                                        <option value="4K">4K (High)</option>
                                        <option value="from_image_1">From Image 1</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Seedream Resolution Selector - Only visible when Seedream provider selected */}
                    {modelConfig.models.find(m => m.id === selectedModel)?.provider === 'seedream' && (
                        <div className="mt-3 space-y-2">
                            <label className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest">Seedream Resolution</label>
                            <div className="relative">
                                <select
                                    value={seedreamResolution.startsWith('custom:') ? 'custom' : seedreamResolution}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setSeedreamResolution('custom:');
                                        } else {
                                            setSeedreamResolution(e.target.value);
                                        }
                                    }}
                                    className="w-full bg-gray-800 border-2 border-cyan-500/30 hover:border-cyan-500/50 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-cyan-100 focus:outline-none transition-all appearance-none cursor-pointer shadow-lg"
                                >
                                    {seedreamResolutions.map(res => (
                                        <option key={res.value} value={res.value}>{res.label}</option>
                                    ))}
                                    <option value="custom">✏️ Custom...</option>
                                </select>
                                <div className="absolute right-3 top-2.5 pointer-events-none text-cyan-400">
                                    <Box size={12} />
                                </div>
                            </div>
                            
                            {/* Custom Resolution Input */}
                            {seedreamResolution.startsWith('custom:') && (() => {
                                const currentModel = modelConfig.models.find(m => m.id === selectedModel);
                                const minPixels = (() => {
                                    const res = currentModel?.minResolution || '2048x2048';
                                    const parts = res.toLowerCase().split('x');
                                    return parts.length === 2 ? parseInt(parts[0]) * parseInt(parts[1]) : 4194304;
                                })();
                                
                                const customValue = seedreamResolution.replace('custom:', '');
                                
                                // Parse the custom input value
                                const parseCustom = (val) => {
                                    if (!val) return null;
                                    // Check for ratio format (e.g., "1:1", "16:9")
                                    if (val.includes(':')) {
                                        const parts = val.split(':').map(p => parseFloat(p.trim()));
                                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > 0) {
                                            const ratio = parts[0] / parts[1];
                                            // Calculate dimensions that meet min pixels with this ratio
                                            const h = Math.ceil(Math.sqrt(minPixels / ratio));
                                            const w = Math.ceil(h * ratio);
                                            return { w, h, type: 'ratio', ratio: `${parts[0]}:${parts[1]}` };
                                        }
                                    }
                                    // Check for WxH format (support both 'x' and '×')
                                    const normalized = val.toLowerCase().replace(/×/g, 'x');
                                    if (normalized.includes('x')) {
                                        const parts = normalized.split('x').map(p => parseInt(p.trim()));
                                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                            return { w: parts[0], h: parts[1], type: 'exact' };
                                        }
                                    }
                                    return null;
                                };
                                
                                const parsed = parseCustom(customValue);
                                
                                const maxPixels = (() => {
                                    const res = currentModel?.maxResolution || '4096x4096';
                                    const parts = res.toLowerCase().split('x');
                                    return parts.length === 2 ? parseInt(parts[0]) * parseInt(parts[1]) : 16777216;
                                })();
                                
                                // Check validation
                                const getValidation = () => {
                                    if (!parsed) return null;
                                    const pixels = parsed.w * parsed.h;
                                    if (pixels < minPixels) return { valid: false, msg: `⚠️ Below min (${(minPixels/1000000).toFixed(1)}M)` };
                                    if (pixels > maxPixels) return { valid: false, msg: `⚠️ Above max (${(maxPixels/1000000).toFixed(1)}M)` };
                                    return { valid: true, msg: '✓ Valid' };
                                };
                                const validation = getValidation();
                                
                                // Multiplier function
                                const applyMultiplier = (mult) => {
                                    if (!parsed) return;
                                    const newW = Math.round(parsed.w * mult);
                                    const newH = Math.round(parsed.h * mult);
                                    setSeedreamResolution(`custom:${newW}x${newH}`);
                                };
                                
                                return (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={customValue}
                                                onChange={(e) => setSeedreamResolution('custom:' + e.target.value)}
                                                placeholder="1:1 or 1920x1080"
                                                className="flex-1 bg-gray-800 border border-cyan-500/40 hover:border-cyan-500/60 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:outline-none transition-all placeholder:text-gray-500"
                                            />
                                            {/* Scale controls */}
                                            {parsed && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => applyMultiplier(1 / (1 + parseFloat(document.getElementById('scaleAmount')?.value || 0.1)))}
                                                        className="px-2 py-1 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded border border-cyan-500/30"
                                                        title="Scale down"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        id="scaleAmount"
                                                        type="number"
                                                        defaultValue="0.1"
                                                        step="0.1"
                                                        min="0.1"
                                                        max="2"
                                                        className="w-12 bg-gray-800 border border-cyan-500/30 rounded px-1 py-1 text-[10px] text-cyan-100 text-center focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => applyMultiplier(1 + parseFloat(document.getElementById('scaleAmount')?.value || 0.1))}
                                                        className="px-2 py-1 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded border border-cyan-500/30"
                                                        title="Scale up"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {parsed && (
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-cyan-400">
                                                    {parsed.type === 'ratio' 
                                                        ? `📐 ${parsed.ratio} → ${parsed.w}x${parsed.h} (${(parsed.w * parsed.h / 1000000).toFixed(1)}M px)`
                                                        : `📏 ${parsed.w}x${parsed.h} (${(parsed.w * parsed.h / 1000000).toFixed(1)}M px)`
                                                    }
                                                </span>
                                                <span className={validation?.valid ? 'text-green-400' : 'text-yellow-400'}>
                                                    {validation?.msg}
                                                </span>
                                            </div>
                                        )}
                                        {!parsed && customValue && (
                                            <p className="text-[10px] text-gray-500">Enter ratio (1:1) or size (1920x1080)</p>
                                        )}
                                    </div>
                                );
                            })()}
                            {/* Validation Display */}
                            {(() => {
                                const currentModel = modelConfig.models.find(m => m.id === selectedModel);
                                const minRes = currentModel?.minResolution || '2048x2048';
                                const maxRes = currentModel?.maxResolution || '4096x4096';
                                
                                const parsePixels = (res) => {
                                    const parts = res.toLowerCase().split('x');
                                    return parts.length === 2 ? parseInt(parts[0]) * parseInt(parts[1]) : 0;
                                };
                                
                                const MIN_PIXELS = parsePixels(minRes);
                                const MAX_PIXELS = parsePixels(maxRes);
                                const minM = (MIN_PIXELS / 1000000).toFixed(1);
                                const maxM = (MAX_PIXELS / 1000000).toFixed(1);
                                
                                if (['2K', '4K'].includes(seedreamResolution)) {
                                    return <p className="text-[10px] text-green-400">✓ Valid preset</p>;
                                }
                                if (['from_image_1', 'from_image_2'].includes(seedreamResolution)) {
                                    return <p className="text-[10px] text-cyan-400">📐 Will auto-scale to valid range ({minM}M - {maxM}M px)</p>;
                                }
                                if (seedreamResolution.includes('x')) {
                                    const parts = seedreamResolution.split('x');
                                    const w = parseInt(parts[0]);
                                    const h = parseInt(parts[1]);
                                    if (!isNaN(w) && !isNaN(h)) {
                                        const pixels = w * h;
                                        const ratio = w / h;
                                        const isValid = pixels >= MIN_PIXELS && pixels <= MAX_PIXELS && ratio >= 1/16 && ratio <= 16;
                                        if (isValid) {
                                            return <p className="text-[10px] text-green-400">✓ {(pixels/1000000).toFixed(1)}M pixels</p>;
                                        } else {
                                            return <p className="text-[10px] text-red-400">✗ {(pixels/1000000).toFixed(1)}M pixels (need {minM}M-{maxM}M)</p>;
                                        }
                                    }
                                }
                                return <p className="text-[10px] text-gray-500">Select resolution</p>;
                            })()}
                        </div>
                    )}
                </div>

                {/* Input Image Controls - Multi-Image Support */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Reference Images {inputImages.length > 0 && <span className="text-purple-400">({inputImages.length})</span>}
                        </label>
                        {inputImages.length > 0 && (
                            <div className="flex gap-2">
                                <button onClick={() => { setInputImages([]); setDoodleData(null); setIsDoodleMode(false); }} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                            </div>
                        )}
                    </div>

                    {/* Upload Buttons - Always visible */}
                    <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group">
                            <Upload className="w-4 h-4 text-gray-500 group-hover:text-gray-300 mb-1" />
                            <span className="text-xs text-gray-500">Upload</span>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                        </label>
                        <button
                            onClick={() => setIsGalleryOpen(true)}
                            className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group"
                        >
                            <Folder className="w-4 h-4 text-gray-500 group-hover:text-gray-300 mb-1" />
                            <span className="text-xs text-gray-500">Gallery</span>
                        </button>
                    </div>

                    {/* Image Thumbnails Grid */}
                    {inputImages.length > 0 && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                {inputImages.map((img, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-700 aspect-square">
                                        <img
                                            src={img}
                                            alt={`Reference ${idx + 1}`}
                                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={() => setLightboxImage(img)}
                                        />
                                        {/* Image Number Badge */}
                                        <div className="absolute bottom-1 left-1 w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                                            {idx + 1}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                                            title="Remove image"
                                        >
                                            ×
                                        </button>
                                        {/* Resolution Info */}
                                        {imageDimensions[idx] && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-center py-0.5">
                                                <span className="text-gray-300">{imageDimensions[idx].w}×{imageDimensions[idx].h}</span>
                                                {modelConfig.models.find(m => m.id === selectedModel)?.provider === 'seedream' && (() => {
                                                    const currentModel = modelConfig.models.find(m => m.id === selectedModel);
                                                    const v = getSeedreamValidation(imageDimensions[idx].w, imageDimensions[idx].h, currentModel);
                                                    const colors = {
                                                        valid: 'text-green-400',
                                                        scale_up: 'text-yellow-400',
                                                        scale_down: 'text-yellow-400',
                                                        invalid: 'text-red-400',
                                                        unknown: 'text-gray-400'
                                                    };
                                                    return <span className={`ml-1 ${colors[v.status]}`}>{v.text}</span>;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setIsDrawingModalOpen(true)}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${doodleData
                                    ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                    : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                                    }`}
                            >
                                <PenTool size={14} />
                                {doodleData ? 'Edit Doodle' : 'Doodle / Mask (First Image)'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4 pt-2 border-t border-gray-800">
                    {/* Temperature */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Temperature</label>
                            <span className="text-xs font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">{temperature}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    {/* Aspect Ratio & Resolution - Only for non-Seedream providers (Gemini, etc.) */}
                    {modelConfig.models.find(m => m.id === selectedModel)?.provider !== 'seedream' && (
                    <div className="grid grid-cols-2 gap-3">
                        {/* Aspect Ratio */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Aspect Ratio</label>
                            <div className="relative">
                                <select
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full bg-gray-800 border-2 border-transparent hover:border-purple-500/30 focus:border-purple-500 rounded-lg px-2 py-2 text-xs text-purple-100 focus:outline-none transition-all appearance-none cursor-pointer shadow-lg shadow-purple-900/5"
                                >
                                    {ASPECT_RATIOS.map(ar => (
                                        <option key={ar} value={ar.toLowerCase()}>{ar}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-2.5 pointer-events-none text-purple-400">
                                    <Box size={12} />
                                </div>
                            </div>
                        </div>

                        {/* Resolution */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resolution</label>
                            <div className="relative">
                                <select
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    className="w-full bg-gray-800 border-2 border-transparent hover:border-purple-500/30 focus:border-purple-500 rounded-lg px-2 py-2 text-xs text-purple-100 focus:outline-none transition-all appearance-none cursor-pointer shadow-lg shadow-purple-900/5"
                                >
                                    {RESOLUTIONS.map(res => (
                                        <option key={res.value} value={res.value}>{res.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-2.5 pointer-events-none text-purple-400">
                                    <Palette size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                {/* Prompt Input - Fixed height, not flex-grow */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your creation..."
                        className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-500/50 resize-none transition-colors placeholder:text-gray-600"
                    />
                </div>

                {/* Thinking Tokens Display */}
                {(thinkingLog || isGenerating) && (
                    <div className="space-y-1 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                            <BrainCircuit size={12} />
                            <span>Reasoning Process</span>
                        </div>
                        <div
                            ref={thinkingLogRef}
                            className="w-full max-h-32 overflow-y-auto bg-[#0a0b10] border border-blue-900/30 rounded-md p-3 text-xs font-mono text-blue-200/80 leading-relaxed shadow-inner custom-scrollbar"
                        >
                            {thinkingLog ? (
                                <div className="whitespace-pre-wrap">{thinkingLog}</div>
                            ) : (
                                <span className="animate-pulse opacity-50">Waiting for model thoughts...</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || (!prompt && inputImages.length === 0)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg ${isGenerating || (!prompt && inputImages.length === 0)
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:brightness-110 shadow-orange-900/20 active:scale-[0.98]'
                        } `}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>GENERATING...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 text-yellow-200" />
                            <span>GENERATE</span>
                        </>
                    )}
                </button>

                {error && (
                    <div className="p-3 rounded bg-red-900/20 border border-red-500/20 text-red-400 text-xs">
                        {error}
                    </div>
                )}
            </div>

            {/* Right Canvas / Preview Area */}
            <div className="flex-grow bg-[#13141f] relative overflow-hidden flex flex-col">
                {/* Compare View Controls - Only when compare mode has results */}
                {isCompareMode && generatedImage && generatedImageB && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-1">
                        <button
                            onClick={() => setCompareView('side')}
                            className={`px-3 py-1 text-xs rounded ${compareView === 'side' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Side by Side
                        </button>
                        <button
                            onClick={() => setCompareView('a')}
                            className={`px-3 py-1 text-xs rounded ${compareView === 'a' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Full A
                        </button>
                        <button
                            onClick={() => setCompareView('b')}
                            className={`px-3 py-1 text-xs rounded ${compareView === 'b' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Full B
                        </button>
                    </div>
                )}
                
                {/* Canvas Area */}
                <div className="flex-grow flex items-center justify-center p-8 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-[#13141f]/0 to-[#13141f] pointer-events-none" />

                    {/* Compare Mode Side-by-Side Display */}
                    {isCompareMode && (generatedImage || generatedImageB || isGenerating || isGeneratingB) ? (
                        <div className={`relative z-10 w-full h-full flex ${compareView === 'side' ? 'gap-4' : ''}`}>
                            {/* Model A Result */}
                            {(compareView === 'side' || compareView === 'a') && (
                                <div className={`${compareView === 'side' ? 'w-1/2' : 'w-full'} flex flex-col items-center justify-center`}>
                                    <div className="mb-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400">
                                        {modelConfig.models.find(m => m.id === selectedModel)?.name || 'Model A'}
                                    </div>
                                    {isGenerating ? (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span>Generating...</span>
                                        </div>
                                    ) : generatedImage ? (
                                        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-700/50 bg-[#0f1016] group cursor-zoom-in"
                                             onClick={() => setLightboxImage(generatedImage)}>
                                            <img src={generatedImage} alt="Result A" className="max-w-full max-h-[70vh] object-contain" />
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-sm">No result yet</div>
                                    )}
                                </div>
                            )}
                            
                            {/* Model B Result */}
                            {(compareView === 'side' || compareView === 'b') && (
                                <div className={`${compareView === 'side' ? 'w-1/2' : 'w-full'} flex flex-col items-center justify-center`}>
                                    <div className="mb-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-400">
                                        {modelConfig.models.find(m => m.id === selectedModelB)?.name || 'Model B'}
                                    </div>
                                    {isGeneratingB ? (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span>Generating...</span>
                                        </div>
                                    ) : generatedImageB ? (
                                        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-700/50 bg-[#0f1016] group cursor-zoom-in"
                                             onClick={() => setLightboxImage(generatedImageB)}>
                                            <img src={generatedImageB} alt="Result B" className="max-w-full max-h-[70vh] object-contain" />
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-sm">No result yet</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : generatedImage ? (
                        <div className="relative z-10 shadow-2xl rounded-lg overflow-hidden border border-gray-700/50 bg-[#0f1016] group">
                            <img
                                src={generatedImage}
                                alt="Generated"
                                className="max-w-full max-h-[85vh] object-contain cursor-zoom-in"
                                onClick={() => setLightboxImage(generatedImage)}
                            />
                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    onClick={handleClearGenerated}
                                    className="p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors"
                                    title="Close / Clear Result"
                                >
                                    <Eraser size={16} />
                                </button>
                                <a
                                    href={generatedImage}
                                    download={`generated-${Date.now()}.png`}
                                    className="p-2 bg-black/60 hover:bg-blue-500/80 text-white rounded-full backdrop-blur-sm transition-colors"
                                    title="Download"
                                >
                                    <Download size={16} />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 opacity-20 select-none">
                            <div className="w-32 h-32 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
                                <ImageIcon className="w-12 h-12 text-gray-500" />
                            </div>
                            <p className="text-gray-400 text-lg font-light tracking-wide">Enter a prompt to ignite the pixels</p>
                        </div>
                    )}
                </div>


            {/* Loader Overlay - Scoped to Right Panel */}
            {isGenerating && (
                <div className="absolute inset-0 z-[50] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
                    <Loader />
                </div>
            )}
        </div>




            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <img
                        src={lightboxImage}
                        alt="Full Preview"
                        className="max-w-full max-h-full object-contain drop-shadow-2xl"
                    />
                    <button className="absolute top-5 right-5 text-white/50 hover:text-white">
                        <RefreshCcw className="rotate-45" size={32} /> {/* Using rotate-45 RefreshCcw as a close icon fallback or need X */}
                    </button>
                </div>
            )}

            {/* Doodle Drawing Modal */}
            {isDrawingModalOpen && (
                <div className="fixed inset-0 z-[50] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1b26] border border-gray-700 w-full max-w-5xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#13141f]">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <PenTool size={18} className="text-purple-400" />
                                Doodle & Mask
                            </h3>
                            <button
                                onClick={() => setIsDrawingModalOpen(false)}
                                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <RefreshCcw className="rotate-45" size={20} />
                            </button>
                        </div>

                        <div className="flex-grow bg-[#0f1016] relative flex items-center justify-center overflow-auto p-4">
                            <DrawingCanvas
                                width={800}
                                height={600}
                                backgroundImageSrc={inputImages[0] || null}
                                onUpdate={(data) => {
                                    setDoodleData(data);
                                    setIsDoodleMode(true); // Auto-enable doodle mode usage
                                }}
                            />
                        </div>
                        <div className="p-4 border-t border-gray-800 bg-[#13141f] flex justify-end gap-2">
                            <button
                                onClick={() => { setDoodleData(null); setIsDoodleMode(false); }}
                                className="px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
                            >
                                Clear Doodle
                            </button>
                            <button
                                onClick={() => setIsDrawingModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-700 font-medium shadow-lg"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Model Modal */}
            <AddModelModal
                isOpen={isAddModelOpen}
                onClose={() => setIsAddModelOpen(false)}
                onSave={(newModel) => {
                    setModelConfig(addModel(modelConfig, newModel));
                }}
                providers={modelConfig.providers}
            />

            {/* Gallery Picker Modal */}
            <GalleryPickerModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelectImage={handleGallerySelect}
            />
        </div>
    );
};

export default EditorView;
