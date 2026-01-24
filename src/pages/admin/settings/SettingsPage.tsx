import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Store, CreditCard, Bell, Palette, Users, Plug, FileText, Printer } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Badge } from '@/components/ui/badge';
import { StoreSettingsTab } from "./StoreSettingsTab";
import { PrinterSettingsTab } from "./PrinterSettingsTab";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';


export default function SettingsPage() {
  const { data: settings } = useSystemSettings();
  const { data: integrations } = useIntegrations();
  const { data: logs } = useActivityLogs(50);
  const updateSetting = useUpdateSystemSetting();

  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});

  const getSetting = (key: string) => {
    if (localSettings[key] !== undefined) return localSettings[key];
    const setting = settings?.find(s => s.key === key);
    if (!setting) return null;

    // Parse JSON values
    if (typeof setting.value === 'string') {
      try {
        return JSON.parse(setting.value);
      } catch {
        return setting.value;
      }
    }
    return setting.value;
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    try {
      await updateSetting.mutateAsync({ key, value });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Configurações gerais e da loja</p>
      </div>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="store">
            <Store className="h-4 w-4 mr-2" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="printer">
            <Printer className="h-4 w-4 mr-2" />
            Impressora
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4">
          <StoreSettingsTab />
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <PrinterSettingsTab />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Configurações básicas do aplicativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="app_name">Nome do Aplicativo</Label>
                <Input
                  id="app_name"
                  value={getSetting('app_name') || ''}
                  onChange={(e) => handleUpdateSetting('app_name', e.target.value)}
                  placeholder="Nome do app"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_order_value">Valor Mínimo do Pedido (R$)</Label>
                <Input
                  id="min_order_value"
                  type="number"
                  step="0.01"
                  value={getSetting('min_order_value') || 0}
                  onChange={(e) => handleUpdateSetting('min_order_value', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_time">Tempo Médio de Entrega (minutos)</Label>
                <Input
                  id="delivery_time"
                  type="number"
                  value={getSetting('delivery_time') || 0}
                  onChange={(e) => handleUpdateSetting('delivery_time', parseInt(e.target.value))}
                  placeholder="45"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_rate">Taxa de Serviço (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={getSetting('tax_rate') || 0}
                  onChange={(e) => handleUpdateSetting('tax_rate', parseFloat(e.target.value))}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a aparência do aplicativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Primária</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="primary_color"
                    type="color"
                    value={getSetting('primary_color') || '#8B5CF6'}
                    onChange={(e) => handleUpdateSetting('primary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={getSetting('primary_color') || '#8B5CF6'}
                    onChange={(e) => handleUpdateSetting('primary_color', e.target.value)}
                    placeholder="#8B5CF6"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pagamento</CardTitle>
              <CardDescription>Configure os métodos de pagamento aceitos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">PIX</Label>
                  <p className="text-sm text-muted-foreground">Aceitar pagamentos via PIX</p>
                </div>
                <Switch
                  checked={getSetting('enable_pix') === true}
                  onCheckedChange={(checked) => handleUpdateSetting('enable_pix', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Cartão de Crédito</Label>
                  <p className="text-sm text-muted-foreground">Aceitar cartão de crédito</p>
                </div>
                <Switch
                  checked={getSetting('enable_credit_card') === true}
                  onCheckedChange={(checked) => handleUpdateSetting('enable_credit_card', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Dinheiro</Label>
                  <p className="text-sm text-muted-foreground">Aceitar pagamento em dinheiro</p>
                </div>
                <Switch
                  checked={getSetting('enable_cash') === true}
                  onCheckedChange={(checked) => handleUpdateSetting('enable_cash', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure as preferências de notificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificações via WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Enviar atualizações de pedidos via WhatsApp</p>
                </div>
                <Switch
                  checked={getSetting('whatsapp_notifications') === true}
                  onCheckedChange={(checked) => handleUpdateSetting('whatsapp_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificações via Email</Label>
                  <p className="text-sm text-muted-foreground">Enviar confirmações e atualizações por email</p>
                </div>
                <Switch
                  checked={getSetting('email_notifications') === true}
                  onCheckedChange={(checked) => handleUpdateSetting('email_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagens (WhatsApp)</CardTitle>
              <CardDescription>Customize o texto enviado automaticamente em cada mudança de status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map((status) => {
                const messages = getSetting('whatsapp_messages') || {};
                const labels: Record<string, string> = {
                  pending: 'Novo Pedido',
                  confirmed: 'Pedido Confirmado',
                  preparing: 'Em Preparação',
                  ready: 'Pronto para Entrega/Retirada',
                  delivered: 'Pedido Entregue',
                  cancelled: 'Pedido Cancelado'
                };

                return (
                  <div key={status} className="space-y-2">
                    <Label className="capitalize font-semibold text-primary">{labels[status] || status}</Label>
                    <Textarea
                      placeholder={`Mensagem para status ${status}...`}
                      defaultValue={messages[status] || ''}
                      onBlur={(e) => {
                        const newValue = e.target.value;
                        if (newValue === messages[status]) return; // No change
                        const newMessages = { ...messages, [status]: newValue };
                        handleUpdateSetting('whatsapp_messages', newMessages);
                      }}
                      className="min-h-[100px] bg-muted/30 border-primary/20 focus:border-primary"
                    />
                    <div className="flex gap-2 flex-wrap text-[10px] text-muted-foreground italic">
                      <span>Variáveis:</span>
                      <code className="bg-muted px-1 rounded not-italic">{"{name}"}</code>
                      <code className="bg-muted px-1 rounded not-italic">{"{order_number}"}</code>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>Status das integrações configuradas</CardDescription>
            </CardHeader>
            <CardContent>
              {integrations && integrations.length > 0 ? (
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Plug className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium capitalize">{integration.name}</p>
                          {integration.provider && (
                            <p className="text-sm text-muted-foreground">{integration.provider}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={integration.active ? 'default' : 'secondary'}>
                        {integration.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma integração configurada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Atividades</CardTitle>
              <CardDescription>Últimas {logs?.length || 0} atividades do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.action}
                          </Badge>
                          <span className="text-sm font-medium capitalize">{log.entity_type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum log registrado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
