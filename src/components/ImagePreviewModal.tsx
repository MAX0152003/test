import React from 'react';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Check, 
  FileImage,
  ExternalLink 
} from 'lucide-react';

export interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  fileName?: string;
  readAloudEnabled?: boolean;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image Attachment Preview',
  subtitle,
  fileName = 'classpulse_attachment.png',
  readAloudEnabled = false
}) => {
  const [scale, setScale] = React.useState<number>(1);
  const [rotation, setRotation] = React.useState<number>(0);
  const [isSaved, setIsSaved] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Reset transform state when modal opens with new image
  React.useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setIsSaved(false);
      setIsSaving(false);
    }
  }, [isOpen, imageUrl]);

  // Keyboard accessibility: Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(s + 0.25, 3));
      } else if (e.key === '-') {
        setScale(s => Math.max(s - 0.25, 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    setIsSaving(true);
    try {
      // Determine clean filename
      const cleanFileName = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')
        ? fileName
        : `${fileName}.png`;

      // If it's a data URL (base64)
      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = cleanFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fetch as blob or fallback to canvas conversion to bypass CORS download limits
        try {
          const response = await fetch(imageUrl, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = cleanFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          } else {
            throw new Error('Direct fetch failed');
          }
        } catch (fetchErr) {
          // Fallback via Image drawing on Canvas
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = cleanFileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          };
          img.onerror = () => {
            // Direct window / anchor fallback
            const link = document.createElement('a');
            link.href = imageUrl;
            link.target = '_blank';
            link.download = cleanFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };
          img.src = imageUrl;
        }
      }

      setIsSaved(true);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(`Image saved successfully: ${cleanFileName}`, 'success');
      }
      if (readAloudEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance("Image saved to your downloads folder successfully.");
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
      }
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Error saving image:', err);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Failed to save image. Try right clicking to save.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Header bar */}
      <div 
        className="w-full max-w-5xl flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-white shadow-2xl z-10 mb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
            <FileImage className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-zinc-100 truncate tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-zinc-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-750">
            <button
              type="button"
              onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
              title="Zoom Out (-)"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono px-1.5 font-bold text-zinc-300 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale(s => Math.min(s + 0.25, 3))}
              title="Zoom In (+)"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotation(r => (r + 90) % 360)}
              title="Rotate 90°"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setScale(1); setRotation(0); }}
              title="Reset View"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SAVE / DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md active:scale-95 ${
              isSaved
                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-black stroke-[3]" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Save Image</span>
              </>
            )}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        className="w-full max-w-5xl flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4 rounded-3xl bg-zinc-950/70 border border-zinc-850/80 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`
          }}
        >
          <img
            src={imageUrl}
            alt={title || 'Attachment Preview'}
            className="max-h-[72vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-zinc-800/80"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-2 text-center text-[10px] text-zinc-500 font-mono">
        Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Esc</kbd> to close • Click "Save Image" to download to your device
      </div>
    </div>
  );
};
