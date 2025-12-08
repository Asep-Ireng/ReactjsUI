import React, { useState, useEffect, useRef } from 'react';
import { loadTags, searchTags, getCurrentToken, escapeTag, TAG_TYPES } from '../utils/tagUtils';
import ReactDOM from 'react-dom';

const TagAutocomplete = ({ id, value, onChange, rows = 3, placeholder, className }) => {
    const [tags, setTags] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
    const [tokenInfo, setTokenInfo] = useState(null);

    const textareaRef = useRef(null);
    const suggestionBoxRef = useRef(null);

    const highlightMatch = (text, query) => {
        if (!query) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        const before = text.substring(0, index);
        const match = text.substring(index, index + query.length);
        const after = text.substring(index + query.length);

        return (
            <>
                {before}
                <span className="font-bold text-[#d9b25c] underline">{match}</span>
                {after}
            </>
        );
    };

    // Load tags on mount
    useEffect(() => {
        let mounted = true;
        loadTags().then(loadedTags => {
            if (mounted) setTags(loadedTags);
        }).catch(err => console.error("Failed to load tags", err));
        return () => { mounted = false; };
    }, []);

    // Handle outside click to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target) &&
                textareaRef.current && !textareaRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    // Adjust position to stay in viewport
    useEffect(() => {
        if (!showSuggestions || !suggestionBoxRef.current) return;

        const box = suggestionBoxRef.current;
        const rect = box.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newTop = cursorPosition.top;
        let newLeft = cursorPosition.left;

        // Check horizontal overflow
        if (rect.right > viewportWidth) {
            newLeft = viewportWidth - rect.width - 20; // 20px padding from edge
        }
        if (newLeft < 0) newLeft = 20;

        // Check vertical overflow
        if (rect.bottom > viewportHeight) {
            newTop = cursorPosition.top - rect.height - 30; // 30px to roughly match line height in reverse + padding
        } else {
            // Default shift down
            newTop = cursorPosition.top + 20;
        }

        // Apply
        box.style.top = `${newTop}px`;
        box.style.left = `${newLeft}px`;

    }, [showSuggestions, cursorPosition.top, cursorPosition.left, suggestions]);

    const updateSuggestions = (text, cursor) => {
        const tokenData = getCurrentToken(text, cursor);
        if (tokenData && tokenData.token.trim().length >= 2) { // Only suggest after 2 chars
            setTokenInfo(tokenData);

            // Calculate cursor coordinates for popup positioning
            // We'll use a hidden div mirror approach or simple approximation
            // For simplicity/performance in React, approximation works well enough or `textarea-caret` lib replacement 
            // But let's try a simple offset relative to textarea for now, or fixed "near cursor" via a mirror.
            // Implementing a basic mirror for coordinates:
            const coords = getCaretCoordinates(textareaRef.current, cursor);
            setCursorPosition({
                top: coords.top + 20, // offset line height
                left: coords.left
            });

            const matches = searchTags(tags, tokenData.token, 50);
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleInput = (e) => {
        const newVal = e.target.value;
        onChange(e); // Propagate change
        updateSuggestions(newVal, e.target.selectionStart);
    };

    const handleSelect = (tag) => {
        if (!tokenInfo) return;

        const escapedTag = escapeTag(tag.name);
        const textBefore = value.substring(0, tokenInfo.start);
        const textAfter = value.substring(tokenInfo.end);

        // Construct new value
        const newValue = textBefore + escapedTag + textAfter;

        // Fire change event manually since we bypassing standard input
        // We need to match the signature expected by parents usually (synthetic event or value)
        // ControlPanel expects e.target.value usually
        onChange({ target: { value: newValue } });

        setShowSuggestions(false);

        // Restore focus and move cursor
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = tokenInfo.start + escapedTag.length;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % suggestions.length);
            // Auto-scroll logic if needed
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (suggestions[selectedIndex]) {
                handleSelect(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
        }
    };

    // --- Caret Position Helper (Mirror Div) ---
    const getCaretCoordinates = (element, position) => {
        if (!element) return { top: 0, left: 0 };
        // This is a simplified version. For robustness, consider using a library 'textarea-caret' 
        // or replicating all styles (font, padding, etc).
        // Given the complexity of the current environment, we will use a "good enough" approximation 
        // by cloning styles to a hidden div.

        const div = document.createElement('div');
        const style = window.getComputedStyle(element);

        Array.from(style).forEach(prop => {
            div.style[prop] = style.getPropertyValue(prop);
        });

        div.style.position = 'absolute';
        div.style.top = '0px';
        div.style.left = '0px';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.width = element.offsetWidth + 'px';
        div.style.height = 'auto';
        div.style.overflow = 'hidden';

        div.textContent = element.value.substring(0, position);

        const span = document.createElement('span');
        span.textContent = element.value.substring(position) || '.';
        div.appendChild(span);

        document.body.appendChild(div);

        const rect = element.getBoundingClientRect();
        const spanOffset = span.offsetTop;
        const spanLeft = span.offsetLeft;

        document.body.removeChild(div);

        // We want coordinates relative to the viewport or closest relative parent?
        // We'll use fixed positioning for the suggestion box relative to the viewport 
        // to avoid z-index/overflow issues.

        return {
            top: rect.top + spanOffset + window.scrollY,
            left: rect.left + spanLeft + window.scrollX
        };
    };

    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                id={id}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onSelect={(e) => updateSuggestions(e.target.value, e.target.selectionStart)}
                rows={rows}
                placeholder={placeholder}
                className={className || "w-full bg-[#0d1117] text-gray-200 border border-[#30363d] rounded p-2 focus:border-[#d9b25c] focus:outline-none transition-colors font-mono text-sm"}
            />

            {showSuggestions && ReactDOM.createPortal(
                <div
                    ref={suggestionBoxRef}
                    style={{
                        top: cursorPosition.top,
                        left: cursorPosition.left,
                        position: 'absolute',
                        zIndex: 9999,
                        opacity: showSuggestions ? 1 : 0
                    }}
                    className="bg-[#181818] border border-[#d9b25c] rounded-md shadow-lg max-h-60 w-80 overflow-y-auto flex flex-col"
                >
                    {suggestions.map((tag, idx) => {
                        const typeInfo = TAG_TYPES[tag.type] || TAG_TYPES[0];
                        return (
                            <div
                                key={tag.name + idx}
                                onClick={() => handleSelect(tag)}
                                className={`p-2 cursor-pointer flex items-center justify-between gap-2 border-b border-[#30363d] last:border-0 ${idx === selectedIndex ? 'bg-[#2c313a]' : 'hover:bg-[#21262d]'}`}
                            >
                                <div className="flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="text-xs font-bold px-1.5 py-0.5 rounded text-[#181818]"
                                            style={{ backgroundColor: typeInfo.color }}
                                        >
                                            {typeInfo.label}
                                        </span>
                                        <span className="text-[#e6edf3] font-medium truncate">
                                            {highlightMatch(tag.name, tokenInfo?.token || "")}
                                        </span>
                                    </div>
                                    {tag.aliases && (
                                        <span className="text-xs text-gray-500 truncate ml-1">
                                            {highlightMatch(tag.aliases, tokenInfo?.token || "")}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-600 font-mono">
                                    {tag.count > 1000 ? (tag.count / 1000).toFixed(0) + 'k' : tag.count}
                                </span>
                            </div>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
};

export default TagAutocomplete;
