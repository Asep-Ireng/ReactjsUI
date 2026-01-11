import React from 'react';
import { Palette, Image, Settings, Wand2, Film } from 'lucide-react';

const Sidebar = ({ activeView, onViewChange }) => {
    const navItems = [
        { id: 'generation', icon: Palette, label: 'Generation', tooltip: 'Image Generation' },
        { id: 'editor', icon: Wand2, label: 'Editor', tooltip: 'AI Editor (Nano Banana)' },
        { id: 'video', icon: Film, label: 'Video', tooltip: 'Video Generation (Seedance)' },
        { id: 'gallery', icon: Image, label: 'Gallery', tooltip: 'Output Gallery' },
        { id: 'settings', icon: Settings, label: 'Settings', tooltip: 'Settings' },
    ];

    return (
        <nav className="sidebar-nav">
            <div className="sidebar-logo">
                <span className="logo-icon">🎨</span>
            </div>

            <div className="sidebar-menu">
                {navItems.map(item => {
                    const IconComponent = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => onViewChange(item.id)}
                            title={item.tooltip}
                        >
                            <IconComponent className="sidebar-icon" size={22} />
                            <span className="sidebar-label">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default Sidebar;
