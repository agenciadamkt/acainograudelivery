'use client';

import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Download,
  Building2,
  Tags,
  Search,
  CircleArrowUp,
  CircleArrowDown,
  Calendar,
  Filter,
  Package,
  History,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  ListOrdered,
  LayoutGrid,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MovementForm } from '@/components/admin/stock/MovementForm';

interface EditDraft {
  id: string;
  item_id: string;
  action: string;
  qty: number;
  unit_price: number;
  classification: string;
  notes: string;
  moved_at: string;
  // snapshot para cálculo de ajuste de estoque
  original_qty: number;
}

export default function StockMovementsPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  // View Mode
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

  // Edit
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; item_id: string; action: string; qty: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory_movements', currentStore?.id, selectedCategory, selectedSupplier, dateFrom, dateTo],
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
        .order('moved_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentStore?.id
  });

  const categories = Array.from(new Set(movements.map(m => (m.inventory_items as any)?.inventory_categories?.name).filter(Boolean))) as string[];
  const suppliers = Array.from(new Set(movements.map(m => (m.inventory_items as any)?.inventory_suppliers?.name).filter(Boolean))) as string[];

  const filteredMovements = movements.filter(m => {
    const item = m.inventory_items as any;
    const matchesSearch = (item?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item?.inventory_categories?.name === selectedCategory;
    const matchesSupplier = selectedSupplier === 'all' || item?.inventory_suppliers?.name === selectedSupplier;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const totalEntradas = filteredMovements
    .filter(m => (m as any).action === 'entry')
    .reduce((acc, m) => acc + (Number((m as any).total_value) || 0), 0);

  const totalSaidas = filteredMovements
    .filter(m => (m as any).action === 'exit')
    .reduce((acc, m) => acc + (Number((m as any).total_value) || 0), 0);

  const saldoLiquido = totalEntradas - totalSaidas;

  const groupedMovements = useMemo(() => {
    const map = new Map<string, any>();
    filteredMovements.forEach(m => {
      const item = m.inventory_items as any;
      const itemId = m.item_id;
      if (!map.has(itemId)) {
        map.set(itemId, {
          item_id: itemId,
          name: item?.name || 'Item Excluído',
          unit: item?.unit || 'un',
          category: item?.inventory_categories?.name || 'Geral',
          entry_qty: 0,
          entry_val: 0,
          exit_qty: 0,
          exit_val: 0,
        });
      }
      const g = map.get(itemId);
      const action = (m as any).action;
      const qty = Number(m.qty) || 0;
      const val = Number((m as any).total_value) || 0;
      
      if (action === 'entry') {
        g.entry_qty += qty;
        g.entry_val += val;
      } else if (action === 'exit') {
        g.exit_qty += qty;
        g.exit_val += val;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredMovements]);

  // ── Editar movimento ──────────────────────────────────────────────────────
  const openEdit = (move: any) => {
    const m = move as any;
    setEditDraft({
      id: m.id,
      item_id: m.item_id,
      action: m.action,
      qty: Number(m.qty),
      unit_price: Number(m.unit_price),
      classification: m.classification,
      notes: m.notes || '',
      moved_at: (m.moved_at as string).slice(0, 16),
      original_qty: Number(m.qty),
    });
  };

  const handleSaveEdit = async () => {
    if (!editDraft) return;
    setIsSaving(true);
    try {
      const newQty = Number(editDraft.qty);
      const newUnitPrice = Number(editDraft.unit_price);
      const totalValue = newQty * newUnitPrice;
      const qtyDelta = newQty - editDraft.original_qty;

      // 1. Ajusta saldo do item no estoque
      if (qtyDelta !== 0) {
        const { data: invItem } = await supabase
          .from('inventory_items')
          .select('current_qty')
          .eq('id', editDraft.item_id)
          .single();
        if (invItem) {
          const adjustment = editDraft.action === 'entry' ? qtyDelta : -qtyDelta;
          await supabase
            .from('inventory_items')
            .update({ current_qty: (invItem as any).current_qty + adjustment })
            .eq('id', editDraft.item_id);
        }
      }

      // 2. Atualiza o movimento
      const { error } = await supabase
        .from('inventory_movements')
        .update({
          qty: newQty,
          unit_price: newUnitPrice,
          total_value: totalValue,
          classification: editDraft.classification,
          notes: editDraft.notes || null,
          moved_at: new Date(editDraft.moved_at).toISOString(),
        })
        .eq('id', editDraft.id);

      if (error) throw error;
      toast.success('Movimento atualizado!');
      setEditDraft(null);
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Excluir movimento ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // 1. Reverte o saldo do item no estoque
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('current_qty')
        .eq('id', deleteTarget.item_id)
        .single();
      if (invItem) {
        // Entrada foi somada → reverte subtraindo; Saída foi subtraída → reverte somando
        const revert = deleteTarget.action === 'entry' ? -deleteTarget.qty : deleteTarget.qty;
        await supabase
          .from('inventory_items')
          .update({ current_qty: (invItem as any).current_qty + revert })
          .eq('id', deleteTarget.item_id);
      }

      // 2. Exclui o movimento
      const { error } = await supabase
        .from('inventory_movements')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;

      toast.success('Movimento excluído e estoque revertido.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleExport = () => {
    if (filteredMovements.length === 0) {
      toast.error('Não há movimentações para exportar');
      return;
    }

    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [141, 66, 221]; // #8D42DD
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Fluxo de Estoque', 14, 16);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${currentStore?.name || 'Loja'}`, pageWidth - 14, 11, { align: 'right' });
      doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 17, { align: 'right' });

      // Totals summary
      const green: [number, number, number] = [34, 197, 94];
      const red: [number, number, number] = [239, 68, 68];
      const boxW = (pageWidth - 28 - 8) / 3;
      const summaryY = 32;
      const summaryBoxes = [
        { label: 'TOTAL ENTRADAS', value: formatCurrency(totalEntradas), color: green },
        { label: 'TOTAL SAÍDAS', value: formatCurrency(totalSaidas), color: red },
        { label: 'SALDO LÍQUIDO', value: formatCurrency(saldoLiquido), color: brandColor },
      ];
      summaryBoxes.forEach((box, i) => {
        const x = 14 + i * (boxW + 4);
        doc.setFillColor(...box.color);
        doc.roundedRect(x, summaryY, boxW, 16, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(box.value, x + boxW / 2, summaryY + 7, { align: 'center' });
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(box.label, x + boxW / 2, summaryY + 13, { align: 'center' });
      });

      if (viewMode === 'list') {
        const tableBody = filteredMovements.map(m => [
          format(new Date((m as any).moved_at), 'dd/MM/yy HH:mm'),
          (m as any).action === 'entry' ? 'Entrada' : (m as any).action === 'exit' ? 'Saída' : 'Ajuste',
          (m.inventory_items as any)?.name,
          `${(m as any).qty} ${(m.inventory_items as any)?.unit}`,
          formatCurrency(Number((m as any).total_value) || 0),
          (m.inventory_items as any)?.inventory_categories?.name || '—',
          (m.inventory_items as any)?.inventory_suppliers?.name || '—'
        ]);

        autoTable(doc, {
          startY: 54,
          head: [['Data', 'Tipo', 'Item', 'Qtd', 'Total', 'Categoria', 'Fornecedor']],
          body: tableBody,
          foot: [[
            '', '', '', '',
            { content: formatCurrency(totalEntradas), styles: { textColor: green, fontStyle: 'bold' } },
            '', ''
          ], [
            '', '', '', 'TOTAL SAÍDAS',
            { content: formatCurrency(totalSaidas), styles: { textColor: red, fontStyle: 'bold' } },
            '', ''
          ], [
            '', '', '', 'SALDO LÍQUIDO',
            { content: formatCurrency(saldoLiquido), styles: { textColor: brandColor, fontStyle: 'bold', fontSize: 9 } },
            '', ''
          ]],
          theme: 'striped',
          headStyles: { fillColor: brandColor, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          footStyles: { fillColor: [245, 245, 250], fontSize: 7, textColor: [40, 40, 40] },
          margin: { top: 54 }
        });
      } else {
        const tableBody = groupedMovements.map(g => [
          g.name,
          g.category,
          `${g.entry_qty} ${g.unit}`,
          formatCurrency(g.entry_val),
          `${g.exit_qty} ${g.unit}`,
          formatCurrency(g.exit_val),
          formatCurrency(g.entry_val - g.exit_val)
        ]);

        autoTable(doc, {
          startY: 54,
          head: [['Item', 'Categoria', 'Entradas', 'Total (Entrada)', 'Saídas', 'Total (Saída)', 'Saldo Líquido (R$)']],
          body: tableBody,
          foot: [[
            'TOTAIS', '', '',
            { content: formatCurrency(totalEntradas), styles: { textColor: green, fontStyle: 'bold' } },
            '',
            { content: formatCurrency(totalSaidas), styles: { textColor: red, fontStyle: 'bold' } },
            { content: formatCurrency(saldoLiquido), styles: { textColor: brandColor, fontStyle: 'bold' } }
          ]],
          theme: 'striped',
          headStyles: { fillColor: brandColor, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          footStyles: { fillColor: [245, 245, 250], fontSize: 7, textColor: [40, 40, 40] },
          margin: { top: 54 }
        });
      }

      doc.save(`movimentacoes_${viewMode}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório gerado!');
    } catch (e) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'entry': return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 shadow-none font-bold">ENTRADA</Badge>;
      case 'exit': return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 shadow-none font-bold">SAÍDA</Badge>;
      case 'inventory': return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 shadow-none font-bold">AJUSTE</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getClassificationLabel = (label: string) => {
    if (!label) return '';
    const map: Record<string, string> = {
      purchase: 'Compra',
      sale: 'Venda',
      waste: 'Desperdício',
      internal: 'Consumo Interno',
      initial: 'Saldo Inicial',
      production: 'Produção',
      adjustment: 'Ajuste',
      consumption: 'Consumo'
    };
    return map[label.toLowerCase()] || label;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Histórico de Fluxo
          </h1>
          <p className="text-muted-foreground mt-1">
            Auditoria completa de cada grama e centavo do seu estoque
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="glass-card gap-2 text-primary border-primary/20">
            <Download size={16} /> Exportar PDF
          </Button>
          
          <Dialog open={isNewMovementOpen} onOpenChange={setIsNewMovementOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2">
                <Plus size={16} /> Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-card border-none">
              <DialogHeader>
                <DialogTitle>Registrar Entrada / Saída</DialogTitle>
              </DialogHeader>
              <MovementForm onSuccess={() => setIsNewMovementOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
            <CircleArrowUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entradas (Mês)</p>
            <p className="text-lg font-black">
              {movements.filter(m => m.action === 'entry').length}
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
            <CircleArrowDown size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saídas (Mês)</p>
            <p className="text-lg font-black">
              {movements.filter(m => m.action === 'exit').length}
            </p>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-green-500">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
            <CircleArrowUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Entradas</p>
            <p className="text-xl font-black text-green-600">{formatCurrency(totalEntradas)}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-red-500">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
            <CircleArrowDown size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Saídas</p>
            <p className="text-xl font-black text-red-600">{formatCurrency(totalSaidas)}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-primary">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <History size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saldo Líquido</p>
            <p className={`text-xl font-black ${saldoLiquido >= 0 ? 'text-primary' : 'text-red-600'}`}>{formatCurrency(saldoLiquido)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center md:justify-start">
        <div className="flex bg-muted/50 p-1 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => setViewMode('list')} 
            className={cn("flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none", viewMode === 'list' ? 'bg-white shadow-sm text-primary dark:bg-[#1A1A24]' : 'text-muted-foreground hover:text-foreground')}
          >
            <ListOrdered size={16} /> Lista Detalhada
          </button>
          <button 
            onClick={() => setViewMode('grouped')} 
            className={cn("flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none", viewMode === 'grouped' ? 'bg-white shadow-sm text-primary dark:bg-[#1A1A24]' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutGrid size={16} /> Resumo por Item
          </button>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar por insumo..." 
              className="pl-10 bg-muted/50 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant={isFilterOpen ? "secondary" : "ghost"} onClick={() => setIsFilterOpen(!isFilterOpen)} className="gap-2">
            <Filter size={18} /> Filtros {isFilterOpen ? 'Ativos' : ''}
          </Button>
        </div>

        {isFilterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t animate-in fade-in duration-300">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Calendar size={12} /> Período
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="glass-card border-none bg-muted/30"
                />
                <span className="text-muted-foreground text-sm shrink-0">até</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="glass-card border-none bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Tags size={12} /> Categoria
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="glass-card border-none">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                <Building2 size={12} /> Fornecedor
              </label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="glass-card border-none">
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.map(sup => (
                    <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog: Editar movimento ─────────────────────────────────────── */}
      <Dialog open={!!editDraft} onOpenChange={open => !open && setEditDraft(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Editar Movimento</DialogTitle>
            <DialogDescription>
              O saldo do insumo será ajustado automaticamente ao salvar.
            </DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min={0.001}
                    step="any"
                    value={editDraft.qty}
                    onChange={e => setEditDraft(d => d && ({ ...d, qty: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preço Unitário (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={editDraft.unit_price}
                    onChange={e => setEditDraft(d => d && ({ ...d, unit_price: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Classificação</Label>
                <Select
                  value={editDraft.classification}
                  onValueChange={v => setEditDraft(d => d && ({ ...d, classification: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Compra</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="waste">Desperdício</SelectItem>
                    <SelectItem value="internal">Consumo Interno</SelectItem>
                    <SelectItem value="initial">Saldo Inicial</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data/Hora</Label>
                <Input
                  type="datetime-local"
                  value={editDraft.moved_at}
                  onChange={e => setEditDraft(d => d && ({ ...d, moved_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  rows={2}
                  placeholder="Opcional"
                  value={editDraft.notes}
                  onChange={e => setEditDraft(d => d && ({ ...d, notes: e.target.value }))}
                />
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Total: <span className="font-bold text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editDraft.qty * editDraft.unit_price)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDraft(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Confirmar exclusão ──────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Excluir movimento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O saldo do insumo será revertido automaticamente (
              {deleteTarget?.action === 'entry' ? `−${deleteTarget?.qty}` : `+${deleteTarget?.qty}`} unidades).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Movements Timeline/Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center animate-pulse">Carregando histórico...</div>
        ) : filteredMovements.length === 0 ? (
          <div className="py-20 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold">Nenhuma movimentação</h3>
            <p className="text-muted-foreground mt-2">Os dados de fluxo aparecerão aqui conforme você opera.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Data/Hora</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Tipo</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Item</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Qtd</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Valor Unit.</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Total</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Classificação</th>
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((move) => {
                  const item = move.inventory_items as any;
                  const itemName = item?.name || 'Insumo Deletado';
                  const unit = item?.unit || '';
                  const categoryName = item?.inventory_categories?.name || 'Geral';
                  const supplierName = item?.inventory_suppliers?.name || '—';

                  return (
                    <tr key={move.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{format(new Date(move.moved_at), 'dd/MM/yy')}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(move.moved_at), 'HH:mm')}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getActionBadge(move.action)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                            <Package size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{itemName}</p>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className="text-[9px] font-medium uppercase opacity-50 px-1 border rounded">{categoryName}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "font-black text-sm",
                          move.action === 'entry' ? "text-green-600" : move.action === 'exit' ? "text-red-600" : ""
                        )}>
                          {move.action === 'entry' ? '+' : move.action === 'exit' ? '-' : ''} {move.qty}
                          <span className="text-[10px] ml-1 opacity-60 lowercase">{unit}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs font-medium text-muted-foreground">
                        {formatCurrency(move.unit_price)}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-sm">
                          {formatCurrency(move.total_value)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter bg-muted w-fit">
                            {getClassificationLabel(move.classification)}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground font-semibold truncate max-w-[100px]">{supplierName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(move)}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({
                              id: (move as any).id,
                              item_id: (move as any).item_id,
                              action: (move as any).action,
                              qty: Number((move as any).qty),
                            })}
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Item / Categoria</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Entradas</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">R$ Entradas</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-center">Saídas</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">R$ Saídas</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Saldo (R$)</th>
                </tr>
              </thead>
              <tbody>
                {groupedMovements.map((g) => {
                  const netValue = g.entry_val - g.exit_val;
                  return (
                    <tr key={g.item_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                            <Package size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{g.name}</p>
                            <span className="text-[9px] font-medium uppercase opacity-50">{g.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-black text-sm text-green-600">
                          {g.entry_qty > 0 ? `+${g.entry_qty}` : '0'}
                          <span className="text-[10px] ml-1 opacity-60 lowercase">{g.unit}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-sm text-green-600">
                          {formatCurrency(g.entry_val)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-black text-sm text-red-600">
                          {g.exit_qty > 0 ? `-${g.exit_qty}` : '0'}
                          <span className="text-[10px] ml-1 opacity-60 lowercase">{g.unit}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-sm text-red-600">
                          {formatCurrency(g.exit_val)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={cn(
                          "font-black text-sm",
                          netValue > 0 ? "text-primary" : netValue < 0 ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {formatCurrency(netValue)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
