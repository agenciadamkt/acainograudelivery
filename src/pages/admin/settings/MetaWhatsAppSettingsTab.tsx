import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MessageCircle, Power, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

type EmbeddedSignupResult = { wabaId: string; phoneNumberId: string; code: string };
type FacebookLoginResponse = { authResponse?: { code?: string } };
type FacebookSdk = {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
};
declare global { interface Window { FB?: FacebookSdk } }

const appId = import.meta.env.VITE_META_APP_ID as string | undefined;
const configId = import.meta.env.VITE_META_WHATSAPP_CONFIG_ID as string | undefined;
const graphVersion = (import.meta.env.VITE_META_GRAPH_API_VERSION as string | undefined) || 'v26.0';
const META_SIGNUP_ORIGIN = 'https://www.facebook.com';

let facebookSdkPromise: Promise<FacebookSdk> | null = null;
let facebookSdkInitialized = false;

function loadFacebookSdk() {
  if (window.FB) return Promise.resolve(window.FB);
  if (facebookSdkPromise) return facebookSdkPromise;
  facebookSdkPromise = new Promise<FacebookSdk>((resolve, reject) => {
    const scriptId = 'facebook-jssdk';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://connect.facebook.net/pt_BR/sdk.js#xfbml=0&version=${graphVersion}&appId=${encodeURIComponent(appId ?? '')}`;
      document.body.appendChild(script);
    }
    const startedAt = Date.now();
    const check = () => {
      if (window.FB) return resolve(window.FB);
      if (Date.now() - startedAt > 15000) return reject(new Error('SDK_TIMEOUT'));
      window.setTimeout(check, 100);
    };
    script.addEventListener('error', () => reject(new Error('SDK_LOAD_FAILED')), { once: true });
    check();
  });
  return facebookSdkPromise;
}

export function MetaWhatsAppSettingsTab() {
  const { stores, currentStore, isLoading: storesLoading } = useStore();
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const queryClient = useQueryClient();
  const signupRef = useRef<(Partial<EmbeddedSignupResult> & { storeId: string; handled?: boolean }) | null>(null);

  useEffect(() => {
    if (currentStore?.id) setSelectedStoreId(currentStore.id);
    else if (!selectedStoreId && stores.length === 1) setSelectedStoreId(stores[0].id);
  }, [currentStore?.id, stores, selectedStoreId]);

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;

  useEffect(() => {
    if (!appId || !configId) return;
    let mounted = true;
    void loadFacebookSdk().then((FB) => {
      if (!facebookSdkInitialized) {
        FB.init({ appId, cookie: true, xfbml: false, version: graphVersion });
        facebookSdkInitialized = true;
      }
      if (mounted) setSdkReady(true);
    }).catch(() => {
      if (mounted) setSdkReady(false);
    });
    return () => { mounted = false; };
  }, []);
  const connectionQuery = useQuery({
    queryKey: ['meta-whatsapp-store-connection', selectedStoreId],
    enabled: !!selectedStoreId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('whatsapp_connections')
        .select('id,status,display_phone_number,verified_name,quality_rating,updated_at')
        .eq('store_id', selectedStoreId).eq('provider', 'meta_cloud').maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const completeSignup = async () => {
    const signup = signupRef.current;
    if (!signup?.code || !signup.wabaId || !signup.phoneNumberId || signup.handled) return;
    signup.handled = true;
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-connect', {
        body: {
          action: 'connect',
          store_id: signup.storeId,
          code: signup.code,
          waba_id: signup.wabaId,
          phone_number_id: signup.phoneNumberId,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'CONNECT_FAILED');
      toast.success(`${data.verified_name || 'WhatsApp'} conectado com sucesso.`);
      await queryClient.invalidateQueries({ queryKey: ['meta-whatsapp-store-connection', signup.storeId] });
      await queryClient.invalidateQueries({ queryKey: ['meta-wa-connection'] });
    } catch (error) {
      console.error('Official Meta WhatsApp connection failed', error);
      toast.error('Não foi possível concluir a conexão. Confira as permissões do app Meta e tente novamente.');
    } finally {
      setBusy(false);
      signupRef.current = null;
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== META_SIGNUP_ORIGIN || !event.source || event.source === window) return;
      let message: any;
      try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (message?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (message.event === 'CANCEL' || message.event === 'ERROR') {
        setBusy(false);
        signupRef.current = null;
        if (message.event === 'ERROR') toast.error('A Meta não concluiu o pareamento do WhatsApp.');
        return;
      }
      if (message.event !== 'FINISH') return;
      const data = message.data ?? {};
      const signup = signupRef.current;
      if (!signup) return;
      Object.assign(signup, {
        wabaId: String(data.waba_id ?? data.wabaId ?? ''),
        phoneNumberId: String(data.phone_number_id ?? data.phoneNumberId ?? ''),
      });
      void completeSignup();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const connect = async () => {
    if (!selectedStoreId || !selectedStore) {
      toast.error('Selecione a loja que vai conectar o WhatsApp.');
      return;
    }
    if (!appId || !configId) {
      toast.error('O App ID e o ID da configuração Embedded Signup da Meta ainda precisam ser configurados.');
      return;
    }
    if (!window.FB || !sdkReady || !facebookSdkInitialized) {
      toast.error('O login seguro da Meta ainda está carregando. Tente novamente em instantes.');
      return;
    }
    setBusy(true);
    signupRef.current = { storeId: selectedStoreId };
    // Call FB.login synchronously from the user click so the browser allows
    // the Meta popup. Embedded Signup v4 is selected in the Meta config.
    window.FB.login((response) => {
      const code = response?.authResponse?.code;
      const signup = signupRef.current;
      if (!signup) return;
      if (!code) {
        signupRef.current = null;
        setBusy(false);
        return;
      }
      signup.code = code;
      void completeSignup();
    }, {
      config_id: configId,
      auth_type: 'rerequest',
      response_type: 'code',
      override_default_response_type: true,
      extras: { version: 'v4' },
    });
  };

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-connect', {
        body: { action: 'disconnect', store_id: selectedStoreId },
      });
      if (error || !data?.ok) throw error ?? new Error(data?.error || 'DISCONNECT_FAILED');
    },
    onSuccess: async () => {
      toast.success('WhatsApp desconectado desta loja no GrauOS.');
      await queryClient.invalidateQueries({ queryKey: ['meta-whatsapp-store-connection', selectedStoreId] });
    },
    onError: () => toast.error('Não foi possível desconectar o WhatsApp.'),
  });

  const connected = connectionQuery.data?.status === 'active';
  const configured = !!appId && !!configId;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><MessageCircle className="h-5 w-5" /></div>
            <div>
              <CardTitle>WhatsApp oficial da loja</CardTitle>
              <CardDescription className="mt-1">Conecte o WhatsApp Business pela API oficial da Meta. O GrauOS não usa QR Code nem armazena a senha da conta.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {stores.length > 1 && <div className="max-w-md space-y-2">
            <label className="text-sm font-medium" htmlFor="meta-store-select">Loja</label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId} disabled={busy}>
              <SelectTrigger id="meta-store-select"><SelectValue placeholder="Selecione uma loja" /></SelectTrigger>
              <SelectContent>{stores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>}

          {!storesLoading && !stores.length && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Esta conta ainda não está vinculada a uma loja. Entre com o acesso de franqueado para conectar o número da unidade.
          </div>}

          {!configured && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            O início de sessão está pronto para o app homologado. Falta configurar no build do GrauOS o App ID e o ID da configuração Embedded Signup da Meta.
          </div>}

          {connected ? <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <div className="flex flex-wrap items-center gap-2 font-semibold text-emerald-950">
                  {connectionQuery.data.verified_name || selectedStore?.name}
                  <Badge className="bg-emerald-700">Conectado</Badge>
                </div>
                <p className="mt-1 text-sm text-emerald-900">{connectionQuery.data.display_phone_number || 'Número aprovado pela Meta'}</p>
                {connectionQuery.data.quality_rating && <p className="mt-1 text-xs text-emerald-800">Qualidade da conta: {connectionQuery.data.quality_rating}</p>}
              </div>
            </div>
            <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
              Desconectar
            </Button>
          </div> : <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{selectedStore?.name || 'Selecione uma loja'}</p>
              <p className="text-sm text-muted-foreground">A conexão autoriza o GrauOS a enviar e receber mensagens pelo número conectado.</p>
            </div>
            <Button onClick={connect} disabled={busy || !selectedStoreId || storesLoading || !configured || !sdkReady}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {busy ? 'Conectando à Meta…' : !sdkReady && configured ? 'Carregando Meta…' : 'Conectar com a Meta'}
            </Button>
          </div>}

          <p className="text-xs leading-relaxed text-muted-foreground">A Meta abre uma janela segura para autorizar a conta empresarial. Depois, o GrauOS confirma o acesso ao número, registra a assinatura do webhook e guarda a credencial OAuth criptografada somente no servidor.</p>
        </CardContent>
      </Card>
    </div>
  );
}
