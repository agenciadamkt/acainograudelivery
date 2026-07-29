/**
 * CheckGrau — Modal de detalhe do colaborador (redesign inspirado no Evolua RH,
 * adaptado aos nossos módulos: checklists, execuções, pontos e SLA).
 * Abas: Visão Geral · Histórico · Checklists · Notas.
 */

import { useState } from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Activity, Clock, ClipboardCheck, AlertTriangle, MessageCircle, Pencil, Save, TrendingUp, Info,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { CARGO_LABEL, STATUS_LABEL, type Collaborator } from '@/hooks/checkgrau/useCollaborators';
import type { PersonDetail } from '@/hooks/checkgrau/useCheckgrauPeople';
import { useCollaboratorNotes } from '@/hooks/checkgrau/useCollaboratorNotes';
import { scoreBadge } from '@/lib/operations/points';

const TONE: Record<string, string> = {
  good: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};
const STATUS_TONE: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  inativo: 'bg-gray-100 text-gray-500 dark:bg-white/10',
  afastado: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  desligado: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
};

const rel = (ms: number | null) => {
  if (!ms) return 'Nunca';
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d <= 0) return 'Hoje';
  if (d === 1) return 'Ontem';
  if (d < 30) return `Há ${d} dias`;
  return new Date(ms).toLocaleDateString('pt-BR');
};

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]">
      <p className="flex items-center gap-1.5 text-xs text-gray-400"><Icon className={cn('h-3.5 w-3.5', color)} /> {label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export function CollaboratorDetailDialog({
  collaborator, detail, onEdit,
}: {
  collaborator: Collaborator;
  detail: PersonDetail;
  onEdit: () => void;
}) {
  const badge = scoreBadge(detail.engajamento);
  const initial = collaborator.name.charAt(0).toUpperCase();
  const notes = useCollaboratorNotes(collaborator.id);
  const [note, setNote] = useState('');

  const saveNote = () => {
    if (!note.trim()) return;
    notes.add.mutate(note, { onSuccess: () => setNote('') });
  };
  const waLink = `https://wa.me/${(collaborator.whatsapp || '').replace(/\D/g, '')}`;

  return (
    <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          {collaborator.photo_url
            ? <img src={collaborator.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7C3AED] text-xl font-bold text-white">{initial}</div>}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{collaborator.name}</h2>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[collaborator.status])}>{STATUS_LABEL[collaborator.status]}</span>
            </div>
            <p className="mt-0.5 text-sm text-gray-400">{collaborator.whatsapp} · <span className="capitalize">{CARGO_LABEL[collaborator.cargo]}</span></p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn('inline-block rounded-full px-3 py-1 text-sm font-bold', TONE[badge.tone])}>{detail.engajamento}% · {badge.label}</span>
          <p className="mt-1 text-xs text-gray-400">{detail.score} pontos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Alertas automáticos */}
        {detail.alerts.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> Alertas automáticos</p>
            <ul className="mt-1 space-y-0.5 pl-5 text-sm text-amber-700 dark:text-amber-300/90">
              {detail.alerts.map((a, i) => <li key={i} className="list-disc">{a}</li>)}
            </ul>
          </div>
        )}

        <Tabs defaultValue="visao">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visao">Visão Geral</TabsTrigger>
            <TabsTrigger value="hist">Histórico</TabsTrigger>
            <TabsTrigger value="checklists">Checklists</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="visao" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Kpi icon={Activity} label="Engajamento" value={`${detail.engajamento}%`} color="text-[#7C3AED]" />
              <Kpi icon={Clock} label="Último acesso" value={rel(detail.lastAt)} color="text-green-500" />
              <Kpi icon={ClipboardCheck} label="Execuções (90d)" value={String(detail.execCount)} color="text-blue-500" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Atividades recentes</p>
              {detail.recent.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Sem execuções ainda.</p>
              ) : (
                <div className="space-y-2">
                  {detail.recent.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-gray-100 pb-2 last:border-none dark:border-white/[0.06]">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#7C3AED]" />
                      <p className="flex-1 text-sm text-gray-700 dark:text-white/70">Concluiu <span className="font-medium">{r.checklist}</span></p>
                      {r.sla != null && <span className="text-[11px] font-semibold text-gray-400">SLA {r.sla}%</span>}
                      <span className="text-[11px] text-gray-400">{rel(r.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="hist" className="mt-4">
            <div className="mb-1 flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Evolução da pontualidade (SLA) — 8 semanas</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-gray-400 transition-colors hover:text-[#7C3AED]" aria-label="O que é SLA?">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">O que é SLA?</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-white/60">
                    <span className="font-medium">SLA</span> significa <span className="font-medium">Service Level Agreement</span>, ou
                    <span className="font-medium"> Acordo de Nível de Serviço</span> — um compromisso sobre o que deve ser entregue,
                    em qual padrão e em quanto tempo, deixando as expectativas claras entre as partes.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-white/60">
                    No CheckGrau, o SLA de cada tarefa mede se ela foi concluída <span className="font-medium">dentro do prazo</span> da rotina:
                    <span className="font-medium"> 100% = feita no horário</span>; quanto maior o atraso, menor o SLA.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <p className="mb-3 text-xs text-gray-400">Média de pontualidade das tarefas concluídas, semana a semana.</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={detail.weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cgArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Pontualidade (SLA)']} />
                  <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} fill="url(#cgArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <TrendingUp className="h-3.5 w-3.5" /> Pontualidade média atual: <span className="font-semibold text-gray-700 dark:text-white/70">{detail.engajamento}%</span>
            </div>
          </TabsContent>

          {/* Checklists (nossos "módulos") */}
          <TabsContent value="checklists" className="mt-4">
            {detail.byChecklist.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Nenhum checklist executado nos últimos 90 dias.</p>
            ) : (
              <div className="space-y-2">
                {detail.byChecklist.map((ck) => (
                  <div key={ck.name} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{ck.name}</p>
                      <p className="text-xs text-gray-400">Último: {rel(ck.lastAt)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{ck.count}</p>
                      <p className="text-[10px] uppercase text-gray-400">execuções</p>
                    </div>
                    <div className="w-14 text-center">
                      <p className={cn('text-sm font-bold', ck.conclusao >= 80 ? 'text-green-600' : ck.conclusao >= 60 ? 'text-amber-600' : 'text-red-600')}>{ck.conclusao}%</p>
                      <p className="text-[10px] uppercase text-gray-400">SLA</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notas */}
          <TabsContent value="notas" className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">Observações e acompanhamentos — privados do gestor.</p>
            <Textarea rows={4} placeholder="Escreva uma nota sobre este colaborador…" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button className="w-full gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={saveNote} disabled={!note.trim() || notes.add.isPending}>
              <Save className="h-4 w-4" /> Salvar nota
            </Button>
            <div className="space-y-2 pt-1">
              {(notes.data ?? []).map((n) => (
                <div key={n.id} className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-semibold text-gray-500 dark:text-white/50">{n.author_name ?? 'Gestor'}</span>
                    <span>{new Date(n.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 dark:text-white/70">{n.body}</p>
                </div>
              ))}
              {(notes.data ?? []).length === 0 && <p className="py-2 text-center text-xs text-gray-400">Nenhuma nota ainda.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rodapé */}
      <div className="flex gap-2 border-t border-gray-100 p-4 dark:border-white/[0.06]">
        <a href={waLink} target="_blank" rel="noreferrer" className="flex-1">
          <Button variant="outline" className="w-full gap-1.5"><MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp</Button>
        </a>
        <Button variant="outline" className="flex-1 gap-1.5" onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</Button>
      </div>
    </DialogContent>
  );
}
