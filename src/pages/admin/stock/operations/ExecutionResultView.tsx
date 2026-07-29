/**
 * Visualização (leitura) do resultado de uma execução concluída: cada item com
 * a resposta, fotos (evidências), GPS, comentário, assinatura e validação.
 * As fotos abrem num visualizador interno com zoom (lupa), sem sair da página.
 */

import { useMemo, useState } from 'react';
import { Check, X, Star, MapPin, ImageOff, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExecutionResult, type ResultItem } from '@/hooks/operations/useExecutionResult';
import { itemTypeLabel } from '@/lib/operations/itemTypes';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageLightbox } from './ImageLightbox';

function itemPhotos(it: ResultItem): string[] {
  // a foto costuma ser gravada 2x (em photo_url do item e na evidência) — dedup por URL.
  const urls = [it.photo_url, ...it.evidences.map((e) => e.photo_url)].filter(Boolean) as string[];
  return Array.from(new Set(urls));
}

function AnswerValue({ it }: { it: ResultItem }) {
  switch (it.item_type) {
    case 'boolean':
      return (
        <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', it.value_boolean ? 'text-green-600' : 'text-red-600')}>
          {it.value_boolean ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{it.value_boolean ? 'Sim' : 'Não'}
        </span>
      );
    case 'rating':
      return (
        <span className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={cn('h-4 w-4', n <= (it.value_number ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
          ))}
        </span>
      );
    case 'number': case 'temperature': case 'range':
      return <span className="text-sm font-semibold text-gray-900 dark:text-white">{it.value_number ?? '—'}</span>;
    case 'multi_choice':
      return <span className="text-sm text-gray-900 dark:text-white">{Array.isArray(it.value_json) ? (it.value_json as string[]).join(', ') : '—'}</span>;
    case 'date':
      return <span className="text-sm text-gray-900 dark:text-white">{it.value_text ? new Date(it.value_text + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>;
    default:
      return <span className="text-sm text-gray-900 dark:text-white">{it.value_text || '—'}</span>;
  }
}

/** Miniatura com lupa no hover; ao clicar abre a foto no visualizador. */
function Thumb({ src, onOpen }: { src: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} title="Ampliar"
      className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
      <img src={src} alt="Evidência" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
        <ZoomIn className="h-5 w-5 text-white" />
      </span>
    </button>
  );
}

export function ExecutionResultView({ executionId, completedBy }: { executionId: string; completedBy?: string | null }) {
  const { data, isLoading } = useExecutionResult(executionId, completedBy);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = data?.items ?? [];

  // lista achatada de todas as fotos da execução (na ordem em que aparecem),
  // com o índice inicial de cada item — para navegar entre elas no visualizador.
  const { allPhotos, offsets } = useMemo(() => {
    const all: string[] = [];
    const offs: number[] = [];
    for (const it of items) {
      offs.push(all.length);
      all.push(...itemPhotos(it));
    }
    return { allPhotos: all, offsets: offs };
  }, [items]);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="space-y-3">
      {data?.executor && (
        <p className="text-sm text-gray-500 dark:text-white/50">Executado por <span className="font-semibold text-gray-900 dark:text-white">{data.executor}</span></p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Sem itens registrados nesta execução.</p>
      ) : (
        items.map((it, idx) => {
          const gps = it.evidences.find((e) => e.latitude != null && e.longitude != null);
          const photos = itemPhotos(it);
          return (
            <div key={it.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/80">{it.item_name}</p>
                  <p className="text-[11px] uppercase text-gray-400">{itemTypeLabel(it.item_type)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AnswerValue it={it} />
                  {it.passed != null && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      it.passed ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300')}>
                      {it.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{it.passed ? 'OK' : 'Fora'}
                    </span>
                  )}
                </div>
              </div>
              {photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((u, i) => (
                    <Thumb key={i} src={u} onOpen={() => setLightbox(offsets[idx] + i)} />
                  ))}
                </div>
              )}
              {gps && (
                <a href={`https://maps.google.com/?q=${gps.latitude},${gps.longitude}`} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600">
                  <MapPin className="h-3.5 w-3.5" /> Ver localização
                </a>
              )}
              {it.comment && <p className="mt-1.5 text-xs text-gray-500 dark:text-white/50">💬 {it.comment}</p>}
              {it.signature && <p className="mt-1 text-xs text-gray-500 dark:text-white/50">✍️ {it.signature}</p>}
              {it.item_type === 'photo' && photos.length === 0 && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400"><ImageOff className="h-3.5 w-3.5" /> Sem foto</p>
              )}
            </div>
          );
        })
      )}

      <ImageLightbox images={allPhotos} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
