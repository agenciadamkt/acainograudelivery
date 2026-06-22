import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRegistrarEntrega, type RotaOrdem } from '@/hooks/useRotaDoDia';
import { capturePhoto } from '@/lib/platform/camera';

interface EntregaComprovanteDialogProps {
  parada: RotaOrdem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// REGRA: este modal NUNCA deve renderizar mapa. A área de comprovante mostra
// só a foto (ou o placeholder "Adicionar foto") — nunca um preview de rota.
export function EntregaComprovanteDialog({ parada, open, onOpenChange }: EntregaComprovanteDialogProps) {
  const [horaClique, setHoraClique] = useState<Date | null>(null);
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [observation, setObservation]   = useState('');
  const [uploading, setUploading]       = useState(false);

  const registrarEntrega = useRegistrarEntrega();

  useEffect(() => {
    if (open) {
      setHoraClique(new Date());
      setPhotoFile(null);
      setPhotoPreview(null);
      setObservation('');
    }
  }, [open]);

  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleTirarFoto = async () => {
    const file = await capturePhoto();
    if (file) handlePhotoChange(file);
  };

  const handleConfirm = async () => {
    if (!photoFile) {
      toast.error('Tire uma foto do pedido assinado para confirmar a entrega.');
      return;
    }
    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop() || 'jpg';
      const filePath = `${parada.orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('frota-comprovantes')
        .upload(filePath, photoFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('frota-comprovantes')
        .getPublicUrl(filePath);

      await registrarEntrega.mutateAsync({
        orderId: parada.orderId,
        isManualOrder: parada.isManualOrder,
        isFranchiseeOrder: parada.isFranchiseeOrder,
        photoUrl: publicUrl,
        observation: observation.trim() || undefined,
      });

      // O aviso falado + toast de "entrega concluída" é disparado de forma
      // centralizada no MotoristaDashboard (observa a mudança de status via
      // useRotaDoDia), cobrindo tanto essa confirmação manual quanto uma
      // entrega marcada como concluída por outra via (Realtime/Supabase) —
      // um único lugar, sem risco de anunciar duas vezes.
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao registrar entrega: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saving = uploading || registrarEntrega.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Cabeçalho fixo */}
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Confirmar Entrega
          </DialogTitle>
        </DialogHeader>

        {/* Conteúdo rolável — resumo + foto + observação, nunca mapa */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Clock className="h-4 w-4 shrink-0" />
            Entrega registrada às {horaClique ? format(horaClique, 'HH:mm') : '--:--'}
          </div>

          <p className="text-sm font-medium">{parada.customer.name}</p>
          <p className="text-xs text-muted-foreground">Pedido {parada.orderNumber}</p>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Foto do comprovante
            </Label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-100 h-56 flex items-center justify-center group">
                <img src={photoPreview} alt="Foto do comprovante" className="max-w-full max-h-full object-contain" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                >
                  Trocar Foto
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleTirarFoto}
                className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <Camera className="text-primary mb-2" size={24} />
                <span className="text-sm font-medium text-primary">Adicionar foto</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Ex: Recebido pelo porteiro..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="min-h-[64px] resize-none text-sm"
            />
          </div>
        </div>

        {/* Área de ação fixa */}
        <DialogFooter className="shrink-0 gap-2 px-6 py-4 border-t safe-area-bottom">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!photoFile || saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
