/**
 * CheckGrau App — pergunta em tela cheia no fluxo passo-a-passo (modelo aprovado
 * telas 3 e 4). Botões grandes, foto (câmera/galeria) e GPS. Reusa os helpers de
 * evidência (upload/GPS) e a validação de faixa/temperatura.
 */

import { useRef, useState } from 'react';
import { Star, Camera, Image as ImageIcon, MapPin, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ChecklistItem, ItemAnswer } from '@/hooks/operations/useTaskExecution';
import { validateItemValue, ruleText } from '@/lib/operations/itemTypes';
import { captureGps, uploadEvidencePhoto } from '@/lib/operations/evidence';

const PURPLE = '#7C3AED';

interface Props {
  item: ChecklistItem;
  answer: ItemAnswer;
  executionId: string;
  index: number; // 1-based
  onChange: (partial: ItemAnswer) => void;
}

export function WizardItemField({ item, answer, executionId, index, onChange }: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const cfg = { min_value: item.min_value, max_value: item.max_value };
  const rule = ruleText(item.type, cfg);
  const passed = validateItemValue(item.type, answer.value_number ?? null, cfg);
  const options = item.options ?? [];
  const multi = Array.isArray(answer.value_json) ? (answer.value_json as string[]) : [];
  const showPhoto = item.type === 'photo' || item.require_photo;

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      if (!navigator.onLine) {
        // offline: guarda como data URL e sobe no sync
        const dataUrl: string = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(r.error);
          r.readAsDataURL(file);
        });
        onChange({ photo_url: dataUrl });
        toast.success('Foto salva (offline).');
      } else {
        const url = await uploadEvidencePhoto(file, executionId);
        onChange({ photo_url: url });
        toast.success('Foto anexada.');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao anexar a foto.');
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
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/[0.06] dark:bg-[#16161D]">
      {/* Número + enunciado */}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-[#7C3AED] dark:bg-purple-500/15">
        {index}
      </div>
      <h2 className="mt-4 text-xl font-bold leading-snug text-gray-900 dark:text-white">
        {item.name}
        {item.is_required && <span className="ml-1 text-red-500">*</span>}
      </h2>
      {rule && <p className="mt-1 text-sm text-gray-400">Padrão: {rule}</p>}

      {/* Input por tipo */}
      <div className="mt-6 space-y-3">
        {item.type === 'boolean' && (
          <>
            <BigChoice
              active={answer.value_boolean === true}
              tone="green"
              icon={<Check className="h-5 w-5" />}
              label="Sim"
              onClick={() => onChange({ value_boolean: true })}
            />
            <BigChoice
              active={answer.value_boolean === false}
              tone="red"
              icon={<X className="h-5 w-5" />}
              label="Não"
              onClick={() => onChange({ value_boolean: false })}
            />
          </>
        )}

        {(item.type === 'number' || item.type === 'temperature' || item.type === 'range') && (
          <div>
            <input
              type="number"
              inputMode="decimal"
              value={answer.value_number ?? ''}
              onChange={(e) => onChange({ value_number: e.target.value === '' ? null : parseFloat(e.target.value) })}
              placeholder="0"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-3xl font-bold text-gray-900 outline-none focus:border-[#7C3AED] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            {(item.type === 'temperature' || item.type === 'range') && answer.value_number != null && (
              <div className={cn('mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold',
                passed ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300')}>
                {passed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {passed ? 'Dentro do padrão' : 'Fora do padrão'}
              </div>
            )}
          </div>
        )}

        {item.type === 'text' && (
          <textarea
            rows={5}
            value={answer.value_text ?? ''}
            onChange={(e) => onChange({ value_text: e.target.value })}
            placeholder="Digite aqui…"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-900 outline-none focus:border-[#7C3AED] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        )}

        {item.type === 'date' && (
          <input
            type="date"
            value={answer.value_text ?? ''}
            onChange={(e) => onChange({ value_text: e.target.value })}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-lg text-gray-900 outline-none focus:border-[#7C3AED] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        )}

        {item.type === 'rating' && (
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => onChange({ value_number: n })} aria-label={`${n} estrela(s)`}>
                <Star className={cn('h-10 w-10 transition-transform active:scale-90',
                  n <= (answer.value_number ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-white/20')} />
              </button>
            ))}
          </div>
        )}

        {item.type === 'single_choice' && options.map((opt) => (
          <BigChoice key={opt} active={answer.value_text === opt} tone="purple" label={opt} onClick={() => onChange({ value_text: opt })} />
        ))}

        {item.type === 'multi_choice' && options.map((opt) => {
          const on = multi.includes(opt);
          return (
            <BigChoice key={opt} active={on} tone="purple" label={opt}
              icon={on ? <Check className="h-5 w-5" /> : undefined}
              onClick={() => onChange({ value_json: on ? multi.filter((o) => o !== opt) : [...multi, opt] })} />
          );
        })}

        {(item.type === 'qr' || item.type === 'barcode') && (
          <input
            value={answer.value_text ?? ''}
            onChange={(e) => onChange({ value_text: e.target.value })}
            placeholder={item.type === 'qr' ? 'Código QR' : 'Código de barras'}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900 outline-none focus:border-[#7C3AED] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        )}

        {/* Foto (tipo foto OU exige foto) */}
        {showPhoto && (
          <div className="space-y-3">
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <input ref={galRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} />

            {answer.photo_url ? (
              <img src={answer.photo_url} alt="Evidência" className="max-h-64 w-full rounded-2xl border border-gray-200 object-cover dark:border-white/10" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 dark:border-white/10">
                <Camera className="h-10 w-10" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => camRef.current?.click()} disabled={uploading}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" style={{ color: PURPLE }} />}
                {answer.photo_url ? 'Trocar' : 'Tirar foto'}
              </button>
              <button type="button" onClick={() => galRef.current?.click()} disabled={uploading}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
                <ImageIcon className="h-4 w-4" style={{ color: PURPLE }} /> Selecionar
              </button>
            </div>
          </div>
        )}

        {/* GPS */}
        {item.require_gps && (
          answer.gps ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-300">
              <MapPin className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">Localização capturada</p>
                <p className="text-xs opacity-80">{answer.gps.latitude.toFixed(6)}, {answer.gps.longitude.toFixed(6)}</p>
              </div>
              <Check className="h-4 w-4" />
            </div>
          ) : (
            <button type="button" onClick={handleGps} disabled={gpsLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
              {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" style={{ color: PURPLE }} />}
              Capturar localização
            </button>
          )
        )}

        {/* Comentário */}
        {item.require_comment && (
          <textarea rows={3} value={answer.comment ?? ''} onChange={(e) => onChange({ comment: e.target.value })}
            placeholder="Comentário obrigatório"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-900 outline-none focus:border-[#7C3AED] dark:border-white/10 dark:bg-white/5 dark:text-white" />
        )}

        {/* Assinatura */}
        {item.require_signature && (
          <input value={answer.signature ?? ''} onChange={(e) => onChange({ signature: e.target.value })}
            placeholder="Assinatura — nome de quem executou"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900 outline-none focus:border-[#7C3AED] dark:border-white/10 dark:bg-white/5 dark:text-white" />
        )}
      </div>
    </div>
  );
}

function BigChoice({ active, tone, icon, label, onClick }: {
  active: boolean;
  tone: 'green' | 'red' | 'purple';
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const tones = {
    green: { on: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300', icon: 'text-green-600' },
    red: { on: 'border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300', icon: 'text-red-600' },
    purple: { on: 'border-[#7C3AED] bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10', icon: 'text-[#7C3AED]' },
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-base font-semibold transition-all active:scale-[0.99]',
        active ? tones.on : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5',
      )}
    >
      {icon && <span className={cn(active ? tones.icon : 'text-gray-400')}>{icon}</span>}
      {label}
    </button>
  );
}
