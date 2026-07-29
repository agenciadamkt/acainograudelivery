/**
 * CheckGrau App — Login do colaborador. Fluxo: WhatsApp + PIN (padrão).
 * 1º acesso / esqueci o PIN → código no WhatsApp (OTP) → cria um PIN.
 * Depois disso, no mesmo aparelho, segue logado (sessão persistente).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShieldCheck, MessageCircle, ArrowRight, Loader2, ArrowLeft, KeyRound, Lock } from 'lucide-react';
import { useCollaborator } from '@/contexts/CollaboratorContext';

type Step = 'pin' | 'phone' | 'code' | 'createpin';

export default function CollaboratorLoginPage() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp, pinLogin, setPin } = useCollaborator();
  const [step, setStep] = useState<Step>('pin');
  const [whatsapp, setWhatsapp] = useState('');
  const [pin, setPinValue] = useState('');
  const [pin2, setPin2] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingSelect, setPendingSelect] = useState(false);

  const goAfterLogin = (needsSelect: boolean) =>
    navigate(needsSelect ? '/colaborador/selecionar-loja' : '/colaborador', { replace: true });

  // WhatsApp + PIN
  const doPinLogin = async () => {
    if (whatsapp.replace(/\D/g, '').length < 10) { toast.error('Informe um WhatsApp válido.'); return; }
    if (!/^\d{6}$/.test(pin)) { toast.error('O PIN tem 6 dígitos.'); return; }
    setBusy(true);
    try {
      const res = await pinLogin(whatsapp, pin);
      goAfterLogin(res.needs_store_selection);
    } catch (e: any) {
      if (e?.code === 'NO_PIN') {
        toast.info('Primeiro acesso: vamos validar pelo WhatsApp.');
        setStep('phone');
      } else {
        toast.error(e?.message ?? 'Não foi possível entrar.');
      }
    } finally { setBusy(false); }
  };

  // OTP
  const sendCode = async () => {
    if (whatsapp.replace(/\D/g, '').length < 10) { toast.error('Informe um WhatsApp válido.'); return; }
    setBusy(true);
    try {
      await requestOtp(whatsapp);
      setStep('code');
      toast.success('Código enviado no seu WhatsApp.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível enviar o código.');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (code.replace(/\D/g, '').length < 4) { toast.error('Informe o código.'); return; }
    setBusy(true);
    try {
      const res = await verifyOtp(whatsapp, code);
      setPendingSelect(res.needs_store_selection);
      setPinValue(''); setPin2('');
      setStep('createpin'); // cria (ou redefine) o PIN
    } catch (e: any) {
      toast.error(e?.message ?? 'Código inválido.');
    } finally { setBusy(false); }
  };

  // Criar/redefinir PIN
  const savePin = async () => {
    if (!/^\d{6}$/.test(pin)) { toast.error('O PIN deve ter 6 dígitos.'); return; }
    if (pin !== pin2) { toast.error('Os PINs não conferem.'); return; }
    setBusy(true);
    try {
      await setPin(pin);
      toast.success('PIN criado! Use-o nos próximos acessos.');
      goAfterLogin(pendingSelect);
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível salvar o PIN.');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-white px-6 dark:from-[#16131F] dark:to-[#0F0F14]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Check<span className="text-purple-600">Grau</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/50">Acesso do colaborador</p>
        </div>

        {/* WhatsApp + PIN */}
        {step === 'pin' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Seu WhatsApp</label>
            <Input type="tel" inputMode="tel" autoFocus placeholder="(86) 9 9999-9999"
              value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="h-12 text-center text-lg" />
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">PIN de acesso</label>
            <Input type="password" inputMode="numeric" maxLength={6} placeholder="••••••"
              value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && doPinLogin()}
              className="h-14 text-center text-2xl tracking-[0.4em]" />
            <Button className="h-12 w-full gap-2 bg-purple-600 text-base hover:bg-purple-700" onClick={doPinLogin} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />} Entrar
            </Button>
            <button onClick={() => { setCode(''); setStep('phone'); }} className="flex w-full items-center justify-center gap-1.5 pt-1 text-sm font-medium text-purple-600">
              <KeyRound className="h-4 w-4" /> Primeiro acesso ou esqueci meu PIN
            </button>
          </div>
        )}

        {/* OTP — telefone */}
        {step === 'phone' && (
          <div className="space-y-3">
            <button onClick={() => setStep('pin')} className="mb-1 flex items-center gap-1.5 text-sm text-gray-500">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Seu WhatsApp</label>
            <Input type="tel" inputMode="tel" autoFocus placeholder="(86) 9 9999-9999"
              value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()} className="h-12 text-center text-lg" />
            <Button className="h-12 w-full gap-2 bg-purple-600 text-base hover:bg-purple-700" onClick={sendCode} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />} Enviar código
            </Button>
            <p className="text-center text-xs text-gray-400">Você receberá um código no seu WhatsApp.</p>
          </div>
        )}

        {/* OTP — código */}
        {step === 'code' && (
          <div className="space-y-3">
            <button onClick={() => setStep('phone')} className="mb-1 flex items-center gap-1.5 text-sm text-gray-500">
              <ArrowLeft className="h-4 w-4" /> {whatsapp}
            </button>
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Código recebido</label>
            <Input type="tel" inputMode="numeric" autoFocus maxLength={6} placeholder="000000"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && verify()} className="h-14 text-center text-2xl tracking-[0.4em]" />
            <Button className="h-12 w-full gap-2 bg-purple-600 text-base hover:bg-purple-700" onClick={verify} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />} Validar
            </Button>
            <button onClick={sendCode} disabled={busy} className="w-full text-center text-xs text-purple-600">Reenviar código</button>
          </div>
        )}

        {/* Criar/redefinir PIN */}
        {step === 'createpin' && (
          <div className="space-y-3">
            <div className="mb-1 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15">
                <KeyRound className="h-6 w-6" />
              </div>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">Crie seu PIN de acesso</p>
              <p className="text-xs text-gray-400">6 dígitos — você usa nos próximos acessos, sem precisar do código.</p>
            </div>
            <Input type="password" inputMode="numeric" autoFocus maxLength={6} placeholder="Novo PIN"
              value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center text-2xl tracking-[0.4em]" />
            <Input type="password" inputMode="numeric" maxLength={6} placeholder="Confirmar PIN"
              value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && savePin()}
              className="h-14 text-center text-2xl tracking-[0.4em]" />
            <Button className="h-12 w-full gap-2 bg-purple-600 text-base hover:bg-purple-700" onClick={savePin} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Salvar PIN
            </Button>
            <button onClick={() => goAfterLogin(pendingSelect)} disabled={busy} className="w-full text-center text-xs text-gray-400">Agora não</button>
          </div>
        )}
      </div>
    </div>
  );
}
