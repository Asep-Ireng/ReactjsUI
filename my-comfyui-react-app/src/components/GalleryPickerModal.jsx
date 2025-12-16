import React, { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, X, Search, ChevronRight, Loader2 } from 'lucide-react';
// import { API_BASE_URL } from '../api/comfyui';

// Reuse logic from GalleryView but simpler for selection
const GalleryPickerModal = ({ isOpen, onClose, onSelectImage }) => {
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [images, setImages] = useState([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [loadingImages, setLoadingImages] = useState(false);

    // We'll assume the same API endpoints exist as GalleryView used:
    // /api/gallery-folders and /api/gallery-images/:folderName
    // Note: GalleryView used a local 'API_BASE' constant 'http://localhost:3001'
    // We should probably double check where that server lives. 
    // In comfyui.js, MODEL_LIST_API_BASE is port 3001. 
    // Let's use the explicit 3001 port for now to match GalleryView's behavior.

    const GALLERY_API = "http://192.168.50.106:3001";

    useEffect(() => {
        if (isOpen) {
            fetchFolders();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedFolder) {
            fetchImages(selectedFolder);
        } else {
            setImages([]);
        }
    }, [selectedFolder]);

    const fetchFolders = async () => {
        setLoadingFolders(true);
        try {
            const res = await fetch(`${GALLERY_API}/api/gallery-folders`);
            if (res.ok) {
                const data = await res.json();
                setFolders(data);
                if (data.length > 0 && !selectedFolder) setSelectedFolder(data[0].name);
            }
        } catch (e) {
            console.error("Failed to load folders", e);
        } finally {
            setLoadingFolders(false);
        }
    };

    const fetchImages = async (folder) => {
        setLoadingImages(true);
        try {
            const res = await fetch(`${GALLERY_API}/api/gallery-images/${folder}`);
            if (res.ok) {
                const data = await res.json();
                setImages(data);
            }
        } catch (e) {
            console.error("Failed to load images", e);
        } finally {
            setLoadingImages(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-10">
            <div className="bg-[#1a1b26] border border-gray-700 w-full max-w-5xl h-[80vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#13141f]">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Select Image from Gallery</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-grow overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-[#13141f]/50 border-r border-gray-800 overflow-y-auto p-2 space-y-1">
                        {loadingFolders ? (
                            <div className="flex items-center justify-center h-20 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                        ) : folders.map(f => (
                            <button
                                key={f.name}
                                onClick={() => setSelectedFolder(f.name)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all ${selectedFolder === f.name
                                    ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Folder size={16} />
                                    <span className="truncate">{f.name}</span>
                                </div>
                                <ChevronRight size={14} className={`opacity-0 transition-opacity ${selectedFolder === f.name ? 'opacity-100' : ''}`} />
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="flex-grow bg-[#0f1016] p-4 overflow-y-auto custom-scrollbar">
                        {loadingImages ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                <span>Loading images...</span>
                            </div>
                        ) : images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <ImageIcon size={48} className="opacity-20 mb-2" />
                                <p>No images found in this folder</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {images.map(img => (
                                    <button
                                        key={img.name}
                                        onClick={() => onSelectImage(`${GALLERY_API}${img.url}`)}
                                        className="group relative aspect-square rounded-lg overflow-hidden border border-gray-800 hover:border-purple-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <img
                                            src={`${GALLERY_API}${img.url}`}
                                            alt={img.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalleryPickerModal;
