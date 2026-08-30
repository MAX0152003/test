import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FlipHorizontal, 
  Move, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Crop,
  Sparkles
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedDataUrl: string) => void;
  title?: string;
  readAloudEnabled?: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  title = "Crop & Re-align Profile Picture",
  readAloudEnabled = false
}) => {
  const [scale, setScale] = React.useState<number>(1);
  const [rotation, setRotation] = React.useState<number>(0);
  const [flipH, setFlipH] = React.useState<boolean>(false);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropShape, setCropShape] = React.useState<'circle' | 'square'>('circle');

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imageObjRef = React.useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Load and cache image
  React.useEffect(() => {
    if (!imageSrc || !isOpen) {
      setImageLoaded(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageObjRef.current = img;
      setImageLoaded(true);
      // Reset transform states on fresh open
      setScale(1);
      setRotation(0);
      setFlipH(false);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      setImageLoaded(false);
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Redraw preview canvas
  const renderPreview = React.useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    // Move to center
    ctx.translate(size / 2, size / 2);

    // Apply rotation & flip
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, 1);

    // Apply offset and user zoom
    ctx.translate(offset.x, offset.y);

    // Compute base scale to cover viewport
    const imgAspect = img.width / img.height;
    let baseW = size;
    let baseH = size;
    if (imgAspect > 1) {
      baseW = size * imgAspect;
      baseH = size;
    } else {
      baseW = size;
      baseH = size / imgAspect;
    }

    const drawW = baseW * scale;
    const drawH = baseH * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imageLoaded, scale, rotation, flipH, offset]);

  React.useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Pointer drag handling for both mouse and touch
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Step nudges
  const nudge = (dx: number, dy: number) => {
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const resetAll = () => {
    setScale(1);
    setRotation(0);
    setFlipH(false);
    setOffset({ x: 0, y: 0 });
  };

  const handleSaveCrop = () => {
    const img = imageObjRef.current;
    if (!img) return;

    // Generate high-quality 320x320 avatar output
    const outputCanvas = document.createElement('canvas');
    const outSize = 320;
    outputCanvas.width = outSize;
    outputCanvas.height = outSize;
    const outCtx = outputCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    outCtx.save();
    outCtx.translate(outSize / 2, outSize / 2);
    outCtx.rotate((rotation * Math.PI) / 180);
    outCtx.scale(flipH ? -1 : 1, 1);
    outCtx.translate(offset.x, offset.y);

    const imgAspect = img.width / img.height;
    let baseW = outSize;
    let baseH = outSize;
    if (imgAspect > 1) {
      baseW = outSize * imgAspect;
      baseH = outSize;
    } else {
      baseW = outSize;
      baseH = outSize / imgAspect;
    }

    const drawW = baseW * scale;
    const drawH = baseH * scale;

    outCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    outCtx.restore();

    // Export as clean JPEG/PNG data URL
    const croppedDataUrl = outputCanvas.toDataURL('image/jpeg', 0.88);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-left max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-450 dark:text-zinc-400">
                Drag to align, use slider to zoom, or rotate to fit perfectly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 flex flex-col items-center">
          {/* Interactive Crop Viewport Frame */}
          <div 
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-2xl bg-zinc-900 overflow-hidden shadow-inner cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center border-2 border-emerald-500/40"
            title="Drag with mouse or touch to re-align photo position"
          >
            {/* Canvas layer */}
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Circular Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div 
                className={`w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] ${
                  cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                } border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-emerald-500/60 relative`}
              >
                {/* Crosshairs & grid */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-full h-[1px] bg-white" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="h-full w-[1px] bg-white" />
                </div>
              </div>
            </div>

            {/* Subtle drag prompt badge */}
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[9px] text-white/90 font-mono flex items-center gap-1.5 pointer-events-none">
              <Move className="w-3 h-3 text-emerald-400" />
              <span>Drag to Pan</span>
            </div>

            {/* Shape Switcher Pill */}
            <div className="absolute top-2 right-2 flex gap-1 bg-black/70 backdrop-blur-xs p-1 rounded-xl pointer-events-auto">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCropShape('circle'); }}
                className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  cropShape === 'circle' ? 'bg-emerald-500 text-black shadow-xs' : 'text-zinc-300 hover:text-white'
                }`}
              >
                Circle
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCropShape('square'); }}
                className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  cropShape === 'square' ? 'bg-emerald-500 text-black shadow-xs' : 'text-zinc-300 hover:text-white'
                }`}
              >
                Square
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full max-w-[340px] space-y-3 pt-1">
            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
                  <ZoomIn className="w-3.5 h-3.5 text-emerald-500" /> Scale / Zoom
                </span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale(s => Math.max(0.6, +(s - 0.1).toFixed(2)))}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.6"
                  max="3.0"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setScale(s => Math.min(3.0, +(s + 0.1).toFixed(2)))}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Transform & Alignment Action Grid */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{rotation}°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlipH(f => !f)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    flipH 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                  }`}
                  title="Flip photo horizontally"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Reset alignment and zoom"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Pan D-Pad Nudge Buttons */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => nudge(-15, 0)} 
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  title="Nudge Left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => nudge(0, -15)} 
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  title="Nudge Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => nudge(0, 15)} 
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  title="Nudge Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => nudge(15, 0)} 
                  className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  title="Nudge Right"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-end gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save & Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
