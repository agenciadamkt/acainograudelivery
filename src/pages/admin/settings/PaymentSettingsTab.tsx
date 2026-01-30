
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useStore } from '@/contexts/StoreContext';
import { useUpdateStore } from '@/hooks/useStores';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function PaymentSettingsTab() {
    const { currentStore } = useStore();
    const updateStore = useUpdateStore();
    const { data: settings } = useSystemSettings();
    const updateSystemSetting = useUpdateSystemSetting();

    const [publicKey, setPublicKey] = useState(currentStore?.mercadopago_public_key || '');
    const [accessToken, setAccessToken] = useState(currentStore?.mercadopago_access_token || '');
    const [isLoading, setIsLoading] = useState(false);

    const getSetting = (key: string) => {
        const setting = settings?.find(s => s.key === key);
        if (!setting) return null;
        if (typeof setting.value === 'string') {
            try {
                return JSON.parse(setting.value);
            } catch {
                return setting.value;
            }
        }
        return setting.value;
    };

    const handleUpdateSystemSetting = async (key: string, value: any) => {
        try {
            await updateSystemSetting.mutateAsync({ key, value });
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveKeys = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStore) return;

        setIsLoading(true);
        try {
            await updateStore.mutateAsync({
                id: currentStore.id,
                updates: {
                    mercadopago_public_key: publicKey,
                    mercadopago_access_token: accessToken,
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentStore) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>Nenhuma loja selecionada.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Métodos de Pagamento Aceitos</CardTitle>
                    <CardDescription>Configure quais formas de pagamento sua loja aceita.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">PIX</Label>
                            <p className="text-sm text-muted-foreground">Aceitar pagamentos via PIX na entrega ou online</p>
                        </div>
                        <Switch
                            checked={getSetting('enable_pix') === true}
                            onCheckedChange={(checked) => handleUpdateSystemSetting('enable_pix', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Cartão de Crédito (Online)</Label>
                            <p className="text-sm text-muted-foreground">Aceitar pagamentos com cartão pelo App</p>
                        </div>
                        <Switch
                            checked={getSetting('enable_credit_card') === true}
                            onCheckedChange={(checked) => handleUpdateSystemSetting('enable_credit_card', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Dinheiro</Label>
                            <p className="text-sm text-muted-foreground">Aceitar pagamento em dinheiro na entrega</p>
                        </div>
                        <Switch
                            checked={getSetting('enable_cash') === true}
                            onCheckedChange={(checked) => handleUpdateSystemSetting('enable_cash', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mercado Pago - Checkout Transparente</CardTitle>
                    <CardDescription>
                        Configure suas credenciais do Mercado Pago para receber pagamentos online.
                        <br />
                        Cada franqueado deve usar suas próprias chaves encontradas no painel de desenvolvedor do Mercado Pago.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveKeys} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="public_key">Public Key (Chave Pública)</Label>
                            <Input
                                id="public_key"
                                placeholder="TEST-xxxx-xxxx-xxxx-xxxx"
                                value={publicKey}
                                onChange={(e) => setPublicKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Usada pelo lado do cliente (App) para processar o cartão.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="access_token">Access Token (Chave de Acesso)</Label>
                            <div className="relative">
                                <Input
                                    id="access_token"
                                    type="password"
                                    placeholder="TEST-xxxx-xxxx-xxxx-xxxx"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    className="pr-10"
                                />
                                <Lock className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Usada pelo servidor para confirmar o pagamento. Mantenha em sigilo.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Salvando...' : 'Salvar Credenciais'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
