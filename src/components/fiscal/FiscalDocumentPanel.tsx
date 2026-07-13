import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Receipt, RefreshCw, FileText, FileCode, AlertTriangle, Printer, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useFiscalDocumentsForSale, useEmitirDocumento, useConsultarDocumento, useCancelarDocumento } from '@/hooks/fiscal/useFiscalDocuments';
import { FiscalService } from '@/services/fiscal/FiscalService';
import { FISCAL_STATUS_META, FISCAL_TIPO_LABEL, type FiscalTipo } from '@/services/fiscal/types';

interface Props {
  orderId?: string;
  pdvOrderId?: string;
  defaultTipo?: FiscalTipo;
}

// Painel de situação fiscal reutilizável (Pedidos e PDV).
export function FiscalDocumentPanel({ orderId, pdvOrderId, defaultTipo = 'NFCE' }: Props) {
  const { data: docs = [], isLoading } = useFiscalDocumentsForSale({ orderId, pdvOrderId });
  const emitir = useEmitirDocumento();
  const consultar = useConsultarDocumento();
  const cancelar = useCancelarDocumento();
  const [tipo, setTipo] = useState<FiscalTipo>(defaultTipo);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const [downloading, setDownloading] = useState<string | null>(null);

  const latest = docs[0];
  const meta = latest ? FISCAL_STATUS_META[latest.status] : null;

  const handleEmitir = () => emitir.mutate({ tipo, orderId, pdvOrderId });

  const abrirArquivo = async (kind: 'pdf' | 'xml', imprimir = false) => {
    if (!latest) return;
    setDownloading(imprimir ? 'print' : kind);
    try {
      const url = await FiscalService.baixarDocumento(latest.id, kind);
      const win = window.open(url, '_blank');
      if (imprimir && win) win.addEventListener('load', () => win.print());
    } catch (e: any) {
      toast.error('Erro ao obter arquivo: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Receipt className="w-4 h-4" /> Situação Fiscal
      </h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground pl-6">Carregando...</p>
      ) : !latest ? (
        // ── Nenhuma nota emitida ──
        <div className="pl-6 flex items-center gap-2">
          <Badge variant="outline">Não emitida</Badge>
          <div className="flex-1" />
          <Select value={tipo} onValueChange={(v) => setTipo(v as FiscalTipo)}>
            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NFCE">NFC-e</SelectItem>
              <SelectItem value="NFE">NF-e</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" onClick={handleEmitir} disabled={emitir.isPending}>
            <Receipt className="h-4 w-4" /> {emitir.isPending ? 'Emitindo...' : 'Emitir'}
          </Button>
        </div>
      ) : (
        // ── Documento existente ──
        <div className="pl-6 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge className={meta?.className}>{meta?.dot} {meta?.label}</Badge>
            <span className="text-muted-foreground">{FISCAL_TIPO_LABEL[latest.tipo_documento]}</span>
            {latest.numero && <span className="text-muted-foreground">nº {latest.numero}/{latest.serie}</span>}
          </div>

          {latest.status === 'PROCESSANDO' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Aguardando autorização da SEFAZ...</span>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => consultar.mutate(latest.id)}>Consultar agora</Button>
            </div>
          )}

          {latest.status === 'AUTORIZADO' && (
            <>
              {latest.chave && <div className="font-mono text-xs break-all text-muted-foreground">Chave: {latest.chave}</div>}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => abrirArquivo('pdf')} disabled={downloading === 'pdf'}>
                  <FileText className="h-4 w-4" /> DANFE (PDF)
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => abrirArquivo('xml')} disabled={downloading === 'xml'}>
                  <FileCode className="h-4 w-4" /> XML
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => abrirArquivo('pdf', true)} disabled={downloading === 'print'}>
                  <Printer className="h-4 w-4" /> Reimprimir
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
                  <Ban className="h-4 w-4" /> Cancelar
                </Button>
              </div>
            </>
          )}

          {(latest.status === 'REJEITADO' || latest.status === 'ERRO') && (
            <>
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{latest.motivo_rejeicao || 'Documento rejeitado.'}</span>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleEmitir} disabled={emitir.isPending}>
                <Receipt className="h-4 w-4" /> Emitir novamente
              </Button>
            </>
          )}
        </div>
      )}
      <Separator />

      {/* Dialog de cancelamento */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar documento fiscal</DialogTitle>
            <DialogDescription>
              O cancelamento é enviado à SEFAZ e é irreversível. Informe a justificativa (mínimo 15 caracteres).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Justificativa do cancelamento" rows={3} />
            <p className="text-xs text-muted-foreground">{motivo.trim().length}/15 caracteres mínimos</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={motivo.trim().length < 15 || cancelar.isPending}
              onClick={() => latest && cancelar.mutate({ documentId: latest.id, motivo: motivo.trim() }, { onSuccess: () => { setCancelOpen(false); setMotivo(''); } })}
            >
              {cancelar.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
