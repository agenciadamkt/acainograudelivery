import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Ícone só, sem texto — pra thumbnails muito pequenas (≤48px) onde o
   * texto "Sem imagem" não cabe de forma legível. */
  compact?: boolean;
}

// Placeholder visual pra produtos sem foto cadastrada — antes, vários
// lugares caíam numa foto genérica do Unsplash como fallback, dando a
// impressão de que era a foto real do produto.
export function ProductImagePlaceholder({ className, compact = false }: Props) {
  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30',
        className,
      )}
    >
      <ImageOff className={compact ? 'h-4 w-4' : 'h-7 w-7'} />
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-center px-1">Sem imagem</span>
      )}
    </div>
  );
}
