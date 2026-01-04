import React, { useState } from 'react';
import { Plus, X, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';
import { GENERATE_API_BASE } from '../api/comfyui';

const AddModelModal = ({ isOpen, onClose, onSave, providers }) => {
  const [provider, setProvider] = useState(providers[0]?.id || 'gemini');
  const [modelName, setModelName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  
  // Seedream-specific resolution constraints
  const [minResolution, setMinResolution] = useState('1280x720');
  const [maxResolution, setMaxResolution] = useState('4096x4096');
  
  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }

  const handleTest = async () => {
    if (!modelName.trim()) {
      setTestResult({ success: false, message: 'Please enter a model name first' });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`${GENERATE_API_BASE}/external/test-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider,
          model_name: modelName.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResult({ success: true, message: 'Model validated successfully!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Model validation failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: `Connection error: ${error.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!modelName.trim() || !displayName.trim()) return;
    
    const newModel = {
      id: `custom-${Date.now()}`,
      name: displayName.trim(),
      modelName: modelName.trim(),
      subtitle: subtitle.trim() || provider,
      provider,
      // Include resolution constraints for Seedream provider
      ...(provider === 'seedream' && {
        minResolution: minResolution.trim() || '1280x720',
        maxResolution: maxResolution.trim() || '4096x4096',
      }),
    };
    
    onSave(newModel);
    handleClose();
  };

  const handleClose = () => {
    setProvider(providers[0]?.id || 'gemini');
    setModelName('');
    setDisplayName('');
    setSubtitle('');
    setMinResolution('1280x720');
    setMaxResolution('4096x4096');
    setTestResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1b26] border border-gray-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#13141f]">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Plus size={18} className="text-purple-400" />
            Add New Model
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Provider Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-gray-800 border-2 border-gray-700 hover:border-purple-500/50 focus:border-purple-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-all"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Model Name (API identifier) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Model Name <span className="text-gray-600">(API identifier)</span>
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., gemini-2.5-flash-image"
              className="w-full bg-gray-800 border-2 border-gray-700 hover:border-purple-500/50 focus:border-purple-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Flash Image"
              className="w-full bg-gray-800 border-2 border-gray-700 hover:border-purple-500/50 focus:border-purple-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Subtitle (optional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Subtitle <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Fast & Cheap"
              className="w-full bg-gray-800 border-2 border-gray-700 hover:border-purple-500/50 focus:border-purple-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Resolution Constraints - Only for Seedream provider */}
          {provider === 'seedream' && (
            <div className="space-y-2 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                Resolution Limits
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Min Resolution</label>
                  <input
                    type="text"
                    value={minResolution}
                    onChange={(e) => setMinResolution(e.target.value)}
                    placeholder="1280x720"
                    className="w-full bg-gray-800 border border-gray-700 hover:border-cyan-500/50 focus:border-cyan-500 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Max Resolution</label>
                  <input
                    type="text"
                    value={maxResolution}
                    onChange={(e) => setMaxResolution(e.target.value)}
                    placeholder="4096x4096"
                    className="w-full bg-gray-800 border border-gray-700 hover:border-cyan-500/50 focus:border-cyan-500 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500">
                Format: WIDTHxHEIGHT (e.g., 1920x1080)
              </p>
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTest}
            disabled={isTesting || !modelName.trim()}
            className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              isTesting || !modelName.trim()
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-600/30'
            }`}
          >
            {isTesting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap size={14} />
                Test Model
              </>
            )}
          </button>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
              testResult.success 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {testResult.success ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="mt-0.5 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#13141f] flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!modelName.trim() || !displayName.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
              !modelName.trim() || !displayName.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            Save Model
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddModelModal;
