/**
 * Visualizador de imagem em tela cheia com zoom/pan (scroll, clique, arrastar) e
 * navegação entre várias fotos. Usado nas evidências das tarefas concluídas.
 * Padrão inspirado no visualizador de comprovantes da Frota (módulos independentes).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.6;

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const open = index != null;
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  // reset ao abrir ou trocar de foto
  useEffect(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, [index]);

  const clampPan = (p: { x: number; y: number }, level: number) => {
    const max = 220 * (level - 1);
    return { x: Math.max(-max, Math.min(max, p.x)), y: Math.max(-max, Math.min(max, p.y)) };
  };
  const applyZoom = (next: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    setZoomLevel(clamped);
    setPan((p) => (clamped <= MIN_ZOOM ? { x: 0, y: 0 } : clampPan(p, clamped)));
  };

  const canPrev = open && images.length > 1;
  const go = useCallback((delta: number) => {
    if (index == null) return;
    onIndexChange((index + delta + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  // teclado: setas navegam, esc fecha (o Dialog já trata esc)
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, go]);

  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); applyZoom(zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)); };
  const handleClick = () => { if (zoomLevel === MIN_ZOOM) applyZoom(2.2); };
  const handleDouble = () => applyZoom(zoomLevel > MIN_ZOOM ? MIN_ZOOM : 2.6);
  const handleDown = (e: React.PointerEvent) => {
    if (zoomLevel <= MIN_ZOOM) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    setIsDragging(true);
  };
  const handleMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setPan(clampPan({ x: dragStateRef.current.startPanX + dx, y: dragStateRef.current.startPanY + dy }, zoomLevel));
  };
  const handleUp = () => { dragStateRef.current = null; setIsDragging(false); };

  const src = index != null ? images[index] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 bg-black/95 border-none [&>button]:text-white [&>button]:z-20">
        <DialogHeader className="sr-only"><DialogTitle>Evidência ampliada</DialogTitle></DialogHeader>
        {src && (
          <div
            className="relative flex h-full w-full touch-none select-none items-center justify-center overflow-hidden"
            onWheel={handleWheel}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerLeave={handleUp}
            onDoubleClick={handleDouble}
            onClick={handleClick}
          >
            <img
              src={src}
              alt="Evidência ampliada"
              draggable={false}
              className={`h-auto max-h-[85vh] w-auto max-w-[90vw] select-none object-contain ${isDragging ? '' : 'transition-transform duration-150'}`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                cursor: zoomLevel > MIN_ZOOM ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              }}
            />

            {/* Navegação entre fotos */}
            {canPrev && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80" title="Anterior">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80" title="Próxima">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white tabular-nums">
                  {index! + 1} / {images.length}
                </span>
              </>
            )}

            {/* Toolbar de zoom */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 px-2 py-1.5"
              onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => applyZoom(zoomLevel - ZOOM_STEP)} disabled={zoomLevel <= MIN_ZOOM} title="Diminuir zoom"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-11 text-center text-xs font-medium text-white tabular-nums">{Math.round(zoomLevel * 100)}%</span>
              <button type="button" onClick={() => applyZoom(zoomLevel + ZOOM_STEP)} disabled={zoomLevel >= MAX_ZOOM} title="Aumentar zoom"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
                <ZoomIn className="h-4 w-4" />
              </button>
              {zoomLevel > MIN_ZOOM && (
                <button type="button" onClick={() => applyZoom(MIN_ZOOM)} className="h-8 rounded-full px-2 text-xs font-medium text-white hover:bg-white/10">
                  Redefinir
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
