
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Wand2, Upload, Eraser, Move, Download, RefreshCw, PanelRightOpen, PanelRightClose, Palette, Box, Folder, PenTool, Sparkles, Image as ImageIcon, Loader2, BrainCircuit, RefreshCcw } from 'lucide-react';
import { GENERATE_API_BASE } from '../api/comfyui';
import GalleryPickerModal from './GalleryPickerModal';
import DrawingCanvas from './DrawingCanvas';
import SciFiButton from './SciFiButton';
import Loader from './Loader';

const EditorView = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('flash'); // 'flash' or 'pro'
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState(null);

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
    
    // Seedream validation helper
    const getSeedreamValidation = (w, h) => {
        if (!w || !h) return { status: 'unknown', text: '?' };
        const MIN_PIXELS = 3686400;
        const MAX_PIXELS = 16777216;
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
    
    // Seedream-specific resolution (uses Method 2 with valid pixel ranges)
    const [seedreamResolution, setSeedreamResolution] = useState('2K');
    
    const SEEDREAM_RESOLUTIONS = [
        { label: "2K (Auto)", value: "2K" },
        { label: "4K (High)", value: "4K" },
        { label: "From Image 1", value: "from_image_1" },
        { label: "From Image 2", value: "from_image_2" },
        { label: "1:1 (2048x2048)", value: "2048x2048" },
        { label: "16:9 (2560x1440)", value: "2560x1440" },
        { label: "9:16 (1440x2560)", value: "1440x2560" },
        { label: "4:3 (2304x1728)", value: "2304x1728" },
        { label: "3:4 (1728x2304)", value: "1728x2304" },
    ];

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

        setIsGenerating(true);
        setError(null);
        setThinkingLog(''); // Clear previous log

        try {
            // Prepare payload
            // If doodle data exists, include it as first image
            // Then add all reference images
            let imagesToSend = [...inputImages];
            if (isDoodleMode && doodleData) {
                imagesToSend = [doodleData, ...inputImages];
            }

            const payload = {
                prompt,
                model: selectedModel,
                images: imagesToSend.length > 0 ? imagesToSend : undefined,
                parameters: {
                    aspectRatio,
                    resolution: selectedModel === 'seedream' ? seedreamResolution : resolution,
                    temperature
                }
            };

            const response = await fetch(`${GENERATE_API_BASE}/external/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Handle Thinking/Reasoning Log if present
            if (data.thinking_process) {
                setThinkingLog(data.thinking_process);
            }

            if (data.status === 'success' && !data.image) {
                console.log("Mock success");
                // Simulate typing effect for thinking log if mock
                if (!data.thinking_process) {
                    simulateThinking();
                }
            } else if (data.image) {
                setGeneratedImage(data.image);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
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
                        <button
                            onClick={() => setSelectedModel('flash')}
                            className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${selectedModel === 'flash'
                                ? 'bg-yellow-500/10 border-yellow-500/50'
                                : 'bg-gray-900/40 border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            <div className={`font-medium text-sm ${selectedModel === 'flash' ? 'text-yellow-400' : 'text-gray-300'}`}>Nano Banana</div>
                            <div className="text-[10px] text-gray-500">Fast (Flash)</div>
                        </button>
                        <button
                            onClick={() => setSelectedModel('pro')}
                            className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${selectedModel === 'pro'
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-gray-900/40 border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            <div className={`font-medium text-sm ${selectedModel === 'pro' ? 'text-purple-400' : 'text-gray-300'}`}>Banana Pro</div>
                            <div className="text-[10px] text-gray-500">Gemini 3 Pro</div>
                        </button>
                        <button
                            onClick={() => setSelectedModel('seedream')}
                            className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${selectedModel === 'seedream'
                                ? 'bg-cyan-500/10 border-cyan-500/50'
                                : 'bg-gray-900/40 border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            <div className={`font-medium text-sm ${selectedModel === 'seedream' ? 'text-cyan-400' : 'text-gray-300'}`}>Seedream</div>
                            <div className="text-[10px] text-gray-500">4.5 (Cheap)</div>
                        </button>
                    </div>
                    
                    {/* Seedream Resolution Selector - Only visible when Seedream selected */}
                    {selectedModel === 'seedream' && (
                        <div className="mt-3 space-y-1">
                            <label className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest">Seedream Resolution</label>
                            <div className="relative">
                                <select
                                    value={seedreamResolution}
                                    onChange={(e) => setSeedreamResolution(e.target.value)}
                                    className="w-full bg-gray-800 border-2 border-cyan-500/30 hover:border-cyan-500/50 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-cyan-100 focus:outline-none transition-all appearance-none cursor-pointer shadow-lg"
                                >
                                    {SEEDREAM_RESOLUTIONS.map(res => (
                                        <option key={res.value} value={res.value}>{res.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-2.5 pointer-events-none text-cyan-400">
                                    <Box size={12} />
                                </div>
                            </div>
                            {/* Validation Display */}
                            {(() => {
                                const MIN_PIXELS = 3686400;
                                const MAX_PIXELS = 16777216;
                                
                                if (['2K', '4K'].includes(seedreamResolution)) {
                                    return <p className="text-[10px] text-green-400">✓ Valid preset</p>;
                                }
                                if (['from_image_1', 'from_image_2'].includes(seedreamResolution)) {
                                    return <p className="text-[10px] text-cyan-400">📐 Will auto-scale to valid range (3.7M - 16.8M px)</p>;
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
                                            return <p className="text-[10px] text-red-400">✗ {(pixels/1000000).toFixed(1)}M pixels (need 3.7M-16.8M)</p>;
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
                                                {selectedModel === 'seedream' && (() => {
                                                    const v = getSeedreamValidation(imageDimensions[idx].w, imageDimensions[idx].h);
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

                    {/* Aspect Ratio & Resolution - Only for Gemini models */}
                    {selectedModel !== 'seedream' && (
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
                {/* Canvas Area */}
                <div className="flex-grow flex items-center justify-center p-8 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-[#13141f]/0 to-[#13141f] pointer-events-none" />

                    {generatedImage ? (
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

            {/* Existing Models */}
            <GalleryPickerModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelectImage={handleGallerySelect}
            />
        </div>
    );
};

export default EditorView;
