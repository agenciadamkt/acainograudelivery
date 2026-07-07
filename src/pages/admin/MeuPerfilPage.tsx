'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERFIL_INFO, NIVEL_INFO, MODULOS, CATEGORIAS, type Perfil } from '@/lib/permissions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Save, Loader2, Eye, EyeOff,
  ShieldCheck, User, Lock, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarUpload } from '@/components/admin/users/AvatarUpload';

export default function MeuPerfilPage() {
  const navigate = useNavigate();
  const { profile, permissions, reload } = usePermissions();
  const { user } = useAuth();

  const [nome, setNome]         = useState(profile?.nome || '');
  const [telefone, setTelefone] = useState(profile?.telefone || '');
  const [foto, setFoto]         = useState(profile?.foto || '');
  const [saving, setSaving]     = useState(false);

  const [senhaAtual, setSenhaAtual]     = useState('');
  const [novaSenha, setNovaSenha]       = useState('');
  const [confirmar, setConfirmar]       = useState('');
  const [showSenha, setShowSenha]       = useState(false);
  const [savingPwd, setSavingPwd]       = useState(false);

  if (!profile) {
    return <div className="p-20 text-center animate-pulse text-muted-foreground">Carregando perfil...</div>;
  }

  const pInfo = PERFIL_INFO[profile.perfil as Perfil] ?? PERFIL_INFO.COLABORADOR;
  const initials = profile.nome?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

  const handleSaveDados = async () => {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({ nome, telefone: telefone || null, foto: foto || null })
        .eq('id', user?.id);
      if (error) throw error;
      await reload();
      toast.success('Dados atualizados!');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSenha = async () => {
    if (!novaSenha || novaSenha.length < 8) { toast.error('Senha mínima: 8 caracteres'); return; }
    if (novaSenha !== confirmar) { toast.error('As senhas não coincidem'); return; }
    const pwRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!pwRegex.test(novaSenha)) {
      toast.error('A senha precisa ter: maiúscula, número e caractere especial'); return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('');
      toast.success('Senha alterada com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao alterar senha: ' + e.message);
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16 max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Voltar
      </button>

      {/* Profile hero */}
      <div className="glass-card p-6 flex items-center gap-5">
        <AvatarUpload
          currentUrl={foto}
          initials={initials}
          userId={user?.id || ''}
          onUpload={url => setFoto(url)}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-black">{profile.nome}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={cn('font-bold text-xs', pInfo.bg, pInfo.color, 'border-0 shadow-none')}>
              {pInfo.label}
            </Badge>
            {profile.is_protected && (
              <Badge variant="outline" className="text-[10px] font-bold text-violet-600 border-violet-300 gap-1">
                <ShieldCheck size={10} /> Protegido
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList className="glass-card border-none p-1 h-auto">
          <TabsTrigger value="dados" className="gap-2 font-bold">
            <User size={15} /> Meus Dados
          </TabsTrigger>
          <TabsTrigger value="senha" className="gap-2 font-bold">
            <Lock size={15} /> Alterar Senha
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 font-bold">
            <LayoutGrid size={15} /> Minhas Permissões
          </TabsTrigger>
        </TabsList>

        {/* Dados */}
        <TabsContent value="dados">
          <div className="glass-card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="bg-muted/50 border-none" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={profile.email} disabled className="bg-muted/50 border-none opacity-60" />
                <p className="text-[10px] text-muted-foreground">E-mail não pode ser alterado.</p>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className="bg-muted/50 border-none" />
              </div>
              {/* Foto gerenciada pelo AvatarUpload no topo da página */}
            </div>
            <Button onClick={handleSaveDados} disabled={saving} className="gap-2 font-bold">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Salvando...' : 'Salvar Dados'}
            </Button>
          </div>
        </TabsContent>

        {/* Senha */}
        <TabsContent value="senha">
          <div className="glass-card p-6 space-y-5 max-w-md">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.
            </div>
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
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
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                className="bg-muted/50 border-none"
              />
            </div>
            <Button onClick={handleSaveSenha} disabled={savingPwd} className="gap-2 font-bold">
              {savingPwd ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {savingPwd ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </TabsContent>

        {/* Permissões (somente leitura) */}
        <TabsContent value="permissoes">
          <div className="glass-card p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Permissões de acesso do seu perfil <strong>{pInfo.label}</strong>. Somente o gestor pode alterar.
            </p>
            {CATEGORIAS.map(cat => {
              const mods = MODULOS.filter(m => m.categoria === cat.id);
              return (
                <div key={cat.id} className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 flex items-center gap-2">
                    <span>{cat.emoji}</span>
                    <span className="font-bold text-sm">{cat.label}</span>
                  </div>
                  <div className="divide-y">
                    {mods.map(m => {
                      const n = profile.perfil === 'MASTER' ? 4 : (permissions[m.codigo] ?? 0);
                      const ni = NIVEL_INFO[n];
                      return (
                        <div key={m.codigo} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm">{m.nome}</span>
                          <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full', ni.bg, ni.color)}>
                            {n} — {ni.short}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
