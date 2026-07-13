import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, RefreshCw, Search, ArrowLeft, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFiscalDocumentsList, useConsultarDocumento } from '@/hooks/fiscal/useFiscalDocuments';
import { FiscalService } from '@/services/fiscal/FiscalService';
import { toast } from 'sonner';
import { FISCAL_STATUS_META, FISCAL_TIPO_LABEL } from '@/services/fiscal/types';

const BRL = (v: number | null | undefined) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function HistoricoFiscal() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyAgo = format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(thirtyAgo);
  const [dateTo, setDateTo] = useState(today);
  const [status, setStatus] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [search, setSearch] = useState('');

  const { data: docs = [], isLoading } = useFiscalDocumentsList({ dateFrom, dateTo, status, tipo, search });
  const consultar = useConsultarDocumento();

  const baixar = async (documentId: string, kind: 'pdf' | 'xml') => {
    try {
      const url = await FiscalService.baixarDocumento(documentId, kind);
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error('Erro ao baixar: ' + e.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/fiscal')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Histórico Fiscal</h1>
          <p className="text-sm text-muted-foreground">Todas as notas emitidas pela loja.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/fiscal')}><Settings2 className="h-4 w-4" /> Configurações</Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="NFCE">NFC-e</SelectItem>
                <SelectItem value="NFE">NF-e</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PROCESSANDO">Processando</SelectItem>
                <SelectItem value="AUTORIZADO">Autorizada</SelectItem>
                <SelectItem value="REJEITADO">Rejeitada</SelectItem>
                <SelectItem value="CANCELADO">Cancelada</SelectItem>
                <SelectItem value="ERRO">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nº, chave, cliente" className="h-9 pl-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Documentos <span className="text-muted-foreground font-normal">({docs.length})</span></CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Documento</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Origem</th>
                  <th className="px-4 py-2">Nº / Série</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
                ) : docs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum documento no período.</td></tr>
                ) : docs.map((d) => {
                  const meta = FISCAL_STATUS_META[d.status];
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground">{format(new Date(d.created_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                      <td className="px-4 py-2 font-medium">{FISCAL_TIPO_LABEL[d.tipo_documento]}</td>
                      <td className="px-4 py-2">{d.destinatario_nome || <span className="text-muted-foreground">Consumidor</span>}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={d.pdv_order_id ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}>
                          {d.pdv_order_id ? 'PDV' : 'Delivery'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{d.numero ? `${d.numero} / ${d.serie}` : '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">{BRL(d.valor_total)}</td>
                      <td className="px-4 py-2"><Badge className={meta?.className}>{meta?.dot} {meta?.label}</Badge></td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.status === 'PROCESSANDO' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Consultar status" onClick={() => consultar.mutate(d.id)}>
                              <RefreshCw className={`h-4 w-4 ${consultar.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          {d.status === 'AUTORIZADO' && (
                            <>
                              <button className="text-xs text-primary underline px-1" onClick={() => baixar(d.id, 'pdf')}>PDF</button>
                              <button className="text-xs text-primary underline px-1" onClick={() => baixar(d.id, 'xml')}>XML</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
