'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Flame, Clock, MessageSquare, AlertCircle,
  MapPin, Loader2, PhoneCall, ExternalLink, StickyNote,
  ChevronDown, BarChart2, Filter, X, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  nome: string | null;
  telefone: string;
  cidade: string | null;
  estado: string | null;
  origem: string;
  tipo_cliente: string | null;
  interesse: string | null;
  status: string;
  score: number;
  probabilidade: number | null;
  motivo_perda: string | null;
  valor_estimado: number | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'novo',           label: 'Novo Lead',        color: '#6B7280', dot: 'bg-gray-400'   },
  { key: 'em_atendimento', label: 'Em Atendimento',   color: '#D97706', dot: 'bg-amber-500'  },
  { key: 'proposta',       label: 'Proposta',          color: '#2563EB', dot: 'bg-blue-500'   },
  { key: 'fechado',        label: 'Fechado',           color: '#16A34A', dot: 'bg-emerald-500'},
  { key: 'perdido',        label: 'Perdido',           color: '#9CA3AF', dot: 'bg-slate-400'  },
];

const FOLLOWUP_SCHEDULE = [
  { tipo: '15min', minutes: 15 },
  { tipo: '2h',    minutes: 120 },
  { tipo: '24h',   minutes: 1440 },
  { tipo: '2d',    minutes: 2880 },
  { tipo: '7d',    minutes: 10080 },
  { tipo: '15d',   minutes: 21600 },
];

const scoreToProbability = (score: number) => {
  if (score >= 91) return 90;
  if (score >= 76) return 70;
  if (score >= 51) return 40;
  if (score >= 26) return 15;
  return 5;
};

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, onClick, onDragStart, onDragEnd, isDragging }: {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const lastTouchHours = lead.last_activity_at
    ? differenceInHours(new Date(), new Date(lead.last_activity_at))
    : differenceInHours(new Date(), new Date(lead.updated_at));

  const isVencido = ['em_atendimento', 'proposta'].includes(lead.status) && lastTouchHours > 72;
  const prob      = lead.probabilidade ?? scoreToProbability(lead.score);
  const waLink    = `https://wa.me/55${lead.telefone.replace(/\D/g, '')}`;

  const heatColor = isVencido      ? '#ef4444'
    : lead.score >= 60             ? '#f97316'
    : lead.score >= 30             ? '#eab308'
    :                                '#cbd5e1';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700',
        'cursor-pointer select-none group',
        'shadow-sm hover:shadow-md transition-all duration-150',
        isVencido && 'border-red-200 dark:border-red-900',
      )}
    >
      {/* Heat stripe — top 3px line */}
      <div className="rounded-t-md h-[3px] w-full" style={{ backgroundColor: heatColor }} />

      <div className="p-3">
        {/* Row 1: name + score pill */}
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
              {lead.nome || lead.telefone}
            </p>
            {lead.nome && (
              <p className="text-[10px] text-gray-400 truncate mt-0.5">{lead.telefone}</p>
            )}
          </div>
          {/* Score */}
          <div className="shrink-0 text-right">
            <span className="inline-block text-[11px] font-bold leading-none px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {lead.score} <span className="font-normal text-gray-400 text-[9px]">pts</span>
            </span>
          </div>
        </div>

        {/* Row 2: location · time */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-2.5">
          {(lead.cidade || lead.estado) && (
            <>
              <MapPin size={9} className="shrink-0 text-gray-300" />
              <span className="truncate">
                {lead.cidade}{lead.cidade && lead.estado ? ', ' : ''}{lead.estado}
              </span>
              <span className="text-gray-200 dark:text-gray-700">·</span>
            </>
          )}
          <Clock size={9} className="shrink-0 text-gray-300" />
          <span className={cn('truncate', isVencido && 'text-red-400 font-medium')}>
            {formatDistanceToNow(new Date(lead.last_activity_at || lead.updated_at), { locale: ptBR, addSuffix: true })}
          </span>
        </div>

        {/* Row 3: tags + value */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.tipo_cliente && (
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 capitalize">
              {lead.tipo_cliente}
            </span>
          )}
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-400 capitalize">
            {lead.origem}
          </span>
          {lead.valor_estimado && (
            <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              R$ {Number(lead.valor_estimado).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions — appear on hover */}
      <div
        className="overflow-hidden max-h-0 group-hover:max-h-8 transition-all duration-150 border-t border-gray-100 dark:border-gray-800 flex divide-x divide-gray-100 dark:divide-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
          onClick={() => window.open(waLink, '_blank')}
        >
          <ExternalLink size={9} /> WhatsApp
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-semibold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => window.location.href = `/admin/crm/leads/${lead.id}`}
        >
          <StickyNote size={9} /> Histórico
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CRMPipeline() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterOrigem, setFilterOrigem] = useState('all');
  const [filterScore, setFilterScore] = useState<'all' | 'quente' | 'morno' | 'frio'>('all');
  const [filterVencidos, setFilterVencidos] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [perdidoModal, setPerdidoModal] = useState<{ lead: Lead } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<string | null>(null);

  // New lead form
  const [nlNome, setNlNome] = useState('');
  const [nlTel, setNlTel] = useState('');
  const [nlCidade, setNlCidade] = useState('');
  const [nlEstado, setNlEstado] = useState('');
  const [nlOrigem, setNlOrigem] = useState('whatsapp');
  const [nlTipo, setNlTipo] = useState('');
  const [nlScore, setNlScore] = useState(0);

  // ── Queries ──────────────────────────────────────────────────

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm_leads', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await (supabase as any)
        .from('crm_leads')
        .select('*')
        .eq('store_id', currentStore.id)
        .order('score', { ascending: false });
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!currentStore?.id,
    refetchInterval: 30000,
  });

  const { data: pendingFollowups = 0 } = useQuery({
    queryKey: ['crm_followups_count', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return 0;
      const { count } = await (supabase as any)
        .from('crm_followups')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .lte('data_agendada', new Date().toISOString());
      return count || 0;
    },
    enabled: !!currentStore?.id,
    refetchInterval: 60000,
  });

  // ── Import helpers ───────────────────────────────────────────

  const STATE_UF: Record<string, string> = {
    'acre':'AC','alagoas':'AL','amapa':'AP','amapá':'AP','amazonas':'AM',
    'bahia':'BA','ceara':'CE','ceará':'CE','distrito federal':'DF',
    'espirito santo':'ES','espírito santo':'ES','goias':'GO','goiás':'GO',
    'maranhao':'MA','maranhão':'MA','mato grosso':'MT','mato grosso do sul':'MS',
    'minas gerais':'MG','para':'PA','pará':'PA','paraiba':'PB','paraíba':'PB',
    'parana':'PR','paraná':'PR','pernambuco':'PE','piaui':'PI','piauí':'PI',
    'rio de janeiro':'RJ','rio grande do norte':'RN','rio grande do sul':'RS',
    'rondonia':'RO','rondônia':'RO','roraima':'RR','santa catarina':'SC',
    'sao paulo':'SP','são paulo':'SP','sergipe':'SE','tocantins':'TO',
  };

  const parseImportText = (text: string) =>
    text.split('\n').map(l => l.trim()).filter(Boolean).flatMap(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 2) return [];
      const [nomeRaw, tel, estadoRaw = ''] = parts;
      const key = estadoRaw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const uf = STATE_UF[estadoRaw.toLowerCase()] ?? STATE_UF[key] ?? null;
      const telefone = tel.replace(/\D/g, '');
      if (telefone.length < 8) return [];
      return [{
        store_id: currentStore?.id,
        nome: (nomeRaw === 'Lead' || !nomeRaw || /\d{6,}/.test(nomeRaw.replace(/\D/g, ''))) ? null : nomeRaw,
        telefone,
        estado: uf,
        cidade: null,
        origem: 'whatsapp',
        status: 'novo',
        score: 0,
        probabilidade: 5,
      }];
    });

  // ── Auto-fix: phone names + duplicates on first load ─────────
  const cleanupRef = useRef(false);
  useEffect(() => {
    if (cleanupRef.current || leads.length === 0) return;
    cleanupRef.current = true;

    // 1) Fix names that are phone numbers
    const badNames = leads.filter(l => l.nome && /\d{6,}/.test(l.nome.replace(/\D/g, '')));
    if (badNames.length > 0) {
      (supabase as any)
        .from('crm_leads').update({ nome: null })
        .in('id', badNames.map(l => l.id))
        .then(({ error }: any) => {
          if (!error) {
            qc.invalidateQueries({ queryKey: ['crm_leads'] });
            toast.success(`${badNames.length} nome(s) com telefone corrigido(s)!`);
          }
        });
    }

    // 2) Remove duplicate leads (same telefone — keep highest score, then most recent)
    const byPhone: Record<string, Lead[]> = {};
    leads.forEach(l => {
      const p = l.telefone.replace(/\D/g, '');
      if (!byPhone[p]) byPhone[p] = [];
      byPhone[p].push(l);
    });
    const toDelete: string[] = [];
    Object.values(byPhone).forEach(group => {
      if (group.length <= 1) return;
      const sorted = [...group].sort((a, b) =>
        b.score !== a.score
          ? b.score - a.score
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      toDelete.push(...sorted.slice(1).map(l => l.id));
    });
    if (toDelete.length > 0) {
      (supabase as any)
        .from('crm_leads').delete()
        .in('id', toDelete)
        .then(({ error }: any) => {
          if (!error) {
            qc.invalidateQueries({ queryKey: ['crm_leads'] });
            toast.success(`${toDelete.length} duplicado(s) removido(s)!`);
          }
        });
    }
  }, [leads]);

  // ── Mutations ────────────────────────────────────────────────

  const moveMutation = useMutation({
    mutationFn: async ({ lead, newStatus, motivo }: { lead: Lead; newStatus: string; motivo?: string }) => {
      const update: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (motivo) update.motivo_perda = motivo;

      const { error } = await (supabase as any).from('crm_leads').update(update).eq('id', lead.id);
      if (error) throw error;

      if (newStatus === 'proposta') {
        const { data: scripts } = await (supabase as any)
          .from('crm_scripts').select('conteudo').eq('categoria', 'followup').eq('ativo', true).order('ordem');
        const rows = FOLLOWUP_SCHEDULE.map((f, i) => ({
          lead_id: lead.id,
          tipo: f.tipo,
          mensagem: scripts?.[i]?.conteudo || `Follow-up ${f.tipo}`,
          status: 'pendente',
          data_agendada: new Date(Date.now() + f.minutes * 60_000).toISOString(),
        }));
        await (supabase as any).from('crm_followups').insert(rows);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_leads'] });
      qc.invalidateQueries({ queryKey: ['crm_followups_count'] });
      toast.success('Lead movido!');
    },
    onError: () => toast.error('Erro ao mover lead'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!nlTel.trim()) throw new Error('Telefone obrigatório');
      const { error } = await (supabase as any).from('crm_leads').insert([{
        store_id: currentStore?.id,
        nome: nlNome || null,
        telefone: nlTel.trim(),
        cidade: nlCidade || null,
        estado: nlEstado || null,
        origem: nlOrigem,
        tipo_cliente: nlTipo || null,
        status: 'novo',
        score: nlScore,
        probabilidade: scoreToProbability(nlScore),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_leads'] });
      setNewLeadOpen(false);
      setNlNome(''); setNlTel(''); setNlCidade(''); setNlEstado(''); setNlOrigem('whatsapp'); setNlTipo(''); setNlScore(0);
      toast.success('Lead criado!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async (rows: ReturnType<typeof parseImportText>) => {
      // Existing phones in this store
      const existingPhones = new Set(leads.map(l => l.telefone.replace(/\D/g, '')));

      // Deduplicate within the import list itself, then against existing
      const seen = new Set<string>();
      const newRows = rows.filter(r => {
        const p = r.telefone.replace(/\D/g, '');
        if (existingPhones.has(p) || seen.has(p)) return false;
        seen.add(p);
        return true;
      });

      const skipped = rows.length - newRows.length;
      if (newRows.length === 0) throw new Error(`Todos os ${rows.length} leads já existem no pipeline`);

      const { error } = await (supabase as any).from('crm_leads').insert(newRows);
      if (error) throw error;
      return { inserted: newRows.length, skipped };
    },
    onSuccess: ({ inserted, skipped }) => {
      qc.invalidateQueries({ queryKey: ['crm_leads'] });
      setImportOpen(false);
      setImportText('');
      const msg = skipped > 0
        ? `${inserted} importado(s), ${skipped} ignorado(s) por duplicata`
        : `${inserted} leads importados com sucesso!`;
      toast.success(msg);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao importar'),
  });


  // ── Drag & Drop ──────────────────────────────────────────────

  const handleDrop = (targetStatus: string) => {
    setDropTargetCol(null);
    if (!draggingId) return;
    const lead = leads.find(l => l.id === draggingId);
    if (!lead || lead.status === targetStatus) return;
    if (targetStatus === 'perdido') {
      setPerdidoModal({ lead });
      setMotivoPerda('');
      return;
    }
    moveMutation.mutate({ lead, newStatus: targetStatus });
  };

  const confirmPerdido = () => {
    if (!perdidoModal || !motivoPerda) { toast.error('Informe o motivo da perda'); return; }
    moveMutation.mutate({ lead: perdidoModal.lead, newStatus: 'perdido', motivo: motivoPerda });
    setPerdidoModal(null);
  };

  // ── Filters ──────────────────────────────────────────────────

  const filtered = leads.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.nome?.toLowerCase().includes(q) && !l.telefone.includes(q) && !l.cidade?.toLowerCase().includes(q))
        return false;
    }
    if (filterTipo !== 'all' && l.tipo_cliente !== filterTipo) return false;
    if (filterOrigem !== 'all' && l.origem !== filterOrigem) return false;
    if (filterScore === 'quente' && l.score < 60) return false;
    if (filterScore === 'morno' && (l.score < 30 || l.score >= 60)) return false;
    if (filterScore === 'frio' && l.score >= 30) return false;
    if (filterVencidos) {
      const h = differenceInHours(new Date(), new Date(l.last_activity_at || l.updated_at));
      if (!['em_atendimento', 'proposta'].includes(l.status) || h <= 48) return false;
    }
    return true;
  });

  const activeFilters = [
    filterTipo !== 'all', filterOrigem !== 'all',
    filterScore !== 'all', filterVencidos,
  ].filter(Boolean).length;

  const columnValue = (key: string) => {
    const col = filtered.filter(l => l.status === key && l.valor_estimado);
    return col.reduce((s, l) => s + Number(l.valor_estimado), 0);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-700 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <MessageSquare className="text-rose-500 shrink-0" size={32} />
            Pipeline de Leads
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-medium">
            {leads.length} leads · {leads.filter(l => l.status === 'fechado').length} fechados ·{' '}
            {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'fechado').length / leads.length) * 100) : 0}% conversão
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-1.5 h-8 text-xs rounded-md"
            onClick={() => navigate('/admin/crm/dashboard')}>
            <BarChart2 size={13} /> Dashboard
          </Button>
          <Button variant="outline" className="gap-1.5 h-8 text-xs rounded-md"
            onClick={() => navigate('/admin/crm/scripts')}>
            <StickyNote size={13} /> Scripts
          </Button>
          <Button variant="outline" className="gap-1.5 h-8 text-xs rounded-md"
            onClick={() => setImportOpen(true)}>
            <Upload size={13} /> Importar
          </Button>
          <Button className="bg-rose-500 hover:bg-rose-600 text-white font-semibold gap-1.5 h-8 text-xs rounded-md shadow-sm"
            onClick={() => setNewLeadOpen(true)}>
            <Plus size={13} /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Follow-ups banner */}
      {pendingFollowups > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-md border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400 shadow-sm">
          <AlertCircle size={13} className="shrink-0" />
          <span className="text-xs font-semibold">
            <strong>{pendingFollowups}</strong> follow-up{pendingFollowups > 1 ? 's' : ''} pendente{pendingFollowups > 1 ? 's' : ''} aguardando envio
          </span>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 shadow-sm">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar por nome, telefone ou cidade..."
            className="pl-8 bg-transparent border-none focus-visible:ring-0 text-sm h-8"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex gap-2 shrink-0">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('gap-1.5 rounded-md h-8 font-semibold text-xs',
                activeFilters > 0 && 'border-rose-400 text-rose-600 bg-rose-50')}>
                <Filter size={12} />
                Filtros {activeFilters > 0 && `(${activeFilters})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 space-y-4" align="end">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Filtros Avançados</p>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tipo de Cliente</Label>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="h-9 bg-muted/40 border-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="experiente">Experiente</SelectItem>
                    <SelectItem value="negocio">Negócio</SelectItem>
                    <SelectItem value="consumo">Consumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Origem</Label>
                <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                  <SelectTrigger className="h-9 bg-muted/40 border-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Temperatura do Lead</Label>
                <div className="grid grid-cols-4 gap-1">
                  {([['all','Todos'],['quente','🔥 Quente'],['morno','☀️ Morno'],['frio','❄️ Frio']] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setFilterScore(v)}
                      className={cn('text-[9px] font-black py-1.5 px-1 rounded-xl border transition-all text-center',
                        filterScore === v ? 'bg-rose-500 text-white border-rose-500' : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setFilterVencidos(!filterVencidos)}
                className={cn('flex items-center gap-2 w-full p-2.5 rounded-xl border text-xs font-bold transition-all',
                  filterVencidos ? 'bg-red-50 border-red-300 text-red-700' : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted')}>
                <AlertCircle size={13} />
                Apenas vencidos (sem contato &gt; 48h)
              </button>

              {activeFilters > 0 && (
                <Button variant="outline" size="sm" className="w-full h-8 rounded-xl text-xs gap-1.5"
                  onClick={() => { setFilterTipo('all'); setFilterOrigem('all'); setFilterScore('all'); setFilterVencidos(false); }}>
                  <X size={12} /> Limpar filtros
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <div className="text-xs font-bold text-muted-foreground flex items-center px-2">
            {filtered.length} leads
          </div>
        </div>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-rose-500" size={32} />
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {COLUMNS.map(col => {
            const colLeads = filtered.filter(l => l.status === col.key);
            const colValue = columnValue(col.key);
            const isDropTarget = dropTargetCol === col.key;

            return (
              <div
                key={col.key}
                className={cn(
                  'flex flex-col min-h-[540px] rounded-lg transition-all duration-150',
                  'bg-gray-50/80 dark:bg-gray-900/40',
                  isDropTarget && 'bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-300'
                )}
                onDragOver={e => { e.preventDefault(); setDropTargetCol(col.key); }}
                onDragLeave={() => setDropTargetCol(null)}
                onDrop={() => handleDrop(col.key)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', col.dot)} />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      {col.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {colValue > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600">
                        R${(colValue / 1000).toFixed(0)}k
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 min-w-[20px] text-center">
                      {colLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[800px] custom-scrollbar px-2 pb-2">
                  <AnimatePresence>
                    {colLeads.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => navigate(`/admin/crm/leads/${lead.id}`)}
                        onDragStart={() => setDraggingId(lead.id)}
                        onDragEnd={() => { setDraggingId(null); setDropTargetCol(null); }}
                        isDragging={draggingId === lead.id}
                      />
                    ))}
                  </AnimatePresence>

                  {colLeads.length === 0 && !isDropTarget && (
                    <div className="flex-1 flex items-center justify-center py-12">
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium text-center">
                        Nenhum lead
                      </p>
                    </div>
                  )}
                  {isDropTarget && (
                    <div className="border-2 border-dashed border-blue-300 rounded-md h-16 flex items-center justify-center">
                      <p className="text-[10px] font-semibold text-blue-400">Soltar aqui</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo Lead */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Plus size={18} className="text-rose-500" /> Novo Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nome</Label>
              <Input placeholder="Nome (opcional)" className="bg-muted/40 border-none h-11"
                value={nlNome} onChange={e => setNlNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">WhatsApp *</Label>
              <Input placeholder="(99) 99999-9999" className="bg-muted/40 border-none h-11"
                value={nlTel} onChange={e => setNlTel(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cidade</Label>
                <Input placeholder="Cidade" className="bg-muted/40 border-none h-11"
                  value={nlCidade} onChange={e => setNlCidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Estado</Label>
                <Input placeholder="UF (ex: PI)" maxLength={2} className="bg-muted/40 border-none h-11 uppercase"
                  value={nlEstado} onChange={e => setNlEstado(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tipo</Label>
              <Select value={nlTipo} onValueChange={setNlTipo}>
                <SelectTrigger className="bg-muted/40 border-none h-11"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="experiente">Experiente</SelectItem>
                  <SelectItem value="negocio">Negócio</SelectItem>
                  <SelectItem value="consumo">Consumo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Origem</Label>
              <Select value={nlOrigem} onValueChange={setNlOrigem}>
                <SelectTrigger className="bg-muted/40 border-none h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Temperatura</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'Frio',   score: 0,  isSelected: nlScore < 30,                    active: 'bg-slate-600 text-white border-slate-600',   idle: 'border-slate-200 text-slate-500 hover:bg-slate-50' },
                  { label: 'Morno',  score: 30, isSelected: nlScore >= 30 && nlScore < 60,   active: 'bg-amber-500 text-white border-amber-500',   idle: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
                  { label: 'Quente', score: 60, isSelected: nlScore >= 60,                   active: 'bg-orange-500 text-white border-orange-500', idle: 'border-orange-200 text-orange-600 hover:bg-orange-50' },
                ] as const).map(opt => (
                  <button key={opt.label} type="button"
                    onClick={() => setNlScore(opt.score)}
                    className={cn('h-9 rounded-md border text-xs font-semibold transition-colors',
                      opt.isSelected ? opt.active : opt.idle)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl"
              disabled={!nlTel.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Criar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Importar Leads */}
      <Dialog open={importOpen} onOpenChange={v => { setImportOpen(v); if (!v) setImportText(''); }}>
        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Upload size={18} className="text-rose-500" /> Importar Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Cole a lista no formato: <code className="bg-muted px-1 rounded text-[10px]">Nome | Telefone | Estado</code>
            </p>
            <Textarea
              placeholder={"Lead | 86999999999 | Piauí\nJoão Silva | 86988888888 | Maranhão"}
              className="bg-muted/40 border-none h-56 text-xs font-mono resize-none"
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            {importText.trim() && (() => {
              const count = parseImportText(importText).length;
              return (
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{count}</strong> lead{count !== 1 ? 's' : ''} válido{count !== 1 ? 's' : ''} identificado{count !== 1 ? 's' : ''}
                </p>
              );
            })()}
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl"
              disabled={!importText.trim() || importMutation.isPending}
              onClick={() => {
                const rows = parseImportText(importText);
                if (rows.length === 0) { toast.error('Nenhum lead válido encontrado'); return; }
                importMutation.mutate(rows);
              }}
            >
              {importMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {importText.trim() ? `Importar ${parseImportText(importText).length} Leads` : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Motivo Perda */}
      <Dialog open={!!perdidoModal} onOpenChange={v => !v && setPerdidoModal(null)}>
        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Por que esse lead foi perdido?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Lead: <strong>{perdidoModal?.lead.nome || perdidoModal?.lead.telefone}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['Preço alto','Não respondeu','Já tem fornecedor','Sem capital agora','Frete caro','Mudou de ideia','Concorrência','Só consumo pessoal'].map(m => (
                <button key={m} onClick={() => setMotivoPerda(m)}
                  className={cn('p-2.5 rounded-xl text-xs font-bold border transition-all text-left',
                    motivoPerda === m
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted')}>
                  {m}
                </button>
              ))}
            </div>
            <Input placeholder="Outro motivo..." className="bg-muted/40 border-none h-10 text-sm"
              value={!['Preço alto','Não respondeu','Já tem fornecedor','Sem capital agora','Frete caro','Mudou de ideia','Concorrência','Só consumo pessoal'].includes(motivoPerda) ? motivoPerda : ''}
              onChange={e => setMotivoPerda(e.target.value)} />
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setPerdidoModal(null)}>Cancelar</Button>
            <Button className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-black rounded-2xl"
              disabled={!motivoPerda || moveMutation.isPending}
              onClick={confirmPerdido}>
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
