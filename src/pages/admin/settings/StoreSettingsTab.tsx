import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { BusinessHours } from '@/utils/businessHours';

const DAYS = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

const DEFAULT_HOURS = {
    open: '09:00',
    close: '22:00',
    closed: false
};

export function StoreSettingsTab() {
    const { currentStore, refreshStores } = useStore();
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [loading, setLoading] = useState(false);
    const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
    const [storeActive, setStoreActive] = useState(false);

    useEffect(() => {
        if (currentStore) {
            setBusinessHours(currentStore.business_hours || {});
            setStoreActive(currentStore.status === 'active');
        }
    }, [currentStore]);

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') {
        if (!event.target.files || event.target.files.length === 0 || !currentStore) {
            return;
        }

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentStore.id}/${type}-${Date.now()}.${fileExt}`;
        const bucket = 'store-assets';

        if (type === 'logo') setUploadingLogo(true);
        else setUploadingBanner(true);

        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('store-assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('store-assets')
                .getPublicUrl(fileName);

            const updateData = type === 'logo'
                ? { logo_url: publicUrl }
                : { banner_url: publicUrl };

            const { error: dbError } = await supabase
                .from('stores')
                .update(updateData)
                .eq('id', currentStore.id);

            if (dbError) throw dbError;

            toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} atualizado com sucesso!`);
            refreshStores();

        } catch (error: any) {
            console.error('Error uploading:', error);
            toast.error(`Erro ao fazer upload: ${error.message || 'Verifique se o bucket store-assets existe'}`);
        } finally {
            if (type === 'logo') setUploadingLogo(false);
            else setUploadingBanner(false);
        }
    }

    const handleUpdateStore = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentStore) return;
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        const updates = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            zip_code: formData.get('zip_code') as string,
            neighborhood: formData.get('neighborhood') as string,
            city: formData.get('city') as string,
            state: formData.get('state') as string,
            delivery_time: formData.get('delivery_time') as string,
            min_order_value: parseFloat(formData.get('min_order_value') as string) || 0,
            delivery_fee: parseFloat(formData.get('delivery_fee') as string) || 0,
            business_hours: businessHours as any,
            status: storeActive ? 'active' : 'inactive',
            active: true // Always keep active/visible. Only status controls open/closed
        };

        try {
            const { error } = await supabase
                .from('stores')
                .update(updates as any)
                .eq('id', currentStore.id);

            if (error) throw error;
            toast.success('Dados da loja atualizados!');
            refreshStores();
        } catch (error: any) {
            toast.error('Erro ao atualizar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateDayHours = (day: keyof BusinessHours, field: 'open' | 'close' | 'closed', value: any) => {
        setBusinessHours(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [day]: {
                    ...prev[day] || DEFAULT_HOURS,
                    [field]: value
                }
            };
        });
    };

    if (!currentStore) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>Nenhuma loja selecionada. Selecione uma loja para editar.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Status da Loja</CardTitle>
                            <CardDescription>Abra ou feche sua loja para receber pedidos.</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="store-active" className="text-base font-medium">
                                {storeActive ? 'Loja Aberta' : 'Loja Fechada'}
                            </Label>
                            <Switch
                                id="store-active"
                                checked={storeActive}
                                onCheckedChange={setStoreActive}
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <form onSubmit={handleUpdateStore} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Identidade Visual</CardTitle>
                        <CardDescription>Gerencie o logo e banner da sua loja no app.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* LOGO UPLOAD */}
                            <div className="space-y-4">
                                <Label>Logomarca (Redonda)</Label>
                                <div className="flex flex-col items-center gap-4 border-2 border-dashed rounded-lg p-6 bg-muted/20">
                                    {currentStore.logo_url ? (
                                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                                            <img src={currentStore.logo_url} alt="Store Logo" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                            Sem Logo
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" className="relative cursor-pointer" disabled={uploadingLogo}>
                                            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                            Alterar Logo
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => handleFileUpload(e, 'logo')}
                                                disabled={uploadingLogo}
                                            />
                                        </Button>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Recomendado: 500x500px (PNG/JPG)</span>
                                </div>
                            </div>

                            {/* BANNER UPLOAD */}
                            <div className="space-y-4">
                                <Label>Banner da Loja (App)</Label>
                                <div className="flex flex-col items-center gap-4 border-2 border-dashed rounded-lg p-6 bg-muted/20">
                                    {currentStore.banner_url ? (
                                        <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden border-2 border-white shadow-md">
                                            <img src={currentStore.banner_url} alt="Store Banner" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-[2/1] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                            Sem Banner
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" className="relative cursor-pointer" disabled={uploadingBanner}>
                                            {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                            Alterar Banner
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => handleFileUpload(e, 'banner')}
                                                disabled={uploadingBanner}
                                            />
                                        </Button>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Recomendado: 1000x500px (PNG/JPG)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Informações da Loja</CardTitle>
                        <CardDescription>Atualize os dados básicos de exibição.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Loja</Label>
                                <Input id="name" name="name" defaultValue={currentStore.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                                <Input id="phone" name="phone" defaultValue={currentStore.phone || ''} />
                            </div>

                            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                                <h3 className="text-sm font-medium mb-4">Endereço e Localização</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="zip_code">CEP</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="zip_code"
                                                name="zip_code"
                                                defaultValue={currentStore.zip_code || ''}
                                                placeholder="00000-000"
                                                maxLength={9}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    if (value.length === 8) {
                                                        fetch(`https://viacep.com.br/ws/${value}/json/`)
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                if (!data.erro) {
                                                                    const form = e.target.form;
                                                                    if (form) {
                                                                        (form.elements.namedItem('address') as HTMLInputElement).value = data.logradouro;
                                                                        (form.elements.namedItem('neighborhood') as HTMLInputElement).value = data.bairro;
                                                                        (form.elements.namedItem('city') as HTMLInputElement).value = data.localidade;
                                                                        (form.elements.namedItem('state') as HTMLInputElement).value = data.uf;
                                                                        toast.success('Endereço encontrado!');
                                                                    }
                                                                }
                                                            });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">Estado (UF)</Label>
                                        <Input id="state" name="state" defaultValue={currentStore.state || ''} maxLength={2} placeholder="UF" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Cidade</Label>
                                        <Input id="city" name="city" defaultValue={currentStore.city || ''} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="neighborhood">Bairro</Label>
                                        <Input id="neighborhood" name="neighborhood" defaultValue={currentStore.neighborhood || ''} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Endereço (Logradouro, Número, Complemento)</Label>
                                        <Input id="address" name="address" defaultValue={currentStore.address || ''} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="delivery_time">Tempo Estimado (ex: 40-60)</Label>
                                <Input id="delivery_time" name="delivery_time" defaultValue={currentStore.delivery_time || ''} placeholder="40-60" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                                <Input id="min_order_value" name="min_order_value" type="number" step="0.01" defaultValue={currentStore.min_order_value || 0} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delivery_fee">Taxa de Entrega Base (R$)</Label>
                                <Input id="delivery_fee" name="delivery_fee" type="number" step="0.01" defaultValue={currentStore.delivery_fee || 0} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Horários de Funcionamento
                        </CardTitle>
                        <CardDescription>Configure os dias e horários que sua loja recebe pedidos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {businessHours && (Object.keys(DAYS) as Array<keyof BusinessHours>).map((day) => {
                            const hours = businessHours[day] || DEFAULT_HOURS;
                            return (
                                <div key={day} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
                                    <div className="w-32 font-medium">{DAYS[day]}</div>

                                    <div className="flex items-center gap-4 flex-1 justify-end">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={`${day}-closed`} className="text-sm text-muted-foreground mr-2">Fechado</Label>
                                            <Switch
                                                id={`${day}-closed`}
                                                checked={hours.closed}
                                                onCheckedChange={(checked) => updateDayHours(day, 'closed', checked)}
                                            />
                                        </div>

                                        {!hours.closed && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="time"
                                                        value={hours.open}
                                                        onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                                                        className="w-24"
                                                    />
                                                    <span>até</span>
                                                    <Input
                                                        type="time"
                                                        value={hours.close}
                                                        onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                                                        className="w-24"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4 pb-20">
                    <Button type="submit" disabled={loading} size="lg">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Todas as Configurações
                    </Button>
                </div>
            </form>
        </div>
    );
}
