import React from 'react';
import './SciFiButton.css';
import { Wand2, Loader2 } from 'lucide-react';

const SciFiButton = ({ onClick, disabled, loading, label = "GENERATE" }) => {
    return (
        <div className="scifi-button-container opacity-90 hover:opacity-100 transition-opacity">
            <div className="scifi-button-border">
                {/* Border effect container */}
            </div>

            <div className="scifi-button">
                {/* The actual clickable element */}
                <button
                    className="scifi-real-button"
                    onClick={onClick}
                    disabled={disabled || loading}
                />

                {/* Visual Content */}
                <div className="z-10 flex flex-col items-center justify-center gap-1">
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    ) : (
                        <Wand2 className="w-6 h-6 text-purple-400" />
                    )}
                    <span className="text-[10px] font-bold tracking-widest text-purple-100">
                        {loading ? 'THINKING' : label}
                    </span>
                </div>

                {/* Animated Background Layers */}
                <div className="scifi-drop"></div>
                <div className="scifi-spin scifi-spin-blur"></div>
                <div className="scifi-spin scifi-spin-intense"></div>
                <div className="scifi-spin scifi-spin-inside"></div>
            </div>
        </div>
    );
};

export default SciFiButton;
