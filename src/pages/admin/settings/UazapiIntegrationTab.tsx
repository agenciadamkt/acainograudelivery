import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, MessageCircle, CheckCircle2, XCircle,
  Eye, EyeOff, Wifi, Webhook, Send, Settings2, Copy, Check,
} from 'lucide-react';
import {
  useUazapiIntegration,
  useSaveUazapiIntegration,
  testUazapiConnection,
  applyUazapiWebhook,
  type UazapiConfig,
} from '@/hooks/useUazapiIntegration';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_PROJECT_ID = 'sixzfcpdjtnftacuwvph';
import { toast } from '@/hooks/use-toast';

const NOTIFY_STATUS_OPTIONS = [
  { value: 'pending',           label: 'Pedido recebido' },
  { value: 'confirmed',         label: 'Pedido confirmado' },
  { value: 'preparing',         label: 'Em preparação' },
  { value: 'ready',             label: 'Pronto para retirada/entrega' },
  { value: 'out_for_delivery',  label: 'Saiu para entrega' },
  { value: 'delivered',         label: 'Pedido entregue' },
  { value: 'cancelled',         label: 'Pedido cancelado' },
];

const DEFAULT_LISTEN_EVENTS = 'message';

type TestState = 'idle' | 'loading' | 'ok' | 'error';

export function UazapiIntegrationTab() {
  const { user } = useAuth();
  const { data: integration, isLoading } = useUazapiIntegration();
  const save = useSaveUazapiIntegration();

  const webhookReceiveUrl = user
    ? `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook?fid=${user.id}`
    : '';

  const [config, setConfig] = useState<UazapiConfig>({
    token: '',
    base_url: 'https://btzap.uazapi.com',
    instance_name: 'btzap',
    auto_send_enabled: false,
    notify_statuses: ['confirmed', 'preparing', 'out_for_delivery', 'delivered'],
    webhook: {
      enabled: false,
      url: '',
      add_events: true,
      add_type_messages: false,
      listen_events: DEFAULT_LISTEN_EVENTS,
      exclude_events: '',
    },
  });
  const [active, setActive] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [connTest, setConnTest] = useState<TestState>('idle');
  const [connMsg, setConnMsg]   = useState('');
  const [whTest, setWhTest]     = useState<TestState>('idle');
  const [whMsg, setWhMsg]       = useState('');
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    if (integration?.config) {
      setConfig(prev => ({
        ...prev,
        ...integration.config,
        webhook: { ...prev.webhook, ...(integration.config as UazapiConfig).webhook },
      }));
      setActive(integration.active ?? false);
    }
  }, [integration]);

  const set = (key: keyof UazapiConfig, value: any) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const setWh = (key: keyof UazapiConfig['webhook'], value: any) =>
    setConfig(prev => ({ ...prev, webhook: { ...prev.webhook, [key]: value } }));

  const webhookUrlFinal = () => {
    if (!config.webhook.url) return '—';
    let url = config.webhook.url.replace(/\/$/, '');
    if (config.webhook.add_events)        url += '/{evento}';
    if (config.webhook.add_type_messages) url += '/{tipoMensagem}';
    return url;
  };

  const toggleStatus = (status: string) =>
    set('notify_statuses', config.notify_statuses.includes(status)
      ? config.notify_statuses.filter(s => s !== status)
      : [...config.notify_statuses, status]);

  const handleTestConn = async () => {
    setConnTest('loading');
    const r = await testUazapiConnection(config.base_url, config.token);
    setConnTest(r.success ? 'ok' : 'error');
    setConnMsg(r.message);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookReceiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyWebhook = async () => {
    setWhTest('loading');
    // Se não preencheu URL personalizada, usa a URL gerada automaticamente
    const effectiveConfig: UazapiConfig = {
      ...config,
      webhook: {
        ...config.webhook,
        url: config.webhook.url || webhookReceiveUrl,
      },
    };
    const r = await applyUazapiWebhook(effectiveConfig);
    setWhTest(r.success ? 'ok' : 'error');
    setWhMsg(r.message);
    if (r.success) {
      toast({ title: 'Webhook aplicado', description: r.message });
    }
  };

  const handleSave = () => save.mutate({ config, active });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>UazAPI — WhatsApp</CardTitle>
                <CardDescription>
                  Integração via{' '}
                  <a
                    href="https://uazapi.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    uazapi.dev
                  </a>{' '}
                  · envio de mensagens e webhooks
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Integração</span>
              <Badge variant={active ? 'default' : 'secondary'}>
                {active ? 'Ativa' : 'Inativa'}
              </Badge>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Credenciais da Instância ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Credenciais da Instância
          </CardTitle>
          <CardDescription>
            Dados disponíveis no painel UazAPI (Server URL e Instance Token)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base_url">Server URL</Label>
              <Input
                id="base_url"
                value={config.base_url}
                onChange={e => set('base_url', e.target.value)}
                placeholder="https://btzap.uazapi.com"
              />
              <p className="text-xs text-muted-foreground">
                URL exibida no painel como <em>Server URL</em>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instance_name">Nome da Instância</Label>
              <Input
                id="instance_name"
                value={config.instance_name}
                onChange={e => set('instance_name', e.target.value)}
                placeholder="btzap"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Instance Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={config.token}
                  onChange={e => set('token', e.target.value)}
                  placeholder="Cole aqui o token da instância"
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConn}
                disabled={!config.token || !config.base_url || connTest === 'loading'}
                className="shrink-0"
              >
                {connTest === 'loading'
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Wifi className="h-4 w-4 mr-2" />}
                Testar
              </Button>
            </div>
            {connTest !== 'idle' && (
              <div className={`flex items-center gap-2 text-sm ${connTest === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {connTest === 'ok'
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <XCircle className="h-4 w-4" />}
                {connMsg}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Webhooks ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure para onde o UazAPI enviará os eventos (POST)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Habilitado */}
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Habilitado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ativa o recebimento de eventos via webhook
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">POST</Badge>
              <Switch
                checked={config.webhook.enabled}
                onCheckedChange={v => setWh('enabled', v)}
              />
            </div>
          </div>

          {/* URL para colar no painel UazAPI */}
          <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-green-800 dark:text-green-300 font-semibold text-sm">
                URL para colar no painel UazAPI
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                className="h-7 px-2 text-green-700 dark:text-green-300 hover:bg-green-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <div className="font-mono text-xs bg-white dark:bg-black/30 px-3 py-2 rounded border border-green-200 dark:border-green-800 break-all text-green-900 dark:text-green-200 select-all">
              {webhookReceiveUrl}
            </div>
            <p className="text-xs text-green-700 dark:text-green-400">
              Cole essa URL no campo <strong>URL</strong> do painel UazAPI → Webhooks
            </p>
          </div>

          {/* URL do Webhook (campo interno — pode ser deixado em branco) */}
          <div className="space-y-2">
            <Label htmlFor="wh_url">URL adicional (opcional)</Label>
            <Input
              id="wh_url"
              value={config.webhook.url}
              onChange={e => setWh('url', e.target.value)}
              placeholder="Deixe em branco para usar a URL gerada acima"
            />
            <p className="text-xs text-muted-foreground">
              Se tiver um servidor próprio para receber eventos, informe aqui. Caso contrário, use a URL verde acima.
            </p>
          </div>

          {/* addEvents e addTypeMessages */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">addEvents</p>
                <p className="text-xs text-muted-foreground">
                  Adiciona o nome do evento ao path da URL
                </p>
              </div>
              <Switch
                checked={config.webhook.add_events}
                onCheckedChange={v => setWh('add_events', v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">addTypeMessages</p>
                <p className="text-xs text-muted-foreground">
                  Adiciona o tipo de mensagem ao path da URL
                </p>
              </div>
              <Switch
                checked={config.webhook.add_type_messages}
                onCheckedChange={v => setWh('add_type_messages', v)}
              />
            </div>
          </div>

          {/* URL final (preview) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL final (preview)</Label>
            <div className="px-3 py-2 bg-muted/50 rounded-md border font-mono text-xs break-all text-muted-foreground">
              {webhookUrlFinal()}
            </div>
          </div>

          <Separator />

          {/* Escutar eventos */}
          <div className="space-y-2">
            <Label htmlFor="listen_events">Escutar eventos (Source)</Label>
            <Input
              id="listen_events"
              value={config.webhook.listen_events}
              onChange={e => setWh('listen_events', e.target.value)}
              placeholder="message"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">message</code> para mensagens. Separe múltiplos com vírgula. Ex: <code className="bg-muted px-1 rounded">message, connection.update</code>
            </p>
          </div>

          {/* Excluir dos eventos escutados */}
          <div className="space-y-2">
            <Label htmlFor="exclude_events">Excluir dos eventos escutados</Label>
            <Textarea
              id="exclude_events"
              value={config.webhook.exclude_events}
              onChange={e => setWh('exclude_events', e.target.value)}
              placeholder="ActionMessages, ..."
              rows={2}
              className="font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Eventos que serão ignorados. Separe com vírgula. Ex: <code className="bg-muted px-1 rounded">ActionMessages</code>
            </p>
          </div>

          {/* Botão aplicar webhook na API */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleApplyWebhook}
              disabled={!config.token || !config.webhook.url || whTest === 'loading'}
            >
              {whTest === 'loading'
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Webhook className="h-4 w-4 mr-2" />}
              Aplicar Webhook na Instância
            </Button>
            {whTest !== 'idle' && (
              <span className={`flex items-center gap-1.5 text-sm ${whTest === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {whTest === 'ok'
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <XCircle className="h-4 w-4" />}
                {whMsg}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Envio Automático de Notificações ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Envio Automático de Mensagens
          </CardTitle>
          <CardDescription>
            Mensagens enviadas automaticamente ao cliente em cada mudança de status do pedido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Ativar envio automático</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envia mensagem WhatsApp ao cliente a cada atualização de status
              </p>
            </div>
            <Switch
              checked={config.auto_send_enabled}
              onCheckedChange={v => set('auto_send_enabled', v)}
            />
          </div>

          {config.auto_send_enabled && (
            <>
              <Separator />
              <p className="text-sm font-medium">Notificar nos status:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {NOTIFY_STATUS_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => toggleStatus(opt.value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors select-none ${
                      config.notify_statuses.includes(opt.value)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        config.notify_statuses.includes(opt.value)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {config.notify_statuses.includes(opt.value) && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">{opt.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Dica ── */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-2xl shrink-0">💡</div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Como configurar sua instância UazAPI</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse <code className="bg-muted px-1 rounded text-xs">uazapi.dev</code> → faça login no painel</li>
                <li>Copie o <strong>Server URL</strong> e o <strong>Instance Token</strong> da sua instância</li>
                <li>Cole os dados acima e clique em <strong>Testar</strong> para validar a conexão</li>
                <li>Configure o <strong>Webhook URL</strong> (onde seu app receberá eventos) e clique em <strong>Aplicar Webhook</strong></li>
                <li>Ative a integração, selecione os status e clique em <strong>Salvar</strong></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Salvar ── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="min-w-[160px]"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Salvar Configurações
        </Button>
      </div>

    </div>
  );
}
