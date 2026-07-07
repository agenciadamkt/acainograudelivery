'use client';

import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { motion } from 'framer-motion';
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  FileDown,
  Truck,
  Tags,
  ArrowLeft
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function PurchaseHistoryPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch suppliers for filter
  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory_suppliers_filter', currentStore?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_suppliers')
        .select('id, name')
        .eq('store_id', currentStore?.id)
        .order('name');
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['inventory_categories_filter', currentStore?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_categories')
        .select('id, name')
        .eq('store_id', currentStore?.id)
        .order('name');
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  // Fetch purchase movements
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['purchase_history', currentStore?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_items(name, unit, supplier_id, inventory_suppliers(id, name), inventory_categories(name, color))
        `)
        .eq('store_id', currentStore.id)
        .eq('action', 'entry')
        .eq('classification', 'purchase')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStore?.id
  });

  // Filter by supplier, category and search
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const item = m.inventory_items as any;
      const matchesSupplier = supplierFilter === 'all' || item?.supplier_id === supplierFilter;
      const matchesCategory = categoryFilter === 'all' || item?.inventory_categories?.id === categoryFilter;
      const matchesSearch = !searchTerm || item?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSupplier && matchesCategory && matchesSearch;
    });
  }, [movements, supplierFilter, categoryFilter, searchTerm]);

  // Stats
  const totalSpent = filteredMovements.reduce((acc, m) => acc + (Number((m as any).total_value) || 0), 0);
  const totalQty = filteredMovements.reduce((acc, m) => acc + (Number((m as any).qty) || 0), 0);
  const totalEntries = filteredMovements.length;
  const avgPerEntry = totalEntries > 0 ? totalSpent / totalEntries : 0;

  // Running accumulated total (oldest→newest)
  const saldoAcumulado = useMemo(() => {
    const sorted = [...filteredMovements].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let running = 0;
    const map: Record<string, number> = {};
    sorted.forEach(m => {
      running += Number((m as any).total_value) || 0;
      map[m.id] = running;
    });
    return map;
  }, [filteredMovements]);

  // Group by supplier for summary
  const supplierSummary = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filteredMovements.forEach(m => {
      const item = m.inventory_items as any;
      const supName = item?.inventory_suppliers?.name || 'Sem fornecedor';
      const supId = item?.supplier_id || 'none';
      if (!map[supId]) map[supId] = { name: supName, total: 0, count: 0 };
      map[supId].total += Number(m.total_value) || 0;
      map[supId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredMovements]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleExport = () => {
    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [141, 66, 221]; // #8D42DD
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header bar
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Compras', 14, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${currentStore?.name || 'Loja'}`, pageWidth - 14, 12, { align: 'right' });
      doc.text(`Período: ${dateFrom.split('-').reverse().join('/')} a ${dateTo.split('-').reverse().join('/')}`, pageWidth - 14, 18, { align: 'right' });
      doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 24, { align: 'right' });

      // KPIs
      let y = 38;
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO DO PERÍODO', 14, y);
      y += 8;

      doc.setFillColor(245, 245, 250);
      doc.roundedRect(14, y, 55, 18, 3, 3, 'F');
      doc.roundedRect(74, y, 55, 18, 3, 3, 'F');
      doc.roundedRect(134, y, 55, 18, 3, 3, 'F');

      doc.setFontSize(7);
      doc.setTextColor(120, 120, 140);
      doc.text('TOTAL GASTO', 18, y + 6);
      doc.text('ENTRADAS', 78, y + 6);
      doc.text('TICKET MÉDIO', 138, y + 6);

      doc.setFontSize(12);
      doc.setTextColor(40, 40, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(totalSpent), 18, y + 14);
      doc.text(String(totalEntries), 78, y + 14);
      doc.text(formatCurrency(avgPerEntry), 138, y + 14);

      y += 26;

      // Supplier breakdown (if multiple)
      if (supplierSummary.length > 1) {
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'bold');
        doc.text('GASTOS POR FORNECEDOR', 14, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          head: [['Fornecedor', 'Entradas', 'Total']],
          body: supplierSummary.map(s => [
            s.name,
            String(s.count),
            formatCurrency(s.total)
          ]),
          theme: 'grid',
          headStyles: { fillColor: brandColor, fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 80 },
            2: { halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 14, right: 14 }
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Detail table
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALHAMENTO', 14, y);
      y += 4;

      const tableBody = filteredMovements.map(m => {
        const item = m.inventory_items as any;
        return [
          format(parseISO(m.created_at), 'dd/MM/yy'),
          item?.name || '—',
          item?.inventory_categories?.name || 'Geral',
          item?.inventory_suppliers?.name || '—',
          `${m.qty} ${item?.unit || ''}`,
          formatCurrency(Number(m.unit_price) || 0),
          formatCurrency(Number(m.total_value) || 0),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Insumo', 'Categoria', 'Fornecedor', 'Qtd', 'Preço Unit.', 'Total']],
        body: tableBody,
        foot: [['', '', '', '', '', 'TOTAL', formatCurrency(totalSpent)]],
        theme: 'striped',
        headStyles: { fillColor: brandColor, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        footStyles: { fillColor: [240, 240, 245], textColor: brandColor, fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 18 },
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 175);
        doc.text(
          `GrauOS • Histórico de Compras • Página ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      const fileName = `compras_${dateFrom}_${dateTo}.pdf`;
      doc.save(fileName);
      toast.success('PDF exportado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Histórico de Compras
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Acompanhe cada centavo investido em insumos
          </p>
        </div>

        <Button variant="outline" className="glass-card gap-2" onClick={handleExport} disabled={filteredMovements.length === 0}>
          <FileDown size={18} /> Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent border-none focus-visible:ring-0 w-[140px]"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent border-none focus-visible:ring-0 w-[140px]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Truck className="text-muted-foreground h-4 w-4 shrink-0" />
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="bg-transparent border-none focus-visible:ring-0 w-[180px]">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Fornecedores</SelectItem>
              {suppliers.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Tags className="text-muted-foreground h-4 w-4 shrink-0" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-transparent border-none focus-visible:ring-0 w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {(categories as any[]).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
          <Input
            placeholder="Buscar insumo..."
            className="bg-transparent border-none focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-none bg-primary/5">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Gasto</p>
              <h3 className="text-2xl font-black">{formatCurrency(totalSpent)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none bg-green-500/5">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-600">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qtd Total Comprada</p>
              <h3 className="text-2xl font-black">{totalQty.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none bg-blue-500/5">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entradas</p>
              <h3 className="text-2xl font-black">{totalEntries}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none bg-amber-500/5">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ticket Médio</p>
              <h3 className="text-2xl font-black">{formatCurrency(avgPerEntry)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Breakdown */}
      {supplierSummary.length > 1 && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            Gastos por Fornecedor
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supplierSummary.map((s, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-2xl">
                <p className="text-xs font-bold text-muted-foreground truncate">{s.name}</p>
                <p className="text-lg font-black mt-1">{formatCurrency(s.total)}</p>
                <p className="text-[10px] text-muted-foreground">{s.count} entrada{s.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Data</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Insumo</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Fornecedor</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Qtd</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Preço Unit.</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Total</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo Acum.</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Obs</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-20 text-center animate-pulse">Carregando compras...</td></tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-20 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h4 className="font-bold text-lg">Nenhuma compra encontrada</h4>
                  <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou registre novas entradas</p>
                </td>
              </tr>
            ) : filteredMovements.map((m, idx) => {
              const item = m.inventory_items as any;
              return (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {format(parseISO(m.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(m.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: item?.inventory_categories?.color || '#94a3b8' }}
                      >
                        <Package size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item?.name || '—'}</p>
                        <Badge variant="outline" className="text-[9px] h-4 leading-none opacity-60">
                          {item?.inventory_categories?.name || 'Geral'}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {item?.inventory_suppliers?.name || '—'}
                  </td>
                  <td className="p-4 text-center font-bold">
                    {m.qty} <span className="text-xs text-muted-foreground">{item?.unit}</span>
                  </td>
                  <td className="p-4 text-right font-mono text-sm">
                    {formatCurrency(Number(m.unit_price) || 0)}
                  </td>
                  <td className="p-4 text-right font-black text-primary">
                    {formatCurrency(Number(m.total_value) || 0)}
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-sm text-emerald-600">
                      {formatCurrency(saldoAcumulado[m.id] || 0)}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground max-w-[160px] truncate">
                    {m.notes || '—'}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          {filteredMovements.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 border-t-2">
                <td colSpan={3} className="p-4 text-right font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  Total do Período
                </td>
                <td className="p-4 text-center font-black text-base text-green-600">
                  {totalQty.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right font-bold text-sm text-muted-foreground">
                  {totalEntries} entradas
                </td>
                <td className="p-4 text-right font-black text-xl text-primary">
                  {formatCurrency(totalSpent)}
                </td>
                <td className="p-4 text-right font-black text-xl text-emerald-600">
                  {formatCurrency(totalSpent)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
