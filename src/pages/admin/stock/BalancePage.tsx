'use client';

import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from '@/pages/admin/financial/utils/pdfBranding';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Download,
  Printer,
  BarChart3,
  Calendar,
  Filter,
  Package,
  Building2,
  Tags,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
  Scale,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type GroupBy = 'product' | 'supplier' | 'category';
type ReportType = 'analytical' | 'synthetic';

interface Movement {
  id: string;
  item_id: string;
  action: string;
  qty: number;
  total_value: number;
  moved_at: string;
  classification: string;
  inventory_items: {
    name: string;
    unit: string;
    inventory_categories: { name: string } | null;
    inventory_suppliers: { name: string } | null;
  } | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function StockBalancePage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const now = new Date();

  // Filters
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [groupBy, setGroupBy] = useState<GroupBy>('product');
  const [reportType, setReportType] = useState<ReportType>('analytical');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  // Movements in the selected period
  const { data: periodMovements = [], isLoading: loadingPeriod } = useQuery({
    queryKey: ['balance_period', currentStore?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_items(
            name,
            unit,
            inventory_categories(name),
            inventory_suppliers(name)
          )
        `)
        .eq('store_id', currentStore.id)
        .gte('moved_at', `${dateFrom}T00:00:00`)
        .lte('moved_at', `${dateTo}T23:59:59`)
        .order('moved_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Movement[];
    },
    enabled: !!currentStore?.id && showReport,
  });

  // All movements BEFORE the period (for initial balance)
  const { data: priorMovements = [], isLoading: loadingPrior } = useQuery({
    queryKey: ['balance_prior', currentStore?.id, dateFrom],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const dayBefore = format(subDays(new Date(dateFrom), 0), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          item_id,
          action,
          qty
        `)
        .eq('store_id', currentStore.id)
        .lt('moved_at', `${dayBefore}T00:00:00`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStore?.id && showReport,
  });

  const isLoading = loadingPeriod || loadingPrior;

  // ── Initial balance per item ─────────────────────────────────────────────

  const initialBalances = useMemo(() => {
    const map = new Map<string, number>();
    priorMovements.forEach((m: any) => {
      const current = map.get(m.item_id) || 0;
      if (m.action === 'entry') {
        map.set(m.item_id, current + Number(m.qty));
      } else if (m.action === 'exit') {
        map.set(m.item_id, current - Number(m.qty));
      }
    });
    return map;
  }, [priorMovements]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatQty = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(2);

  const getClassificationLabel = (c: string) => {
    const map: Record<string, string> = {
      purchase: 'Compra', sale: 'Venda', waste: 'Desperdício',
      internal: 'Consumo Interno', initial: 'Saldo Inicial',
      production: 'Produção', adjustment: 'Ajuste', consumption: 'Consumo',
    };
    return map[c?.toLowerCase()] || c || '—';
  };

  // ── ANALYTICAL DATA (by Product) ─────────────────────────────────────────

  const analyticalByProduct = useMemo(() => {
    if (!showReport) return [];
    // Group movements by item_id, compute running balance
    const itemMap = new Map<string, any[]>();
    periodMovements.forEach(m => {
      const itemId = m.item_id;
      if (!itemMap.has(itemId)) itemMap.set(itemId, []);
      itemMap.get(itemId)!.push(m);
    });

    const result: any[] = [];
    // Get all unique items from both period and prior
    const allItemIds = new Set([...itemMap.keys(), ...initialBalances.keys()]);

    allItemIds.forEach(itemId => {
      const moves = itemMap.get(itemId) || [];
      let balance = initialBalances.get(itemId) || 0;
      const firstMove = moves[0];
      const itemName = firstMove?.inventory_items?.name || 'Item Removido';
      const itemUnit = firstMove?.inventory_items?.unit || 'un';
      const category = firstMove?.inventory_items?.inventory_categories?.name || 'Geral';
      const supplier = firstMove?.inventory_items?.inventory_suppliers?.name || '—';

      moves.forEach(m => {
        const entry = m.action === 'entry' ? Number(m.qty) : 0;
        const exit = m.action === 'exit' ? Number(m.qty) : 0;
        balance += entry - exit;
        result.push({
          date: m.moved_at,
          itemId,
          itemName,
          itemUnit,
          category,
          supplier,
          classification: m.classification,
          entry,
          exit,
          balance,
          totalValue: Number(m.total_value) || 0,
        });
      });
    });

    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return result;
  }, [periodMovements, initialBalances, showReport]);

  // ── SYNTHETIC DATA (by Product) ──────────────────────────────────────────

  const syntheticByProduct = useMemo(() => {
    if (!showReport) return [];
    const map = new Map<string, any>();

    // Initialize with initial balances
    initialBalances.forEach((balance, itemId) => {
      if (!map.has(itemId)) {
        map.set(itemId, {
          itemId,
          itemName: 'Item Removido',
          itemUnit: 'un',
          category: 'Geral',
          supplier: '—',
          initialBalance: balance,
          totalEntry: 0,
          totalExit: 0,
        });
      }
    });

    periodMovements.forEach(m => {
      const itemId = m.item_id;
      if (!map.has(itemId)) {
        map.set(itemId, {
          itemId,
          itemName: m.inventory_items?.name || 'Item Removido',
          itemUnit: m.inventory_items?.unit || 'un',
          category: m.inventory_items?.inventory_categories?.name || 'Geral',
          supplier: m.inventory_items?.inventory_suppliers?.name || '—',
          initialBalance: initialBalances.get(itemId) || 0,
          totalEntry: 0,
          totalExit: 0,
        });
      }
      const g = map.get(itemId);
      g.itemName = m.inventory_items?.name || g.itemName;
      g.itemUnit = m.inventory_items?.unit || g.itemUnit;
      g.category = m.inventory_items?.inventory_categories?.name || g.category;
      g.supplier = m.inventory_items?.inventory_suppliers?.name || g.supplier;
      if (m.action === 'entry') g.totalEntry += Number(m.qty);
      if (m.action === 'exit') g.totalExit += Number(m.qty);
    });

    return Array.from(map.values())
      .map(g => ({ ...g, finalBalance: g.initialBalance + g.totalEntry - g.totalExit }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [periodMovements, initialBalances, showReport]);

  // ── GROUPED BY SUPPLIER ──────────────────────────────────────────────────

  const analyticalBySupplier = useMemo(() => {
    if (!showReport || groupBy !== 'supplier') return new Map<string, any[]>();
    const grouped = new Map<string, any[]>();
    const balanceTracker = new Map<string, number>();

    // Init balances
    initialBalances.forEach((bal, itemId) => balanceTracker.set(itemId, bal));

    const sorted = [...periodMovements].sort((a, b) =>
      new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()
    );

    sorted.forEach(m => {
      const supplier = m.inventory_items?.inventory_suppliers?.name || 'Sem Fornecedor';
      if (!grouped.has(supplier)) grouped.set(supplier, []);

      let balance = balanceTracker.get(m.item_id) || 0;
      const entry = m.action === 'entry' ? Number(m.qty) : 0;
      const exit = m.action === 'exit' ? Number(m.qty) : 0;
      balance += entry - exit;
      balanceTracker.set(m.item_id, balance);

      grouped.get(supplier)!.push({
        date: m.moved_at,
        itemName: m.inventory_items?.name || 'Item Removido',
        itemUnit: m.inventory_items?.unit || 'un',
        supplier,
        entry,
        exit,
        balance,
        totalValue: Number(m.total_value) || 0,
      });
    });
    return grouped;
  }, [periodMovements, initialBalances, showReport, groupBy]);

  const syntheticBySupplier = useMemo(() => {
    if (!showReport || groupBy !== 'supplier') return [];
    const map = new Map<string, any>();
    periodMovements.forEach(m => {
      const supplier = m.inventory_items?.inventory_suppliers?.name || 'Sem Fornecedor';
      if (!map.has(supplier)) {
        map.set(supplier, { supplier, productCount: new Set(), totalEntry: 0, totalExit: 0, totalEntryVal: 0, totalExitVal: 0 });
      }
      const g = map.get(supplier);
      g.productCount.add(m.item_id);
      const qty = Number(m.qty) || 0;
      const val = Number(m.total_value) || 0;
      if (m.action === 'entry') {
        g.totalEntry += qty;
        g.totalEntryVal += val;
      }
      if (m.action === 'exit') {
        g.totalExit += qty;
        g.totalExitVal += val;
      }
    });
    return Array.from(map.values())
      .map(g => ({
        ...g,
        productCount: g.productCount.size,
        saldo: g.totalEntry - g.totalExit,
        saldoVal: g.totalEntryVal - g.totalExitVal
      }))
      .sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [periodMovements, showReport, groupBy]);

  // ── GROUPED BY CATEGORY ──────────────────────────────────────────────────

  const analyticalByCategory = useMemo(() => {
    if (!showReport || groupBy !== 'category') return new Map<string, any[]>();
    const grouped = new Map<string, any[]>();
    const balanceTracker = new Map<string, number>();

    initialBalances.forEach((bal, itemId) => balanceTracker.set(itemId, bal));

    const sorted = [...periodMovements].sort((a, b) =>
      new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()
    );

    sorted.forEach(m => {
      const category = m.inventory_items?.inventory_categories?.name || 'Sem Categoria';
      if (!grouped.has(category)) grouped.set(category, []);

      let balance = balanceTracker.get(m.item_id) || 0;
      const entry = m.action === 'entry' ? Number(m.qty) : 0;
      const exit = m.action === 'exit' ? Number(m.qty) : 0;
      balance += entry - exit;
      balanceTracker.set(m.item_id, balance);

      grouped.get(category)!.push({
        date: m.moved_at,
        itemName: m.inventory_items?.name || 'Item Removido',
        itemUnit: m.inventory_items?.unit || 'un',
        category,
        entry,
        exit,
        balance,
        totalValue: Number(m.total_value) || 0,
      });
    });
    return grouped;
  }, [periodMovements, initialBalances, showReport, groupBy]);

  const syntheticByCategory = useMemo(() => {
    if (!showReport || groupBy !== 'category') return [];
    const map = new Map<string, any>();
    periodMovements.forEach(m => {
      const category = m.inventory_items?.inventory_categories?.name || 'Sem Categoria';
      if (!map.has(category)) {
        map.set(category, { category, productCount: new Set(), totalEntry: 0, totalExit: 0, totalEntryVal: 0, totalExitVal: 0 });
      }
      const g = map.get(category);
      g.productCount.add(m.item_id);
      const qty = Number(m.qty) || 0;
      const val = Number(m.total_value) || 0;
      if (m.action === 'entry') {
        g.totalEntry += qty;
        g.totalEntryVal += val;
      }
      if (m.action === 'exit') {
        g.totalExit += qty;
        g.totalExitVal += val;
      }
    });
    return Array.from(map.values())
      .map(g => ({
        ...g,
        productCount: g.productCount.size,
        saldo: g.totalEntry - g.totalExit,
        saldoVal: g.totalEntryVal - g.totalExitVal
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [periodMovements, showReport, groupBy]);

  // ── Totals ───────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let totalEntry = 0, totalExit = 0;
    let totalEntryVal = 0, totalExitVal = 0;
    periodMovements.forEach(m => {
      const qty = Number(m.qty) || 0;
      const val = Number(m.total_value) || 0;
      if (m.action === 'entry') {
        totalEntry += qty;
        totalEntryVal += val;
      }
      if (m.action === 'exit') {
        totalExit += qty;
        totalExitVal += val;
      }
    });
    return {
      totalEntry,
      totalExit,
      net: totalEntry - totalExit,
      totalEntryVal,
      totalExitVal,
      netVal: totalEntryVal - totalExitVal
    };
  }, [periodMovements]);

  // ── Handle Generate ──────────────────────────────────────────────────────

  const handleGenerate = () => {
    setIsGenerating(true);
    setShowReport(true);
    setTimeout(() => setIsGenerating(false), 300);
  };

  // ── PDF Export ────────────────────────────────────────────────────────────

  const handleExportPDF = async () => {
    if (periodMovements.length === 0 && initialBalances.size === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [141, 66, 221];
      const green: [number, number, number] = [34, 197, 94];
      const red: [number, number, number] = [239, 68, 68];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = await addPdfBranding(doc, currentStore?.name || 'Loja');

      // Title
      const groupLabel = groupBy === 'product' ? 'por Produto' : groupBy === 'supplier' ? 'por Fornecedor' : 'por Categoria';
      const typeLabel = reportType === 'analytical' ? 'Analítico' : 'Sintético';
      const title = `Balanço de Estoque — ${groupLabel} (${typeLabel})`;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(title, 14, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      const dateFromFmt = format(new Date(dateFrom + 'T12:00:00'), 'dd/MM/yyyy');
      const dateToFmt = format(new Date(dateTo + 'T12:00:00'), 'dd/MM/yyyy');
      doc.text(`Período: ${dateFromFmt} a ${dateToFmt}`, 14, y);
      doc.text(`Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, y, { align: 'right' });
      y += 4;

      if (user?.email) {
        doc.text(`Usuário: ${user.email}`, 14, y);
        y += 6;
      } else {
        y += 2;
      }

      // Summary boxes
      const boxW = (pageWidth - 28 - 8) / 3;
      const summaryBoxes = [
        { label: 'TOTAL ENTRADAS', value: formatCurrency(totals.totalEntryVal), color: green },
        { label: 'TOTAL SAÍDAS', value: formatCurrency(totals.totalExitVal), color: red },
        { label: 'SALDO LÍQUIDO', value: formatCurrency(totals.netVal), color: totals.netVal >= 0 ? brandColor : red },
      ];
      summaryBoxes.forEach((box, i) => {
        const x = 14 + i * (boxW + 4);
        doc.setFillColor(...box.color);
        doc.roundedRect(x, y, boxW, 16, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(box.value, x + boxW / 2, y + 7, { align: 'center' });
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(box.label, x + boxW / 2, y + 13, { align: 'center' });
      });
      y += 24;

      // ── TABLE CONTENT ──────────────────────────────────────────────────

      if (groupBy === 'product') {
        if (reportType === 'analytical') {
          autoTable(doc, {
            startY: y,
            head: [['Data', 'Produto', 'Tipo', 'Entrada', 'Saída', 'Valor', 'Saldo']],
            body: analyticalByProduct.map(r => [
              format(new Date(r.date), 'dd/MM/yy HH:mm'),
              r.itemName,
              getClassificationLabel(r.classification),
              r.entry > 0 ? formatQty(r.entry) : '—',
              r.exit > 0 ? formatQty(r.exit) : '—',
              r.totalValue > 0 ? formatCurrency(r.totalValue) : '—',
              formatQty(r.balance),
            ]),
            theme: 'striped',
            headStyles: { fillColor: brandColor, fontSize: 8 },
            bodyStyles: { fontSize: 7.5 },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: (data) => {
              if (data.section !== 'body') return;
              if (data.column.index === 3 && data.cell.raw !== '—') data.cell.styles.textColor = green;
              if (data.column.index === 4 && data.cell.raw !== '—') data.cell.styles.textColor = red;
              if (data.column.index === 5 && data.cell.raw !== '—') {
                const row = analyticalByProduct[data.row.index];
                data.cell.styles.textColor = row.entry > 0 ? green : red;
              }
            },
            margin: { left: 14, right: 14 },
          });
        } else {
          autoTable(doc, {
            startY: y,
            head: [['Produto', 'Unidade', 'Saldo Inicial', 'Entradas', 'Saídas', 'Saldo Final']],
            body: syntheticByProduct.map(r => [
              r.itemName,
              r.itemUnit,
              formatQty(r.initialBalance),
              formatQty(r.totalEntry),
              formatQty(r.totalExit),
              formatQty(r.finalBalance),
            ]),
            theme: 'striped',
            headStyles: { fillColor: brandColor, fontSize: 8 },
            bodyStyles: { fontSize: 7.5 },
            columnStyles: {
              2: { halign: 'right' },
              3: { halign: 'right', textColor: green },
              4: { halign: 'right', textColor: red },
              5: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
          });
        }
      } else if (groupBy === 'supplier') {
        if (reportType === 'analytical') {
          const entries = Array.from(analyticalBySupplier.entries());
          entries.forEach(([supplier, rows]) => {
            if (y > pageHeight - 40) { doc.addPage(); y = 20; }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text(`Fornecedor: ${supplier}`, 14, y);
            y += 2;

            const subtotalEntry = rows.reduce((a: number, r: any) => a + r.entry, 0);
            const subtotalExit = rows.reduce((a: number, r: any) => a + r.exit, 0);
            const subtotalEntryVal = rows.reduce((a: number, r: any) => a + (r.entry > 0 ? r.totalValue : 0), 0);
            const subtotalBalance = subtotalEntry - subtotalExit;

            autoTable(doc, {
              startY: y,
              head: [['Data', 'Produto', 'Entrada', 'Saída', 'Valor', 'Saldo']],
              body: rows.map((r: any) => [
                format(new Date(r.date), 'dd/MM/yy HH:mm'),
                r.itemName,
                r.entry > 0 ? formatQty(r.entry) : '—',
                r.exit > 0 ? formatQty(r.exit) : '—',
                r.totalValue > 0 ? formatCurrency(r.totalValue) : '—',
                formatQty(r.balance),
              ]),
              foot: [['Total', '', `+${formatQty(subtotalEntry)}`, `-${formatQty(subtotalExit)}`, formatCurrency(subtotalEntryVal), formatQty(subtotalBalance)]],
              theme: 'striped',
              headStyles: { fillColor: brandColor, fontSize: 8 },
              footStyles: { fillColor: [245, 245, 250], textColor: [40, 40, 40], fontSize: 8, fontStyle: 'bold' },
              bodyStyles: { fontSize: 7.5 },
              columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
              didParseCell: (data) => {
                if (data.section !== 'body') return;
                if (data.column.index === 2 && data.cell.raw !== '—') data.cell.styles.textColor = green;
                if (data.column.index === 3 && data.cell.raw !== '—') data.cell.styles.textColor = red;
                if (data.column.index === 4 && data.cell.raw !== '—') {
                  const row = rows[data.row.index];
                  data.cell.styles.textColor = row.entry > 0 ? green : red;
                }
              },
              margin: { left: 14, right: 14 },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
          });
        } else {
          autoTable(doc, {
            startY: y,
            head: [['Fornecedor', 'Qtd Prod.', 'Entradas (Qtd)', 'Saídas (Qtd)', 'Total Compras (R$)', 'Saldo Final']],
            body: syntheticBySupplier.map(r => [
              r.supplier,
              String(r.productCount),
              formatQty(r.totalEntry),
              formatQty(r.totalExit),
              formatCurrency(r.totalEntryVal || 0),
              formatQty(r.saldo),
            ]),
            theme: 'striped',
            headStyles: { fillColor: brandColor, fontSize: 8 },
            bodyStyles: { fontSize: 7.5 },
            columnStyles: {
              1: { halign: 'center' },
              2: { halign: 'right', textColor: green },
              3: { halign: 'right', textColor: red },
              4: { halign: 'right', textColor: green, fontStyle: 'bold' },
              5: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
          });
        }
      } else {
        // category
        if (reportType === 'analytical') {
          const entries = Array.from(analyticalByCategory.entries());
          entries.forEach(([category, rows]) => {
            if (y > pageHeight - 40) { doc.addPage(); y = 20; }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text(`Categoria: ${category}`, 14, y);
            y += 2;

            const subtotalEntry = rows.reduce((a: number, r: any) => a + r.entry, 0);
            const subtotalExit = rows.reduce((a: number, r: any) => a + r.exit, 0);
            const subtotalEntryVal = rows.reduce((a: number, r: any) => a + (r.entry > 0 ? r.totalValue : 0), 0);
            const subtotalBalance = subtotalEntry - subtotalExit;

            autoTable(doc, {
              startY: y,
              head: [['Data', 'Produto', 'Entrada', 'Saída', 'Valor', 'Saldo']],
              body: rows.map((r: any) => [
                format(new Date(r.date), 'dd/MM/yy HH:mm'),
                r.itemName,
                r.entry > 0 ? formatQty(r.entry) : '—',
                r.exit > 0 ? formatQty(r.exit) : '—',
                r.totalValue > 0 ? formatCurrency(r.totalValue) : '—',
                formatQty(r.balance),
              ]),
              foot: [['Total', '', `+${formatQty(subtotalEntry)}`, `-${formatQty(subtotalExit)}`, formatCurrency(subtotalEntryVal), formatQty(subtotalBalance)]],
              theme: 'striped',
              headStyles: { fillColor: brandColor, fontSize: 8 },
              footStyles: { fillColor: [245, 245, 250], textColor: [40, 40, 40], fontSize: 8, fontStyle: 'bold' },
              bodyStyles: { fontSize: 7.5 },
              columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
              didParseCell: (data) => {
                if (data.section !== 'body') return;
                if (data.column.index === 2 && data.cell.raw !== '—') data.cell.styles.textColor = green;
                if (data.column.index === 3 && data.cell.raw !== '—') data.cell.styles.textColor = red;
                if (data.column.index === 4 && data.cell.raw !== '—') {
                  const row = rows[data.row.index];
                  data.cell.styles.textColor = row.entry > 0 ? green : red;
                }
              },
              margin: { left: 14, right: 14 },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
          });
        } else {
          autoTable(doc, {
            startY: y,
            head: [['Categoria', 'Qtd Prod.', 'Entradas (Qtd)', 'Saídas (Qtd)', 'Total Compras (R$)', 'Saldo Final']],
            body: syntheticByCategory.map(r => [
              r.category,
              String(r.productCount),
              formatQty(r.totalEntry),
              formatQty(r.totalExit),
              formatCurrency(r.totalEntryVal || 0),
              formatQty(r.saldo),
            ]),
            theme: 'striped',
            headStyles: { fillColor: brandColor, fontSize: 8 },
            bodyStyles: { fontSize: 7.5 },
            columnStyles: {
              1: { halign: 'center' },
              2: { halign: 'right', textColor: green },
              3: { halign: 'right', textColor: red },
              4: { halign: 'right', textColor: green, fontStyle: 'bold' },
              5: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
          });
        }
      }

      // Footer
      const total = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(160, 160, 160);
        doc.text(`Balanço de Estoque · ${dateFromFmt} a ${dateToFmt} · ${currentStore?.name || ''}`, 14, pageHeight - 8);
        doc.text(`Pág. ${i} / ${total}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`balanco_estoque_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    }
  };

  // ── Print (open PDF in new tab) ──────────────────────────────────────────

  const handlePrint = async () => {
    if (periodMovements.length === 0 && initialBalances.size === 0) {
      toast.error('Gere o relatório antes de imprimir');
      return;
    }
    // Generate the same PDF but open instead of download
    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [141, 66, 221];
      const green: [number, number, number] = [34, 197, 94];
      const red: [number, number, number] = [239, 68, 68];

      let y = await addPdfBranding(doc, currentStore?.name || 'Loja');

      const groupLabel = groupBy === 'product' ? 'por Produto' : groupBy === 'supplier' ? 'por Fornecedor' : 'por Categoria';
      const typeLabel = reportType === 'analytical' ? 'Analítico' : 'Sintético';

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`Balanço de Estoque — ${groupLabel} (${typeLabel})`, 14, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`Período: ${format(new Date(dateFrom + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(dateTo + 'T12:00:00'), 'dd/MM/yyyy')}`, 14, y);
      y += 8;

      // Simplified table for print
      if (groupBy === 'product' && reportType === 'synthetic') {
        autoTable(doc, {
          startY: y,
          head: [['Produto', 'Un.', 'Saldo Inicial', 'Entradas', 'Saídas', 'Saldo Final']],
          body: syntheticByProduct.map(r => [
            r.itemName, r.itemUnit,
            formatQty(r.initialBalance), formatQty(r.totalEntry),
            formatQty(r.totalExit), formatQty(r.finalBalance),
          ]),
          theme: 'striped',
          headStyles: { fillColor: brandColor, fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          margin: { left: 14, right: 14 },
        });
      } else if (groupBy === 'product' && reportType === 'analytical') {
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Produto', 'Tipo', 'Entrada', 'Saída', 'Valor', 'Saldo']],
          body: analyticalByProduct.map(r => [
            format(new Date(r.date), 'dd/MM/yy HH:mm'), r.itemName,
            getClassificationLabel(r.classification),
            r.entry > 0 ? formatQty(r.entry) : '—',
            r.exit > 0 ? formatQty(r.exit) : '—',
            r.totalValue > 0 ? formatCurrency(r.totalValue) : '—',
            formatQty(r.balance),
          ]),
          theme: 'striped',
          headStyles: { fillColor: brandColor, fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          margin: { left: 14, right: 14 },
        });
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error('Erro ao imprimir');
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button
        onClick={() => navigate('/admin/stock/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Estoque & Operações</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <Scale size={36} className="text-primary" />
            Balanço de Estoque
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe a evolução do estoque com saldo acumulado e relatórios detalhados
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Parâmetros do Relatório</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Date Range */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
              <Calendar size={12} /> Período
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setShowReport(false); }}
                className="glass-card border-none bg-muted/30 w-full"
              />
              <span className="text-muted-foreground text-sm shrink-0">até</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setShowReport(false); }}
                className="glass-card border-none bg-muted/30 w-full"
              />
            </div>
          </div>

          {/* Grouping */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
              <Tags size={12} /> Agrupamento
            </label>
            <Select value={groupBy} onValueChange={(v) => { setGroupBy(v as GroupBy); setShowReport(false); }}>
              <SelectTrigger className="glass-card border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product"><span className="flex items-center gap-2"><Package size={14} /> Produto</span></SelectItem>
                <SelectItem value="supplier"><span className="flex items-center gap-2"><Building2 size={14} /> Fornecedor</span></SelectItem>
                <SelectItem value="category"><span className="flex items-center gap-2"><Tags size={14} /> Categoria</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
              <FileText size={12} /> Tipo de Relatório
            </label>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              <button
                onClick={() => { setReportType('analytical'); setShowReport(false); }}
                className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  reportType === 'analytical' ? 'bg-white shadow-sm text-primary dark:bg-[#1A1A24]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Analítico
              </button>
              <button
                onClick={() => { setReportType('synthetic'); setShowReport(false); }}
                className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  reportType === 'synthetic' ? 'bg-white shadow-sm text-primary dark:bg-[#1A1A24]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Sintético
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Ações</label>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isLoading}
                className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2 w-full"
              >
                {(isGenerating || isLoading) ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                Gerar Relatório
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportPDF} disabled={!showReport} className="flex-1 glass-card gap-2 text-primary border-primary/20">
                  <Download size={14} /> PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} disabled={!showReport} className="flex-1 glass-card gap-2">
                  <Printer size={14} /> Imprimir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {showReport && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-500">
          <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-green-500">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Entradas</p>
              <p className="text-xl font-black text-green-600">{formatCurrency(totals.totalEntryVal)}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{formatQty(totals.totalEntry)} unidades</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-red-500">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 shrink-0">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Saídas</p>
              <p className="text-xl font-black text-red-600">{formatCurrency(totals.totalExitVal)}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{formatQty(totals.totalExit)} unidades</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-primary">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saldo Líquido</p>
              <p className={cn("text-xl font-black", totals.netVal >= 0 ? 'text-primary' : 'text-red-600')}>
                {formatCurrency(totals.netVal)}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold">{formatQty(totals.net)} unidades</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Table */}
      {showReport && (
        <div className="glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
          {isLoading ? (
            <div className="p-20 text-center animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Calculando balanço...</p>
            </div>
          ) : periodMovements.length === 0 ? (
            <div className="py-20 text-center">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold">Nenhuma movimentação no período</h3>
              <p className="text-muted-foreground mt-2">Ajuste as datas e tente novamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ── Product - Analytical ──────────────────────────────────── */}
              {groupBy === 'product' && reportType === 'analytical' && (
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Data</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Produto</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Tipo</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Entrada</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saída</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Valor</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticalByProduct.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold">{format(new Date(r.date), 'dd/MM/yy')}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(r.date), 'HH:mm')}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              <Package size={14} />
                            </div>
                            <div>
                              <p className="font-bold text-sm tracking-tight">{r.itemName}</p>
                              <span className="text-[9px] font-medium uppercase opacity-50">{r.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter bg-muted">
                            {getClassificationLabel(r.classification)}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          {r.entry > 0 ? (
                            <span className="font-black text-sm text-green-600">+{formatQty(r.entry)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {r.exit > 0 ? (
                            <span className="font-black text-sm text-red-600">-{formatQty(r.exit)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {r.totalValue > 0 ? (
                            <span className={cn("font-black text-sm", r.entry > 0 ? "text-green-600" : "text-red-600")}>
                              {r.entry > 0 ? '+' : '-'}{formatCurrency(r.totalValue)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className={cn("font-black text-sm", r.balance >= 0 ? "text-primary" : "text-red-600")}>
                            {formatQty(r.balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── Product - Synthetic ───────────────────────────────────── */}
              {groupBy === 'product' && reportType === 'synthetic' && (
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Produto</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Unidade</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo Inicial</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Entradas</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saídas</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syntheticByProduct.map((r) => (
                      <tr key={r.itemId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              <Package size={14} />
                            </div>
                            <div>
                              <p className="font-bold text-sm tracking-tight">{r.itemName}</p>
                              <span className="text-[9px] font-medium uppercase opacity-50">{r.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground uppercase">{r.itemUnit}</td>
                        <td className="p-4 text-right font-bold text-sm">{formatQty(r.initialBalance)}</td>
                        <td className="p-4 text-right font-black text-sm text-green-600">{r.totalEntry > 0 ? `+${formatQty(r.totalEntry)}` : '0'}</td>
                        <td className="p-4 text-right font-black text-sm text-red-600">{r.totalExit > 0 ? `-${formatQty(r.totalExit)}` : '0'}</td>
                        <td className="p-4 text-right">
                          <span className={cn("font-black text-sm", r.finalBalance >= 0 ? "text-primary" : "text-red-600")}>
                            {formatQty(r.finalBalance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── Supplier - Analytical ─────────────────────────────────── */}
              {groupBy === 'supplier' && reportType === 'analytical' && (
                <div className="divide-y">
                  {Array.from(analyticalBySupplier.entries()).map(([supplier, rows]) => {
                    const subtotalEntry = rows.reduce((a: number, r: any) => a + r.entry, 0);
                    const subtotalExit = rows.reduce((a: number, r: any) => a + r.exit, 0);
                    return (
                      <div key={supplier}>
                        <div className="bg-muted/30 px-6 py-3 border-b flex items-center gap-2">
                          <Building2 size={14} className="text-primary" />
                          <span className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{supplier}</span>
                          <Badge variant="outline" className="ml-auto text-[10px] font-bold">{rows.length} mov.</Badge>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-muted/20 border-b">
                            <tr>
                              <th className="p-3 pl-6 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Data</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Produto</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Entrada</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Saída</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Valor</th>
                              <th className="p-3 pr-6 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r: any, i: number) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="p-3 pl-6 text-center text-sm font-bold">{format(new Date(r.date), 'dd/MM/yy')}</td>
                                <td className="p-3 font-medium text-sm">{r.itemName}</td>
                                <td className="p-3 text-right">{r.entry > 0 ? <span className="font-bold text-green-600">+{formatQty(r.entry)}</span> : <span className="text-muted-foreground">—</span>}</td>
                                <td className="p-3 text-right">{r.exit > 0 ? <span className="font-bold text-red-600">-{formatQty(r.exit)}</span> : <span className="text-muted-foreground">—</span>}</td>
                                <td className="p-3 text-right">
                                  {r.totalValue > 0 ? (
                                    <span className={cn("font-bold text-sm", r.entry > 0 ? "text-green-600" : "text-red-600")}>
                                      {r.entry > 0 ? '+' : '-'}{formatCurrency(r.totalValue)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="p-3 pr-6 text-right font-black text-sm">{formatQty(r.balance)}</td>
                              </tr>
                            ))}
                            {(() => {
                              const subtotalEntryVal = rows.reduce((a: number, r: any) => a + (r.entry > 0 ? r.totalValue : 0), 0);
                              return (
                                <tr className="bg-muted/40 font-bold text-sm">
                                  <td colSpan={2} className="p-3 pl-6 uppercase tracking-widest text-[10px] text-muted-foreground">Total Compras {supplier}</td>
                                  <td className="p-3 text-right text-green-600">+{formatQty(subtotalEntry)}</td>
                                  <td className="p-3 text-right text-red-600">-{formatQty(subtotalExit)}</td>
                                  <td className="p-3 text-right text-green-600 font-bold">+{formatCurrency(subtotalEntryVal)}</td>
                                  <td className="p-3 pr-6 text-right font-black text-primary">{formatQty(subtotalEntry - subtotalExit)}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Supplier - Synthetic ──────────────────────────────────── */}
              {groupBy === 'supplier' && reportType === 'synthetic' && (
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Fornecedor</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Qtd Produtos</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Entradas (Qtd)</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saídas (Qtd)</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Total Compras (R$)</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo Final (Qtd)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syntheticBySupplier.map((r) => (
                      <tr key={r.supplier} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              <Building2 size={14} />
                            </div>
                            <p className="font-bold text-sm tracking-tight">{r.supplier}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-sm">{r.productCount}</td>
                        <td className="p-4 text-right font-black text-sm text-green-600">+{formatQty(r.totalEntry)}</td>
                        <td className="p-4 text-right font-black text-sm text-red-600">-{formatQty(r.totalExit)}</td>
                        <td className="p-4 text-right font-black text-sm text-green-600">{formatCurrency(r.totalEntryVal || 0)}</td>
                        <td className="p-4 text-right">
                          <span className={cn("font-black text-sm", r.saldo >= 0 ? "text-primary" : "text-red-600")}>
                            {formatQty(r.saldo)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── Category - Analytical ─────────────────────────────────── */}
              {groupBy === 'category' && reportType === 'analytical' && (
                <div className="divide-y">
                  {Array.from(analyticalByCategory.entries()).map(([category, rows]) => {
                    const subtotalEntry = rows.reduce((a: number, r: any) => a + r.entry, 0);
                    const subtotalExit = rows.reduce((a: number, r: any) => a + r.exit, 0);
                    return (
                      <div key={category}>
                        <div className="bg-muted/30 px-6 py-3 border-b flex items-center gap-2">
                          <Tags size={14} className="text-primary" />
                          <span className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{category}</span>
                          <Badge variant="outline" className="ml-auto text-[10px] font-bold">{rows.length} mov.</Badge>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-muted/20 border-b">
                            <tr>
                              <th className="p-3 pl-6 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Data</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Produto</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Entrada</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Saída</th>
                              <th className="p-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Valor</th>
                              <th className="p-3 pr-6 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r: any, i: number) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="p-3 pl-6 text-center text-sm font-bold">{format(new Date(r.date), 'dd/MM/yy')}</td>
                                <td className="p-3 font-medium text-sm">{r.itemName}</td>
                                <td className="p-3 text-right">{r.entry > 0 ? <span className="font-bold text-green-600">+{formatQty(r.entry)}</span> : <span className="text-muted-foreground">—</span>}</td>
                                <td className="p-3 text-right">{r.exit > 0 ? <span className="font-bold text-red-600">-{formatQty(r.exit)}</span> : <span className="text-muted-foreground">—</span>}</td>
                                <td className="p-3 text-right">
                                  {r.totalValue > 0 ? (
                                    <span className={cn("font-bold text-sm", r.entry > 0 ? "text-green-600" : "text-red-600")}>
                                      {r.entry > 0 ? '+' : '-'}{formatCurrency(r.totalValue)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="p-3 pr-6 text-right font-black text-sm">{formatQty(r.balance)}</td>
                              </tr>
                            ))}
                            {(() => {
                              const subtotalEntryVal = rows.reduce((a: number, r: any) => a + (r.entry > 0 ? r.totalValue : 0), 0);
                              return (
                                <tr className="bg-muted/40 font-bold text-sm">
                                  <td colSpan={2} className="p-3 pl-6 uppercase tracking-widest text-[10px] text-muted-foreground">Total Compras {category}</td>
                                  <td className="p-3 text-right text-green-600">+{formatQty(subtotalEntry)}</td>
                                  <td className="p-3 text-right text-red-600">-{formatQty(subtotalExit)}</td>
                                  <td className="p-3 text-right text-green-600 font-bold">+{formatCurrency(subtotalEntryVal)}</td>
                                  <td className="p-3 pr-6 text-right font-black text-primary">{formatQty(subtotalEntry - subtotalExit)}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Category - Synthetic ──────────────────────────────────── */}
              {groupBy === 'category' && reportType === 'synthetic' && (
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Categoria</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Qtd Produtos</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Entradas (Qtd)</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saídas (Qtd)</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Total Compras (R$)</th>
                      <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo Final (Qtd)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syntheticByCategory.map((r) => (
                      <tr key={r.category} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              <Tags size={14} />
                            </div>
                            <p className="font-bold text-sm tracking-tight">{r.category}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-sm">{r.productCount}</td>
                        <td className="p-4 text-right font-black text-sm text-green-600">+{formatQty(r.totalEntry)}</td>
                        <td className="p-4 text-right font-black text-sm text-red-600">-{formatQty(r.totalExit)}</td>
                        <td className="p-4 text-right font-black text-sm text-green-600">{formatCurrency(r.totalEntryVal || 0)}</td>
                        <td className="p-4 text-right">
                          <span className={cn("font-black text-sm", r.saldo >= 0 ? "text-primary" : "text-red-600")}>
                            {formatQty(r.saldo)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
