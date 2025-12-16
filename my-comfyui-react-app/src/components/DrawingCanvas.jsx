import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, Undo, Trash2 } from 'lucide-react';

const DrawingCanvas = ({ width, height, backgroundImageSrc, onUpdate }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mode, setMode] = useState('brush'); // 'brush' or 'eraser'
    const [brushSize, setBrushSize] = useState(5);
    const [color, setColor] = useState('#FFFFFF'); // Default white
    // const [history, setHistory] = useState([]); // Array of imageData

    // Initialize canvas context
    const getCtx = () => canvasRef.current?.getContext('2d');

    useEffect(() => {
        // Handle resize or initial setup if needed
    }, []);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        const ctx = getCtx();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : color;
        ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ctx = getCtx();
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            getCtx().closePath();
            // Notify parent of update
            if (onUpdate) {
                onUpdate(canvasRef.current.toDataURL());
            }
        }
    };

    const clearCanvas = () => {
        const ctx = getCtx();
        ctx.clearRect(0, 0, width, height);
        if (onUpdate) onUpdate(null);
    };

    return (
        <div className="relative group" style={{ width, height }}>
            {/* Background Image Layer */}
            {backgroundImageSrc && (
                <img
                    src={backgroundImageSrc}
                    alt="Canvas Bg"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                    style={{ width: '100%', height: '100%' }} // Ensure fit
                />
            )}

            {/* Drawing Layer */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="absolute inset-0 z-10 cursor-crosshair touch-none"
            />

            {/* Toolbar (Floating) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#1a1b26] border border-gray-700 p-2 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setMode('brush')}
                    className={`p-2 rounded-full transition-colors ${mode === 'brush' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Pen size={16} />
                </button>
                <button
                    onClick={() => setMode('eraser')}
                    className={`p-2 rounded-full transition-colors ${mode === 'eraser' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Eraser size={16} />
                </button>

                <div className="w-px h-6 bg-gray-700 mx-1" />

                {/* Color Picker */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-600 cursor-pointer hover:scale-110 transition-transform">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute -top-2 -left-2 w-12 h-12 p-0 border-0 cursor-pointer"
                    />
                </div>

                <div className="w-px h-6 bg-gray-700 mx-1" />

                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 accent-purple-500"
                />

                <div className="w-px h-6 bg-gray-700 mx-1" />

                <button onClick={clearCanvas} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-500/10">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default DrawingCanvas;
