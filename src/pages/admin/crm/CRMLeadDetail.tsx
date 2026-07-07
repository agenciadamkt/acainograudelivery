'use client';

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, MapPin, Copy, Check, ExternalLink,
  Clock, Loader2, Save, Plus, CheckCircle2, PhoneCall,
  MessageSquare, Mail, Calendar, StickyNote, PhoneOff,
  TrendingUp, AlertCircle, Flame, Tag, ChevronDown,
  Edit2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreToProbability = (score: number) => {
  if (score >= 91) return 90;
  if (score >= 76) return 70;
  if (score >= 51) return 40;
  if (score >= 26) return 15;
  return 5;
};

const SCORE_COLOR = (s: number) =>
  s >= 60 ? 'text-red-600 bg-red-50 border-red-200' :
  s >= 30 ? 'text-amber-600 bg-amber-50 border-amber-200' :
  'text-gray-500 bg-gray-100 border-gray-200';

const STATUS_COLOR: Record<string, string> = {
  novo:           'bg-gray-100 text-gray-600',
  em_atendimento: 'bg-amber-100 text-amber-700',
  proposta:       'bg-blue-100 text-blue-700',
  fechado:        'bg-green-100 text-green-700',
  perdido:        'bg-slate-200 text-slate-600',
};

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  ligacao:   { icon: PhoneCall,    color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Ligação'   },
  whatsapp:  { icon: MessageSquare,color: 'text-green-600',  bg: 'bg-green-50',  label: 'WhatsApp'  },
  email:     { icon: Mail,         color: 'text-violet-600', bg: 'bg-violet-50', label: 'Email'     },
  reuniao:   { icon: Calendar,     color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Reunião'   },
  nota:      { icon: StickyNote,   color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Nota'      },
  sms:       { icon: MessageSquare,color: 'text-cyan-600',   bg: 'bg-cyan-50',   label: 'SMS'       },
  script:    { icon: Copy,         color: 'text-primary',    bg: 'bg-primary/5', label: 'Script'    },
};

const RESULTADO_CONFIG: Record<string, { label: string; color: string }> = {
  falha_contato:      { label: 'Não atendeu',    color: 'text-red-500'    },
  em_progresso:       { label: 'Em andamento',   color: 'text-amber-500'  },
  interesse:          { label: 'Demonstrou interesse', color: 'text-green-600' },
  sem_interesse:      { label: 'Sem interesse',  color: 'text-gray-500'   },
  reuniao_agendada:   { label: 'Reunião agendada', color: 'text-blue-600' },
};

const SCORE_DELTA: Record<string, Record<string, number>> = {
  ligacao:  { falha_contato: -5, em_progresso: 0, interesse: 20, sem_interesse: -15, reuniao_agendada: 25 },
  whatsapp: { em_progresso: 5, interesse: 15, sem_interesse: -10 },
  reuniao:  { reuniao_agendada: 25, interesse: 20 },
};

const EMPTY_ACTIVITY = {
  tipo: 'nota', titulo: '', descricao: '', resultado: '',
  duracao_minutos: '', prox_seguimento: '',
};

// ─── Activity Script Button ───────────────────────────────────────────────────

function ScriptBtn({ label, categoria, leadId, onDone }: {
  label: string; categoria: string; leadId: string; onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    const { data } = await (supabase as any)
      .from('crm_scripts').select('id, conteudo').eq('categoria', categoria)
      .eq('ativo', true).order('ordem').limit(1).single();
    if (!data?.conteudo) { toast.error('Script não encontrado.'); return; }
    await navigator.clipboard.writeText(data.conteudo);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    await (supabase as any).from('crm_atendimentos').insert([{
      lead_id: leadId, etapa: categoria, tipo_mensagem: 'texto',
      mensagem_enviada: data.conteudo, script_id: data.id,
    }]);
    toast.success(`"${label}" copiado!`);
    onDone?.();
  };
  return (
    <button onClick={handleClick}
      className="flex items-center gap-2 w-full p-2.5 rounded-xl bg-muted/40 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all text-left group">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
        copied ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white')}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </div>
      <span className="text-xs font-bold truncate">{label}</span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CRMLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ ...EMPTY_ACTIVITY });
  const [editNome, setEditNome] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editInteresse, setEditInteresse] = useState('');
  const [editObs, setEditObs] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editScore, setEditScore] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Queries ──────────────────────────────────────────────────

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm_lead', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('crm_leads').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    onSuccess: (d: any) => {
      setEditNome(d.nome || ''); setEditCidade(d.cidade || '');
      setEditEstado(d.estado || ''); setEditTipo(d.tipo_cliente || '');
      setEditInteresse(d.interesse || ''); setEditObs(d.observacoes || '');
      setEditValor(d.valor_estimado ? String(d.valor_estimado) : '');
      setEditScore(d.score ?? 0);
    },
  });

  const { data: activities = [], refetch: refetchAct } = useQuery({
    queryKey: ['crm_activities', id],
    queryFn: async () => {
      const [{ data: acts }, { data: ats }] = await Promise.all([
        (supabase as any).from('crm_activities').select('*').eq('lead_id', id).order('data_horario', { ascending: false }),
        (supabase as any).from('crm_atendimentos').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      ]);
      const mapped = [
        ...(acts || []).map((a: any) => ({ ...a, _source: 'activity', _date: a.data_horario })),
        ...(ats || []).map((a: any) => ({ ...a, tipo: 'script', _source: 'atendimento', _date: a.created_at,
          titulo: a.etapa, descricao: a.mensagem_enviada, resultado_text: a.resposta_cliente })),
      ];
      return mapped.sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
    },
    enabled: !!id,
  });

  const { data: followups = [], refetch: refetchFu } = useQuery({
    queryKey: ['crm_followups_lead', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('crm_followups').select('*').eq('lead_id', id).order('data_agendada');
      return (data || []).filter((f: any) => f.status === 'pendente');
    },
    enabled: !!id,
  });

  // próximos seguimentos de activities
  const nextFollowups = useMemo(() =>
    activities
      .filter((a: any) => a.prox_seguimento && !isPast(new Date(a.prox_seguimento)))
      .sort((a: any, b: any) => new Date(a.prox_seguimento).getTime() - new Date(b.prox_seguimento).getTime())
      .slice(0, 3),
  [activities]);

  const overdueFollowups = useMemo(() =>
    activities
      .filter((a: any) => a.prox_seguimento && isPast(new Date(a.prox_seguimento)) && a._source === 'activity'),
  [activities]);

  // ── Mutations ────────────────────────────────────────────────

  const saveActivityMutation = useMutation({
    mutationFn: async () => {
      const delta = SCORE_DELTA[activityForm.tipo]?.[activityForm.resultado] || 0;
      const newScore = Math.min(100, Math.max(0, (lead?.score || 0) + delta));
      const prob = scoreToProbability(newScore);

      await (supabase as any).from('crm_activities').insert([{
        lead_id: id,
        tipo: activityForm.tipo,
        titulo: activityForm.titulo || ACTIVITY_CONFIG[activityForm.tipo]?.label,
        descricao: activityForm.descricao || null,
        resultado: activityForm.resultado || null,
        duracao_minutos: activityForm.duracao_minutos ? Number(activityForm.duracao_minutos) : null,
        prox_seguimento: activityForm.prox_seguimento || null,
        usuario_nome: user?.email?.split('@')[0] || 'Usuário',
        score_delta: delta,
        data_horario: new Date().toISOString(),
      }]);

      await (supabase as any).from('crm_leads').update({
        score: newScore,
        probabilidade: prob,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_lead', id] });
      qc.invalidateQueries({ queryKey: ['crm_leads'] });
      refetchAct();
      setActivityModal(false);
      setActivityForm({ ...EMPTY_ACTIVITY });
      toast.success('Atividade registrada!');
    },
    onError: () => toast.error('Erro ao salvar atividade'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('crm_leads').update({
        nome: editNome || null, cidade: editCidade || null,
        estado: editEstado || null, tipo_cliente: editTipo || null,
        interesse: editInteresse || null, observacoes: editObs || null,
        valor_estimado: editValor ? parseFloat(editValor) : null,
        score: editScore,
        probabilidade: scoreToProbability(editScore),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_lead', id] });
      qc.invalidateQueries({ queryKey: ['crm_leads'] });
      setEditMode(false);
      toast.success('Lead atualizado!');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await (supabase as any).from('crm_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_lead', id] });
      qc.invalidateQueries({ queryKey: ['crm_leads'] });
    },
  });

  const fuDoneMutation = useMutation({
    mutationFn: async (fuId: string) => {
      await (supabase as any).from('crm_followups')
        .update({ status: 'enviado', data_enviado: new Date().toISOString() }).eq('id', fuId);
    },
    onSuccess: () => refetchFu(),
  });

  // ── Loading ──────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="animate-spin text-rose-500" size={32} />
    </div>
  );
  if (!lead) return <div className="text-center py-20 text-muted-foreground">Lead não encontrado.</div>;

  const prob = scoreToProbability(lead.score);
  const waLink = `https://wa.me/55${lead.telefone.replace(/\D/g, '')}`;

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/crm/pipeline')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />Pipeline
      </button>

      {/* ── Header bar ─────────────────────────────────────── */}
      <div className="glass-card border-none p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-black">{lead.nome || lead.telefone}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Phone size={11} className="text-muted-foreground" />
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-green-600 transition-colors font-medium">
                {lead.telefone}
              </a>
              {lead.cidade && <>
                <MapPin size={11} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{lead.cidade}{lead.estado ? `, ${lead.estado}` : ''}</span>
              </>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Score */}
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-sm font-black', SCORE_COLOR(lead.score))}>
              {lead.score >= 80 && <Flame size={13} />}
              {lead.score} pts
            </div>
            {/* Probability */}
            <div className={cn('px-2.5 py-1 rounded-xl text-sm font-black border',
              prob >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
              prob >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-gray-100 text-gray-500 border-gray-200')}>
              {prob}% conv.
            </div>
            {/* Status */}
            <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black', STATUS_COLOR[lead.status] || 'bg-gray-100 text-gray-500')}>
              {lead.status?.replace('_', ' ')}
            </span>
            {lead.valor_estimado && (
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                R$ {Number(lead.valor_estimado).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button size="sm" className="h-8 rounded-xl gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs"
            onClick={() => window.open(waLink, '_blank')}>
            <ExternalLink size={12} /> WhatsApp
          </Button>
          <Button size="sm" className="h-8 rounded-xl gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs"
            onClick={() => { setActivityForm({ ...EMPTY_ACTIVITY, tipo: 'ligacao' }); setActivityModal(true); }}>
            <PhoneCall size={12} /> Ligar
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-xl gap-1.5 font-bold text-xs"
            onClick={() => { setActivityForm({ ...EMPTY_ACTIVITY, tipo: 'nota' }); setActivityModal(true); }}>
            <StickyNote size={12} /> Nota
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-xl gap-1.5 font-bold text-xs"
            onClick={() => { setActivityForm({ ...EMPTY_ACTIVITY, tipo: 'reuniao' }); setActivityModal(true); }}>
            <Calendar size={12} /> Agendar
          </Button>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────── */}
      {overdueFollowups.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-200 text-rose-700 text-sm font-bold">
          <AlertCircle size={15} className="shrink-0" />
          {overdueFollowups.length} seguimento{overdueFollowups.length > 1 ? 's' : ''} vencido{overdueFollowups.length > 1 ? 's' : ''} — precisa de ação agora
        </div>
      )}

      {/* ── Main two-column layout ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">

        {/* LEFT: Info + Scripts ─────────────────────────── */}
        <div className="space-y-4">
          {/* Lead Info */}
          <div className="glass-card border-none p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dados do Lead</p>
              <button onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                {editMode ? <X size={11} /> : <Edit2 size={11} />}
                {editMode ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nome</Label>
                    <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-9 bg-muted/40 border-none text-sm mt-1" /></div>
                  <div><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cidade</Label>
                    <Input value={editCidade} onChange={e => setEditCidade(e.target.value)} className="h-9 bg-muted/40 border-none text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">UF</Label>
                    <Input value={editEstado} onChange={e => setEditEstado(e.target.value)} maxLength={2} className="h-9 bg-muted/40 border-none text-sm mt-1" /></div>
                  <div><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor Est.</Label>
                    <Input value={editValor} onChange={e => setEditValor(e.target.value)} type="number" className="h-9 bg-muted/40 border-none text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tipo</Label>
                    <Select value={editTipo} onValueChange={setEditTipo}>
                      <SelectTrigger className="h-9 bg-muted/40 border-none text-sm mt-1"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="experiente">Experiente</SelectItem>
                        <SelectItem value="negocio">Negócio</SelectItem>
                        <SelectItem value="consumo">Consumo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Interesse</Label>
                    <Select value={editInteresse} onValueChange={setEditInteresse}>
                      <SelectTrigger className="h-9 bg-muted/40 border-none text-sm mt-1"><SelectValue placeholder="Interesse" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenda">Revenda</SelectItem>
                        <SelectItem value="quiosque">Quiosque</SelectItem>
                        <SelectItem value="consumo">Consumo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Temperatura</Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {([
                      { label: 'Frio',   score: 0,  isSelected: editScore < 30,                      active: 'bg-slate-600 text-white border-slate-600',   idle: 'border-slate-200 text-slate-500 hover:bg-slate-50' },
                      { label: 'Morno',  score: 30, isSelected: editScore >= 30 && editScore < 60,   active: 'bg-amber-500 text-white border-amber-500',   idle: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
                      { label: 'Quente', score: 60, isSelected: editScore >= 60,                     active: 'bg-orange-500 text-white border-orange-500', idle: 'border-orange-200 text-orange-600 hover:bg-orange-50' },
                    ] as const).map(opt => (
                      <button key={opt.label} type="button"
                        onClick={() => setEditScore(opt.score)}
                        className={cn('h-8 rounded-md border text-xs font-semibold transition-colors',
                          opt.isSelected ? opt.active : opt.idle)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea value={editObs} onChange={e => setEditObs(e.target.value)}
                  placeholder="Observações..." className="bg-muted/40 border-none resize-none text-sm" rows={2} />
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                  className="w-full h-9 bg-primary font-bold text-white rounded-xl text-xs">
                  <Save size={13} className="mr-1" /> Salvar alterações
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {lead.tipo_cliente && <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-bold">{lead.tipo_cliente}</Badge>
                  {lead.interesse && <Badge variant="outline" className="text-xs font-bold">{lead.interesse}</Badge>}
                  {lead.origem && <Badge variant="outline" className="text-xs text-muted-foreground">{lead.origem}</Badge>}
                </div>}
                {lead.observacoes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-xl p-2.5 leading-relaxed">{lead.observacoes}</p>
                )}
                {lead.last_activity_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Última atividade: {formatDistanceToNow(new Date(lead.last_activity_at), { locale: ptBR, addSuffix: true })}
                  </p>
                )}
              </div>
            )}

            {/* Move status */}
            <div>
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mover Lead</Label>
              <Select value={lead.status} onValueChange={v => statusMutation.mutate(v)}>
                <SelectTrigger className="mt-1 bg-muted/40 border-none h-9 text-sm font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo Lead</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="proposta">Proposta Enviada</SelectItem>
                  <SelectItem value="fechado">Fechado ✅</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Script buttons */}
          <div className="glass-card border-none p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Scripts Rápidos
            </p>
            <ScriptBtn label="📋 Abertura"          categoria="abertura"    leadId={lead.id} onDone={refetchAct} />
            <ScriptBtn label="📋 Iniciante"          categoria="iniciante"   leadId={lead.id} onDone={refetchAct} />
            <ScriptBtn label="📋 Experiente"         categoria="experiente"  leadId={lead.id} onDone={refetchAct} />
            <ScriptBtn label="📋 Tabela de Preços"   categoria="tabela"      leadId={lead.id} onDone={refetchAct} />
            <ScriptBtn label="📋 Proposta"           categoria="fechamento"  leadId={lead.id} onDone={refetchAct} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full p-2.5 rounded-xl bg-muted/40 hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all text-left">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                    <ChevronDown size={12} />
                  </div>
                  <span className="text-xs font-bold">🛡 Quebrar Objeção</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {[['caro','Tá caro'],['pensar','Vou pensar'],['fornecedor','Já tenho fornecedor'],['vende','Será que vende?'],['comecar','Não sei começar']].map(([kw, lbl]) => (
                  <DropdownMenuItem key={kw} onClick={async () => {
                    const { data } = await (supabase as any).from('crm_scripts').select('conteudo')
                      .eq('categoria', 'objecao').ilike('atalho', `%${kw}%`).single();
                    if (data?.conteudo) { await navigator.clipboard.writeText(data.conteudo); toast.success('Copiado!'); }
                    else toast.error('Script não encontrado');
                  }}>{lbl}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ScriptBtn label="✅ Fechar Venda"       categoria="fechamento"  leadId={lead.id} onDone={refetchAct} />
          </div>

          {/* Próximos seguimentos */}
          {nextFollowups.length > 0 && (
            <div className="glass-card border-none p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Próximos Seguimentos</p>
              {nextFollowups.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 p-2 bg-amber-50 rounded-xl">
                  <Clock size={12} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{a.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(a.prox_seguimento), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Follow-ups agendados */}
          {followups.length > 0 && (
            <div className="glass-card border-none p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Follow-ups Pendentes</p>
              {followups.slice(0, 4).map((fu: any) => (
                <div key={fu.id} className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                  <Badge variant="outline" className="text-[9px] font-black border-rose-200 text-rose-600 shrink-0">{fu.tipo}</Badge>
                  <p className="text-[10px] text-gray-600 flex-1 min-w-0 truncate">{fu.mensagem}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg"
                      onClick={async () => { await navigator.clipboard.writeText(fu.mensagem); toast.success('Copiado!'); }}>
                      <Copy size={10} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg text-green-500"
                      onClick={() => fuDoneMutation.mutate(fu.id)}>
                      <CheckCircle2 size={10} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Timeline ──────────────────────────────── */}
        <div className="glass-card border-none p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Histórico de Atividades ({activities.length})
            </p>
            <Button size="sm" variant="outline" className="h-7 rounded-xl gap-1.5 text-xs font-bold"
              onClick={() => { setActivityForm({ ...EMPTY_ACTIVITY }); setActivityModal(true); }}>
              <Plus size={12} /> Registrar
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <StickyNote size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">Nenhuma atividade ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Registre a primeira ligação ou nota</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-[900px] overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence>
                {activities.map((act: any, idx: number) => {
                  const cfg = ACTIVITY_CONFIG[act.tipo] || ACTIVITY_CONFIG.nota;
                  const Icon = cfg.icon;
                  const res = act.resultado ? RESULTADO_CONFIG[act.resultado] : null;
                  const isOverdue = act.prox_seguimento && isPast(new Date(act.prox_seguimento));

                  return (
                    <motion.div key={act.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                          <Icon size={13} className={cfg.color} />
                        </div>
                        {idx < activities.length - 1 && <div className="w-px flex-1 bg-border/50 my-1" />}
                      </div>

                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                          {res && (
                            <span className={cn('text-[10px] font-bold', res.color)}>{res.label}</span>
                          )}
                          {act.score_delta !== 0 && act.score_delta != null && (
                            <span className={cn('text-[9px] font-black', act.score_delta > 0 ? 'text-green-600' : 'text-red-500')}>
                              {act.score_delta > 0 ? '+' : ''}{act.score_delta} pts
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(act._date), { locale: ptBR, addSuffix: true })}
                          </span>
                        </div>

                        {act.titulo && act.titulo !== act.tipo && (
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">{act.titulo}</p>
                        )}
                        {act.descricao && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-muted/20 rounded-xl p-2 mt-1">
                            {act.descricao}
                          </p>
                        )}
                        {act.resultado_text && (
                          <p className="text-xs text-muted-foreground italic bg-green-50 rounded-xl p-2 mt-1">
                            Resposta: {act.resultado_text}
                          </p>
                        )}
                        {act.duracao_minutos && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Duração: {act.duracao_minutos} min
                          </p>
                        )}
                        {act.prox_seguimento && (
                          <div className={cn('flex items-center gap-1 mt-1 text-[10px] font-bold',
                            isOverdue ? 'text-red-500' : 'text-amber-600')}>
                            <Clock size={10} />
                            {isOverdue ? 'VENCIDO: ' : 'Próximo: '}
                            {format(new Date(act.prox_seguimento), "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                        )}
                        {act.usuario_nome && (
                          <p className="text-[9px] text-muted-foreground/70 mt-1">{act.usuario_nome}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Modal ─────────────────────────────────── */}
      <Dialog open={activityModal} onOpenChange={v => { if (!v) { setActivityModal(false); setActivityForm({ ...EMPTY_ACTIVITY }); } }}>
        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Plus size={18} className="text-rose-500" /> Registrar Atividade
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tipo */}
            <div className="grid grid-cols-3 gap-2">
              {(['ligacao','whatsapp','email','reuniao','nota','sms'] as const).map(tipo => {
                const cfg = ACTIVITY_CONFIG[tipo];
                const Icon = cfg.icon;
                return (
                  <button key={tipo} onClick={() => setActivityForm(f => ({ ...f, tipo, resultado: '' }))}
                    className={cn('flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all text-[10px] font-black uppercase',
                      activityForm.tipo === tipo
                        ? `border-current ${cfg.bg} ${cfg.color}`
                        : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/60')}>
                    <Icon size={18} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Resultado (para ligação e reunião) */}
            {['ligacao','reuniao','whatsapp'].includes(activityForm.tipo) && (
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resultado</Label>
                <Select value={activityForm.resultado} onValueChange={v => setActivityForm(f => ({ ...f, resultado: v }))}>
                  <SelectTrigger className="bg-muted/40 border-none h-10"><SelectValue placeholder="Qual foi o resultado?" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULTADO_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className={v.color}>{v.label}</span>
                        {SCORE_DELTA[activityForm.tipo]?.[k] !== undefined && (
                          <span className={cn('ml-2 text-[10px] font-black',
                            SCORE_DELTA[activityForm.tipo][k] > 0 ? 'text-green-600' : 'text-red-500')}>
                            ({SCORE_DELTA[activityForm.tipo][k] > 0 ? '+' : ''}{SCORE_DELTA[activityForm.tipo][k]} pts)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descrição / Nota */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {activityForm.tipo === 'nota' ? 'Nota' : 'Descrição / Observação'}
              </Label>
              <Textarea value={activityForm.descricao}
                onChange={e => setActivityForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="O que aconteceu? O que o lead disse?"
                className="bg-muted/40 border-none resize-none text-sm" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Duração */}
              {activityForm.tipo === 'ligacao' && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duração (min)</Label>
                  <Input type="number" min="0" placeholder="ex: 5"
                    value={activityForm.duracao_minutos}
                    onChange={e => setActivityForm(f => ({ ...f, duracao_minutos: e.target.value }))}
                    className="bg-muted/40 border-none h-10 text-sm" />
                </div>
              )}
              {/* Próximo seguimento */}
              <div className="space-y-1 col-span-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Próximo Contato</Label>
                <Input type="datetime-local"
                  value={activityForm.prox_seguimento}
                  onChange={e => setActivityForm(f => ({ ...f, prox_seguimento: e.target.value }))}
                  className="bg-muted/40 border-none h-10 text-sm" />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl"
              disabled={saveActivityMutation.isPending}
              onClick={() => saveActivityMutation.mutate()}>
              {saveActivityMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Salvar Atividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
