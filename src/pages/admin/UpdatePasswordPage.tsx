'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAppUrl } from '@/lib/utils';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PageState = 'loading' | 'form' | 'expired' | 'success';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [senha, setSenha]         = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [email, setEmail]         = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Supabase coloca os tokens no hash da URL
    const hash = window.location.hash;

    if (hash.includes('error=')) {
      // Link inválido ou expirado
      const params = new URLSearchParams(hash.slice(1));
      setPageState('expired');
      return;
    }

    if (hash.includes('access_token=') && hash.includes('type=recovery')) {
      // Link válido — o Supabase client já processa o hash automaticamente
      setPageState('form');
      return;
    }

    // Verifica se há sessão ativa (usuário chegou após o cliente processar o hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState('form');
      } else {
        setPageState('expired');
      }
    });
  }, []);

  const handleSave = async () => {
    if (!senha || senha.length < 8) {
      toast.error('Senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (senha !== confirmar) {
      toast.error('As senhas não coincidem');
      return;
    }
    const pwRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!pwRegex.test(senha)) {
      toast.error('A senha precisa ter: 1 maiúscula, 1 número e 1 caractere especial');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        if (error.message.toLowerCase().includes('different from the old password')) {
          toast.error('A nova senha não pode ser igual à senha temporária. Escolha uma senha diferente.');
        } else {
          toast.error('Erro ao definir senha: ' + error.message);
        }
        return;
      }
      setPageState('success');
      toast.success('Senha definida com sucesso!');
      setTimeout(() => navigate('/admin/login'), 2500);
    } catch (err: any) {
      toast.error('Erro ao definir senha: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) { toast.error('Informe seu e-mail'); return; }
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppUrl()}/admin/update-password`,
      });
      if (error) throw error;
      toast.success('Novo link enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setResending(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-black">Senha definida!</h1>
          <p className="text-muted-foreground">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  // ── Expired ──────────────────────────────────────────────────────
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-black">Link expirado</h1>
            <p className="text-muted-foreground text-sm">
              O link de definição de senha expirou ou já foi utilizado.
              Solicite um novo link abaixo.
            </p>
          </div>

          <div className="glass-card p-5 space-y-4">
            <div className="space-y-2">
              <Label>Seu e-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-muted/50 border-none"
                onKeyDown={e => e.key === 'Enter' && handleResend()}
              />
            </div>
            <Button
              className="w-full gap-2 font-bold"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {resending ? 'Enviando...' : 'Reenviar link de acesso'}
            </Button>
          </div>

          <button
            onClick={() => navigate('/admin/login')}
            className="w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-black">Defina sua senha</h1>
          <p className="text-muted-foreground text-sm">
            Crie uma senha <strong>diferente</strong> da senha temporária que você recebeu.
          </p>
        </div>

        <div className="glass-card p-5 space-y-5">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <div className="relative">
              <Input
                type={showSenha ? 'text' : 'password'}
                placeholder="Mín. 8 chars, maiúscula, número, especial"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="bg-muted/50 border-none pr-10"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowSenha(v => !v)}
              >
                {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Indicador de força */}
            {senha.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[
                    senha.length >= 8,
                    /[A-Z]/.test(senha),
                    /[0-9]/.test(senha),
                    /[^A-Za-z0-9]/.test(senha),
                  ].map((ok, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-green-500' : 'bg-muted'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className={senha.length >= 8 ? 'text-green-600' : ''}>8+ chars</span>
                  <span className={/[A-Z]/.test(senha) ? 'text-green-600' : ''}>Maiúscula</span>
                  <span className={/[0-9]/.test(senha) ? 'text-green-600' : ''}>Número</span>
                  <span className={/[^A-Za-z0-9]/.test(senha) ? 'text-green-600' : ''}>Especial</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              placeholder="Repita a senha"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              className="bg-muted/50 border-none"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            {confirmar.length > 0 && senha !== confirmar && (
              <p className="text-xs text-red-500">As senhas não coincidem</p>
            )}
          </div>

          <Button
            className="w-full font-bold gap-2"
            onClick={handleSave}
            disabled={saving || senha !== confirmar || senha.length < 8}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {saving ? 'Salvando...' : 'Confirmar senha'}
          </Button>
        </div>
      </div>
    </div>
  );
}
