'use client';

import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { PERFIL_INFO, type Perfil } from '@/lib/permissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn, getAppUrl } from '@/lib/utils';
import {
  Users, Plus, Search, Pencil, KeyRound,
  Trash2, ArrowLeft, ShieldCheck, Building2,
  UserX, UserCheck, AlertTriangle, History,
  ChevronDown, ChevronRight, FileClock, Filter,
  Activity, Flame, BarChart3, Monitor, Clock,
  ShoppingBag, Star, TrendingUp, Zap, Eye, Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Audit data formatting helpers ─────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  ativo:       'Ativo',
  perfil:      'Perfil',
  nome:        'Nome',
  email:       'E-mail',
  telefone:    'Telefone',
  unidades:    'Unidades',
  role:        'Papel',
  permissoes:  'Permissões',
  is_protected: 'Protegido',
  unidade_id:  'Loja',
  status:      'Status',
  cpf:         'CPF',
};

const PERFIL_PT: Record<string, string> = {
  MASTER:      'Master',
  GERENTE:     'Gerente',
  COLABORADOR: 'Colaborador',
  FRANQUEADO:  'Franqueado',
  ADMIN:       'Admin',
};

const AUDIT_SKIP = new Set(['id', 'foto', 'ip', 'senha', 'password']);

function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (Array.isArray(val)) {
    if (key === 'unidades') return `${val.length} unidade${val.length !== 1 ? 's' : ''}`;
    return `${val.length} item${val.length !== 1 ? 's' : ''}`;
  }
  if (key === 'perfil' && typeof val === 'string') return PERFIL_PT[val] ?? val;
  if (typeof val === 'string' && val.length > 50) return val.slice(0, 47) + '…';
  return String(val);
}

function formatAuditSummary(data: any): string {
  if (!data || typeof data !== 'object') return '';
  return Object.entries(data)
    .filter(([k]) => !AUDIT_SKIP.has(k))
    .map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${formatFieldValue(k, v)}`)
    .join(' · ');
}

// ── Action badge config ────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  CRIAR:              { label: 'Criação',     className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
  ATIVAR:             { label: 'Ativação',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EDITAR:             { label: 'Edição',      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
  DESATIVAR:          { label: 'Desativação', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400' },
  DESATIVAR_EXCLUSAO: { label: 'Exclusão',    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
};

function ActionBadge({ acao }: { acao: string }) {
  const cfg = ACTION_CONFIG[acao] ?? { label: acao, className: 'bg-gray-100 text-gray-600' };
  return (
    <Badge variant="outline" className={cn('font-bold text-[10px] uppercase tracking-wider', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ── Inline diff for before/after data ─────────────────────────────────────
function DiffCell({ antes, depois }: { antes: any; depois: any }) {
  if (!antes && !depois) return <span className="text-muted-foreground text-xs">—</span>;
  const keys = Array.from(new Set([
    ...Object.keys(antes || {}),
    ...Object.keys(depois || {}),
  ])).filter(k => !AUDIT_SKIP.has(k));
  const changed = keys.filter(k => JSON.stringify(antes?.[k]) !== JSON.stringify(depois?.[k]));
  if (changed.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="space-y-1">
      {changed.map(k => (
        <div key={k} className="flex items-center gap-1 flex-wrap text-[10px]">
          <span className="text-muted-foreground font-semibold">{FIELD_LABELS[k] ?? k}:</span>
          {antes?.[k] !== undefined && (
            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-1 rounded line-through">
              {formatFieldValue(k, antes[k])}
            </span>
          )}
          {depois?.[k] !== undefined && (
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded">
              {formatFieldValue(k, depois[k])}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const navigate = useNavigate();
  const { profile: myProfile } = usePermissions();
  const { currentStore } = useStore();
  const { user: authUser } = useAuth();
  const qc = useQueryClient();

  // ── Users tab state ────────────────────────────────────────────
  const [tab, setTab]                    = useState('usuarios');
  const [search, setSearch]              = useState('');
  const [filterPerfil, setFilterPerfil]  = useState<string>('all');
  const [filterAtivo, setFilterAtivo]    = useState<string>('all');
  const [filterCAF, setFilterCAF]        = useState<string>('all');
  const [deleteTarget, setDeleteTarget]  = useState<any>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  // ── Audit tab state ────────────────────────────────────────────
  const [auditSearch, setAuditSearch]   = useState('');
  const [auditAction, setAuditAction]   = useState('all');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo]   = useState('');
  const [expandedLog, setExpandedLog]   = useState<string | null>(null);

  const isMaster = myProfile?.perfil === 'MASTER';

  // ── Fetch users ────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user_profiles_list', myProfile?.unidade_id],
    queryFn: async () => {
      let q = (supabase as any)
        .from('user_profiles')
        .select('*, stores(name)')
        .order('criado_em', { ascending: false });

      if (myProfile?.perfil === 'FRANQUEADO') {
        q = q.eq('unidade_id', myProfile.unidade_id).eq('perfil', 'COLABORADOR');
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!myProfile,
  });

  // ── Monitoring tab state ───────────────────────────────────────
  const [monitorSection, setMonitorSection] = useState<'timeline' | 'heatmap' | 'pages' | 'sessions'>('timeline');

  // ── Fetch rbac_auditoria for Timeline + Páginas ───────────────
  const { data: activityLogs = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ['rbac_auditoria_monitor'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rbac_auditoria')
        .select('*, usuario:usuario_id(nome, email, perfil), alterador:alterado_por(nome, email)')
        .order('criado_em', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: tab === 'monitoramento' && isMaster,
  });


  // ── Fetch recent customers ─────────────────────────────────────
  const { data: recentCustomers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['recent_customers_monitor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, last_order_at, total_orders, total_spent, loyalty_tier, loyalty_points, created_at')
        .order('last_order_at', { ascending: false, nullsFirst: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: tab === 'monitoramento' && isMaster,
  });

  // ── Compute heat map matrix [day 0-6][hour 0-23] from audit activity ──
  const heatmapData = (() => {
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    activityLogs.forEach((l: any) => {
      const d = new Date(l.criado_em);
      matrix[d.getDay()][d.getHours()]++;
    });
    return matrix;
  })();
  const heatmapMax = Math.max(1, ...heatmapData.flat());

  // ── Compute top actions from rbac_auditoria ───────────────────
  const topPages = (() => {
    const counts: Record<string, number> = {};
    activityLogs.forEach((l: any) => {
      const key = l.acao || 'desconhecido';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  })();
  const topPagesMax = topPages[0]?.[1] || 1;

  // ── Fetch audit logs (only when audit tab is active) ───────────
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['users_audit_all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rbac_auditoria')
        .select('*, usuario:usuario_id(nome, email, perfil), alterador:alterado_por(nome, email)')
        .order('criado_em', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: tab === 'auditoria' && isMaster,
  });

  // ── Filter users ───────────────────────────────────────────────
  const filtered = users.filter((u: any) => {
    const matchSearch = !search ||
      u.nome?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchPerfil = filterPerfil === 'all' || u.perfil === filterPerfil;
    const matchAtivo  = filterAtivo === 'all' ||
      (filterAtivo === 'ativo' ? u.ativo : !u.ativo);
    const matchCAF    = filterCAF === 'all' ||
      (filterCAF === 'caf' ? u.caf_ativo === true : u.caf_ativo !== true);
    return matchSearch && matchPerfil && matchAtivo && matchCAF;
  });

  // ── Filter audit logs ──────────────────────────────────────────
  const filteredAudit = auditLogs.filter((log: any) => {
    const matchSearch = !auditSearch ||
      log.usuario?.nome?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.usuario?.email?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.alterador?.nome?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.alterador?.email?.toLowerCase().includes(auditSearch.toLowerCase());
    const matchAction = auditAction === 'all' || log.acao === auditAction;
    const matchFrom = !auditDateFrom || new Date(log.criado_em) >= new Date(auditDateFrom);
    const matchTo   = !auditDateTo   || new Date(log.criado_em) <= new Date(auditDateTo + 'T23:59:59');
    return matchSearch && matchAction && matchFrom && matchTo;
  });

  // ── Audit stats ────────────────────────────────────────────────
  const auditStats = {
    total:      auditLogs.length,
    criar:      auditLogs.filter((l: any) => l.acao === 'CRIAR').length,
    editar:     auditLogs.filter((l: any) => l.acao === 'EDITAR').length,
    desativar:  auditLogs.filter((l: any) => l.acao === 'DESATIVAR' || l.acao === 'DESATIVAR_EXCLUSAO').length,
    ativar:     auditLogs.filter((l: any) => l.acao === 'ATIVAR').length,
  };

  // ── Mutations ──────────────────────────────────────────────────
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo, is_protected }: any) => {
      if (is_protected) throw new Error('Usuário master protegido não pode ser desativado.');
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({ ativo: !ativo })
        .eq('id', id);
      if (error) throw error;
      await (supabase as any).from('rbac_auditoria').insert([{
        usuario_id: id,
        alterado_por: authUser?.id,
        acao: !ativo ? 'ATIVAR' : 'DESATIVAR',
        dados_antes: { ativo },
        dados_depois: { ativo: !ativo },
      }]);
    },
    onSuccess: (_, vars) => {
      toast.success(vars.ativo ? 'Usuário desativado.' : 'Usuário ativado.');
      qc.invalidateQueries({ queryKey: ['user_profiles_list'] });
      qc.invalidateQueries({ queryKey: ['users_audit_all'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/admin/update-password`,
    });
    if (error) toast.error('Erro ao enviar e-mail: ' + error.message);
    else toast.success('E-mail de redefinição enviado para ' + email);
  };

  const confirmDelete = useMutation({
    mutationFn: async (u: any) => {
      if (u.is_protected) throw new Error('Usuário master protegido não pode ser removido.');
      if (deleteConfirmEmail !== u.email) throw new Error('E-mail de confirmação incorreto.');
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({ ativo: false })
        .eq('id', u.id);
      if (error) throw error;
      await (supabase as any).from('rbac_auditoria').insert([{
        usuario_id: u.id,
        alterado_por: authUser?.id,
        acao: 'DESATIVAR_EXCLUSAO',
        dados_antes: { ativo: true },
        dados_depois: { ativo: false },
      }]);
    },
    onSuccess: () => {
      toast.success('Usuário desativado.');
      setDeleteTarget(null);
      setDeleteConfirmEmail('');
      qc.invalidateQueries({ queryKey: ['user_profiles_list'] });
      qc.invalidateQueries({ queryKey: ['users_audit_all'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/settings')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Configurações
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <Users className="text-primary shrink-0" size={34} />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">Gestão de usuários, permissões e auditoria de acessos</p>
        </div>
        {tab === 'usuarios' && (
          <Button
            className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2"
            onClick={() => navigate('/admin/settings/usuarios/novo')}
          >
            <Plus size={16} /> Novo Usuário
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['MASTER', 'FRANQUEADO', 'COLABORADOR'] as Perfil[]).map(p => {
          const count = users.filter((u: any) => u.perfil === p && u.ativo).length;
          const pInfo = PERFIL_INFO[p];
          return (
            <div key={p} className="glass-card p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', pInfo.bg)}>
                <ShieldCheck size={18} className={pInfo.color} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{pInfo.label}</p>
                <p className="text-2xl font-black">{count}</p>
              </div>
            </div>
          );
        })}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <UserX size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inativos</p>
            <p className="text-2xl font-black">{users.filter((u: any) => !u.ativo).length}</p>
          </div>
        </div>
        {isMaster && (
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Headphones size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Equipe CAF</p>
              <p className="text-2xl font-black">{users.filter((u: any) => u.caf_ativo).length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass-card border-none p-1 h-auto">
          <TabsTrigger value="usuarios" className="gap-2 font-bold">
            <Users size={15} /> Usuários
          </TabsTrigger>
          {isMaster && (
            <TabsTrigger value="auditoria" className="gap-2 font-bold">
              <History size={15} /> Auditoria
            </TabsTrigger>
          )}
          {isMaster && (
            <TabsTrigger value="monitoramento" className="gap-2 font-bold">
              <Monitor size={15} /> Monitoramento de Clientes
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab: Usuários ──────────────────────────────────────── */}
        <TabsContent value="usuarios" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="glass-card p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                className="pl-10 bg-muted/50 border-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {isMaster && (
              <Select value={filterPerfil} onValueChange={setFilterPerfil}>
                <SelectTrigger className="w-[160px] bg-muted/50 border-none">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                  <SelectItem value="FRANQUEADO">Franqueado</SelectItem>
                  <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={filterAtivo} onValueChange={setFilterAtivo}>
              <SelectTrigger className="w-[140px] bg-muted/50 border-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            {isMaster && (
              <Select value={filterCAF} onValueChange={setFilterCAF}>
                <SelectTrigger className="w-[140px] bg-muted/50 border-none">
                  <SelectValue placeholder="CAF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (CAF)</SelectItem>
                  <SelectItem value="caf">Equipe CAF</SelectItem>
                  <SelectItem value="nao-caf">Fora do CAF</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            {isLoading ? (
              <div className="p-20 text-center animate-pulse text-muted-foreground">Carregando usuários...</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-bold">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground mt-1">Ajuste os filtros ou cadastre um novo usuário.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Usuário</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Perfil</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Unidade</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Último Acesso</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Status</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u: any) => {
                      const pInfo = PERFIL_INFO[u.perfil as Perfil] ?? PERFIL_INFO.COLABORADOR;
                      const initials = u.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || u.email?.[0]?.toUpperCase();
                      const isSelf = u.id === authUser?.id;

                      return (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9">
                                <AvatarImage src={u.foto || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm flex items-center gap-1.5">
                                  {u.nome || '—'}
                                  {isSelf && <Badge variant="outline" className="text-[9px] font-bold h-4 px-1">Você</Badge>}
                                  {u.is_protected && <ShieldCheck size={12} className="text-violet-500" />}
                                </p>
                                <p className="text-[11px] text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <Badge className={cn('font-bold text-[11px] w-fit', pInfo.bg, pInfo.color, 'border-0 shadow-none')}>
                                {pInfo.label}
                              </Badge>
                              {u.caf_ativo && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge variant="outline" className="text-[9px] font-bold h-4 px-1 gap-0.5 text-purple-600 border-purple-200">
                                    <Headphones size={9} /> CAF
                                  </Badge>
                                  {(u.caf_categorias as string[] | null)?.slice(0, 2).map((cat: string) => (
                                    <Badge key={cat} variant="outline" className="text-[9px] font-bold h-4 px-1 text-muted-foreground">
                                      {cat}
                                    </Badge>
                                  ))}
                                  {(u.caf_categorias as string[] | null)?.length > 2 && (
                                    <Badge variant="outline" className="text-[9px] font-bold h-4 px-1 text-muted-foreground">
                                      +{(u.caf_categorias as string[]).length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Building2 size={12} />
                              {(u.stores as any)?.name || '—'}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {u.ultimo_acesso ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-bold">{format(new Date(u.ultimo_acesso), 'dd/MM/yy')}</span>
                                <span className="text-[10px] text-muted-foreground">{format(new Date(u.ultimo_acesso), 'HH:mm')}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Nunca</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              disabled={u.is_protected || isSelf}
                              onClick={() => toggleAtivo.mutate({ id: u.id, ativo: u.ativo, is_protected: u.is_protected })}
                              className="disabled:opacity-40 disabled:cursor-not-allowed"
                              title={u.is_protected ? 'Usuário protegido' : u.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {u.ativo
                                ? <UserCheck size={18} className="text-green-500 mx-auto" />
                                : <UserX size={18} className="text-gray-400 mx-auto" />
                              }
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                onClick={() => navigate(`/admin/settings/usuarios/editar/${u.id}`)}
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                onClick={() => resetPassword(u.email)}
                                title="Resetar senha"
                              >
                                <KeyRound size={14} />
                              </Button>
                              {isMaster && !u.is_protected && !isSelf && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                  onClick={() => { setDeleteTarget(u); setDeleteConfirmEmail(''); }}
                                  title="Desativar usuário"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Auditoria ─────────────────────────────────────── */}
        {isMaster && (
          <TabsContent value="auditoria" className="space-y-6 mt-6">
            {/* Audit summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileClock size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
                  <p className="text-xl font-black">{auditStats.total}</p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <Plus size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criações</p>
                  <p className="text-xl font-black">{auditStats.criar}</p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Pencil size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Edições</p>
                  <p className="text-xl font-black">{auditStats.editar}</p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <UserCheck size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ativações</p>
                  <p className="text-xl font-black">{auditStats.ativar}</p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <UserX size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Desativações</p>
                  <p className="text-xl font-black">{auditStats.desativar}</p>
                </div>
              </div>
            </div>

            {/* Audit filters */}
            <div className="glass-card p-4 flex flex-col md:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário ou responsável..."
                  className="pl-10 bg-muted/50 border-none"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                />
              </div>
              <Select value={auditAction} onValueChange={setAuditAction}>
                <SelectTrigger className="w-[170px] bg-muted/50 border-none">
                  <Filter size={14} className="mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tipo de ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="CRIAR">Criação</SelectItem>
                  <SelectItem value="EDITAR">Edição</SelectItem>
                  <SelectItem value="ATIVAR">Ativação</SelectItem>
                  <SelectItem value="DESATIVAR">Desativação</SelectItem>
                  <SelectItem value="DESATIVAR_EXCLUSAO">Exclusão</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-[150px] bg-muted/50 border-none text-sm"
                  value={auditDateFrom}
                  onChange={e => setAuditDateFrom(e.target.value)}
                  title="Data inicial"
                />
                <span className="text-muted-foreground text-sm">→</span>
                <Input
                  type="date"
                  className="w-[150px] bg-muted/50 border-none text-sm"
                  value={auditDateTo}
                  onChange={e => setAuditDateTo(e.target.value)}
                  title="Data final"
                />
              </div>
              {(auditSearch || auditAction !== 'all' || auditDateFrom || auditDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => { setAuditSearch(''); setAuditAction('all'); setAuditDateFrom(''); setAuditDateTo(''); }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Audit table */}
            <div className="glass-card overflow-hidden">
              {isLoadingAudit ? (
                <div className="p-20 text-center animate-pulse text-muted-foreground">Carregando registros de auditoria...</div>
              ) : filteredAudit.length === 0 ? (
                <div className="py-20 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="text-xl font-bold">Nenhum registro encontrado</h3>
                  <p className="text-muted-foreground mt-1">Ajuste os filtros para ver outros registros.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {filteredAudit.length} {filteredAudit.length === 1 ? 'registro' : 'registros'}
                      {auditLogs.length !== filteredAudit.length && ` de ${auditLogs.length}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Últimos 500 registros</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground w-[100px]"></th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Data / Hora</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Usuário afetado</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Ação</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Alterado por</th>
                        <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Alterações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudit.map((log: any) => {
                        const isExpanded = expandedLog === log.id;
                        const usuarioPerfil = log.usuario?.perfil as Perfil | undefined;
                        const pInfo = usuarioPerfil ? PERFIL_INFO[usuarioPerfil] : null;
                        const uInitials = log.usuario?.nome
                          ? log.usuario.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
                          : log.usuario?.email?.[0]?.toUpperCase() || '?';

                        return (
                          <Fragment key={log.id}>
                            <tr
                              className={cn(
                                'border-b transition-colors cursor-pointer',
                                isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20',
                                !isExpanded && 'last:border-0'
                              )}
                              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            >
                              {/* Expand toggle */}
                              <td className="p-4 text-muted-foreground">
                                {isExpanded
                                  ? <ChevronDown size={16} className="text-primary" />
                                  : <ChevronRight size={16} />
                                }
                              </td>

                              {/* Date */}
                              <td className="p-4 whitespace-nowrap">
                                <p className="text-sm font-bold">
                                  {format(new Date(log.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {format(new Date(log.criado_em), 'HH:mm:ss')}
                                </p>
                              </td>

                              {/* Affected user */}
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                                      {uInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-bold leading-tight">{log.usuario?.nome || '—'}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">{log.usuario?.email || '—'}</p>
                                  </div>
                                  {pInfo && (
                                    <Badge className={cn('font-bold text-[9px] ml-1 border-0 shadow-none', pInfo.bg, pInfo.color)}>
                                      {pInfo.label}
                                    </Badge>
                                  )}
                                </div>
                              </td>

                              {/* Action */}
                              <td className="p-4">
                                <ActionBadge acao={log.acao} />
                              </td>

                              {/* Changed by */}
                              <td className="p-4">
                                <p className="text-sm font-semibold leading-tight">{log.alterador?.nome || '—'}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">{log.alterador?.email || ''}</p>
                              </td>

                              {/* Diff preview */}
                              <td className="p-4">
                                <DiffCell antes={log.dados_antes} depois={log.dados_depois} />
                              </td>
                            </tr>

                            {/* Expanded detail row */}
                            {isExpanded && (
                              <tr className="border-b last:border-0 bg-muted/10">
                                <td colSpan={6} className="px-6 pb-4 pt-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <p className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Estado anterior</p>
                                      <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30 space-y-1.5">
                                        {log.dados_antes
                                          ? Object.entries(log.dados_antes)
                                              .filter(([k]) => !AUDIT_SKIP.has(k))
                                              .map(([k, v]) => (
                                                <div key={k} className="flex gap-2 text-[11px]">
                                                  <span className="font-semibold text-red-700 dark:text-red-400 min-w-[90px] shrink-0">{FIELD_LABELS[k] ?? k}</span>
                                                  <span className="text-red-600 dark:text-red-300 break-all">{formatFieldValue(k, v)}</span>
                                                </div>
                                              ))
                                          : <span className="text-xs text-muted-foreground">Sem dados anteriores</span>
                                        }
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Estado posterior</p>
                                      <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30 space-y-1.5">
                                        {log.dados_depois
                                          ? Object.entries(log.dados_depois)
                                              .filter(([k]) => !AUDIT_SKIP.has(k))
                                              .map(([k, v]) => (
                                                <div key={k} className="flex gap-2 text-[11px]">
                                                  <span className="font-semibold text-green-700 dark:text-green-400 min-w-[90px] shrink-0">{FIELD_LABELS[k] ?? k}</span>
                                                  <span className="text-green-600 dark:text-green-300 break-all">{formatFieldValue(k, v)}</span>
                                                </div>
                                              ))
                                          : <span className="text-xs text-muted-foreground">Sem dados posteriores</span>
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex items-center gap-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-primary gap-1.5 h-7 text-xs"
                                      onClick={e => { e.stopPropagation(); navigate(`/admin/settings/usuarios/editar/${log.usuario_id}`); }}
                                    >
                                      <Pencil size={12} /> Ver cadastro do usuário
                                    </Button>
                                    <span className="text-[10px] text-muted-foreground font-mono">ID: {log.id}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* ── Tab: Monitoramento de Clientes ─────────────────────── */}
        {isMaster && (
          <TabsContent value="monitoramento" className="space-y-6 mt-6">

            {/* Sub-nav */}
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'timeline', label: 'Timeline de Atividades', icon: Activity },
                { key: 'heatmap',  label: 'Mapa de Calor',          icon: Flame },
                { key: 'pages',    label: 'Páginas Mais Acessadas',  icon: BarChart3 },
                { key: 'sessions', label: 'Sessões de Usuários',     icon: Eye },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMonitorSection(key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border',
                    monitorSection === key
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'glass-card border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* ── Timeline de Atividades ── */}
            {monitorSection === 'timeline' && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h3 className="font-bold text-sm">Timeline de Atividades</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Últimas 200 ações</span>
                </div>
                {isLoadingActivity ? (
                  <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando atividades...</div>
                ) : activityLogs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {activityLogs.map((log: any) => {
                      const actionColors: Record<string, string> = {
                        criar:       'bg-green-500',
                        criar_usuario: 'bg-green-500',
                        atualizar:   'bg-blue-500',
                        editar:      'bg-blue-500',
                        remover:     'bg-red-500',
                        deletar:     'bg-red-500',
                        ativar:      'bg-emerald-500',
                        desativar:   'bg-orange-500',
                        login:       'bg-violet-500',
                      };
                      const color = actionColors[log.acao?.toLowerCase()] || 'bg-primary';
                      const usuario = log.usuario?.nome || log.alterador?.nome || 'Sistema';
                      const email   = log.usuario?.email || log.alterador?.email || '';
                      const diff = formatAuditSummary(log.dados_depois ?? log.dados_antes) || null;
                      return (
                        <div key={log.id} className="flex items-start gap-4 px-6 py-3 hover:bg-muted/20 transition-colors">
                          <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
                            <div className={cn('w-2.5 h-2.5 rounded-full', color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase tracking-wider text-foreground">{log.acao}</span>
                              {email && <Badge variant="outline" className="text-[9px] px-1 h-4 font-mono">{usuario}</Badge>}
                            </div>
                            {diff && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono">{diff}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-bold text-foreground">{format(new Date(log.criado_em), 'dd/MM/yy')}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(log.criado_em), 'HH:mm:ss')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Mapa de Calor ── */}
            {monitorSection === 'heatmap' && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flame size={16} className="text-orange-500" />
                      <h3 className="font-bold text-sm">Mapa de Calor de Acessos</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">Visualize os padrões de acesso por horário e dia da semana</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activityLogs.length} registros</span>
                </div>
                {isLoadingActivity ? (
                  <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando dados...</div>
                ) : (
                  <div className="p-6 overflow-x-auto">
                    {/* Legend */}
                    <div className="flex items-center gap-2 mb-5 justify-end">
                      <span className="text-[10px] text-muted-foreground">Menos acessos</span>
                      {[0.06, 0.2, 0.4, 0.65, 1].map(v => (
                        <div key={v} className="w-5 h-5 rounded" style={{ background: `rgba(83,32,137,${v})` }} />
                      ))}
                      <span className="text-[10px] text-muted-foreground">Mais acessos</span>
                    </div>
                    {/* Hour labels */}
                    <div className="flex gap-0.5 mb-1 ml-10">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="w-7 text-center text-[8px] text-muted-foreground font-mono shrink-0">
                          {h % 3 === 0 ? `${h}h` : ''}
                        </div>
                      ))}
                    </div>
                    {/* Grid */}
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day, di) => (
                      <div key={di} className="flex items-center gap-0.5 mb-0.5">
                        <div className="w-9 text-[9px] font-bold text-muted-foreground shrink-0">{day}</div>
                        {heatmapData[di].map((count, hi) => {
                          const intensity = count / heatmapMax;
                          return (
                            <div
                              key={hi}
                              title={`${day} ${String(hi).padStart(2,'0')}h: ${count} acesso${count !== 1 ? 's' : ''}`}
                              className="w-7 h-6 rounded-sm shrink-0 transition-all hover:scale-125 cursor-default"
                              style={{
                                background: count === 0
                                  ? 'hsl(var(--muted))'
                                  : `rgba(83,32,137,${Math.max(0.1, intensity)})`
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                    <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Passe o mouse sobre cada célula para ver o número de acessos</span>
                      {heatmapMax > 1 && (
                        <span className="font-semibold text-primary">
                          Pico: {heatmapMax} acesso{heatmapMax !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Páginas Mais Acessadas ── */}
            {monitorSection === 'pages' && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    <h3 className="font-bold text-sm">Ações Mais Frequentes</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{activityLogs.length} ações auditadas</span>
                </div>
                {isLoadingActivity ? (
                  <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando dados...</div>
                ) : topPages.length === 0 ? (
                  <div className="py-16 text-center">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {topPages.map(([page, count], idx) => {
                      const pct = Math.round((count / topPagesMax) * 100);
                      return (
                        <div key={page} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/20 transition-colors">
                          <span className="text-xs font-black text-muted-foreground w-6 shrink-0">#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold capitalize">{page}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-primary">{count.toLocaleString('pt-BR')}</span>
                                <span className="text-[10px] text-muted-foreground">ações</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Sessões de Usuários ── */}
            {monitorSection === 'sessions' && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-emerald-500" />
                    <h3 className="font-bold text-sm">Sessões de Clientes</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Ordenado por último pedido</span>
                </div>
                {isLoadingCustomers ? (
                  <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando clientes...</div>
                ) : recentCustomers.length === 0 ? (
                  <div className="py-16 text-center">
                    <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Cliente</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Último Pedido</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Total Pedidos</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Total Gasto</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Fidelidade</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentCustomers.map((c: any) => {
                          const lastOrder = c.last_order_at ? new Date(c.last_order_at) : null;
                          const diffDays = lastOrder ? Math.floor((Date.now() - lastOrder.getTime()) / 86400000) : null;
                          const isActive = diffDays !== null && diffDays <= 7;
                          const tierColors: Record<string, string> = {
                            bronze:   'bg-orange-100 text-orange-700',
                            silver:   'bg-gray-100 text-gray-700',
                            gold:     'bg-yellow-100 text-yellow-700',
                            platinum: 'bg-violet-100 text-violet-700',
                          };
                          const tierColor = tierColors[c.loyalty_tier?.toLowerCase()] || 'bg-muted text-muted-foreground';
                          const initials = c.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?';
                          return (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm leading-tight">{c.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{c.phone || c.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {lastOrder ? (
                                  <div>
                                    <p className="text-xs font-bold">{format(lastOrder, 'dd/MM/yy')}</p>
                                    <p className="text-[10px] text-muted-foreground">{diffDays === 0 ? 'Hoje' : `${diffDays}d atrás`}</p>
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <ShoppingBag size={12} className="text-muted-foreground" />
                                  <span className="text-sm font-black">{c.total_orders}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="text-sm font-black text-primary">
                                  {Number(c.total_spent).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {c.loyalty_tier ? (
                                  <Badge className={cn('text-[9px] font-bold border-0 capitalize', tierColor)}>
                                    <Star size={9} className="mr-1" />{c.loyalty_tier}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">{c.loyalty_points} pts</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold',
                                  isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                                )}>
                                  <div className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
                                  {isActive ? 'Ativo' : 'Inativo'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </TabsContent>
        )}
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteConfirmEmail(''); }}>
        <DialogContent className="glass-card border-none max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} /> Desativar usuário
            </DialogTitle>
            <DialogDescription>
              Esta ação irá desativar o acesso de <strong>{deleteTarget?.nome}</strong>.
              Para confirmar, digite o e-mail do usuário abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-mono bg-muted/50 px-3 py-2 rounded-lg text-center select-all">
              {deleteTarget?.email}
            </p>
            <Input
              placeholder="Digite o e-mail para confirmar"
              value={deleteConfirmEmail}
              onChange={e => setDeleteConfirmEmail(e.target.value)}
              className="bg-muted/50 border-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmEmail !== deleteTarget?.email || confirmDelete.isPending}
              onClick={() => deleteTarget && confirmDelete.mutate(deleteTarget)}
            >
              {confirmDelete.isPending ? 'Desativando...' : 'Confirmar Desativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
