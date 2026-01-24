import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function StoreSettingsTab() {
    const { currentStore, refreshStores } = useStore();
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [loading, setLoading] = useState(false);

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

        // Casting explicitamente para evitar erros de TS
        const updates = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            delivery_time: formData.get('delivery_time') as string, // Campo novo
            min_order_value: parseFloat(formData.get('min_order_value') as string) || 0,
            delivery_fee: parseFloat(formData.get('delivery_fee') as string) || 0,
        };

        try {
            const { error } = await supabase
                .from('stores')
                .update(updates)
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
                                    <Button variant="outline" size="sm" className="relative cursor-pointer" disabled={uploadingLogo}>
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
                                {(currentStore as any).banner_url ? (
                                    <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden border-2 border-white shadow-md">
                                        <img src={(currentStore as any).banner_url} alt="Store Banner" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-full aspect-[2/1] rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                        Sem Banner
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="relative cursor-pointer" disabled={uploadingBanner}>
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
                    <form onSubmit={handleUpdateStore} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Loja</Label>
                                <Input id="name" name="name" defaultValue={currentStore.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                                <Input id="phone" name="phone" defaultValue={currentStore.phone || ''} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Endereço Completo</Label>
                                <Input id="address" name="address" defaultValue={currentStore.address || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delivery_time">Tempo Estimado (ex: 40-60)</Label>
                                <Input id="delivery_time" name="delivery_time" defaultValue={(currentStore as any).delivery_time || ''} placeholder="40-60" />
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
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
