import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Printer, Save, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useFiscalCompany } from '@/hooks/fiscal/useFiscalCompany';
import { toast } from 'sonner';

export default function ImpressaoTab() {
  const { currentStore } = useStore();
  const { company, saveConfig } = useFiscalCompany();
  const [rodape, setRodape] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (company) { setRodape(company.danfe_rodape || ''); setLogoUrl(company.danfe_logo_url || null); }
  }, [company]);

  const handleLogo = async (file: File) => {
    if (!currentStore?.id) return;
    setUploading(true);
    try {
      const fileName = `fiscal/${currentStore.id}/danfe-logo-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('store-assets').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      setLogoUrl(data.publicUrl);
      saveConfig.mutate({ danfe_logo_url: data.publicUrl } as any);
    } catch (e: any) {
      toast.error('Erro no upload do logo: ' + (e.message || 'verifique o bucket store-assets'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Printer className="h-4 w-4" /> Logotipo da DANFE</CardTitle>
          <CardDescription>Aparece no topo da DANFE/DANFCe (quando suportado).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="rounded-md border p-3 bg-muted/30 flex justify-center">
              <img src={logoUrl} alt="Logo DANFE" className="max-h-24 object-contain" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Enviar logotipo (PNG/JPG)</Label>
            <Input type="file" accept="image/png,image/jpeg" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogo(f); }} />
          </div>
          {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="h-3 w-3" /> Enviando...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Texto do rodapé</CardTitle>
          <CardDescription>Mensagem opcional impressa na nota (ex: agradecimento).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rodapé</Label>
            <Textarea value={rodape} onChange={(e) => setRodape(e.target.value)} rows={4} placeholder="Ex: Obrigado pela preferência! Volte sempre." />
          </div>
          <Button className="w-full gap-2" onClick={() => saveConfig.mutate({ danfe_rodape: rodape } as any)} disabled={saveConfig.isPending}>
            <Save className="h-4 w-4" /> Salvar rodapé
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
