import React, { useState, useRef } from 'react';
import { uploadCommunityAvatar } from '../lib/supabase';

interface AvatarUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Generate random hex color
const generateRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
};

// Convert HSL to hex
const hslToHex = (hsl: string): string => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#000000';

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const AvatarUpload: React.FC<AvatarUploadProps> = ({ onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color] = useState(generateRandomColor());
  const [accentColor] = useState(generateRandomColor());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be less than 5MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('File must be JPG, PNG, or WebP');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-generate name from filename if empty
    if (!name) {
      const baseName = file.name.split('.')[0].replace(/[-_]/g, ' ').toUpperCase();
      setName(baseName.slice(0, 20));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !name.trim()) {
      setError('Please select a file and enter a name');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const hexColor = hslToHex(color);
      const hexAccentColor = hslToHex(accentColor);

      await uploadCommunityAvatar(selectedFile, name.trim(), hexColor, hexAccentColor);

      // Success!
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-cyan-500/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Upload Avatar
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Preview Area */}
        <div className="mb-6">
          {preview ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-lg"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full text-white font-bold transition-colors"
                >
                  ×
                  </button>
              </div>
              <p className="text-slate-400 text-sm">{selectedFile?.name}</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl p-12 text-center cursor-pointer transition-all group"
            >
              <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">📁</div>
              <p className="text-slate-400 group-hover:text-cyan-400 transition-colors">
                Click to select an image
              </p>
              <p className="text-slate-600 text-xs mt-2">JPG, PNG, or WebP (max 5MB)</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-300 mb-2">
            Avatar Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Enter a name..."
            maxLength={20}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <p className="text-slate-500 text-xs mt-1">{name.length}/20 characters</p>
        </div>

        {/* Color Preview */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1">
            <p className="text-sm text-slate-400 mb-2">Primary Color</p>
            <div
              className="h-10 rounded-lg border-2 border-white/20"
              style={{ background: color }}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-400 mb-2">Accent Color</p>
            <div
              className="h-10 rounded-lg border-2 border-white/20"
              style={{ background: accentColor }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !name.trim() || uploading}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            !selectedFile || !name.trim() || uploading
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg'
          }`}
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Uploading...
            </span>
          ) : (
            'Upload Avatar'
          )}
        </button>

        {/* Info */}
        <p className="text-slate-500 text-xs text-center mt-4">
          Your avatar will be available to all players globally
        </p>
      </div>
    </div>
  );
};

export default AvatarUpload;
