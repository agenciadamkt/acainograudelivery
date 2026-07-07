import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ProdutoAtual {
  id: string;
  code: string;
  name: string;
  price: number;
  current_stock: number;
}

interface LinhaPreview {
  code: string;
  descricao: string;
  novoPreco: number;
  novoEstoque: number;
  produtoAtual: ProdutoAtual | null;
}

// Cabeçalhos esperados no estoque.xls — "Código" aparece duas vezes na
// planilha real (produto e fornecedor); sempre usa a PRIMEIRA ocorrência,
// que é a do produto.
const COL_CODIGO = 'Código';
const COL_DESCRICAO = 'Descrição';
const COL_QT_REAL = 'Qt. Real';
const COL_PVENDA = 'P.Venda';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ImportSpreadsheetDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<LinhaPreview[] | null>(null);
  const [naoEncontrados, setNaoEncontrados] = useState<{ code: string; descricao: string }[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = () => {
    setFileName('');
    setPreview(null);
    setNaoEncontrados([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setParsing(true);
    setPreview(null);
    setNaoEncontrados([]);

    try {
      // Import dinâmico — xlsx é uma lib pesada, mesma estratégia já usada
      // pra Leaflet/html2canvas neste projeto pra não inflar o bundle
      // principal (e estourar o limite de precache do PWA).
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

      // Acha a linha de cabeçalho procurando pelas colunas esperadas
      // (normalmente a primeira linha, mas tolera linhas extras antes).
      let headerRowIndex = -1;
      let idxCodigo = -1, idxDescricao = -1, idxQtReal = -1, idxPVenda = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i].map(c => String(c ?? '').trim());
        const ci = row.indexOf(COL_CODIGO); // primeira ocorrência
        const di = row.indexOf(COL_DESCRICAO);
        const qi = row.indexOf(COL_QT_REAL);
        const pi = row.indexOf(COL_PVENDA);
        if (ci >= 0 && di >= 0 && qi >= 0 && pi >= 0) {
          headerRowIndex = i;
          idxCodigo = ci; idxDescricao = di; idxQtReal = qi; idxPVenda = pi;
          break;
        }
      }

      if (headerRowIndex === -1) {
        setParseError('Não encontrei as colunas "Código", "Descrição", "Qt. Real" e "P.Venda" na planilha. Confira o arquivo.');
        setParsing(false);
        return;
      }

      const linhas = rows.slice(headerRowIndex + 1)
        .map(row => ({
          code: String(row[idxCodigo] ?? '').trim(),
          descricao: String(row[idxDescricao] ?? '').trim(),
          novoPreco: Number(row[idxPVenda]) || 0,
          novoEstoque: Number(row[idxQtReal]) || 0,
        }))
        .filter(l => l.code);

      if (linhas.length === 0) {
        setParseError('Nenhuma linha com código válido foi encontrada na planilha.');
        setParsing(false);
        return;
      }

      const codes = [...new Set(linhas.map(l => l.code))];
      const { data: produtos, error } = await supabase
        .from('franchisee_products' as any)
        .select('id, code, name, price, current_stock')
        .in('code', codes);
      if (error) throw error;

      const porCodigo = new Map<string, ProdutoAtual>((produtos || []).map((p: any) => [p.code, p]));

      const linhasComProduto: LinhaPreview[] = linhas.map(l => ({
        ...l,
        produtoAtual: porCodigo.get(l.code) ?? null,
      }));

      setPreview(linhasComProduto.filter(l => l.produtoAtual));
      setNaoEncontrados(linhasComProduto.filter(l => !l.produtoAtual).map(l => ({ code: l.code, descricao: l.descricao })));
    } catch (err: any) {
      setParseError('Erro ao ler a planilha: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImportar = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    try {
      const payload = preview.map(l => ({
        code: l.code,
        price: l.novoPreco,
        current_stock: l.novoEstoque,
      }));
      const { data, error } = await supabase.rpc('bulk_update_products_from_spreadsheet' as any, { p_items: payload });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['franchisee_products'] });
      toast.success(`${data ?? preview.length} produto(s) atualizado(s) com sucesso!`);
      handleClose();
    } catch (err: any) {
      toast.error('Erro ao importar: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !importing && (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" /> Importar Planilha de Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
          {!preview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="w-full flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/50 hover:bg-purple-50 transition-colors"
            >
              {parsing ? (
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-purple-400" />
              )}
              <span className="text-sm font-semibold text-purple-700">
                {parsing ? 'Lendo planilha...' : fileName || 'Clique para selecionar o arquivo .xls/.xlsx'}
              </span>
              <span className="text-xs text-muted-foreground">Colunas esperadas: Código, Descrição, Qt. Real, P.Venda</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />

          {parseError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {preview && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-purple-600" /> {fileName}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
                  <X className="h-3.5 w-3.5" /> Trocar arquivo
                </Button>
              </div>

              <div className="flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> {preview.length} produto(s) serão atualizados
                </Badge>
                {naoEncontrados.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> {naoEncontrados.length} código(s) sem produto no catálogo
                  </Badge>
                )}
              </div>

              {preview.length > 0 && (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left font-bold text-xs uppercase p-2.5">Código</th>
                        <th className="text-left font-bold text-xs uppercase p-2.5">Produto</th>
                        <th className="text-right font-bold text-xs uppercase p-2.5">Preço</th>
                        <th className="text-right font-bold text-xs uppercase p-2.5">Estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 50).map(l => {
                        const precoMudou = l.produtoAtual!.price !== l.novoPreco;
                        const estoqueMudou = l.produtoAtual!.current_stock !== l.novoEstoque;
                        return (
                          <tr key={l.code} className="border-t">
                            <td className="p-2.5 font-mono text-xs text-muted-foreground">{l.code}</td>
                            <td className="p-2.5 font-medium">{l.produtoAtual!.name}</td>
                            <td className="p-2.5 text-right">
                              {precoMudou ? (
                                <span>
                                  <span className="text-muted-foreground line-through text-xs">{formatBRL(l.produtoAtual!.price)}</span>
                                  {' → '}
                                  <span className="font-bold text-purple-600">{formatBRL(l.novoPreco)}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{formatBRL(l.novoPreco)}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {estoqueMudou ? (
                                <span>
                                  <span className="text-muted-foreground line-through text-xs">{l.produtoAtual!.current_stock}</span>
                                  {' → '}
                                  <span className="font-bold text-purple-600">{l.novoEstoque}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{l.novoEstoque}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {preview.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center p-2 bg-muted/30">
                      Mostrando 50 de {preview.length} — todos serão importados ao confirmar.
                    </p>
                  )}
                </div>
              )}

              {naoEncontrados.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-semibold">Ver códigos não encontrados ({naoEncontrados.length})</summary>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {naoEncontrados.map(n => (
                      <p key={n.code}>{n.code} — {n.descricao}</p>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancelar
          </Button>
          {preview && preview.length > 0 && (
            <Button
              onClick={handleImportar}
              disabled={importing}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar {preview.length} produto(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
