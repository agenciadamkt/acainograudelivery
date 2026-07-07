'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, AlertTriangle, Lock, ArrowLeft,
  CheckCircle2, XCircle, Clock, Eye,
  FileText, CreditCard, Database, KeyRound,
  RefreshCw, CheckCheck, Loader2,
  ShieldAlert, Activity, BookLock, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERFIL_INFO, type Perfil } from '@/lib/permissions';

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ success }: { success: boolean }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold',
      success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    )}>
      <div className={cn('w-1.5 h-1.5 rounded-full', success ? 'bg-green-500' : 'bg-red-500')} />
      {success ? 'Sucesso' : 'Falha'}
    </div>
  );
}

function SeverityBadge({ sev }: { sev: string }) {
  const map: Record<string, string> = {
    high:   'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    low:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', map[sev] ?? 'bg-muted text-muted-foreground')}>
      {sev}
    </Badge>
  );
}

// ── LGPD Items ────────────────────────────────────────────────────────────────
const LGPD_ITEMS = [
  { icon: Lock,       label: 'Criptografia de Dados',    desc: 'AES-256 para dados sensíveis',               ok: true },
  { icon: FileText,   label: 'Política de Privacidade',  desc: 'Acessível em /app/politica-privacidade',      ok: true },
  { icon: BookLock,   label: 'Termos de Uso',            desc: 'Acessível em /app/termos-uso',                ok: true },
  { icon: Activity,   label: 'Sistema de Auditoria',     desc: 'Logs de acesso a dados sensíveis',            ok: true },
  { icon: CreditCard, label: 'Proteção de Pagamentos',   desc: 'PCI DSS via Stripe',                         ok: true },
  { icon: Database,   label: 'Row Level Security (RLS)', desc: 'Habilitado em todas as tabelas',              ok: true },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SecurityPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('alerts');
  const [loginFilter, setLoginFilter] = useState<'all' | 'success' | 'failed'>('all');

  // ── Login attempts from activity_logs ──────────────────────────
  const { data: loginLogs = [], isLoading: isLoadingLogins, refetch: refetchLogins } = useQuery({
    queryKey: ['security_login_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'auth')
        .in('action', ['login_success', 'login_failed'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Resolved alert IDs ─────────────────────────────────────────
  const { data: resolvedIds = [] } = useQuery({
    queryKey: ['security_resolved_alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('entity_id')
        .eq('action', 'resolve_alert')
        .not('entity_id', 'is', null);
      if (error) return [];
      return (data || []).map((r: any) => r.entity_id as string);
    },
  });

  // ── Security alerts (failed logins > threshold or explicit alerts) ─
  const { data: alertLogs = [], isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['security_alert_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .in('action', ['unauthorized_admin_access', 'suspicious_activity', 'security_alert', 'brute_force_detected', 'login_failed'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Audit logs from rbac_auditoria (real data) ─────────────────
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['security_audit_rbac'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rbac_auditoria')
        .select('*, usuario:usuario_id(nome, email, perfil), alterador:alterado_por(nome, email)')
        .order('criado_em', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Derived ────────────────────────────────────────────────────
  const unresolvedAlerts = alertLogs.filter((l: any) => !resolvedIds.includes(l.id));
  const failedLogins     = loginLogs.filter((l: any) => l.action === 'login_failed');

  const loginFiltered =
    loginFilter === 'all'     ? loginLogs :
    loginFilter === 'failed'  ? failedLogins :
    loginLogs.filter((l: any) => l.action === 'login_success');

  // ── Resolve alert ──────────────────────────────────────────────
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from('activity_logs').insert({
        action: 'resolve_alert',
        entity_type: 'security_monitoring',
        entity_id: alertId,
        details: { resolved_at: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alerta marcado como resolvido.');
      qc.invalidateQueries({ queryKey: ['security_resolved_alerts'] });
      qc.invalidateQueries({ queryKey: ['security_alert_logs'] });
    },
    onError: () => toast.error('Erro ao resolver alerta.'),
  });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['security_login_logs'] });
    qc.invalidateQueries({ queryKey: ['security_alert_logs'] });
    qc.invalidateQueries({ queryKey: ['security_audit_rbac'] });
  };

  const isLoading = isLoadingLogins || isLoadingAlerts || isLoadingAudit;

  // ── Empty state helper ─────────────────────────────────────────
  function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
    return (
      <div className="py-16 text-center">
        <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Os dados aparecerão conforme os usuários utilizam o sistema.</p>
      </div>
    );
  }

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
            <ShieldCheck className="text-primary shrink-0" size={34} />
            Segurança do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">Monitoramento e conformidade LGPD</p>
        </div>
        <Button variant="outline" size="sm" className="glass-card gap-2 w-fit" onClick={refetchAll} disabled={isLoading}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Lock size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criptografia</p>
            <p className="text-sm font-black text-green-600">Ativa (AES-256)</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alertas Críticos</p>
            <p className="text-2xl font-black text-red-500">{unresolvedAlerts.length}</p>
            <p className="text-[10px] text-muted-foreground">Não resolvidos</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logins Falhados</p>
            <p className="text-2xl font-black text-orange-500">{failedLogins.length}</p>
            <p className="text-[10px] text-muted-foreground">Últimas 100 tentativas</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Eye size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ações Auditadas</p>
            <p className="text-2xl font-black">{auditLogs.length}</p>
            <p className="text-[10px] text-muted-foreground">Últimas 100 ações</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass-card border-none p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="alerts" className="gap-2 font-bold">
            <ShieldAlert size={14} />
            Alertas Não Resolvidos
            {unresolvedAlerts.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {unresolvedAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logins" className="gap-2 font-bold">
            <KeyRound size={14} /> Tentativas de Login
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 font-bold">
            <Activity size={14} /> Logs de Auditoria
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="gap-2 font-bold">
            <BookLock size={14} /> Conformidade LGPD
          </TabsTrigger>
        </TabsList>

        {/* ── Alertas ────────────────────────────────────────────── */}
        <TabsContent value="alerts" className="mt-6">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500" />
                Alertas de segurança que requerem atenção
              </h3>
            </div>
            {isLoadingAlerts ? (
              <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando alertas...</div>
            ) : unresolvedAlerts.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3 opacity-60" />
                <h3 className="font-bold text-lg text-green-600">Nenhum alerta não resolvido</h3>
                <p className="text-muted-foreground text-sm mt-1">O sistema está sem alertas de segurança ativos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Severidade</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Descrição</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Data</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unresolvedAlerts.map((log: any) => {
                      const sev = log.details?.severity || 'high';
                      const desc = log.details?.description || log.details?.reason ||
                        (log.action === 'login_failed'
                          ? `Tentativa de login com falha — ${log.details?.email || 'email desconhecido'}`
                          : log.action.replace(/_/g, ' '));
                      return (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4"><SeverityBadge sev={sev} /></td>
                          <td className="p-4">
                            <span className="font-mono text-[11px] text-muted-foreground">{log.action}</span>
                          </td>
                          <td className="p-4"><p className="text-sm">{desc}</p></td>
                          <td className="p-4 whitespace-nowrap">
                            <p className="text-xs font-bold">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</p>
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                              disabled={resolveAlert.isPending}
                              onClick={() => resolveAlert.mutate(log.id)}
                            >
                              <CheckCheck size={12} /> Resolver
                            </Button>
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

        {/* ── Login attempts ─────────────────────────────────────── */}
        <TabsContent value="logins" className="mt-6">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <KeyRound size={15} className="text-primary" />
                Últimas 100 tentativas de autenticação
              </h3>
              <div className="flex gap-1">
                {(['all', 'success', 'failed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLoginFilter(f)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-bold transition-all',
                      loginFilter === f
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {f === 'all' ? 'Todas' : f === 'success' ? 'Sucesso' : 'Falhas'}
                  </button>
                ))}
              </div>
            </div>
            {isLoadingLogins ? (
              <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando tentativas...</div>
            ) : loginFiltered.length === 0 ? (
              <EmptyState icon={KeyRound} label="Nenhuma tentativa de login registrada ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Email</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">IP</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Data / Hora</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginFiltered.map((log: any) => {
                      const isSuccess = log.action === 'login_success';
                      const email  = log.details?.email || '—';
                      const reason = log.details?.reason || (isSuccess ? '—' : 'Credenciais inválidas');
                      return (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4"><StatusDot success={isSuccess} /></td>
                          <td className="p-4"><span className="text-sm font-mono">{email}</span></td>
                          <td className="p-4">
                            <span className="text-xs font-mono text-muted-foreground">
                              {String(log.ip_address || '—')}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <p className="text-xs font-bold">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-muted-foreground">{reason}</span>
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

        {/* ── Audit Logs (rbac_auditoria) ───────────────────────── */}
        <TabsContent value="audit" className="mt-6">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Activity size={15} className="text-blue-500" />
                Últimas 100 ações em dados sensíveis
              </h3>
            </div>
            {isLoadingAudit ? (
              <div className="p-16 text-center animate-pulse text-muted-foreground text-sm">Carregando logs...</div>
            ) : auditLogs.length === 0 ? (
              <EmptyState icon={Activity} label="Nenhum log de auditoria encontrado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Ação</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Usuário Afetado</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Alterado por</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Data / Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => {
                      const ACTION_LABELS: Record<string, string> = {
                        CRIAR: 'Criação', EDITAR: 'Edição',
                        ATIVAR: 'Ativação', DESATIVAR: 'Desativação',
                        DESATIVAR_EXCLUSAO: 'Exclusão',
                      };
                      const ACTION_COLORS: Record<string, string> = {
                        CRIAR: 'bg-green-100 text-green-700', ATIVAR: 'bg-emerald-100 text-emerald-700',
                        EDITAR: 'bg-blue-100 text-blue-700', DESATIVAR: 'bg-orange-100 text-orange-700',
                        DESATIVAR_EXCLUSAO: 'bg-red-100 text-red-700',
                      };
                      return (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <Badge variant="outline" className={cn('text-[10px] font-bold', ACTION_COLORS[log.acao] || 'bg-muted text-muted-foreground')}>
                              {ACTION_LABELS[log.acao] || log.acao}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-bold leading-tight">{log.usuario?.nome || '—'}</p>
                            <p className="text-[10px] text-muted-foreground">{log.usuario?.email || ''}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-semibold leading-tight">{log.alterador?.nome || '—'}</p>
                            <p className="text-[10px] text-muted-foreground">{log.alterador?.email || ''}</p>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <p className="text-xs font-bold">{format(new Date(log.criado_em), 'dd/MM/yyyy HH:mm:ss')}</p>
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

        {/* ── LGPD ─────────────────────────────────────────────────── */}
        <TabsContent value="lgpd" className="mt-6">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <BookLock size={15} className="text-violet-500" />
                Status de conformidade com a Lei Geral de Proteção de Dados
              </h3>
            </div>
            <div className="divide-y">
              {LGPD_ITEMS.map(({ icon: Icon, label, desc, ok }) => (
                <div key={label} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0',
                    ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {ok ? <><CheckCircle2 size={13} /> Conforme</> : <><XCircle size={13} /> Pendente</>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
    return (
      <div className="py-16 text-center">
        <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Os dados aparecerão conforme os usuários utilizam o sistema.</p>
      </div>
    );
  }
}
