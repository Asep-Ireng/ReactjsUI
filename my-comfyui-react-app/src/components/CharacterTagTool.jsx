import React, { useState, useEffect } from "react";
import { Copy, ArrowRight } from "lucide-react"; // Assuming Lucide is available since it's in package.json

const CharacterTagTool = ({ onInsert }) => {
    const [charName, setCharName] = useState("");
    const [origin, setOrigin] = useState("");
    const [costume, setCostume] = useState("");
    const [isCosplay, setIsCosplay] = useState(false);
    const [output, setOutput] = useState("");

    const escape = (str) => {
        if (!str) return "";
        return str.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    };

    useEffect(() => {
        // Logic: character_name (costume_name) (copyright) (cosplay)
        // Minimal: character_name (copyright)

        if (!charName) {
            setOutput("");
            return;
        }

        const cleanChar = charName.toLowerCase().trim();
        const cleanOrigin = origin.toLowerCase().trim();
        const cleanCostume = costume.toLowerCase().trim();

        let parts = [cleanChar];

        if (cleanCostume) {
            parts.push(`(${cleanCostume})`);
        }

        if (cleanOrigin) {
            parts.push(`(${cleanOrigin})`);
        }

        if (isCosplay) {
            parts.push("(cosplay)");
        }

        const rawTag = parts.join(" ");
        setOutput(escape(rawTag));
    }, [charName, origin, costume, isCosplay]);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(output);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement("textarea");
                textArea.value = output;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    const handleInsert = () => {
        if (onInsert && output) {
            onInsert(output);
        }
    };

    return (
        <div className="character-tag-tool bg-[#181818] border border-[#504c4a] rounded-lg p-4 mt-4">
            <h3 className="text-[#d9b25c] font-bold border-b border-[#504c4a] pb-2 mb-3">
                Character Tag Tool
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Character Name</label>
                    <input
                        type="text"
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-gray-200 focus:border-[#d9b25c] outline-none"
                        placeholder="e.g. hatsune miku"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Origin / Series</label>
                    <input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-gray-200 focus:border-[#d9b25c] outline-none"
                        placeholder="e.g. vocaloid"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Costume Name (Optional)</label>
                    <input
                        type="text"
                        value={costume}
                        onChange={(e) => setCostume(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-gray-200 focus:border-[#d9b25c] outline-none"
                        placeholder="e.g. maid"
                    />
                </div>

                <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="cb-cosplay"
                            checked={isCosplay}
                            onChange={(e) => setIsCosplay(e.target.checked)}
                            className="accent-[#d9b25c] w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="cb-cosplay" className="text-sm text-gray-200 cursor-pointer select-none">
                            Is Cosplay?
                        </label>
                    </div>
                </div>
            </div>

            {output && (
                <div className="mt-4 p-3 bg-[#0d1117] border border-[#30363d] rounded flex items-center justify-between group">
                    <code className="text-[#d9b25c] text-sm font-mono break-all">{output}</code>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-1.5 text-gray-400 hover:text-white bg-[#21262d] hover:bg-[#30363d] rounded transition-colors"
                            title="Copy to clipboard"
                        >
                            <Copy size={16} />
                        </button>
                        <button
                            onClick={handleInsert}
                            className="flex items-center gap-1 px-2 py-1.5 text-[#181818] bg-[#d9b25c] hover:bg-[#e49b0f] rounded text-xs font-bold transition-colors"
                            title="Insert into prompt"
                        >
                            <ArrowRight size={14} /> Insert
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CharacterTagTool;
