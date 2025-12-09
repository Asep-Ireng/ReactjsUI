import React, { useState, useEffect } from 'react';
import { useGenerationContext } from '../context/GenerationContext.jsx';
import { Folder, Image as ImageIcon, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

const GalleryView = () => {
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [images, setImages] = useState([]);
    const [loadingFolders, setLoadingFolders] = useState(true);
    const [loadingImages, setLoadingImages] = useState(false);
    const [error, setError] = useState(null);

    const { setModalImageSrc, setIsModalOpen } = useGenerationContext();

    // Fetch folders on mount
    useEffect(() => {
        fetchFolders();
    }, []);

    // Fetch images when folder changes
    useEffect(() => {
        if (selectedFolder) {
            fetchImages(selectedFolder);
        } else {
            setImages([]);
        }
    }, [selectedFolder]);

    const fetchFolders = async () => {
        setLoadingFolders(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/gallery-folders`);
            if (!response.ok) throw new Error('Failed to fetch folders');
            const data = await response.json();
            setFolders(data);
            // Auto-select first folder if available
            if (data.length > 0 && !selectedFolder) {
                setSelectedFolder(data[0].name);
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching folders:', err);
        } finally {
            setLoadingFolders(false);
        }
    };

    const fetchImages = async (folderName) => {
        setLoadingImages(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/gallery-images/${folderName}`);
            if (!response.ok) throw new Error('Failed to fetch images');
            const data = await response.json();
            setImages(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching images:', err);
        } finally {
            setLoadingImages(false);
        }
    };

    const handleImageClick = (image) => {
        setModalImageSrc(`${API_BASE}${image.url}`);
        setIsModalOpen(true);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="gallery-view">
            {/* Folder Sidebar */}
            <div className="gallery-folder-sidebar">
                <div className="gallery-folder-header">
                    <h3>
                        <Folder size={18} />
                        <span>Folders</span>
                    </h3>
                    <button
                        className="gallery-refresh-btn"
                        onClick={fetchFolders}
                        title="Refresh folders"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <div className="gallery-folder-list">
                    {loadingFolders ? (
                        <div className="gallery-loading">
                            <Loader2 className="spin" size={24} />
                            <span>Loading...</span>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="gallery-empty">No folders found</div>
                    ) : (
                        folders.map(folder => (
                            <button
                                key={folder.name}
                                className={`gallery-folder-item ${selectedFolder === folder.name ? 'active' : ''}`}
                                onClick={() => setSelectedFolder(folder.name)}
                            >
                                <Folder size={16} />
                                <span className="folder-name">{folder.name}</span>
                                <span className="folder-count">{folder.imageCount}</span>
                                <ChevronRight size={14} className="folder-arrow" />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Image Grid */}
            <div className="gallery-content">
                <div className="gallery-content-header">
                    <h2>
                        <ImageIcon size={20} />
                        <span>{selectedFolder || 'Select a folder'}</span>
                    </h2>
                    {selectedFolder && (
                        <span className="image-count">{images.length} images</span>
                    )}
                </div>

                <div className="gallery-image-grid">
                    {loadingImages ? (
                        <div className="gallery-loading full">
                            <Loader2 className="spin" size={32} />
                            <span>Loading images...</span>
                        </div>
                    ) : error ? (
                        <div className="gallery-error">
                            <span>⚠️ {error}</span>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="gallery-empty full">
                            {selectedFolder ? 'No images in this folder' : 'Select a folder to view images'}
                        </div>
                    ) : (
                        images.map(image => (
                            <div
                                key={image.name}
                                className="gallery-image-item"
                                onClick={() => handleImageClick(image)}
                            >
                                <img
                                    src={`${API_BASE}${image.url}`}
                                    alt={image.name}
                                    loading="lazy"
                                />
                                <div className="image-overlay">
                                    <span className="image-name">{image.name}</span>
                                    <span className="image-size">{formatFileSize(image.size)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GalleryView;
