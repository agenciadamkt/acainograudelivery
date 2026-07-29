/**
 * Card de upload do PDF de Baixas do Cefas.
 * Aceita apenas .pdf (drag & drop ou seleção) e devolve o arquivo escolhido.
 */

import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
}

export function ReceiptUploadCard({ onFile, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    onFile(file);
  };

  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !loading) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!loading) pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-600/10'
              : 'border-gray-300 hover:border-purple-400 dark:border-white/10 dark:hover:border-purple-500/60',
            loading && 'pointer-events-none opacity-70',
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-600/15">
            {loading ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {loading ? 'Lendo o PDF…' : 'Enviar relatório de Baixas (Cefas)'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/40">
              Arraste o arquivo aqui ou clique para selecionar — somente .pdf
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            className="mt-1 gap-2"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <FileText className="h-4 w-4" />
            Selecionar PDF
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
