/**
 * CheckNoGrau — Galeria de múltiplas fotos por pergunta do checklist.
 *
 * Funcionalidades:
 *  - Thumbnails das fotos já anexadas
 *  - Botão "+ Adicionar Foto" sempre visível (câmera ou galeria)
 *  - Lightbox para visualizar em tela cheia
 *  - Excluir foto individualmente
 *  - Compressão automática antes do upload (via evidence.ts)
 *  - Spinner individual por foto durante upload
 *  - Retry em caso de falha
 *  - Limite configurável (padrão: 10 fotos)
 *  - Offline: guarda como data URL e sincroniza depois
 */

import { useRef, useState } from 'react';
import { Camera, Image as GalleryIcon, X, ZoomIn, Loader2, RotateCcw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadEvidencePhoto } from '@/lib/operations/evidence';

const PURPLE = '#7C3AED';
const DEFAULT_MAX = 10;

interface Props {
  /** Lista de URLs já salvas. */
  photos: string[];
  executionId: string;
  /** Máximo de fotos permitido (padrão 10). */
  maxPhotos?: number;
  /** Callback chamado quando a lista muda (adicionar ou remover). */
  onChange: (photos: string[]) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'error';

interface Slot {
  url: string;
  state: UploadState;
  /** Arquivo original guardado para retry em caso de erro. */
  file?: File;
}

export function PhotoGalleryUploader({
  photos,
  executionId,
  maxPhotos = DEFAULT_MAX,
  onChange,
  disabled = false,
}: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  // Mapeamos as URLs existentes em slots estáveis; novos uploads entram como 'uploading'
  const [slots, setSlots] = useState<Slot[]>(() =>
    photos.map((url) => ({ url, state: 'idle' as UploadState })),
  );
  const [lightbox, setLightbox] = useState<string | null>(null);

  const busy = slots.some((s) => s.state === 'uploading');
  const canAdd = !disabled && !busy && slots.length < maxPhotos;

  /** Atualiza os slots e propaga as URLs confirmadas ao pai. */
  const sync = (next: Slot[]) => {
    setSlots(next);
    onChange(next.filter((s) => s.state === 'idle').map((s) => s.url));
  };

  const doUpload = async (file: File): Promise<void> => {
    // Slot temporário com estado uploading
    const tempUrl = URL.createObjectURL(file);
    const tempSlot: Slot = { url: tempUrl, state: 'uploading', file };

    setSlots((prev) => {
      const next = [...prev, tempSlot];
      return next;
    });

    try {
      let finalUrl: string;
      if (!navigator.onLine) {
        // offline: usa data URL
        finalUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = () => rej(r.error);
          r.readAsDataURL(file);
        });
        toast.success('Foto salva (offline).');
      } else {
        finalUrl = await uploadEvidencePhoto(file, executionId);
        toast.success('Foto adicionada.');
      }

      URL.revokeObjectURL(tempUrl);

      setSlots((prev) => {
        const next = prev.map((s) =>
          s.url === tempUrl ? { url: finalUrl, state: 'idle' as UploadState } : s,
        );
        onChange(next.filter((s) => s.state === 'idle').map((s) => s.url));
        return next;
      });
    } catch (e: any) {
      URL.revokeObjectURL(tempUrl);
      setSlots((prev) =>
        prev.map((s) =>
          s.url === tempUrl ? { url: '', state: 'error' as UploadState, file } : s,
        ),
      );
      toast.error(e?.message ?? 'Falha ao enviar foto.');
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const remaining = maxPhotos - slots.length;
    const toUpload = Array.from(fileList).slice(0, remaining);
    if (toUpload.length === 0) {
      toast.error(`Limite de ${maxPhotos} fotos atingido.`);
      return;
    }
    toUpload.forEach((f) => doUpload(f));
  };

  const handleRetry = (slot: Slot) => {
    if (!slot.file) return;
    setSlots((prev) => prev.filter((s) => s !== slot));
    doUpload(slot.file);
  };

  const handleRemove = (index: number) => {
    setSlots((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onChange(next.filter((s) => s.state === 'idle').map((s) => s.url));
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Contador */}
      {slots.length > 0 && (
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {slots.filter((s) => s.state === 'idle').length} foto{slots.filter((s) => s.state === 'idle').length !== 1 ? 's' : ''} anexada{slots.filter((s) => s.state === 'idle').length !== 1 ? 's' : ''}
          {maxPhotos > 0 && ` · máx. ${maxPhotos}`}
        </p>
      )}

      {/* Grid de thumbnails */}
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="relative aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5"
          >
            {slot.state === 'uploading' ? (
              /* Spinner durante upload */
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
              </div>
            ) : slot.state === 'error' ? (
              /* Slot de erro com retry */
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                <p className="text-[10px] text-red-500">Falha</p>
                <button
                  type="button"
                  onClick={() => handleRetry(slot)}
                  className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600"
                >
                  <RotateCcw className="h-3 w-3" /> Tentar
                </button>
              </div>
            ) : (
              /* Foto carregada */
              <>
                <img
                  src={slot.url}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {/* Botões sobrepostos */}
                <div className="absolute inset-0 flex items-end justify-between p-1.5 opacity-0 transition-opacity hover:opacity-100 bg-gradient-to-t from-black/40 to-transparent">
                  <button
                    type="button"
                    onClick={() => setLightbox(slot.url)}
                    className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm"
                    aria-label="Ampliar"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(i)}
                      className="rounded-full bg-red-500/80 p-1.5 text-white backdrop-blur-sm"
                      aria-label="Excluir foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Slot vazio — placeholder quando não tem fotos */}
        {slots.length === 0 && (
          <div className="col-span-3 flex h-32 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 dark:border-white/10">
            <Camera className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Botões de ação */}
      {canAdd && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
          >
            <Camera className="h-4 w-4" style={{ color: PURPLE }} />
            Câmera
          </button>
          <button
            type="button"
            onClick={() => galRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
          >
            <GalleryIcon className="h-4 w-4" style={{ color: PURPLE }} />
            Galeria
          </button>
        </div>
      )}

      {/* Botão "+ Adicionar Foto" quando já existem fotos */}
      {canAdd && slots.length > 0 && (
        <button
          type="button"
          onClick={() => galRef.current?.click()}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold transition-colors',
            'border-purple-200 text-[#7C3AED] hover:bg-purple-50 dark:border-purple-500/20 dark:hover:bg-purple-500/5',
          )}
        >
          <Plus className="h-4 w-4" />
          Adicionar mais fotos
        </button>
      )}

      {/* Limite atingido */}
      {!canAdd && slots.length >= maxPhotos && !disabled && (
        <p className="text-center text-xs text-gray-400">
          Limite de {maxPhotos} fotos atingido.
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Visualizar foto"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
