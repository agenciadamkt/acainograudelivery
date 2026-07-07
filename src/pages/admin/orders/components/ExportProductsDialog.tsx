import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { useFranchiseeProducts, type FranchiseeProduct } from '@/hooks/useFranchiseeProducts';
import { formatBRL } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Categoria {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
}

export function ExportProductsDialog({ open, onOpenChange, categorias }: Props) {
  const { data: produtos = [], isLoading } = useFranchiseeProducts(undefined);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

  const todasSelecionadas = categoriasSelecionadas.size === 0;

  const toggleCategoria = (id: string) => {
    setCategoriasSelecionadas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtrados = useMemo(() => {
    if (todasSelecionadas) return produtos;
    return produtos.filter(p => categoriasSelecionadas.has(p.category_id));
  }, [produtos, categoriasSelecionadas, todasSelecionadas]);

  const handleClose = () => {
    setCategoriasSelecionadas(new Set());
    onOpenChange(false);
  };

  const exportarPDF = async () => {
    setExportando('pdf');
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pw = doc.internal.pageSize.getWidth();
      const ML = 14;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(109, 40, 217);
      doc.text('Catálogo de Insumos', ML, 16);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 128);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} — ${filtrados.length} produto(s)`, ML, 23);
      doc.setDrawColor(220, 220, 220);
      doc.line(ML, 27, pw - ML, 27);

      autoTable(doc, {
        startY: 32,
        head: [['Código', 'Produto', 'Categoria', 'Unidade', 'Preço', 'Estoque', 'Status']],
        body: filtrados.map((p: FranchiseeProduct) => [
          p.code || '—',
          p.name,
          p.category?.name || '—',
          p.unit,
          formatBRL(p.price),
          String(p.current_stock ?? 0),
          p.active ? 'Ativo' : 'Inativo',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } },
        margin: { left: ML, right: ML },
      });

      doc.save(`catalogo-insumos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setExportando(null);
    }
  };

  const exportarExcel = async () => {
    setExportando('excel');
    try {
      // Import dinâmico — mesma estratégia do ImportSpreadsheetDialog, pra
      // não inflar o bundle principal com a lib xlsx.
      const XLSX = await import('xlsx');
      const linhas = filtrados.map((p: FranchiseeProduct) => ({
        'Código': p.code || '',
        'Produto': p.name,
        'Categoria': p.category?.name || '',
        'Unidade': p.unit,
        'Preço': p.price,
        'Estoque Atual': p.current_stock ?? 0,
        'Status': p.active ? 'Ativo' : 'Inativo',
      }));
      const worksheet = XLSX.utils.json_to_sheet(linhas);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Insumos');
      XLSX.writeFile(workbook, `catalogo-insumos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } finally {
      setExportando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !exportando && (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-purple-600" /> Exportar Catálogo
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Filtrar por categoria
            </Label>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <Checkbox checked={todasSelecionadas} onCheckedChange={() => setCategoriasSelecionadas(new Set())} />
              <span className="text-sm font-semibold">Todas as categorias</span>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {categorias.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={categoriasSelecionadas.has(cat.id)}
                    onCheckedChange={() => toggleCategoria(cat.id)}
                  />
                  <span className="text-sm">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="text-sm text-center text-muted-foreground bg-purple-50 rounded-xl p-3">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</span>
            ) : (
              <span><strong className="text-purple-700">{filtrados.length}</strong> produto(s) serão exportados</span>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={!!exportando}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={exportarExcel}
            disabled={isLoading || !!exportando || filtrados.length === 0}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {exportando === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Excel
          </Button>
          <Button
            onClick={exportarPDF}
            disabled={isLoading || !!exportando || filtrados.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {exportando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
