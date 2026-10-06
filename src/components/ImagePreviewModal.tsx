import React from 'react';
import { 
  X, 
  Download, 
  Check
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

/**
 * Standard, modern, clean photo viewer (just like Facebook Messenger, WhatsApp, and Google Photos)
 * Displays the photo centered without heavy toolbar frames or coordinate diagnostic panels.
 */
export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Photo',
  subtitle,
  fileName = 'photo.png',
  readAloudEnabled = false
}) => {
  const [isSaved, setIsSaved] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const cleanFileName = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp')
        ? fileName
        : `${fileName}.png`;

      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = cleanFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
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
        } catch {
          const link = document.createElement('a');
          link.href = imageUrl;
          link.target = '_blank';
          link.download = cleanFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      setIsSaved(true);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Photo saved to downloads', 'success');
      }
      if (readAloudEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance("Photo saved to your downloads folder.");
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
      }
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Error saving image:', err);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Failed to save photo. Try saving directly.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col justify-between p-3 sm:p-6 bg-black/90 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Floating Header */}
      <div 
        className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 pr-2">
          {title && (
            <h3 className="text-sm font-semibold text-white/95 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-white/60 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isSaving}
            title="Save photo to device"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-sm"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span className="hidden xs:inline text-emerald-400">Saved</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="hidden xs:inline">Save</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 text-white/90 hover:text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Photo Centerpiece */}
      <div 
        className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center min-h-0 py-2 sm:py-4"
        onClick={onClose}
      >
        <img
          src={imageUrl}
          alt={title || 'Photo'}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[82vh] max-w-[94vw] sm:max-w-[85vw] object-contain rounded-2xl shadow-2xl transition-all cursor-default"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Bottom Hint */}
      <div className="w-full text-center text-[11px] text-white/40 font-sans py-1">
        Tap anywhere or press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">Esc</kbd> to exit
      </div>
    </div>
  );
};
