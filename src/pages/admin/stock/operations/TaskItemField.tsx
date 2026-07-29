/**
 * Operações 2.0 — Campo de item na execução (M2).
 * Renderiza o input conforme o tipo e as capturas de evidência exigidas
 * (foto, GPS, comentário, assinatura) para um item do checklist.
 */

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Star, Camera, MapPin, Loader2, Check, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ChecklistItem, ItemAnswer } from '@/hooks/operations/useTaskExecution';
import { validateItemValue, ruleText } from '@/lib/operations/itemTypes';
import { captureGps, uploadEvidencePhoto } from '@/lib/operations/evidence';
import { useValidatePhoto, useCompareReference, type PhotoVerdict } from '@/hooks/operations/useAiAnalysis';

interface Props {
  item: ChecklistItem;
  answer: ItemAnswer;
  executionId: string;
  onChange: (partial: ItemAnswer) => void;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrela(s)`}>
          <Star className={cn('h-6 w-6 transition-colors', n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-white/20')} />
        </button>
      ))}
    </div>
  );
}

export function TaskItemField({ item, answer, executionId, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [verdict, setVerdict] = useState<PhotoVerdict | null>(null);
  const validatePhoto = useValidatePhoto();
  const compareReference = useCompareReference();
  const cfg = { min_value: item.min_value, max_value: item.max_value };
  const rule = ruleText(item.type, cfg);
  const passed = validateItemValue(item.type, answer.value_number ?? null, cfg);

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadEvidencePhoto(file, executionId);
      onChange({ photo_url: url });
      setVerdict(null);
      toast.success('Foto anexada.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleGps = async () => {
    setGpsLoading(true);
    try {
      const pos = await captureGps();
      if (!pos) { toast.error('Não foi possível obter a localização.'); return; }
      onChange({ gps: pos });
      toast.success('Localização capturada.');
    } finally {
      setGpsLoading(false);
    }
  };

  const runValidate = async () => {
    if (!answer.photo_url) return;
    const v = await validatePhoto.mutateAsync({ photoUrl: answer.photo_url, itemName: item.name });
    setVerdict(v);
  };
  const runCompare = async () => {
    if (!answer.photo_url || !item.reference_image_url) return;
    const v = await compareReference.mutateAsync({
      photoUrl: answer.photo_url, referenceImageUrl: item.reference_image_url, itemName: item.name,
    });
    setVerdict(v);
  };
  const aiBusy = validatePhoto.isPending || compareReference.isPending;

  const options = item.options ?? [];
  const multi = Array.isArray(answer.value_json) ? (answer.value_json as string[]) : [];

  return (
    <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 last:border-none dark:border-white/[0.06]">
      <label className="text-sm font-medium text-gray-800 dark:text-white/80">
        {item.name}
        {item.is_required && <span className="ml-1 text-red-500">*</span>}
        {rule && <span className="ml-2 text-[11px] font-normal text-gray-400">Padrão: {rule}</span>}
      </label>

      {/* Input principal por tipo */}
      {item.type === 'boolean' && (
        <Switch checked={!!answer.value_boolean} onCheckedChange={(v) => onChange({ value_boolean: v })} />
      )}
      {(item.type === 'number' || item.type === 'temperature' || item.type === 'range') && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={answer.value_number ?? ''}
            onChange={(e) => onChange({ value_number: e.target.value === '' ? null : parseFloat(e.target.value) })}
            className="max-w-[160px]"
          />
          {(item.type === 'temperature' || item.type === 'range') && answer.value_number != null && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              passed ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300')}>
              {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {passed ? 'Dentro do padrão' : 'Fora do padrão'}
            </span>
          )}
        </div>
      )}
      {item.type === 'text' && (
        <Input value={answer.value_text ?? ''} onChange={(e) => onChange({ value_text: e.target.value })} />
      )}
      {item.type === 'date' && (
        <Input type="date" className="max-w-[200px]" value={answer.value_text ?? ''} onChange={(e) => onChange({ value_text: e.target.value })} />
      )}
      {item.type === 'rating' && (
        <StarRating value={answer.value_number ?? 0} onChange={(v) => onChange({ value_number: v })} />
      )}
      {(item.type === 'qr' || item.type === 'barcode') && (
        <Input
          placeholder={item.type === 'qr' ? 'Código QR (leitura por câmera em breve)' : 'Código de barras'}
          value={answer.value_text ?? ''}
          onChange={(e) => onChange({ value_text: e.target.value })}
        />
      )}
      {item.type === 'single_choice' && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button key={opt} type="button" onClick={() => onChange({ value_text: opt })}
              className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors',
                answer.value_text === opt ? 'border-transparent bg-purple-600 text-white' : 'border-gray-200 hover:bg-gray-100 dark:border-white/10 dark:hover:bg-white/5')}>
              {opt}
            </button>
          ))}
        </div>
      )}
      {item.type === 'multi_choice' && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const on = multi.includes(opt);
            return (
              <button key={opt} type="button"
                onClick={() => onChange({ value_json: on ? multi.filter((o) => o !== opt) : [...multi, opt] })}
                className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  on ? 'border-transparent bg-purple-600 text-white' : 'border-gray-200 hover:bg-gray-100 dark:border-white/10 dark:hover:bg-white/5')}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Foto: tipo 'photo' OU require_photo */}
      {(item.type === 'photo' || item.require_photo) && (
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {answer.photo_url ? 'Trocar foto' : 'Anexar foto'}
          </Button>
          {answer.photo_url && (
            <a href={answer.photo_url} target="_blank" rel="noreferrer">
              <img src={answer.photo_url} alt="Evidência" className="h-10 w-10 rounded-lg border border-gray-200 object-cover dark:border-white/10" />
            </a>
          )}
        </div>
      )}

      {/* Análise por IA (M5) */}
      {answer.photo_url && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={aiBusy} onClick={runValidate}>
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-500" />}
              Validar com IA
            </Button>
            {item.reference_image_url && (
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={aiBusy} onClick={runCompare}>
                <Sparkles className="h-4 w-4 text-purple-500" /> Comparar c/ referência
              </Button>
            )}
          </div>
          {verdict && (
            <div className={cn('rounded-lg border px-3 py-2 text-xs',
              verdict.approved
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300')}>
              <span className="font-semibold">
                {verdict.approved ? '✓ Conforme' : '✕ Não conforme'}
                {verdict.score != null && ` · ${verdict.score}%`}
              </span>
              {verdict.reason && <span className="block text-gray-600 dark:text-white/60">{verdict.reason}</span>}
              {verdict.fraud_suspected && <span className="block font-semibold text-amber-600">⚠ Possível fraude na imagem</span>}
            </div>
          )}
        </div>
      )}

      {/* GPS: require_gps */}
      {item.require_gps && (
        <Button type="button" variant="outline" size="sm" className={cn('w-fit gap-1.5', answer.gps && 'border-green-500 text-green-600')} disabled={gpsLoading} onClick={handleGps}>
          {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {answer.gps ? `Local capturado (±${Math.round(answer.gps.accuracy)}m)` : 'Capturar localização'}
        </Button>
      )}

      {/* Comentário: require_comment */}
      {item.require_comment && (
        <Textarea placeholder="Comentário obrigatório" rows={2} value={answer.comment ?? ''} onChange={(e) => onChange({ comment: e.target.value })} />
      )}

      {/* Assinatura: require_signature */}
      {item.require_signature && (
        <Input placeholder="Assinatura (nome de quem executou)" value={answer.signature ?? ''} onChange={(e) => onChange({ signature: e.target.value })} />
      )}
    </div>
  );
}
