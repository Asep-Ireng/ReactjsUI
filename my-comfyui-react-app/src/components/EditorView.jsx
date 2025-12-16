
import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Upload, Eraser, Move, Download, RefreshCw, PanelRightOpen, PanelRightClose, Palette, Box, Folder, PenTool, Sparkles, Image as ImageIcon, Loader2, BrainCircuit, RefreshCcw } from 'lucide-react';
import { GENERATE_API_BASE } from '../api/comfyui';
import GalleryPickerModal from './GalleryPickerModal';
import DrawingCanvas from './DrawingCanvas';
import SciFiButton from './SciFiButton';

const EditorView = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('flash'); // 'flash' or 'pro'
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState(null);

    // Reasoning/Thinking Log
    const [thinkingLog, setThinkingLog] = useState('');
    const thinkingLogRef = useRef(null);

    // Input Image State
    const [inputImage, setInputImage] = useState(null); // base64 or URL
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isDoodleMode, setIsDoodleMode] = useState(false);

    // Canvas State
    const [doodleData, setDoodleData] = useState(null);

    // Advanced Settings
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [resolution, setResolution] = useState('1024x1024'); // Default 1K
    const [temperature, setTemperature] = useState(1.0);

    const ASPECT_RATIOS = [
        "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"
    ];

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
        if (!prompt && !inputImage && !doodleData) return;

        setIsGenerating(true);
        setError(null);
        setThinkingLog(''); // Clear previous log

        try {
            // Prepare payload
            // If doodle data exists, use that (it should be the composite or mask)
            // Ideally we composites them on client or send layered data. 
            // For now, if Doodling, send doodleData as image. Else inputImage.

            const payload = {
                prompt,
                model: selectedModel,
                image: isDoodleMode && doodleData ? doodleData : inputImage,
                parameters: {
                    aspectRatio,
                    resolution,
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
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setInputImage(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleGallerySelect = (url) => {
        setInputImage(url); // Note: DrawingCanvas might need CrossOrigin support if URL is different domain
        setIsGalleryOpen(false);
    };

    return (
        <div className="flex h-full text-gray-200">
            {/* Left Control Panel */}
            <div className="w-96 border-r border-gray-700/50 p-4 flex flex-col gap-5 bg-[#1a1b26]/50 shrink-0">

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
                    <div className="grid grid-cols-2 gap-2">
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
                            <div className="text-[10px] text-gray-500">Quality (Gemini 3)</div>
                        </button>
                    </div>
                </div>

                {/* Input Image Controls */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reference Image</label>
                        {inputImage && (
                            <button onClick={() => { setInputImage(null); setDoodleData(null); setIsDoodleMode(false); }} className="text-xs text-red-400 hover:text-red-300">Clear</button>
                        )}
                    </div>

                    {!inputImage ? (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group">
                                <Upload className="w-5 h-5 text-gray-500 group-hover:text-gray-300 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                            <button
                                onClick={() => setIsGalleryOpen(true)}
                                className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group"
                            >
                                <Folder className="w-5 h-5 text-gray-500 group-hover:text-gray-300 mb-1" />
                                <span className="text-xs text-gray-500">Gallery</span>
                            </button>
                        </div>
                    ) : (
                        <div className="relative rounded-lg overflow-hidden border border-gray-700 group">
                            <img src={inputImage} alt="Reference" className="w-full h-32 object-cover opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setIsDoodleMode(!isDoodleMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all ${isDoodleMode
                                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105'
                                        : 'bg-gray-900/90 text-white border border-gray-600 hover:bg-gray-800'
                                        }`}
                                >
                                    <PenTool size={12} />
                                    {isDoodleMode ? 'Doodling Active' : 'Doodle / Edit'}
                                </button>
                            </div>
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
                                        <option key={ar} value={ar}>{ar}</option>
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
                </div>

                {/* Prompt Input */}
                <div className="space-y-2 flex-grow flex flex-col min-h-0">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your creation..."
                        className="w-full h-32 flex-grow bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-500/50 resize-none transition-colors placeholder:text-gray-600"
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
                    disabled={isGenerating || (!prompt && !inputImage)}
                    className={`w - full py - 3.5 rounded - xl font - bold text - sm tracking - wide flex items - center justify - center gap - 2 transition - all shadow - lg ${isGenerating || (!prompt && !inputImage)
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
                        <div className="relative z-10 shadow-2xl rounded-lg overflow-hidden border border-gray-700/50 bg-[#0f1016]">
                            <img src={generatedImage} alt="Generated" className="max-w-full max-h-[85vh] object-contain" />
                        </div>
                    ) : isDoodleMode && inputImage ? (
                        <div className="relative z-10 shadow-2xl rounded-lg overflow-hidden border border-purple-500/30 bg-[#0f1016]">
                            {/* We need fixed dimensions for canvas, or responsive. For MVP, we'll let it size naturally but constraint it */}
                            <div className="relative max-w-full max-h-[85vh]">
                                <DrawingCanvas
                                    width={800} // Fixed workspace for now or dynamic
                                    height={600} // Dynamic implementation requires image aspect ratio check
                                    backgroundImageSrc={inputImage}
                                    onUpdate={setDoodleData}
                                />
                            </div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50 bg-black/50 px-3 py-1 rounded-full pointer-events-none">
                                Draw on the image to mask or guide
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
            </div>

            {/* Modals */}
            <GalleryPickerModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelectImage={handleGallerySelect}
            />
        </div>
    );
};

export default EditorView;
