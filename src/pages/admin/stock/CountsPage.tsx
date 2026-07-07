'use client';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClipboardCheck, Save, RotateCcw, TriangleAlert, Search,
  CheckCircle2, Loader2, ArrowLeft, FileText, TrendingUp,
  TrendingDown, Download, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PendingAdjustment = {
  id: string;
  name: string;
  unit: string;
  systemQty: number;
  countedQty: number;
  diff: number;
  avgPrice: number;
};

type AuditRecord = {
  id: string;
  created_at: string;
  items_counted: number;
  items_with_diff: number;
  items_surplus: number;
  items_shortage: number;
  adjustments_applied: boolean;
  pdf_url: string | null;
};

export default function StockCountsPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingAdjustment[]>([]);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ── Inventory items ────────────────────────────────────────────────────────
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory_audit', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, inventory_categories(name, color)')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentStore?.id,
  });

  // ── Audit history ──────────────────────────────────────────────────────────
  const { data: auditHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['inventory_audits', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data } = await (supabase as any)
        .from('inventory_audits')
        .select('*')
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data || []) as AuditRecord[];
    },
    enabled: !!currentStore?.id,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const filteredItems = items.filter(i =>
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountChange = (id: string, value: string) => {
    const num = parseFloat(value);
    setCounts(prev => ({ ...prev, [id]: num }));
  };

  // ── Print blank list ───────────────────────────────────────────────────────
  const handlePrintList = () => {
    if (items.length === 0) { toast.error('Não há itens para imprimir'); return; }
    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [141, 66, 221];
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista para Contagem Física', 14, 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${currentStore?.name || 'Loja'}`, pageWidth - 14, 11, { align: 'right' });
      doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 17, { align: 'right' });

      const grouped = items.reduce((acc, item) => {
        const cat = item.inventory_categories?.name || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {} as Record<string, typeof items>);

      let y = 35;
      Object.entries(grouped).forEach(([category, catItems]) => {
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(category.toUpperCase(), 18, y + 6);
        autoTable(doc, {
          startY: y + 10,
          head: [['Item', 'No Sistema', 'Contagem Real']],
          body: catItems.map(i => [i.name, `${i.current_qty} ${i.unit}`, '']),
          theme: 'grid',
          headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
          bodyStyles: { fontSize: 9 },
          styles: { cellPadding: 4 },
          columnStyles: { 2: { cellWidth: 50 } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        if (y > 260) { doc.addPage(); y = 20; }
      });
      doc.save(`folha_contagem_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Lista gerada!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  // ── Build audit PDF (returns Blob + triggers download) ─────────────────────
  const buildAuditPDF = (adjustments: PendingAdjustment[]): Blob => {
    const doc = new jsPDF();
    const brandColor: [number, number, number] = [141, 66, 221];
    const green: [number, number, number] = [34, 197, 94];
    const red: [number, number, number] = [239, 68, 68];
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(...brandColor);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Auditoria de Estoque', 14, 17);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(currentStore?.name || 'Loja', pageWidth - 14, 12, { align: 'right' });
    doc.text(`Auditoria em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 20, { align: 'right' });

    // Summary boxes
    const withDiff = adjustments.filter(a => a.diff !== 0);
    const boxes: { label: string; value: string; color: [number, number, number] }[] = [
      { label: 'Itens Contados', value: String(adjustments.length), color: brandColor },
      { label: 'Movimentos Gerados', value: String(withDiff.length), color: [249, 115, 22] },
      { label: 'Entradas (+)', value: String(adjustments.filter(a => a.diff > 0).length), color: green },
      { label: 'Saídas (−)', value: String(adjustments.filter(a => a.diff < 0).length), color: red },
      { label: 'Sem Diferença', value: String(adjustments.filter(a => a.diff === 0).length), color: [100, 116, 139] },
    ];
    let y = 40;
    const boxW = (pageWidth - 28 - 8) / 5;
    boxes.forEach((box, i) => {
      const x = 14 + i * (boxW + 2);
      doc.setFillColor(...box.color);
      doc.roundedRect(x, y, boxW, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(box.value, x + boxW / 2, y + 12, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(box.label.toUpperCase(), x + boxW / 2, y + 18, { align: 'center' });
    });
    y += 28;

    // Divergences table
    if (withDiff.length > 0) {
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('MOVIMENTOS GERADOS (VENDA - BAIXA TÉCNICA)', 14, y);
      y += 4;
      
      const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      autoTable(doc, {
        startY: y,
        head: [['Item', 'Un.', 'Sistema', 'Contagem', 'Diferença', 'Valor Un.', 'Valor Total', 'Status']],
        body: withDiff.map(a => [
          a.name, a.unit,
          a.systemQty.toFixed(2), a.countedQty.toFixed(2),
          Math.abs(a.diff).toFixed(2),
          formatCurrency(a.avgPrice || 0),
          formatCurrency(Math.abs(a.diff) * (a.avgPrice || 0)),
          a.diff < 0 ? 'SAÍDA' : 'ENTRADA',
        ]),
        theme: 'striped',
        headStyles: { fillColor: brandColor, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: 3 },
        columnStyles: { 
          2: { halign: 'center' }, 
          3: { halign: 'center' }, 
          4: { halign: 'center', fontStyle: 'bold' }, 
          5: { halign: 'right' }, 
          6: { halign: 'right', fontStyle: 'bold' }, 
          7: { halign: 'center', fontStyle: 'bold' } 
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          if (data.column.index === 7) {
            data.cell.styles.textColor = data.cell.raw === 'ENTRADA' ? green : red;
          }
          if (data.column.index === 4 || data.column.index === 6) {
            const rowStatus = data.row.cells[7]?.raw;
            data.cell.styles.textColor = rowStatus === 'ENTRADA' ? green : red;
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Full updated stock list
    if (y > 210) { doc.addPage(); y = 20; }
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTOQUE ATUALIZADO APÓS AUDITORIA', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Un.', 'Valor Un.', 'Qtd. Anterior', 'Qtd. Nova', 'Variação']],
      body: items.map(item => {
        const adj = adjustments.find(a => a.id === item.id);
        const diff = adj ? adj.diff : 0;
        return [
          item.name, item.unit,
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item as any).avg_price || 0),
          item.current_qty.toFixed(2),
          adj ? adj.countedQty.toFixed(2) : '—',
          diff !== 0 ? (diff > 0 ? '+' : '') + diff.toFixed(2) : '—',
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [80, 80, 80], fontSize: 7.5 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2.5 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 5) return;
        const raw = String(data.cell.raw);
        if (raw.startsWith('+')) data.cell.styles.textColor = green;
        else if (raw.startsWith('-')) data.cell.styles.textColor = red;
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text(`Auditoria · ${format(new Date(), 'dd/MM/yyyy HH:mm')} · ${currentStore?.name || ''}`, 14, pageHeight - 8);
      doc.text(`Pág. ${i} / ${total}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    const blob = doc.output('blob');
    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_estoque_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return blob;
  };

  // ── Upload PDF & save audit record ─────────────────────────────────────────
  const saveAuditRecord = async (
    blob: Blob,
    adjustments: PendingAdjustment[],
    appliedAdjustments: boolean
  ) => {
    let pdfUrl: string | null = null;
    try {
      const fileName = `${currentStore?.id}/${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('auditorias')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: false });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('auditorias').getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
      }
    } catch {
      // Storage not configured — continue without URL
    }

    const withDiff = adjustments.filter(a => a.diff !== 0);
    await (supabase as any).from('inventory_audits').insert([{
      store_id: currentStore?.id,
      user_id: user?.id,
      items_counted: adjustments.length,
      items_with_diff: withDiff.length,
      items_surplus: adjustments.filter(a => a.diff > 0).length,
      items_shortage: adjustments.filter(a => a.diff < 0).length,
      adjustments_applied: appliedAdjustments,
      pdf_url: pdfUrl,
      audit_data: adjustments,
    }]);

    refetchHistory();
  };

  // ── Submit audit ───────────────────────────────────────────────────────────
  const handleSubmitAudit = () => {
    const built: PendingAdjustment[] = Object.entries(counts)
      .filter(([_, val]) => !isNaN(val))
      .map(([id, countedQty]) => {
        const item = items.find(i => i.id === id);
        if (!item) return null;
        return { id, name: item.name, unit: item.unit, systemQty: item.current_qty, countedQty, diff: countedQty - item.current_qty, avgPrice: (item as any).avg_price ?? 0 };
      })
      .filter(Boolean) as PendingAdjustment[];

    if (built.length === 0) { toast.error('Informe a contagem de pelo menos um item'); return; }

    const blob = buildAuditPDF(built);
    setPendingBlob(blob);
    setPendingAdjustments(built);
    setShowAdjustDialog(true);
  };

  // ── Apply adjustments ──────────────────────────────────────────────────────
  const applyAdjustments = async () => {
    const toApply = pendingAdjustments.filter(a => a.diff !== 0);
    setIsSubmitting(true);
    try {
      for (const adj of toApply) {
        // diff = contado - sistema
        // diff < 0 → foram consumidos → SAÍDA
        // diff > 0 → sobra não registrada → ENTRADA
        const isExit = adj.diff < 0;
        const { error: moveError } = await (supabase as any).from('inventory_movements').insert([{
          store_id: currentStore?.id,
          item_id: adj.id,
          user_id: user?.id,
          action: isExit ? 'exit' : 'entry',
          classification: isExit ? 'consumption' : 'adjustment',
          qty: Math.abs(adj.diff),
          unit_price: adj.avgPrice,
          total_value: Math.abs(adj.diff) * adj.avgPrice,
          notes: `Contagem física: ${adj.systemQty} ${adj.unit} → ${adj.countedQty} ${adj.unit}`,
        }]);
        if (moveError) throw moveError;
        const { error: itemError } = await (supabase as any).from('inventory_items').update({ current_qty: adj.countedQty }).eq('id', adj.id);
        if (itemError) throw itemError;
      }
      toast.success(`${toApply.length} ajuste(s) registrado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await saveAuditRecord(pendingBlob!, pendingAdjustments, true);
      setCounts({});
    } catch (error: any) {
      toast.error('Erro ao aplicar ajustes: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setShowAdjustDialog(false);
      setPendingAdjustments([]);
      setPendingBlob(null);
    }
  };

  const handleSkipAdjustments = async () => {
    await saveAuditRecord(pendingBlob!, pendingAdjustments, false);
    setCounts({});
    setShowAdjustDialog(false);
    setPendingAdjustments([]);
    setPendingBlob(null);
  };

  const handleReset = () => {
    if (confirm('Limpar todas as contagens digitadas?')) setCounts({});
  };

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.inventory_categories?.name || 'Sem Categoria';
    if (!acc[cat]) acc[cat] = { color: item.inventory_categories?.color || '#94a3b8', items: [] };
    acc[cat].items.push(item);
    return acc;
  }, {} as Record<string, { color: string; items: typeof items }>);

  // ── Render ─────────────────────────────────────────────────────────────────
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
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Contagem Física
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Sincronize o estoque do sistema com a realidade da prateleira</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(v => !v)} className="glass-card gap-2">
            <History size={16} />
            Histórico
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
          <Button variant="outline" onClick={handlePrintList} className="glass-card gap-2 text-primary border-primary/20">
            <ClipboardCheck size={18} /> Imprimir Lista
          </Button>
          <Button variant="outline" onClick={handleReset} className="glass-card gap-2">
            <RotateCcw size={18} /> Limpar
          </Button>
          <Button
            onClick={handleSubmitAudit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2 px-8"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Finalizar Auditoria
          </Button>
        </div>
      </div>

      {/* ── Audit History ──────────────────────────────────────────────────── */}
      {showHistory && (
        <div className="glass-card overflow-hidden border-none shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-muted/30 px-6 py-4 border-b flex items-center gap-3">
            <History size={16} className="text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Histórico de Auditorias</h3>
            <Badge variant="outline" className="ml-auto text-[10px] font-bold">{auditHistory.length} registros</Badge>
          </div>

          {auditHistory.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Nenhuma auditoria registrada ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Data / Hora</th>
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Contados</th>
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Divergências</th>
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Sobras</th>
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Faltas</th>
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Ajustes</th>
                    <th className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {auditHistory.map(audit => (
                    <tr key={audit.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-bold text-sm">
                          {format(new Date(audit.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(audit.created_at), "HH:mm:ss")}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-center font-bold">{audit.items_counted}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn("font-bold", audit.items_with_diff > 0 ? "text-orange-500" : "text-green-500")}>
                          {audit.items_with_diff}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-green-600">
                        {audit.items_surplus > 0 ? `+${audit.items_surplus}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-red-500">
                        {audit.items_shortage > 0 ? `-${audit.items_shortage}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge className={cn(
                          "text-[10px] font-bold",
                          audit.adjustments_applied
                            ? "bg-green-500/10 text-green-600 border-green-200"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        )}>
                          {audit.adjustments_applied ? 'Aplicados' : 'Apenas PDF'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {audit.pdf_url ? (
                          <a
                            href={audit.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Download size={12} /> Baixar
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="glass-card p-4 flex items-center gap-4">
        <Search className="text-muted-foreground h-5 w-5" />
        <Input
          placeholder="Buscar item para conferência..."
          className="border-none bg-transparent focus-visible:ring-0 text-lg"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Items table */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="glass-card p-20 text-center animate-pulse">Carregando itens...</div>
        ) : Object.entries(groupedItems).length === 0 ? (
          <div className="glass-card p-20 text-center text-muted-foreground">Nenhum item encontrado.</div>
        ) : Object.entries(groupedItems).map(([category, data]) => (
          <div key={category} className="glass-card overflow-hidden border-none shadow-xl">
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: data.color }} />
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{category}</h3>
              <Badge variant="outline" className="ml-auto text-[10px] font-bold">{data.items.length} itens</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Item</th>
                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">No Sistema</th>
                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Diferença</th>
                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center w-[200px]">Contagem Real</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(item => {
                    const currentVal = counts[item.id];
                    const hasCount = currentVal !== undefined && !isNaN(currentVal) && (counts[item.id] as any) !== '';
                    const diff = hasCount ? Number(currentVal) - item.current_qty : 0;
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4">
                          <p className={cn('font-bold text-sm tracking-tight', item.current_qty > 0 && 'text-blue-500')}>{item.name}</p>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">{item.unit}</span>
                        </td>
                        <td className={cn('px-6 py-4 text-center font-bold', item.current_qty <= 0 ? 'text-red-500' : 'text-blue-500')}>
                          {item.current_qty} <span className="text-[10px] uppercase">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasCount ? (
                            diff === 0 ? (
                              <Badge className="bg-gray-100 text-gray-400 font-bold">OK</Badge>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge className={cn('font-bold', diff < 0 ? 'bg-red-500/10 text-red-600 border-red-200' : 'bg-green-500/10 text-green-600 border-green-200')}>
                                  {diff < 0 ? 'SAÍDA' : 'ENTRADA'}
                                </Badge>
                                <span className={cn('text-xs font-black tabular-nums', diff < 0 ? 'text-red-500' : 'text-green-600')}>
                                  {Math.abs(diff).toFixed(2)} {item.unit}
                                </span>
                              </div>
                            )
                          ) : (
                            <span className="text-gray-300">---</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative group">
                            <Input
                              type="number" step="0.01" placeholder="0.00"
                              className={cn('h-11 text-center font-black rounded-xl transition-all focus:ring-4 focus:ring-primary/20 focus:border-primary border-2', hasCount ? 'border-primary bg-primary/5' : 'bg-muted/40 border-transparent hover:border-gray-300')}
                              value={counts[item.id] ?? ''}
                              onChange={e => handleCountChange(item.id, e.target.value)}
                            />
                            {hasCount && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-in zoom-in duration-300">
                                <CheckCircle2 size={16} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20 flex items-start gap-4">
        <TriangleAlert className="text-amber-600 shrink-0" size={24} />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900">Atenção ao Finalizar</h4>
          <p className="text-sm text-amber-700/80 leading-relaxed">
            Ao finalizar, o sistema gerará e salvará um PDF com o relatório completo da auditoria.
            Você poderá consultá-lo a qualquer momento no histórico acima.
          </p>
        </div>
      </div>

      {/* ── Adjust dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              PDF gerado e salvo! Aplicar ajustes?
            </DialogTitle>
            <DialogDescription>
              O relatório foi salvo no histórico. Deseja registrar as movimentações de ajuste no estoque?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 my-1">
            <div className="text-center p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
              <p className="text-2xl font-black text-violet-600">{pendingAdjustments.length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Contados</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <p className="text-2xl font-black text-red-500">{pendingAdjustments.filter(a => a.diff < 0).length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5 flex items-center justify-center gap-0.5">
                <TrendingDown size={10} /> Saídas
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
              <p className="text-2xl font-black text-green-500">{pendingAdjustments.filter(a => a.diff > 0).length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5 flex items-center justify-center gap-0.5">
                <TrendingUp size={10} /> Entradas
              </p>
            </div>
          </div>

          {pendingAdjustments.filter(a => a.diff !== 0).length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-xl border bg-muted/30 divide-y text-sm">
              {pendingAdjustments.filter(a => a.diff !== 0).map(a => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2 gap-2">
                  <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{a.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                      a.diff < 0
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20'
                        : 'bg-green-100 text-green-600 dark:bg-green-500/20'
                    )}>
                      {a.diff < 0 ? 'SAÍDA' : 'ENTRADA'}
                    </span>
                    <span className={cn('font-bold text-xs tabular-nums', a.diff < 0 ? 'text-red-500' : 'text-green-600')}>
                      {Math.abs(a.diff).toFixed(2)} {a.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingAdjustments.filter(a => a.diff === 0).length > 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              + {pendingAdjustments.filter(a => a.diff === 0).length} itens sem divergência (não serão ajustados)
            </p>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={handleSkipAdjustments} disabled={isSubmitting}>
              Não, apenas o PDF
            </Button>
            <Button onClick={applyAdjustments} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Sim, aplicar ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
