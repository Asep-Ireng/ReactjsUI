import React, { useState, useRef } from 'react';
import { Video, Upload, Folder, Play, Download, Loader2, X, Film, Volume2, Camera, Clock, Ratio, Dice5 } from 'lucide-react';
import { GENERATE_API_BASE } from '../api/comfyui';
import GalleryPickerModal from './GalleryPickerModal';

const VideoSection = () => {
    // Core State
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [statusLog, setStatusLog] = useState('');
    
    // Generated Video
    const [generatedVideo, setGeneratedVideo] = useState(null);
    const [videoDuration, setVideoDuration] = useState(null);
    
    // First Frame Image (optional)
    const [firstFrameImage, setFirstFrameImage] = useState(null);
    const [lastFrameImage, setLastFrameImage] = useState(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryTarget, setGalleryTarget] = useState('first'); // 'first' or 'last'
    
    // Video Settings
    const [resolution, setResolution] = useState('720p');
    const [ratio, setRatio] = useState('16:9');
    const [duration, setDuration] = useState(5);
    const [seed, setSeed] = useState(-1);  // -1 = random
    const [cameraFixed, setCameraFixed] = useState(false);
    const [generateAudio, setGenerateAudio] = useState(false);
    
    const fileInputFirstRef = useRef(null);
    const fileInputLastRef = useRef(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedVideo(null);
        setStatusLog('> Submitting video generation task...\n> This may take 30-120 seconds...');

        try {
            const payload = {
                prompt,
                model: 'seedance-1-5-pro-251215',
                first_frame_image: firstFrameImage || undefined,
                last_frame_image: lastFrameImage || undefined,
                resolution,
                ratio,
                duration,
                seed,
                camera_fixed: cameraFixed,
                generate_audio: generateAudio
            };

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
                setVideoDuration(data.duration);
                setStatusLog(prev => prev + `\n> ✅ Video generated successfully!\n> Duration: ${data.duration || 'N/A'}s`);
            } else if (data.video_base64) {
                setGeneratedVideo(`data:video/mp4;base64,${data.video_base64}`);
                setStatusLog(prev => prev + `\n> ✅ Video generated successfully!`);
            } else {
                throw new Error('No video returned from API');
            }

        } catch (err) {
            setError(err.message);
            setStatusLog(prev => prev + `\n> ❌ Error: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = (e, target) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (target === 'first') {
                    setFirstFrameImage(ev.target.result);
                } else {
                    setLastFrameImage(ev.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleGallerySelect = (url) => {
        if (galleryTarget === 'first') {
            setFirstFrameImage(url);
        } else {
            setLastFrameImage(url);
        }
        setIsGalleryOpen(false);
    };

    const handleDownload = () => {
        if (generatedVideo) {
            const link = document.createElement('a');
            link.href = generatedVideo;
            link.download = `video_${Date.now()}.mp4`;
            link.click();
        }
    };

    return (
        <div className="flex h-full text-gray-200">
            {/* Left Control Panel */}
            <div className="w-96 border-r border-gray-700/50 p-4 flex flex-col gap-5 bg-[#1a1b26]/50 shrink-0 overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                    <Film className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">Video Generation</h2>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Seedance</span>
                </div>

                {/* First Frame Image (Optional) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        First Frame <span className="text-gray-600">(Optional)</span>
                    </label>
                    
                    {firstFrameImage ? (
                        <div className="relative rounded-lg overflow-hidden border border-purple-500/30">
                            <img src={firstFrameImage} alt="First Frame" className="w-full h-32 object-cover" />
                            <button
                                onClick={() => setFirstFrameImage(null)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group">
                                <Upload className="w-4 h-4 text-gray-500 group-hover:text-gray-300 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                                <input 
                                    ref={fileInputFirstRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => handleFileUpload(e, 'first')} 
                                />
                            </label>
                            <button
                                onClick={() => { setGalleryTarget('first'); setIsGalleryOpen(true); }}
                                className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group"
                            >
                                <Folder className="w-4 h-4 text-gray-500 group-hover:text-gray-300 mb-1" />
                                <span className="text-xs text-gray-500">Gallery</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Last Frame Image (Optional) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Last Frame <span className="text-gray-600">(Optional)</span>
                    </label>
                    
                    {lastFrameImage ? (
                        <div className="relative rounded-lg overflow-hidden border border-purple-500/30">
                            <img src={lastFrameImage} alt="Last Frame" className="w-full h-32 object-cover" />
                            <button
                                onClick={() => setLastFrameImage(null)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group">
                                <Upload className="w-4 h-4 text-gray-500 group-hover:text-gray-300 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                                <input 
                                    ref={fileInputLastRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => handleFileUpload(e, 'last')} 
                                />
                            </label>
                            <button
                                onClick={() => { setGalleryTarget('last'); setIsGalleryOpen(true); }}
                                className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group"
                            >
                                <Folder className="w-4 h-4 text-gray-500 group-hover:text-gray-300 mb-1" />
                                <span className="text-xs text-gray-500">Gallery</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Video Settings */}
                <div className="space-y-3 pt-3 border-t border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-400/80 uppercase tracking-widest">🎬 Video Settings</span>
                    </div>

                    {/* Resolution & Aspect Ratio */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Video size={10} /> Resolution
                            </label>
                            <select
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                className="w-full mt-1 bg-gray-800 border border-purple-500/30 rounded px-2 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                            >
                                <option value="480p">480p</option>
                                <option value="720p">720p (Default)</option>
                                <option value="1080p">1080p</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Ratio size={10} /> Aspect Ratio
                            </label>
                            <select
                                value={ratio}
                                onChange={(e) => setRatio(e.target.value)}
                                className="w-full mt-1 bg-gray-800 border border-purple-500/30 rounded px-2 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                            >
                                <option value="adaptive">Adaptive (Auto)</option>
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                                <option value="4:3">4:3</option>
                                <option value="3:4">3:4</option>
                                <option value="1:1">1:1 (Square)</option>
                                <option value="21:9">21:9 (Cinematic)</option>
                            </select>
                        </div>
                    </div>

                    {/* Duration Slider */}
                    <div>
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock size={10} /> Duration
                            </label>
                            <span className="text-[10px] font-mono text-purple-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                {duration === -1 ? 'Auto' : `${duration}s`}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="-1"
                            max="12"
                            step="1"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-1"
                        />
                        <div className="flex justify-between text-[8px] text-gray-500 mt-0.5">
                            <span>Auto</span>
                            <span>4s</span>
                            <span>8s</span>
                            <span>12s</span>
                        </div>
                    </div>

                    {/* Seed Input */}
                    <div>
                        <label className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Dice5 size={10} /> Seed
                        </label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="number"
                                value={seed}
                                onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                                placeholder="-1 = random"
                                className="flex-1 bg-gray-800 border border-purple-500/30 rounded px-2 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                            />
                            <button
                                onClick={() => setSeed(-1)}
                                className="px-2 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded border border-purple-500/30 text-xs"
                                title="Randomize"
                            >
                                <Dice5 size={14} />
                            </button>
                        </div>
                        <p className="text-[8px] text-gray-500 mt-0.5">-1 = random, or enter a specific seed</p>
                    </div>

                    {/* Toggle Options */}
                    <div className="flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cameraFixed}
                                onChange={(e) => setCameraFixed(e.target.checked)}
                                className="w-4 h-4 accent-purple-500 rounded"
                            />
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Camera size={12} /> Fixed Camera
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={generateAudio}
                                onChange={(e) => setGenerateAudio(e.target.checked)}
                                className="w-4 h-4 accent-purple-500 rounded"
                            />
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Volume2 size={12} /> Generate Audio
                            </span>
                        </label>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your video... e.g., 'A drone flying through mountains at sunrise, cinematic movement'"
                        className="w-full h-28 bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        isGenerating
                            ? 'bg-purple-600/50 text-purple-200 cursor-wait'
                            : prompt.trim()
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/30'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Video...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Generate Video
                        </>
                    )}
                </button>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-xs">
                        ❌ {error}
                    </div>
                )}

                {/* Status Log */}
                {statusLog && (
                    <div className="mt-2 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Status</label>
                        <pre className="mt-1 text-[11px] text-gray-400 whitespace-pre-wrap font-mono">{statusLog}</pre>
                    </div>
                )}
            </div>

            {/* Right Preview Panel */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#0f0f14]">
                {generatedVideo ? (
                    <div className="w-full max-w-3xl space-y-4">
                        <video
                            src={generatedVideo}
                            controls
                            autoPlay
                            loop
                            className="w-full rounded-lg shadow-2xl border border-purple-500/30"
                        />
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download size={16} />
                                Download Video
                            </button>
                            <button
                                onClick={() => setGeneratedVideo(null)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <X size={16} />
                                Clear
                            </button>
                        </div>
                        {videoDuration && (
                            <p className="text-center text-xs text-gray-500">Duration: {videoDuration}s</p>
                        )}
                    </div>
                ) : isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                        <p className="text-gray-400 text-sm">Generating video...</p>
                        <p className="text-gray-500 text-xs">This may take 30-120 seconds</p>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <Film className="w-16 h-16 text-gray-700 mx-auto" />
                        <p className="text-gray-500 text-sm">Enter a prompt and click Generate to create a video</p>
                        <p className="text-gray-600 text-xs">Optionally add first/last frame images</p>
                    </div>
                )}
            </div>

            {/* Gallery Picker Modal */}
            <GalleryPickerModal
                isOpen={isGalleryOpen}
                onSelectImage={handleGallerySelect}
                onClose={() => setIsGalleryOpen(false)}
            />
        </div>
    );
};

export default VideoSection;
