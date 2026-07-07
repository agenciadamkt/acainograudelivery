'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERFIL_INFO, type Perfil } from '@/lib/permissions';
import { PermissionMatrix } from '@/components/admin/permissions/PermissionMatrix';
import { AvatarUpload } from '@/components/admin/users/AvatarUpload';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getAppUrl } from '@/lib/utils';
import {
  ArrowLeft, Save, Loader2, User, Shield, Lock,
  History, Eye, EyeOff, Building2,
  ShieldCheck, AlertCircle, ChevronsUpDown, Check, X, Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // usado na aba auditoria
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

type FormData = {
  nome: string; email: string; cpf: string; telefone: string; foto: string;
  perfil: Perfil; ativo: boolean;
  senha: string; confirmarSenha: string;
  cafAtivo: boolean;
};

const emptyForm = (): FormData => ({
  nome: '', email: '', cpf: '', telefone: '', foto: '',
  perfil: 'COLABORADOR', ativo: true,
  senha: '', confirmarSenha: '',
  cafAtivo: false,
});

export default function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { profile: myProfile } = usePermissions();
  const { user: authUser } = useAuth();
  const qc = useQueryClient();

  const [form, setForm]               = useState<FormData>(emptyForm());
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [unidadesOpen, setUnidadesOpen] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, number>>({});
  const [showSenha, setShowSenha]     = useState(false);
  const [tab, setTab]                 = useState('dados');
  const [saving, setSaving]           = useState(false);

  const isMaster = myProfile?.perfil === 'MASTER';
  const isSelf   = id === authUser?.id;

  // ── Load existing user ──────────────────────────────────────────
  const { data: existingUser, isLoading: loadingUser } = useQuery({
    queryKey: ['user_form', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['user_audit', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('rbac_auditoria')
        .select('*, alterador:alterado_por(email)')
        .eq('usuario_id', id)
        .order('criado_em', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: isEdit,
  });

  // Load stores for unidade selector
  const { data: stores = [] } = useQuery({
    queryKey: ['stores_list'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name').order('name');
      return data || [];
    },
  });

  // Load user's current units on edit
  const { data: userUnidades = [] } = useQuery({
    queryKey: ['user_unidades', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('user_unidades')
        .select('store_id')
        .eq('usuario_id', id);
      return (data || []).map((r: any) => r.store_id as string);
    },
    enabled: isEdit,
  });

  // Load profile defaults when perfil changes
  const { data: perfilDefaults = {} } = useQuery({
    queryKey: ['perfil_defaults_form', form.perfil],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('rbac_perfil_permissoes')
        .select('modulo_codigo, nivel')
        .eq('perfil', form.perfil);
      const map: Record<string, number> = {};
      (data || []).forEach((d: any) => { map[d.modulo_codigo] = d.nivel; });
      return map;
    },
    enabled: !!form.perfil,
  });

  // Populate form on edit load
  useEffect(() => {
    if (!existingUser) return;
    setForm({
      nome: existingUser.nome || '',
      email: existingUser.email || '',
      cpf: existingUser.cpf || '',
      telefone: existingUser.telefone || '',
      foto: existingUser.foto || '',
      perfil: existingUser.perfil as Perfil,
      ativo: existingUser.ativo,
      senha: '', confirmarSenha: '',
      cafAtivo: existingUser.caf_ativo ?? false,
    });
  }, [existingUser]);

  // Populate units on edit load
  useEffect(() => {
    if (userUnidades.length > 0) setSelectedUnidades(userUnidades);
  }, [userUnidades]);

  // Load custom permissions for edit
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('rbac_usuario_permissoes')
        .select('modulo_codigo, nivel')
        .eq('usuario_id', id);
      // Merge defaults + custom
      const merged = { ...perfilDefaults };
      (data || []).forEach((d: any) => { merged[d.modulo_codigo] = d.nivel; });
      if (Object.keys(merged).length > 0) setPermissions(merged);
    })();
  }, [id, perfilDefaults]);

  // Apply defaults when perfil changes on NEW user
  useEffect(() => {
    if (!isEdit && Object.keys(perfilDefaults).length > 0) {
      setPermissions({ ...perfilDefaults });
    }
  }, [perfilDefaults, isEdit]);

  const setField = (k: keyof FormData, v: any) => setForm(p => ({ ...p, [k]: v }));

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome do usuário'); return; }
    if (!form.email.trim()) { toast.error('Informe o e-mail'); return; }

    if (!isEdit) {
      if (!form.senha || form.senha.length < 8) {
        toast.error('Senha deve ter no mínimo 8 caracteres'); return;
      }
      if (form.senha !== form.confirmarSenha) {
        toast.error('As senhas não coincidem'); return;
      }
      const pwRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!pwRegex.test(form.senha)) {
        toast.error('Senha deve ter maiúscula, número e caractere especial'); return;
      }
    }

    setSaving(true);
    try {
      let userId = id;

      if (!isEdit) {
        // 1. Salva sessão do admin (signUp vai trocá-la)
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        // 2. Cria o auth user — o trigger `on_auth_user_created` cria
        //    automaticamente um user_profiles básico para o novo usuário
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.senha,
          options: { data: { full_name: form.nome } },
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Usuário não criado');
        userId = signUpData.user.id;

        // 3. Restaura sessão do admin imediatamente
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }

        // 4. Envia e-mail para o novo usuário definir a própria senha
        await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${getAppUrl()}/admin/update-password`,
        });
      }

      // Upsert completo do perfil (inclui cpf, telefone, foto, unidade, etc.)
      const profilePayload: any = {
        id: userId,
        email: form.email,
        nome: form.nome,
        cpf: form.cpf || null,
        telefone: form.telefone || null,
        foto: form.foto || null,
        perfil: form.perfil,
        unidade_id: selectedUnidades[0] || null,
        ativo: form.ativo,
        caf_ativo: form.cafAtivo,
        criado_por: isEdit ? undefined : authUser?.id,
      };
      if (isEdit) delete profilePayload.criado_por;

      const { error: profileError } = await (supabase as any)
        .from('user_profiles')
        .upsert([profilePayload]);
      if (profileError) throw profileError;

      // Salvar permissões customizadas (apenas as que diferem do padrão)
      const customEntries = Object.entries(permissions).filter(
        ([k, v]) => perfilDefaults[k] !== v
      );

      // Deletar antigas customizações
      await (supabase as any)
        .from('rbac_usuario_permissoes')
        .delete()
        .eq('usuario_id', userId);

      // Inserir novas customizações
      if (customEntries.length > 0) {
        const rows = customEntries.map(([modulo_codigo, nivel]) => ({
          usuario_id: userId,
          modulo_codigo,
          nivel,
        }));
        const { error: permError } = await (supabase as any)
          .from('rbac_usuario_permissoes')
          .insert(rows);
        if (permError) throw permError;
      }

      // Sincroniza user_roles (necessário para hasRole() funcionar)
      const perfilToRole: Record<string, string> = {
        MASTER:      'franchisee_master',
        FRANQUEADO:  'manager',
        COLABORADOR: 'staff',
      };
      const appRole = perfilToRole[form.perfil] || 'staff';

      await (supabase as any).from('user_roles').delete().eq('user_id', userId);
      await (supabase as any).from('user_roles').insert([{ user_id: userId, role: appRole }]);

      // Salvar unidades (user_unidades)
      await (supabase as any).from('user_unidades').delete().eq('usuario_id', userId);
      if (selectedUnidades.length > 0) {
        const rows = selectedUnidades.map(store_id => ({ usuario_id: userId, store_id }));
        await (supabase as any).from('user_unidades').insert(rows);
      }

      // Log auditoria
      await (supabase as any).from('rbac_auditoria').insert([{
        usuario_id: userId,
        alterado_por: authUser?.id,
        acao: isEdit ? 'EDITAR' : 'CRIAR',
        dados_depois: { perfil: form.perfil, ativo: form.ativo, unidades: selectedUnidades },
      }]);

      toast.success(isEdit ? 'Usuário atualizado!' : 'Usuário criado! E-mail de redefinição de senha enviado.');
      qc.invalidateQueries({ queryKey: ['user_profiles_list'] });
      navigate('/admin/settings/usuarios');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingUser) {
    return <div className="p-20 text-center animate-pulse text-muted-foreground">Carregando usuário...</div>;
  }

  const initials = form.nome.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';
  const isProtected = existingUser?.is_protected;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16">
      <button
        onClick={() => navigate('/admin/settings/usuarios')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Usuários
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarUpload
            currentUrl={form.foto}
            initials={initials}
            userId={id || 'new-user'}
            onUpload={url => setField('foto', url)}
            size="md"
          />
          <div>
            <h1 className="text-3xl font-black">
              {isEdit ? (form.nome || 'Editar Usuário') : 'Novo Usuário'}
            </h1>
            {isEdit && (
              <p className="text-muted-foreground text-sm">{form.email}</p>
            )}
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || (isProtected && !isMaster)}
          className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {isProtected && (
        <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-200 dark:border-violet-800">
          <ShieldCheck size={20} className="text-violet-600 shrink-0" />
          <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">
            Este é o usuário Master protegido. Perfil e status não podem ser alterados.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass-card border-none p-1 h-auto">
          <TabsTrigger value="dados" className="gap-2 font-bold">
            <User size={15} /> Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 font-bold">
            <Shield size={15} /> Perfil & Unidade
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 font-bold">
            <Lock size={15} /> Permissões
          </TabsTrigger>
          {isEdit && (
            <TabsTrigger value="auditoria" className="gap-2 font-bold">
              <History size={15} /> Auditoria
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Aba 1: Dados Pessoais ────────────────────────────────── */}
        <TabsContent value="dados">
          <div className="glass-card p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input
                  placeholder="Ex: Maria Silva"
                  value={form.nome}
                  onChange={e => setField('nome', e.target.value)}
                  className="bg-muted/50 border-none"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  disabled={isEdit}
                  onChange={e => setField('email', e.target.value)}
                  className="bg-muted/50 border-none disabled:opacity-60"
                />
                {isEdit && (
                  <p className="text-[10px] text-muted-foreground">E-mail não pode ser alterado após criação.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={e => setField('cpf', e.target.value)}
                  className="bg-muted/50 border-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={form.telefone}
                  onChange={e => setField('telefone', e.target.value)}
                  className="bg-muted/50 border-none"
                />
              </div>
              {/* Foto gerenciada pelo AvatarUpload no header — sem campo URL manual */}

              {!isEdit && (
                <>
                  <div className="space-y-2">
                    <Label>Senha inicial *</Label>
                    <div className="relative">
                      <Input
                        type={showSenha ? 'text' : 'password'}
                        placeholder="Mín. 8 chars, maiúscula, número, especial"
                        value={form.senha}
                        onChange={e => setField('senha', e.target.value)}
                        className="bg-muted/50 border-none pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowSenha(v => !v)}
                      >
                        {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar senha *</Label>
                    <Input
                      type="password"
                      placeholder="Repita a senha"
                      value={form.confirmarSenha}
                      onChange={e => setField('confirmarSenha', e.target.value)}
                      className="bg-muted/50 border-none"
                    />
                  </div>
                  <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    Após criar o usuário, um e-mail de redefinição de senha será enviado automaticamente. O usuário poderá definir sua própria senha no primeiro acesso.
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Aba 2: Perfil & Unidade ──────────────────────────────── */}
        <TabsContent value="perfil">
          <div className="glass-card p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Perfil de Acesso *</Label>
                <Select
                  value={form.perfil}
                  onValueChange={v => setField('perfil', v)}
                  disabled={isProtected}
                >
                  <SelectTrigger className="bg-muted/50 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isMaster && <SelectItem value="MASTER">Master</SelectItem>}
                    {isMaster && <SelectItem value="FRANQUEADO">Franqueado</SelectItem>}
                    <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
                {form.perfil && (
                  <div className={cn(
                    'flex items-center gap-2 p-3 rounded-xl text-sm font-medium mt-2',
                    PERFIL_INFO[form.perfil].bg,
                    PERFIL_INFO[form.perfil].color
                  )}>
                    <ShieldCheck size={15} />
                    <span>
                      {form.perfil === 'MASTER' && 'Acesso total a todos os módulos'}
                      {form.perfil === 'FRANQUEADO' && 'Acesso gerencial completo da unidade'}
                      {form.perfil === 'COLABORADOR' && 'Acesso operacional básico'}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unidades</Label>
                <Popover open={unidadesOpen} onOpenChange={setUnidadesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      disabled={form.perfil === 'MASTER'}
                      className="w-full justify-between bg-muted/50 border-input font-normal min-h-[40px] h-auto"
                    >
                      <div className="flex flex-wrap gap-1 flex-1">
                        {selectedUnidades.length === 0 ? (
                          <span className="text-muted-foreground">Selecione as unidades...</span>
                        ) : (
                          selectedUnidades.map(sid => {
                            const s = (stores as any[]).find((x: any) => x.id === sid);
                            return (
                              <span
                                key={sid}
                                className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full"
                              >
                                {s?.name || sid}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedUnidades(prev => prev.filter(id => id !== sid));
                                  }}
                                  className="hover:text-red-500 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                      <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar unidade..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                        <CommandGroup>
                          {(stores as any[]).map((s: any) => {
                            const selected = selectedUnidades.includes(s.id);
                            return (
                              <CommandItem
                                key={s.id}
                                value={s.name}
                                onSelect={() => {
                                  setSelectedUnidades(prev =>
                                    selected
                                      ? prev.filter(id => id !== s.id)
                                      : [...prev, s.id]
                                  );
                                }}
                              >
                                <Check
                                  size={14}
                                  className={cn('mr-2 shrink-0', selected ? 'opacity-100 text-primary' : 'opacity-0')}
                                />
                                {s.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.perfil !== 'MASTER' && selectedUnidades.length === 0 && (
                  <p className="text-[11px] text-amber-600">Recomendado: vincule o usuário a pelo menos uma unidade.</p>
                )}
                {selectedUnidades.length > 1 && (
                  <p className="text-[11px] text-muted-foreground">A primeira unidade selecionada é a principal.</p>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-bold text-sm">Usuário Ativo</p>
                  <p className="text-xs text-muted-foreground">Usuários inativos não conseguem fazer login</p>
                </div>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={v => setField('ativo', v)}
                  disabled={isProtected}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Aba 3: Permissões ────────────────────────────────────── */}
        <TabsContent value="permissoes" className="space-y-4">
          <div className="glass-card p-6">
            {form.perfil === 'MASTER' ? (
              <div className="py-16 text-center">
                <ShieldCheck size={48} className="text-violet-500 mx-auto mb-4" />
                <h3 className="text-xl font-black">Acesso Total</h3>
                <p className="text-muted-foreground mt-2">
                  O perfil Master possui nível 4 (Acesso Total) em todos os 42 módulos automaticamente.
                </p>
              </div>
            ) : (
              <PermissionMatrix
                value={permissions}
                perfil={form.perfil}
                onChange={setPermissions}
                readonly={isProtected}
              />
            )}
          </div>

          {/* ── Permissões de Atendimento CAF ── */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Headphones size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-black text-base">Permissões de Atendimento</h3>
                <p className="text-xs text-muted-foreground">Define se o usuário participa da Central de Atendimento ao Franqueado (CAF) e quais categorias pode visualizar.</p>
              </div>
            </div>

            {/* Checkbox principal */}
            <div className={cn(
              'flex items-center justify-between p-4 rounded-xl border-2 transition-colors cursor-pointer',
              form.cafAtivo
                ? 'border-primary/30 bg-primary/5'
                : 'border-muted bg-muted/30'
            )}
              onClick={() => setField('cafAtivo', !form.cafAtivo)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={form.cafAtivo}
                  onCheckedChange={v => setField('cafAtivo', !!v)}
                  onClick={e => e.stopPropagation()}
                  className="h-5 w-5"
                />
                <div>
                  <p className="font-bold text-sm">Participa da Central de Atendimento</p>
                  <p className="text-xs text-muted-foreground">
                    Usuário com acesso ao módulo verá todos os atendimentos, de todas as categorias
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Aba 4: Auditoria ─────────────────────────────────────── */}
        {isEdit && (
          <TabsContent value="auditoria">
            <div className="glass-card overflow-hidden">
              {auditLog.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <History size={32} className="mx-auto mb-3 opacity-20" />
                  <p>Nenhuma alteração registrada.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Data</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Ação</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Alterado por</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((log: any) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <p className="text-sm font-bold">{format(new Date(log.criado_em), 'dd/MM/yy', { locale: ptBR })}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(log.criado_em), 'HH:mm:ss')}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="font-bold text-[10px]">{log.acao}</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {log.alterador?.email || '—'}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground font-mono">
                          {log.dados_depois ? JSON.stringify(log.dados_depois) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
