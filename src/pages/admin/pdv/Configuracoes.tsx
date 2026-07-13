
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Printer, Settings, Plug, RefreshCw, Monitor, Store, MessageCircle } from 'lucide-react';
import { usePdvSettings } from '@/hooks/pdv/usePdvSettings';
import { qzPrinter } from '@/lib/qz-printer';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoreSettingsTab } from '@/pages/admin/settings/StoreSettingsTab';
import { UazapiIntegrationTab } from '@/pages/admin/settings/UazapiIntegrationTab';

export default function Configuracoes() {
    const { settings, updateSettings, isLoading } = usePdvSettings();
    const [printers, setPrinters] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Local state for form to avoid stuttering updates, syncing on blur/change
    // For simplicity, I'll update directly on change but ideally debounce.
    // Given low frequency, direct update is fine.

    const handleSearchPrinters = async () => {
        setIsSearching(true);
        try {
            const list = await qzPrinter.listPrinters();
            setPrinters(list);
            toast.success("Impressoras encontradas!");
        } catch (err: any) {
            toast.error("Erro ao buscar impressoras. Verifique se o QZ Tray está rodando.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleTestPrint = async () => {
        if (!settings?.qz_printer_name) {
            toast.error("Selecione uma impressora primeiro.");
            return;
        }
        try {
            await qzPrinter.printHtml(settings.qz_printer_name, "<h1>Teste de Impressão</h1><p>QZ Tray funcionando!</p>");
        } catch (err) {
            // Toast handled in service
        }
    };

    const update = (key: string, value: any) => {
        updateSettings.mutate({ [key]: value });
    };

    if (isLoading) return <div>Carregando configurações...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
                    <p className="text-muted-foreground">Gerencie as opções do PDV e os dados operacionais das lojas.</p>
                </div>
            </div>

            <Tabs defaultValue="pdv" className="space-y-6">
                <TabsList className="grid w-full max-w-xl grid-cols-3">
                    <TabsTrigger value="pdv" className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        PDV
                    </TabsTrigger>
                    <TabsTrigger value="store" className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Dados da Loja
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Integrações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pdv" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Printer className="h-5 w-5" />
                                    Impressão Térmica (QZ Tray)
                                </CardTitle>
                                <CardDescription>Conexão direta USB/Rede via QZ Tray.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Habilitar Impressão Automática</Label>
                                    <Switch
                                        checked={settings?.auto_print || false}
                                        onCheckedChange={(checked) => update('auto_print', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Usar QZ Tray (Recomendado)</Label>
                                    <Switch
                                        checked={settings?.use_qz_tray || false}
                                        onCheckedChange={(checked) => update('use_qz_tray', checked)}
                                    />
                                </div>

                                {settings?.use_qz_tray && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                                        <Label>Selecionar Impressora</Label>
                                        <div className="flex gap-2">
                                            <Select
                                                value={settings?.qz_printer_name || ''}
                                                onValueChange={(val) => update('qz_printer_name', val)}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {printers.map(p => (
                                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button variant="outline" size="icon" onClick={handleSearchPrinters} disabled={isSearching}>
                                                <RefreshCw className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {!settings?.use_qz_tray && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>IP da Impressora (Rede)</Label>
                                            <Input
                                                value={settings?.printer_ip || ''}
                                                onChange={(e) => update('printer_ip', e.target.value)}
                                                placeholder="192.168.1.200"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Porta (Padrão: 9100)</Label>
                                            <Input
                                                type="number"
                                                value={settings?.printer_port || 9100}
                                                onChange={(e) => update('printer_port', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </>
                                )}

                                <Button variant="outline" className="w-full" onClick={handleTestPrint}>
                                    Testar Impressão
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Geral
                                </CardTitle>
                                <CardDescription>Comportamento do sistema.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Exigir CPF no Cupom</Label>
                                    <Switch
                                        checked={settings?.require_cpf || false}
                                        onCheckedChange={(c) => update('require_cpf', c)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Permitir Estoque Negativo</Label>
                                    <Switch
                                        checked={settings?.allow_negative_stock || false}
                                        onCheckedChange={(c) => update('allow_negative_stock', c)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Recebimento Automático (Dinheiro)</Label>
                                    <Switch
                                        checked={settings?.auto_receive_cash || false}
                                        onCheckedChange={(c) => update('auto_receive_cash', c)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Exigir caixa aberto antes de vender</Label>
                                        <p className="text-xs text-muted-foreground">Bloqueia finalizar venda sem um caixa aberto.</p>
                                    </div>
                                    <Switch
                                        checked={(settings as any)?.require_open_cash_register || false}
                                        onCheckedChange={(c) => update('require_open_cash_register', c)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Integrar com Cartão de Ponto</Label>
                                    <Switch
                                        disabled
                                        title="Em breve"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plug className="h-5 w-5" />
                                    Integrações
                                </CardTitle>
                                <CardDescription>Dispositivos externos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Balança Toledo (Web)</Label>
                                    <Switch disabled />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Módulo Fiscal (NFC-e)</Label>
                                    <Switch disabled />
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-xs text-muted-foreground">Status do Serviço Fiscal</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                        <span className="text-sm font-medium text-muted-foreground">Não configurado</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="store" className="space-y-6">
                    <StoreSettingsTab />
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                    <UazapiIntegrationTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
