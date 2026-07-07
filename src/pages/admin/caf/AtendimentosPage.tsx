'use client';

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Headphones, Plus, Search, X, ArrowLeft, ArrowRight,
  Clock, CheckCircle2, Loader2, Phone, Mail, MapPin, Tag,
  MessageSquare, BookOpen, Copy, Star, Send, FileText,
  Pencil, Save, AlertTriangle, Info, Lightbulb, Trash2,
  ExternalLink, RotateCcw, ChevronsUpDown, Check, History,
  RefreshCw, Video, CalendarPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CafConnectPainel } from './connect/components/CafConnectPainel';
import { NovoEventoDialog } from '../agenda/components/NovoEventoDialog';

// ── Constants ─────────────────────────────────────────────────────────────────

export const CATEGORIAS: Record<string, string[]> = {
  'Suporte ao Sistema': ['PDV', 'Cadastro', 'Relatórios', 'Estoque', 'Aplicativo'],
  'Marketing':          ['Promoções', 'Redes Sociais', 'Campanhas', 'Materiais'],
  'Financeiro':         ['Boletos', 'Royalties', 'Taxas'],
  'Pedidos':            ['Realização', 'Cancelamento', 'Entrega', 'Produto'],
  'Processos':          ['Operacional', 'RH', 'Treinamento', 'Auditoria'],
};

export const CARGOS   = ['Proprietário', 'Gerente', 'Caixa', 'Supervisor', 'Atendimento'];
export const CANAIS   = ['WhatsApp', 'Telefone', 'E-mail', 'Presencial', 'Grupo de WhatsApp'];
export const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];
export const STATUS_LIST = ['Aberto', 'Em Atendimento', 'Aguardando Franqueado', 'Resolvido', 'Encerrado'];

const PRIORIDADE_COLOR: Record<string, string> = {
  Baixa:    'bg-gray-100 text-gray-600 border-gray-200',
  Média:    'bg-blue-50 text-blue-700 border-blue-200',
  Alta:     'bg-orange-50 text-orange-700 border-orange-200',
  Crítica:  'bg-red-50 text-red-700 border-red-200',
};

const STATUS_COLOR: Record<string, string> = {
  'Aberto':                'bg-blue-50 text-blue-700 border-blue-200',
  'Em Atendimento':        'bg-amber-50 text-amber-700 border-amber-200',
  'Aguardando Franqueado': 'bg-orange-50 text-orange-700 border-orange-200',
  'Resolvido':             'bg-green-50 text-green-700 border-green-200',
  'Encerrado':             'bg-gray-100 text-gray-600 border-gray-300',
};

// ── Cadastros dinâmicos (Cargo / Canal / Categoria) ────────────────────────────
// Lidos de caf_configuracoes — mesma fonte editada em "Cadastros CAF".
// Os arrays CARGOS/CANAIS/CATEGORIAS acima continuam existindo só como fallback
// (usado aqui e também importado por CadastrosCAFPage como default).

async function getCafSetting(key: string): Promise<any> {
  const { data } = await (supabase as any)
    .from('caf_configuracoes')
    .select('value')
    .eq('key', key)
    .single();
  return data ? data.value : null;
}

function useCafCadastros() {
  const { data: cargos = CARGOS } = useQuery<string[]>({
    queryKey: ['caf_cadastro', 'caf_cargos'],
    queryFn: async () => {
      const v = await getCafSetting('caf_cargos');
      return Array.isArray(v) && v.length > 0 ? v : CARGOS;
    },
  });

  const { data: canais = CANAIS } = useQuery<string[]>({
    queryKey: ['caf_cadastro', 'caf_canais'],
    queryFn: async () => {
      const v = await getCafSetting('caf_canais');
      return Array.isArray(v) && v.length > 0 ? v : CANAIS;
    },
  });

  const { data: categorias = CATEGORIAS } = useQuery<Record<string, string[]>>({
    queryKey: ['caf_cadastro', 'caf_categorias'],
    queryFn: async () => {
      const v = await getCafSetting('caf_categorias');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : CATEGORIAS;
    },
  });

  return { cargos, canais, categorias };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AtendimentosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile: myProfile } = usePermissions();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [filterStatus, setStatus] = useState('todos');
  const [filterCat, setCat]       = useState('todas');
  const [filterPrio, setPrio]     = useState('todas');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selected, setSelected]   = useState<any>(null);

  const isMaster       = myProfile?.perfil === 'MASTER';
  const cafAtivo       = (myProfile as any)?.caf_ativo === true;

  const { categorias: categoriasCadastro } = useCafCadastros();

  // Cadastros de categoria são dinâmicos (Cadastros CAF) — todo usuário com
  // acesso ao módulo vê todas as categorias, sem restrição por usuário.
  const categoriasPermitidas = useMemo(
    () => Object.keys(categoriasCadastro),
    [categoriasCadastro]
  );

  // Nome do atendente logado (usa nome do perfil, não e-mail)
  const atendenteNome = (myProfile as any)?.nome || user?.user_metadata?.full_name || user?.email || '';

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['caf_atendimentos', categoriasPermitidas],
    queryFn: async () => {
      let q = (supabase as any)
        .from('caf_atendimentos')
        .select('*, caf_satisfacao(*)')
        .order('created_at', { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];

      // Resolve nomes reais por ID e por email (para tickets onde atendente_id é nulo)
      const ids    = [...new Set(rows.map((a: any) => a.atendente_id).filter(Boolean))];
      const emails = [...new Set(
        rows.map((a: any) => a.atendente_nome).filter((v: any) => typeof v === 'string' && v.includes('@'))
      )];

      let idMap:    Record<string, string> = {};
      let emailMap: Record<string, string> = {};

      if (ids.length > 0 || emails.length > 0) {
        let q = (supabase as any).from('user_profiles').select('id, nome, email');
        if (ids.length > 0 && emails.length > 0) {
          q = q.or(`id.in.(${ids.join(',')}),email.in.(${emails.map((e: string) => `"${e}"`).join(',')})`);
        } else if (ids.length > 0) {
          q = q.in('id', ids);
        } else {
          q = q.in('email', emails);
        }
        const { data: profiles } = await q;
        (profiles || []).forEach((p: any) => {
          if (p.nome) {
            if (p.id)    idMap[p.id]      = p.nome;
            if (p.email) emailMap[p.email] = p.nome;
          }
        });
      }

      return rows.map((a: any) => ({
        ...a,
        atendente_nome:
          (a.atendente_id && idMap[a.atendente_id]) ||
          (a.atendente_nome && emailMap[a.atendente_nome]) ||
          a.atendente_nome,
      }));
    },
  });

  // Deep-link vindo da Agenda (?ticket=<id>) — abre o detalhe automaticamente.
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (!ticketId || atendimentos.length === 0) return;
    const found = atendimentos.find((a: any) => a.id === ticketId);
    if (found) {
      setSelected(found);
      setSearchParams(prev => { prev.delete('ticket'); return prev; }, { replace: true });
    }
  }, [searchParams, atendimentos, setSearchParams]);

  const filtered = useMemo(() => atendimentos.filter((a: any) => {
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false;
    if (filterCat !== 'todas' && a.categoria !== filterCat) return false;
    if (filterPrio !== 'todas' && a.prioridade !== filterPrio) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.protocolo?.toLowerCase().includes(q) ||
        a.loja_franqueada?.toLowerCase().includes(q) ||
        a.solicitante_nome?.toLowerCase().includes(q) ||
        a.descricao?.toLowerCase().includes(q) ||
        a.atendente_nome?.toLowerCase().includes(q);
    }
    return true;
  }), [atendimentos, filterStatus, filterCat, filterPrio, search]);

  const counts = useMemo(() => ({
    abertos:    atendimentos.filter((a: any) => ['Aberto', 'Em Atendimento', 'Aguardando Franqueado'].includes(a.status)).length,
    resolvidos: atendimentos.filter((a: any) => ['Resolvido', 'Encerrado'].includes(a.status)).length,
    criticos:   atendimentos.filter((a: any) => a.prioridade === 'Crítica' && a.status !== 'Encerrado').length,
  }), [atendimentos]);

  // Categorias disponíveis nos dropdowns — sempre todas (cadastro dinâmico)
  const categoriasDropdown = Object.keys(categoriasCadastro);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/caf/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        CAF Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <Headphones className="text-primary shrink-0" size={34} />
            Atendimentos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Central de Atendimento ao Franqueado
          </p>
        </div>
        <Button onClick={() => setIsNewOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2">
          <Plus size={16} /> Novo Atendimento
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Em Aberto', value: counts.abertos, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: Clock },
          { label: 'Resolvidos', value: counts.resolvidos, color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle2 },
          { label: 'Críticos', value: counts.criticos, color: 'text-red-600', bg: 'bg-red-500/10', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-black">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar protocolo, loja, atendente..." className="pl-9 bg-muted/50 border-none"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setCat}>
          <SelectTrigger className="w-[180px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {categoriasDropdown.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrio} onValueChange={setPrio}>
          <SelectTrigger className="w-[140px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas prioridades</SelectItem>
            {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterStatus !== 'todos' || filterCat !== 'todas' || filterPrio !== 'todas') && (
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1"
            onClick={() => { setSearch(''); setStatus('todos'); setCat('todas'); setPrio('todas'); }}>
            <X size={13} /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden border-none p-0">
        {isLoading ? (
          <div className="p-20 text-center flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin text-primary" size={28} />
            <span className="text-xs font-bold uppercase tracking-widest">Carregando atendimentos...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Headphones className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold">Nenhum atendimento encontrado</h3>
            <p className="text-muted-foreground mt-1 text-sm">Registre um novo atendimento ou ajuste os filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {['Protocolo', 'Data', 'Loja', 'Categoria', 'Prioridade', 'Status', 'Atendente', 'Tempo'].map(h => (
                    <th key={h} className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a: any) => {
                  const tempoMin = a.tempo_resolucao_min ?? (
                    a.status !== 'Encerrado' ? differenceInMinutes(new Date(), parseISO(a.created_at)) : null
                  );
                  const tempoStr = tempoMin === null ? '—' : tempoMin < 60
                    ? `${tempoMin}m`
                    : tempoMin < 1440
                    ? `${Math.floor(tempoMin / 60)}h ${tempoMin % 60}m`
                    : `${Math.floor(tempoMin / 1440)}d`;
                  const satisfacao = a.caf_satisfacao?.[0];
                  return (
                    <tr key={a.id}
                      className="border-b last:border-0 hover:bg-muted/10 transition-colors cursor-pointer group"
                      onClick={() => setSelected(a)}>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-xs text-primary font-mono">{a.protocolo}</span>
                          {satisfacao?.nota && (
                            <span className="flex items-center gap-0.5">
                              {Array.from({ length: satisfacao.nota }).map((_, i) => (
                                <Star key={i} size={9} className="fill-amber-400 text-amber-400" />
                              ))}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(a.created_at), "dd/MM/yy HH:mm")}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold truncate max-w-[120px]">{a.loja_franqueada || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{a.cidade}{a.estado ? ` / ${a.estado}` : ''}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-medium">{a.categoria}</p>
                        {a.subcategoria && <p className="text-[10px] text-muted-foreground">{a.subcategoria}</p>}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn('text-[10px] font-bold', PRIORIDADE_COLOR[a.prioridade])}>
                          {a.prioridade}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn('text-[10px] font-bold whitespace-nowrap', STATUS_COLOR[a.status])}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">{a.atendente_nome || '—'}</td>
                      <td className="p-4 text-xs font-mono text-muted-foreground">{tempoStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t text-[11px] text-muted-foreground">
              {filtered.length} atendimento{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      <NovoAtendimentoDialog
        open={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        currentUser={user}
        atendenteNome={atendenteNome}
        onSaved={() => { setIsNewOpen(false); qc.invalidateQueries({ queryKey: ['caf_atendimentos'] }); }}
      />

      {selected && (
        <AtendimentoDetailDialog
          atendimento={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated: any) => {
            setSelected(updated);
            qc.invalidateQueries({ queryKey: ['caf_atendimentos'] });
          }}
          currentUser={user}
          atendenteNome={atendenteNome}
          isMaster={isMaster}
          cafAtivo={cafAtivo}
        />
      )}
    </div>
  );
}

// ── Novo Atendimento Dialog ────────────────────────────────────────────────────

function NovoAtendimentoDialog({ open, onClose, currentUser, atendenteNome, onSaved }: {
  open: boolean; onClose: () => void; currentUser: any; atendenteNome: string; onSaved: () => void;
}) {
  const [lojaFranqueada, setLojaFranqueada] = useState('');
  const [cidade, setCidade]                 = useState('');
  const [estado, setEstado]                 = useState('');
  const [solNome, setSolNome]               = useState('');
  const [solCargo, setSolCargo]             = useState('');
  const [canal, setCanal]                   = useState('WhatsApp');
  const [categoria, setCategoria]           = useState('');
  const [subcategoria, setSubcategoria]     = useState('');
  const [prioridade, setPrioridade]         = useState('Média');
  const [descricao, setDescricao]           = useState('');
  const [solucao, setSolucao]               = useState('');
  const [saving, setSaving]                 = useState(false);
  const [debouncedDesc, setDebouncedDesc]   = useState('');
  const [lojaOpen, setLojaOpen]             = useState(false);

  const { cargos, canais, categorias } = useCafCadastros();

  const { data: stores = [] } = useQuery({
    queryKey: ['stores_caf'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('stores')
        .select('id, name, city, state, slug')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDesc(descricao), 600);
    return () => clearTimeout(t);
  }, [descricao]);

  const { data: similares = [] } = useQuery({
    queryKey: ['caf_similares', debouncedDesc],
    queryFn: async () => {
      if (debouncedDesc.length < 10) return [];
      const palavra = debouncedDesc.split(/\s+/).find(w => w.length >= 4) || '';
      if (!palavra) return [];
      const { data } = await (supabase as any)
        .from('caf_atendimentos')
        .select('id, protocolo, descricao, solucao, categoria, status')
        .ilike('descricao', `%${palavra}%`)
        .not('solucao', 'is', null)
        .limit(5);
      return data || [];
    },
    enabled: debouncedDesc.length >= 10,
  });

  const { data: artigosSimilares = [] } = useQuery({
    queryKey: ['caf_artigos_similares', debouncedDesc],
    queryFn: async () => {
      if (debouncedDesc.length < 10) return [];
      const palavra = debouncedDesc.split(/\s+/).find(w => w.length >= 4) || '';
      if (!palavra) return [];
      const { data } = await (supabase as any)
        .from('caf_artigos')
        .select('id, titulo, categoria')
        .ilike('titulo', `%${palavra}%`)
        .eq('publicado', true)
        .limit(3);
      return data || [];
    },
    enabled: debouncedDesc.length >= 10,
  });

  const reset = () => {
    setLojaFranqueada(''); setCidade(''); setEstado('');
    setSolNome(''); setSolCargo(''); setCanal('WhatsApp'); setCategoria('');
    setSubcategoria(''); setPrioridade('Média'); setDescricao(''); setSolucao('');
    setLojaOpen(false);
  };

  const handleSelectStore = (store: any) => {
    setLojaFranqueada(store.name);
    if (store.city)  setCidade(store.city);
    if (store.state) setEstado(store.state);
    setLojaOpen(false);
  };

  const handleSave = async () => {
    if (!categoria) { toast.error('Selecione a categoria'); return; }
    if (!descricao.trim()) { toast.error('Descreva a solicitação'); return; }
    setSaving(true);
    try {
      const payload: any = {
        loja_franqueada:   lojaFranqueada || null,
        cidade:            cidade || null,
        estado:            estado || null,
        solicitante_nome:  solNome || null,
        solicitante_cargo: solCargo || null,
        canal, categoria, subcategoria: subcategoria || null, prioridade,
        descricao, solucao: solucao || null,
        status:            solucao.trim() ? 'Resolvido' : 'Aberto',
        atendente_id:      currentUser?.id || null,
        atendente_nome:    atendenteNome || null,
        respondido_em:     solucao.trim() ? new Date().toISOString() : null,
        resolvido_em:      solucao.trim() ? new Date().toISOString() : null,
      };
      const { error } = await (supabase as any).from('caf_atendimentos').insert([payload]);
      if (error) throw error;
      toast.success('Atendimento registrado!');
      reset();
      onSaved();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasSimilares = similares.length > 0 || artigosSimilares.length > 0;
  const [showSimilares, setShowSimilares] = useState(true);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Headphones size={22} className="text-violet-600" /> Novo Atendimento
          </DialogTitle>
          <p className="text-sm text-slate-500">Registre uma nova solicitação do franqueado.</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Identificação */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Identificação da Loja</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Loja Franqueada</Label>
                <Popover open={lojaOpen} onOpenChange={setLojaOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox"
                      className="w-full justify-between bg-white border-slate-200 font-normal">
                      <span className={cn('truncate', !lojaFranqueada && 'text-muted-foreground')}>
                        {lojaFranqueada || 'Selecionar loja franqueada...'}
                      </span>
                      <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[480px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar loja pelo nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                        <CommandGroup>
                          {(stores as any[]).map((s: any) => (
                            <CommandItem key={s.id} value={s.name} onSelect={() => handleSelectStore(s)}>
                              <Check size={13} className={cn('mr-2 shrink-0', lojaFranqueada === s.name ? 'opacity-100 text-primary' : 'opacity-0')} />
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">{s.name}</span>
                                {(s.city || s.state) && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {[s.city, s.state].filter(Boolean).join(' / ')}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                      <div className="p-2 border-t">
                        <Input
                          placeholder="Ou digite o nome da loja manualmente..."
                          className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500"
                          value={lojaFranqueada}
                          onChange={e => setLojaFranqueada(e.target.value)}
                        />
                      </div>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="Preenchido automaticamente" value={cidade} onChange={e => setCidade(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label>Estado</Label>
                <Input placeholder="UF" value={estado} onChange={e => setEstado(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" maxLength={2} />
              </div>
            </div>
          </div>

          {/* Solicitante */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Solicitante</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Nome do solicitante" value={solNome} onChange={e => setSolNome(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={solCargo} onValueChange={setSolCargo}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{cargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Classificação */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Classificação</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <Select value={canal} onValueChange={setCanal}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue /></SelectTrigger>
                  <SelectContent>{canais.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade *</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={categoria} onValueChange={v => { setCategoria(v); setSubcategoria(''); }}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{Object.keys(categorias).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subcategoria</Label>
                <Select value={subcategoria} onValueChange={setSubcategoria} disabled={!categoria}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {(categorias[categoria] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Atendente (informativo) */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
            <Headphones size={12} className="text-violet-600" />
            <span>Atendente: <strong className="text-slate-900">{atendenteNome}</strong></span>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição da Solicitação *</Label>
            <Textarea placeholder="Descreva detalhadamente o que o franqueado solicitou..."
              value={descricao} onChange={e => setDescricao(e.target.value)}
              className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none" rows={3} />

            {hasSimilares && showSimilares && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Lightbulb size={14} />
                    <span className="text-xs font-bold">
                      {similares.length > 0 && `${similares.length} atendimento(s) semelhante(s)`}
                      {artigosSimilares.length > 0 && ` · ${artigosSimilares.length} artigo(s) relacionado(s)`}
                    </span>
                  </div>
                  <button onClick={() => setShowSimilares(false)} className="text-amber-400 hover:text-amber-600"><X size={12} /></button>
                </div>
                {similares.slice(0, 3).map((s: any) => (
                  <div key={s.id} className="bg-white/60 rounded-lg p-2 text-xs">
                    <span className="font-black text-amber-700 font-mono">{s.protocolo}</span>
                    <span className="mx-1 text-amber-400">·</span>
                    <span className="text-amber-800">{s.descricao?.slice(0, 60)}...</span>
                    {s.solucao && <p className="text-green-700 font-medium mt-0.5">✓ {s.solucao.slice(0, 80)}...</p>}
                  </div>
                ))}
                {artigosSimilares.map((a: any) => (
                  <div key={a.id} className="bg-white/60 rounded-lg p-2 text-xs flex items-center gap-2">
                    <BookOpen size={11} className="text-blue-600 shrink-0" />
                    <span className="font-medium text-blue-700">{a.titulo}</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">{a.categoria}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solução */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Solução Aplicada
              <span className="text-[10px] font-normal text-muted-foreground">(opcional — preencher se já foi resolvido)</span>
            </Label>
            <Textarea placeholder="Descreva como o problema foi resolvido..."
              value={solucao} onChange={e => setSolucao(e.target.value)}
              className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none" rows={2} />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-xl font-bold gap-2 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-600/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {saving ? 'Registrando...' : 'Registrar Atendimento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Atendimento Detail Dialog ─────────────────────────────────────────────────

function AtendimentoDetailDialog({ atendimento, onClose, onUpdated, currentUser, atendenteNome, isMaster, cafAtivo }: {
  atendimento: any; onClose: () => void; onUpdated: (a: any) => void;
  currentUser: any; atendenteNome: string; isMaster: boolean; cafAtivo: boolean;
}) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const [editMode, setEditMode]         = useState(false);
  const [solucao, setSolucao]           = useState(atendimento.solucao || '');
  const [descricao, setDescricao]       = useState(atendimento.descricao || '');
  const [saving, setSaving]             = useState(false);
  const [showArtigo, setShowArtigo]     = useState(false);
  const [showTransferir, setShowTransferir] = useState(false);
  const [connectOpen, setConnectOpen]   = useState(false);
  const [agendarOpen, setAgendarOpen]   = useState(false);

  const satisfacao = atendimento.caf_satisfacao?.[0];
  const surveyUrl  = `${window.location.origin}/avaliacao/${atendimento.satisfacao_token}`;

  const canTransfer = isMaster || cafAtivo || hasRole('manager');

  const waMsg = `Olá, ${atendimento.solicitante_nome || 'Franqueado'}! 👋\n\nSeu atendimento nº *${atendimento.protocolo}* foi concluído.\n\nPara avaliarmos nosso atendimento, responda rapidamente:\n${surveyUrl}\n\nAgradecemos sua participação.\n_Equipe Açaí no Grau_ 🍇`;

  const { data: historico = [] } = useQuery({
    queryKey: ['caf_historico', atendimento.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('caf_historico')
        .select('*')
        .eq('atendimento_id', atendimento.id)
        .order('criado_em', { ascending: false });
      return data || [];
    },
  });

  const updateStatus = async (newStatus: string) => {
    const now     = new Date().toISOString();
    const updates: any = { status: newStatus, updated_at: now };
    if (newStatus === 'Em Atendimento' && !atendimento.respondido_em) {
      updates.respondido_em      = now;
      updates.tempo_resposta_min = differenceInMinutes(new Date(), parseISO(atendimento.created_at));
      // Garante que o nome do atendente fica gravado corretamente
      if (!atendimento.atendente_id) {
        updates.atendente_id   = currentUser?.id || null;
        updates.atendente_nome = atendenteNome || null;
      }
    }
    if (newStatus === 'Resolvido' && !atendimento.resolvido_em) {
      updates.resolvido_em      = now;
      updates.tempo_resolucao_min = differenceInMinutes(new Date(), parseISO(atendimento.created_at));
    }
    if (newStatus === 'Encerrado') updates.encerrado_em = now;
    try {
      const { data, error } = await (supabase as any)
        .from('caf_atendimentos')
        .update(updates)
        .eq('id', atendimento.id)
        .select('*, caf_satisfacao(*)')
        .single();
      if (error) throw error;
      // Preserva o nome resolvido no objeto retornado
      if (data && atendenteNome) data.atendente_nome = data.atendente_nome || atendenteNome;

      // Registra no histórico
      await (supabase as any).from('caf_historico').insert([{
        atendimento_id: atendimento.id,
        tipo:           'MUDANCA_STATUS',
        usuario_id:     currentUser?.id,
        usuario_nome:   atendenteNome,
        campo:          'status',
        valor_anterior: atendimento.status,
        valor_novo:     newStatus,
      }]);

      toast.success('Status atualizado');
      onUpdated(data);
      qc.invalidateQueries({ queryKey: ['caf_historico', atendimento.id] });
    } catch (e: any) { toast.error(e.message); }
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('caf_atendimentos')
        .update({ descricao, solucao: solucao || null })
        .eq('id', atendimento.id)
        .select('*, caf_satisfacao(*)')
        .single();
      if (error) throw error;
      toast.success('Atendimento atualizado');
      setEditMode(false);
      onUpdated(data);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-violet-600 font-black text-lg">{atendimento.protocolo}</span>
            <Badge variant="outline" className={cn('text-xs font-bold', STATUS_COLOR[atendimento.status])}>
              {atendimento.status}
            </Badge>
            <Badge variant="outline" className={cn('text-xs font-bold', PRIORIDADE_COLOR[atendimento.prioridade])}>
              {atendimento.prioridade}
            </Badge>
            <Badge variant="outline" className="text-xs font-bold text-slate-500 bg-slate-50 border-slate-200">
              {atendimento.categoria}
            </Badge>
            <Button
              size="sm"
              className="ml-auto gap-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm shadow-violet-600/20"
              onClick={() => setConnectOpen(true)}
            >
              <Video className="h-3.5 w-3.5" /> CAF Connect
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-bold bg-white border-slate-200"
              onClick={() => setAgendarOpen(true)}
            >
              <CalendarPlus className="h-3.5 w-3.5 text-violet-600" /> Agendar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="bg-slate-100 border border-slate-200 p-1 h-9 mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="info" className="text-xs font-bold px-3 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">Informações</TabsTrigger>
            <TabsTrigger value="status" className="text-xs font-bold px-3 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">Status & Ações</TabsTrigger>
            <TabsTrigger value="satisfacao" className="text-xs font-bold px-3 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
              Pesquisa {satisfacao && '✓'}
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs font-bold px-3 flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
              <History size={11} /> Histórico
              {historico.length > 0 && (
                <span className="bg-violet-100 text-violet-700 text-[9px] font-black px-1 rounded-full">{historico.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: Info */}
          <TabsContent value="info" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Loja', value: atendimento.loja_franqueada },
                { label: 'Cidade / UF', value: [atendimento.cidade, atendimento.estado].filter(Boolean).join(' / ') },
                { label: 'Solicitante', value: atendimento.solicitante_nome },
                { label: 'Cargo', value: atendimento.solicitante_cargo },
                { label: 'Canal', value: atendimento.canal },
                { label: 'Categoria', value: atendimento.categoria },
                { label: 'Subcategoria', value: atendimento.subcategoria },
                { label: 'Atendente', value: atendimento.atendente_nome },
              ].filter(f => f.value).map(f => (
                <div key={f.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{f.label}</p>
                  <p className="text-sm font-semibold mt-0.5 text-slate-900">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Clock size={11} /> Aberto {format(parseISO(atendimento.created_at), "dd/MM/yy 'às' HH:mm")}</span>
              {atendimento.tempo_resposta_min != null && (
                <span className="flex items-center gap-1 text-amber-600"><Clock size={11} /> Resposta: {atendimento.tempo_resposta_min}min</span>
              )}
              {atendimento.tempo_resolucao_min != null && (
                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={11} /> Resolução: {Math.floor(atendimento.tempo_resolucao_min / 60)}h{atendimento.tempo_resolucao_min % 60}m</span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descrição da Solicitação</Label>
              {editMode ? (
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                  className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none" rows={3} />
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                  {atendimento.descricao || <span className="text-slate-400 italic">Sem descrição</span>}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Solução Aplicada</Label>
              {editMode ? (
                <Textarea value={solucao} onChange={e => setSolucao(e.target.value)}
                  className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none" rows={3}
                  placeholder="Descreva como o problema foi resolvido..." />
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                  {atendimento.solucao || <span className="text-slate-400 italic">Ainda não preenchida</span>}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {!editMode ? (
                <Button variant="outline" size="sm" className="gap-1.5 bg-white border-slate-200" onClick={() => setEditMode(true)}>
                  <Pencil size={13} /> Editar
                </Button>
              ) : (
                <>
                  <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white" onClick={saveEdits} disabled={saving}>
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setSolucao(atendimento.solucao || ''); setDescricao(atendimento.descricao || ''); }}>
                    Cancelar
                  </Button>
                </>
              )}
              {atendimento.solucao && (
                <Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => setShowArtigo(true)}>
                  <BookOpen size={13} /> Transformar em Artigo
                </Button>
              )}
              {canTransfer && (
                <Button variant="outline" size="sm" className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowTransferir(true)}>
                  <RefreshCw size={13} /> Transferir Categoria
                </Button>
              )}
            </div>
          </TabsContent>

          {/* TAB: Status */}
          <TabsContent value="status" className="space-y-4 mt-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Mudar Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_LIST.map(s => (
                  <Button key={s} variant="outline" size="sm"
                    className={cn('text-xs font-bold transition-all', STATUS_COLOR[s],
                      atendimento.status === s ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-100')}
                    onClick={() => updateStatus(s)}
                    disabled={atendimento.status === s}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {['Resolvido', 'Encerrado'].includes(atendimento.status) && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Mensagem WhatsApp para Pesquisa</p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs whitespace-pre-wrap text-green-900 font-medium leading-relaxed">
                  {waMsg}
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-green-700 border-green-300"
                  onClick={() => { navigator.clipboard.writeText(waMsg); toast.success('Mensagem copiada!'); }}>
                  <Copy size={12} /> Copiar mensagem
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB: Satisfação */}
          <TabsContent value="satisfacao" className="space-y-4 mt-0">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Link da Pesquisa</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono truncate text-slate-700">{surveyUrl}</code>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200"
                  onClick={() => { navigator.clipboard.writeText(surveyUrl); toast.success('Link copiado!'); }}>
                  <Copy size={13} />
                </Button>
              </div>
            </div>

            {satisfacao ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Resposta Recebida</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Problema resolvido?</p>
                    <p className="font-bold mt-0.5 text-sm text-slate-900">{satisfacao.problema_resolvido || '—'}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nota</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {satisfacao.nota ? Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} className={i < satisfacao.nota ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                      )) : <span className="text-sm">—</span>}
                    </div>
                  </div>
                  {satisfacao.nps != null && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">NPS</p>
                      <p className="text-2xl font-black mt-0.5 text-violet-600">{satisfacao.nps}</p>
                    </div>
                  )}
                  {satisfacao.comentario && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Comentário</p>
                      <p className="text-sm mt-0.5 italic text-slate-700">{satisfacao.comentario}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <Info size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Pesquisa ainda não respondida</p>
                <p className="text-[11px] mt-1">Envie o link acima para o franqueado.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB: Histórico */}
          <TabsContent value="historico" className="mt-0">
            {historico.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <History size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum evento registrado ainda.</p>
                <p className="text-[11px] mt-1">Transferências e mudanças de status aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(historico as any[]).map((h: any) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      h.tipo === 'TRANSFERENCIA_CATEGORIA' ? 'bg-orange-100' : 'bg-blue-100'
                    )}>
                      {h.tipo === 'TRANSFERENCIA_CATEGORIA'
                        ? <RefreshCw size={12} className="text-orange-600" />
                        : <History size={12} className="text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {h.usuario_nome || 'Sistema'}
                            {h.tipo === 'TRANSFERENCIA_CATEGORIA' && (
                              <span className="ml-2 text-orange-600 font-normal">
                                transferiu a categoria
                              </span>
                            )}
                            {h.tipo === 'MUDANCA_STATUS' && (
                              <span className="ml-2 text-blue-600 font-normal">
                                alterou o status
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              {h.valor_anterior || '—'}
                            </span>
                            <ArrowRight size={10} className="text-slate-400" />
                            <span className="text-[10px] font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              {h.valor_novo || '—'}
                            </span>
                          </div>
                          {h.motivo && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">"{h.motivo}"</p>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {format(new Date(h.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CafConnectPainel
          ticketId={atendimento.id}
          ticketProtocolo={atendimento.protocolo}
          ticketCategoria={atendimento.categoria}
          ticketPrioridade={atendimento.prioridade}
          ticketStatus={atendimento.status}
          ticketLoja={atendimento.loja_franqueada}
          ticketDestinatarioNome={atendimento.solicitante_nome}
          currentUserId={currentUser?.id}
          currentUserNome={atendenteNome}
          canUseConnect={isMaster || cafAtivo}
          open={connectOpen}
          onOpenChange={setConnectOpen}
        />

        <NovoEventoDialog
          open={agendarOpen}
          onOpenChange={setAgendarOpen}
          currentUserId={currentUser?.id}
          defaultTicketId={atendimento.id}
          defaultTicketProtocolo={atendimento.protocolo}
          defaultOrigemModulo="caf"
          defaultOrigemTabela="caf_atendimentos"
        />

        {/* Artigo Dialog */}
        {showArtigo && (
          <CriarArtigoDialog
            atendimento={atendimento}
            currentUser={currentUser}
            atendenteNome={atendenteNome}
            onClose={() => setShowArtigo(false)}
            onSaved={() => { setShowArtigo(false); toast.success('Artigo criado na Base de Conhecimento!'); }}
          />
        )}

        {/* Transferir Categoria Dialog */}
        {showTransferir && (
          <TransferirCategoriaDialog
            atendimento={atendimento}
            currentUser={currentUser}
            atendenteNome={atendenteNome}
            onClose={() => setShowTransferir(false)}
            onTransferred={(updated: any) => {
              setShowTransferir(false);
              onUpdated(updated);
              qc.invalidateQueries({ queryKey: ['caf_historico', atendimento.id] });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Transferir Categoria Dialog ───────────────────────────────────────────────

function TransferirCategoriaDialog({ atendimento, currentUser, atendenteNome, onClose, onTransferred }: {
  atendimento: any; currentUser: any; atendenteNome: string;
  onClose: () => void; onTransferred: (a: any) => void;
}) {
  const [novaCategoria, setNovaCategoria] = useState('');
  const [motivo, setMotivo]               = useState('');
  const [saving, setSaving]               = useState(false);

  const { categorias } = useCafCadastros();

  const handleTransfer = async () => {
    if (!novaCategoria) { toast.error('Selecione a nova categoria'); return; }
    if (novaCategoria === atendimento.categoria) { toast.error('Selecione uma categoria diferente da atual'); return; }
    if (!motivo.trim()) { toast.error('Informe o motivo da transferência'); return; }

    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('caf_atendimentos')
        .update({ categoria: novaCategoria, subcategoria: null })
        .eq('id', atendimento.id)
        .select('*, caf_satisfacao(*)')
        .single();
      if (error) throw error;

      await (supabase as any).from('caf_historico').insert([{
        atendimento_id: atendimento.id,
        tipo:           'TRANSFERENCIA_CATEGORIA',
        usuario_id:     currentUser?.id,
        usuario_nome:   atendenteNome,
        campo:          'categoria',
        valor_anterior: atendimento.categoria,
        valor_novo:     novaCategoria,
        motivo:         motivo.trim(),
      }]);

      toast.success(`Atendimento transferido para ${novaCategoria}`);
      onTransferred(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <RefreshCw size={18} className="text-orange-500" /> Transferir Categoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Categoria atual */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Categoria atual</p>
              <p className="font-bold text-sm mt-0.5 text-slate-900">{atendimento.categoria}</p>
            </div>
            <ArrowRight size={16} className="text-slate-400 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nova categoria</p>
              <p className={cn('font-bold text-sm mt-0.5', novaCategoria ? 'text-orange-600' : 'text-slate-400 italic')}>
                {novaCategoria || 'Selecionar...'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nova Categoria *</Label>
            <Select value={novaCategoria} onValueChange={setNovaCategoria}>
              <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20">
                <SelectValue placeholder="Selecionar categoria de destino" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(categorias)
                  .filter(c => c !== atendimento.categoria)
                  .map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo da Transferência *</Label>
            <Textarea
              placeholder="Ex: O franqueado abriu em Marketing, mas trata-se de configuração do PDV..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTransfer} disabled={saving} className="flex-1 h-11 rounded-xl font-bold gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Confirmar Transferência
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl border-slate-200">Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Criar Artigo a partir de Atendimento ─────────────────────────────────────

function CriarArtigoDialog({ atendimento, currentUser, atendenteNome, onClose, onSaved }: {
  atendimento: any; currentUser: any; atendenteNome: string; onClose: () => void; onSaved: () => void;
}) {
  const [titulo, setTitulo]     = useState(atendimento.descricao?.split('\n')[0]?.slice(0, 80) || '');
  const [conteudo, setConteudo] = useState(atendimento.solucao || '');
  const [tags, setTags]         = useState('');
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error('Informe o título do artigo'); return; }
    if (!conteudo.trim()) { toast.error('Informe o conteúdo'); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('caf_artigos').insert([{
        titulo, conteudo,
        categoria:             atendimento.categoria,
        subcategoria:          atendimento.subcategoria,
        tags:                  tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        atendimento_origem_id: atendimento.id,
        criado_por:            currentUser?.id,
        criado_por_nome:       atendenteNome,
        publicado:             true,
      }]);
      if (error) throw error;
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            📚 Transformar em Artigo
          </DialogTitle>
          <p className="text-sm text-slate-500">Publique essa solução na Base de Conhecimento da rede.</p>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="space-y-1.5">
              <Label>Título do Artigo *</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo / Solução *</Label>
              <Textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none" rows={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags <span className="text-slate-400 font-normal text-xs">(separadas por vírgula)</span></Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="pdv, promoção, combo..." className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl font-bold gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-600/20">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
              Publicar Artigo
            </Button>
            <Button variant="outline" onClick={onClose} className="h-12 rounded-xl border-slate-200">Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
