'use client';

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowLeft, Plus, Search, FileDown, Gift, Trash2,
  User, CalendarDays, Package, ChevronsUpDown, Check, X,
  Loader2, Save, ClipboardList, Pencil, LayoutList, History,
  Coffee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BonifItem {
  item_id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  unit_price: number;
}

const emptyItem = (): BonifItem => ({ item_id: '', descricao: '', quantidade: 1, unidade: '', unit_price: 0 });

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v: number, dec = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BonificacoesPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const qc = useQueryClient();

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo]     = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [filterAut, setFilterAut] = useState('all');
  const [search, setSearch]     = useState('');
  const [isOpen, setIsOpen]             = useState(false);
  const [editingBonif, setEditingBonif] = useState<any>(null);
  const [viewMode, setViewMode]         = useState<'detalhado' | 'consolidado' | 'crm'>('detalhado');

  // ── Fetch bonificações ──────────────────────────────────────────
  const { data: bonifs = [], isLoading } = useQuery({
    queryKey: ['bonificacoes', currentStore?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await (supabase as any)
        .from('stock_bonificacoes')
        .select(`*, stock_bonificacao_items(*, inventory_items(name, unit, code, avg_price))`)
        .eq('store_id', currentStore.id)
        .gte('data', dateFrom)
        .lte('data', dateTo)
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentStore?.id,
  });

  // ── Status Update Mutation ──────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('stock_bonificacoes')
        .update({ feedback_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status de feedback atualizado.');
      qc.invalidateQueries({ queryKey: ['bonificacoes'] });
    },
    onError: (e: any) => toast.error('Erro ao atualizar status: ' + e.message),
  });

  // ── Fetch products (inventory_items com code) ───────────────────
  const { data: products = [] } = useQuery({
    queryKey: ['inventory_items_compact', currentStore?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('inventory_items')
        .select('id, name, unit, code, avg_price')
        .eq('store_id', currentStore?.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!currentStore?.id,
  });

  // Mapas: id/nome → code e avg_price
  const itemCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    (products as any[]).forEach((p: any) => {
      if (p.code) { map[p.id] = p.code; map[p.name] = p.code; }
    });
    return map;
  }, [products]);

  const itemPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    (products as any[]).forEach((p: any) => {
      if (p.avg_price) { map[p.id] = Number(p.avg_price); map[p.name] = Number(p.avg_price); }
    });
    return map;
  }, [products]);

  // Helpers
  const resolveCode = (item: any): string => {
    if (item.inventory_items?.code) return item.inventory_items.code;
    if (item.item_id && itemCodeMap[item.item_id]) return itemCodeMap[item.item_id];
    if (item.descricao && itemCodeMap[item.descricao]) return itemCodeMap[item.descricao];
    return '—';
  };

  const resolvePrice = (item: any): number => {
    if (item.unit_price && item.unit_price > 0) return Number(item.unit_price);
    if (item.inventory_items?.avg_price) return Number(item.inventory_items.avg_price);
    if (item.item_id && itemPriceMap[item.item_id]) return itemPriceMap[item.item_id];
    if (item.descricao && itemPriceMap[item.descricao]) return itemPriceMap[item.descricao];
    return 0;
  };

  // ── Delete ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('stock_bonificacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recibo excluído.');
      qc.invalidateQueries({ queryKey: ['bonificacoes'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Filters ─────────────────────────────────────────────────────
  const autorizadores = useMemo(() =>
    Array.from(new Set(bonifs.map((b: any) => b.autorizado_por).filter(Boolean))) as string[]
  , [bonifs]);

  const filtered = useMemo(() => bonifs.filter((b: any) => {
    const matchAut = filterAut === 'all' || b.autorizado_por === filterAut;
    const matchSearch = !search || 
      b.autorizado_por?.toLowerCase().includes(search.toLowerCase()) ||
      b.favorecido?.toLowerCase().includes(search.toLowerCase()) ||
      b.whatsapp?.includes(search) ||
      b.stock_bonificacao_items?.some((i: any) => i.descricao?.toLowerCase().includes(search.toLowerCase()));
    return matchAut && matchSearch;
  }), [bonifs, filterAut, search]);

  // ── Stats ───────────────────────────────────────────────────────
  const totalRecibos  = filtered.length;
  const totalItens    = filtered.reduce((acc: number, b: any) =>
    acc + (b.stock_bonificacao_items?.reduce((s: number, i: any) => s + Number(i.quantidade), 0) || 0), 0);
  const autUnicos     = new Set(filtered.map((b: any) => b.autorizado_por)).size;

  // ── Consolidado por produto (Geral) ──────────────────────────────────────
  const consolidado = useMemo(() => {
    const map: Record<string, { descricao: string; unidade: string; quantidade: number; recibos: number; code: string; unit_price: number; valor_total: number }> = {};
    filtered.forEach((b: any) => {
      (b.stock_bonificacao_items || []).forEach((it: any) => {
        const key = it.item_id || it.descricao;
        const price = resolvePrice(it);
        if (!map[key]) map[key] = { descricao: it.descricao, unidade: it.unidade || '', quantidade: 0, recibos: 0, code: resolveCode(it), unit_price: price, valor_total: 0 };
        const qty = Number(it.quantidade) || 0;
        map[key].quantidade += qty;
        map[key].valor_total += qty * price;
        map[key].recibos += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
  }, [filtered]);

  // ── Consolidado por Data ──────────────────────────────────────
  const consolidadoPorData = useMemo(() => {
    const map: Record<string, Record<string, { descricao: string; unidade: string; quantidade: number; code: string; unit_price: number; valor_total: number }>> = {};
    filtered.forEach((b: any) => {
      const d = format(parseISO(b.data), 'yyyy-MM-dd');
      if (!map[d]) map[d] = {};
      (b.stock_bonificacao_items || []).forEach((it: any) => {
        const key = it.item_id || it.descricao;
        const price = resolvePrice(it);
        const qty = Number(it.quantidade) || 0;
        if (!map[d][key]) map[d][key] = { descricao: it.descricao, unidade: it.unidade || '', quantidade: 0, code: resolveCode(it), unit_price: price, valor_total: 0 };
        map[d][key].quantidade += qty;
        map[d][key].valor_total += qty * price;
      });
    });
    return Object.entries(map)
      .map(([date, items]) => ({ date, items: Object.values(items).sort((a, b) => a.descricao.localeCompare(b.descricao)) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  // ── PDF individual (Recibo Corporativo) ────────────────────────
  const printRecibo = (bonif: any, autoDownload = false) => {
    const doc = new jsPDF({ format: 'a5', orientation: 'landscape' });
    const pw = doc.internal.pageSize.getWidth();

    // Corporate Header
    try {
      doc.addImage('/logo-nograu.png', 'PNG', 14, 10, 30, 8);
    } catch (e) {
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('REDE NOGRAU | AMAZFRUT', 14, 15);
    }
    
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const title = bonif.is_internal_consumption ? 'RECIBO DE CONSUMO INTERNO' : 'RECIBO DE BONIFICAÇÃO';
    doc.text(title, pw - 14, 15, { align: 'right' });
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(14, 19, pw - 14, 19);

    // Metadata
    doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text(`DATA: ${format(parseISO(bonif.data), 'dd/MM/yyyy')}`, 14, 25);
    doc.text(`LOJA: ${currentStore?.name?.toUpperCase() || 'GERAL'}`, pw - 14, 25, { align: 'right' });

    let startY = 32;
    if (bonif.motivo) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('MOTIVO:', 14, 30);
      doc.setFont('helvetica', 'normal');
      doc.text(bonif.motivo.toUpperCase(), 30, 30);
      startY = 35;
    }

    // Tabela de itens
    const items = bonif.stock_bonificacao_items || [];
    const grandTotal = items.reduce((s: number, i: any) => s + (Number(i.quantidade) || 0) * resolvePrice(i), 0);
    autoTable(doc, {
      startY,
      head: [['CÓD.', 'DESCRIÇÃO DO PRODUTO', 'QTD', 'UN', 'PREÇO UNIT.', 'TOTAL']],
      body: [
        ...items.map((i: any) => {
          const price = resolvePrice(i);
          const total = (Number(i.quantidade) || 0) * price;
          return [
            resolveCode(i),
            i.descricao.toUpperCase(),
            fmtNum(i.quantidade),
            (i.unidade || '').toUpperCase(),
            price > 0 ? fmtBRL(price) : '—',
            total > 0 ? fmtBRL(total) : '—',
          ];
        }),
        ['', 'TOTAL GERAL', '', '', '', grandTotal > 0 ? fmtBRL(grandTotal) : '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [250, 250, 250], textColor: [40, 40, 40], fontStyle: 'bold', fontSize: 7.5, lineWidth: 0.1 },
      bodyStyles: { fontSize: 7.5, textColor: [60, 60, 60], lineWidth: 0.1 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 16 },
        2: { halign: 'right', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 26 },
        5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.row.index === items.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [245, 245, 245];
        }
      },
      margin: { left: 14, right: 14 },
    });

    let yTable = (doc as any).lastAutoTable.finalY + 6;

    // Observações
    if (bonif.observacoes) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
      doc.text('OBSERVAÇÕES:', 14, yTable);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      const obsLines = doc.splitTextToSize(bonif.observacoes.toUpperCase(), pw - 28);
      doc.text(obsLines, 14, yTable + 5);
      yTable += 5 + obsLines.length * 4 + 4;
    } else {
      yTable += 6;
    }

    // Assinaturas e Rodapé
    doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    
    // Linha de Assinatura 1
    doc.line(14, yTable + 10, 80, yTable + 10);
    doc.text('AUTORIZADO POR', 14, yTable + 14);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
    doc.text(bonif.autorizado_por?.toUpperCase() || '—', 14, yTable + 9);

    // Linha de Assinatura 2
    doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    doc.line(pw - 80, yTable + 10, pw - 14, yTable + 10);
    doc.text('RESPONSÁVEL PELO RECEBIMENTO', pw - 14, yTable + 14, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
    doc.text(bonif.favorecido?.toUpperCase() || '—', pw - 14, yTable + 9, { align: 'right' });

    doc.save(`recibo_bonif_${bonif.id.slice(0, 8)}.pdf`);
    if (!autoDownload) toast.success('Recibo gerado com sucesso.');
  };

  // ── PDF relatório (Geral Corporativo) ──────────────────────────────────────
  const exportRelatorio = () => {
    if (filtered.length === 0) { toast.error('Sem dados para exportar'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const addLayout = (d: jsPDF, pageNum: number, totalPages: number) => {
      // Header com Logo
      try {
        d.addImage('/logo-nograu.png', 'PNG', 14, 10, 40, 11);
      } catch (e) {
        d.setFontSize(14); d.setFont('helvetica', 'bold'); d.setTextColor(40, 40, 40);
        d.text('NOGRAU | AMAZFRUT', 14, 15);
      }
      
      d.setFontSize(12); d.setFont('helvetica', 'bold'); d.setTextColor(40, 40, 40);
      d.text('RELATÓRIO DE BONIFICAÇÕES', pw - 14, 15, { align: 'right' });
      
      d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(100, 100, 100);
      d.text(currentStore?.name?.toUpperCase() || '', pw - 14, 20, { align: 'right' });
      d.text(`PERÍODO: ${dateFrom.split('-').reverse().join('/')} A ${dateTo.split('-').reverse().join('/')}`, 14, 25);
      d.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pw - 14, 25, { align: 'right' });

      d.setDrawColor(200, 200, 200); d.setLineWidth(0.1);
      d.line(14, 28, pw - 14, 28);

      // Footer com Paginação
      d.setFontSize(7); d.setTextColor(150, 150, 150);
      d.text(`Página ${pageNum} de ${totalPages}`, pw / 2, ph - 10, { align: 'center' });
    };

    // Summary Header (Big numbers style)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
    doc.text(String(totalRecibos), 14, 42);
    doc.text(totalItens.toLocaleString('pt-BR'), 60, 42);
    doc.text(String(autUnicos), 120, 42);

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
    doc.text('RECIBOS', 14, 46);
    doc.text('TOTAL ITENS', 60, 46);
    doc.text('AUTORIZADORES', 120, 46);

    const bonifsMarketing = filtered.filter((b: any) => !b.is_internal_consumption);
    const bonifsInternal  = filtered.filter((b: any) => b.is_internal_consumption);

    let currentY = 55;

    // ── Tabela 1: Bonificações (Marketing / Clientes) ──────────────
    if (bonifsMarketing.length > 0) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
      doc.text('1. BONIFICAÇÕES (MARKETING / CLIENTES)', 14, currentY);
      currentY += 4;

      const rowsM: any[] = [];
      let totalM = 0;
      bonifsMarketing.forEach((b: any) => {
        const items = b.stock_bonificacao_items || [];
        items.forEach((it: any, idx: number) => {
          const price = resolvePrice(it);
          const total = (Number(it.quantidade) || 0) * price;
          totalM += total;
          rowsM.push([
            idx === 0 ? format(parseISO(b.data), 'dd/MM/yy') : '',
            idx === 0 ? b.autorizado_por?.toUpperCase() : '',
            idx === 0 ? (b.motivo?.toUpperCase() || '—') : '',
            resolveCode(it),
            it.descricao?.toUpperCase(),
            fmtNum(it.quantidade),
            price > 0 ? fmtBRL(price) : '—',
            total > 0 ? fmtBRL(total) : '—',
            idx === 0 ? (b.favorecido?.toUpperCase() || '—') : '',
          ]);
        });
      });
      rowsM.push(['', '', '', '', 'TOTAL GERAL', '', '', totalM > 0 ? fmtBRL(totalM) : '—', '']);

      autoTable(doc, {
        startY: currentY,
        head: [['DATA', 'AUTORIZADO POR', 'MOTIVO', 'CÓD.', 'ITEM / PRODUTO', 'QTD', 'PREÇO UNIT.', 'TOTAL', 'RECEBEDOR']],
        body: rowsM,
        theme: 'striped',
        headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontSize: 7, fontStyle: 'bold', lineWidth: 0.1 },
        bodyStyles: { fontSize: 7, textColor: [60, 60, 60], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 16 },
          3: { halign: 'center', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 14 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        },
        didParseCell: (data: any) => {
          if (data.row.index === rowsM.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
        margin: { left: 14, right: 14, top: 35 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // ── Tabela 2: Consumo Interno da Loja ──────────────────────────
    if (bonifsInternal.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 40; }

      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
      doc.text('2. CONSUMO INTERNO DA LOJA', 14, currentY);
      currentY += 4;

      const rowsI: any[] = [];
      let totalI = 0;
      bonifsInternal.forEach((b: any) => {
        const items = b.stock_bonificacao_items || [];
        items.forEach((it: any, idx: number) => {
          const price = resolvePrice(it);
          const total = (Number(it.quantidade) || 0) * price;
          totalI += total;
          rowsI.push([
            idx === 0 ? format(parseISO(b.data), 'dd/MM/yy') : '',
            idx === 0 ? b.autorizado_por?.toUpperCase() : '',
            idx === 0 ? (b.motivo?.toUpperCase() || '—') : '',
            resolveCode(it),
            it.descricao?.toUpperCase(),
            fmtNum(it.quantidade),
            price > 0 ? fmtBRL(price) : '—',
            total > 0 ? fmtBRL(total) : '—',
            idx === 0 ? (b.favorecido?.toUpperCase() || '—') : '',
          ]);
        });
      });
      rowsI.push(['', '', '', '', 'TOTAL GERAL', '', '', totalI > 0 ? fmtBRL(totalI) : '—', '']);

      autoTable(doc, {
        startY: currentY,
        head: [['DATA', 'AUTORIZADO POR', 'MOTIVO', 'CÓD.', 'ITEM / PRODUTO', 'QTD', 'PREÇO UNIT.', 'TOTAL', 'RESPONSÁVEL']],
        body: rowsI,
        theme: 'striped',
        headStyles: { fillColor: [255, 245, 230], textColor: [100, 70, 0], fontSize: 7, fontStyle: 'bold', lineWidth: 0.1 },
        bodyStyles: { fontSize: 7, textColor: [60, 60, 60], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 16 },
          3: { halign: 'center', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 14 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        },
        didParseCell: (data: any) => {
          if (data.row.index === rowsI.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
        margin: { left: 14, right: 14, top: 35 },
      });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addLayout(doc, i, totalPages);
    }

    doc.save(`relatorio_bonificacoes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Relatório corporativo gerado.');
  };

  // ── PDF consolidado ANALÍTICO (Corporativo) ──────────────────────────────────
  const exportConsolidadoAnalitico = () => {
    if (consolidadoPorData.length === 0) { toast.error('Sem dados para exportar'); return; }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const addLayout = (d: jsPDF, pageNum: number, totalPages: number) => {
      try {
        d.addImage('/logo-nograu.png', 'PNG', 14, 10, 40, 11);
      } catch (e) {
        d.setFontSize(14); d.setFont('helvetica', 'bold'); d.text('NOGRAU | AMAZFRUT', 14, 15);
      }
      
      d.setFontSize(12); d.setFont('helvetica', 'bold');
      d.text('CONSOLIDADO ANALÍTICO', pw - 14, 15, { align: 'right' });
      
      d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(100, 100, 100);
      d.text(`PERÍODO: ${dateFrom.split('-').reverse().join('/')} A ${dateTo.split('-').reverse().join('/')}`, 14, 25);
      d.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pw - 14, 25, { align: 'right' });

      d.setDrawColor(200, 200, 200); d.setLineWidth(0.1);
      d.line(14, 28, pw - 14, 28);

      d.setFontSize(7); d.setTextColor(150, 150, 150);
      d.text(`Página ${pageNum} de ${totalPages}`, pw / 2, ph - 10, { align: 'center' });
    };

    let currentY = 38;

    consolidadoPorData.forEach((day: any) => {
      // Header da Data - Discreto
      doc.setFillColor(252, 252, 252);
      doc.rect(14, currentY, pw - 28, 7, 'F');
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(`DATA: ${format(parseISO(day.date), 'dd/MM/yyyy')}`, 17, currentY + 5);
      
      currentY += 7;

      const dayTotal = day.items.reduce((s: number, it: any) => s + (it.valor_total || 0), 0);
      autoTable(doc, {
        startY: currentY,
        head: [['CÓD.', 'PRODUTO / DESCRIÇÃO', 'QTD TOTAL', 'UN', 'PREÇO UNIT.', 'VALOR TOTAL']],
        body: [
          ...day.items.map((it: any) => [
            it.code || '—',
            it.descricao.toUpperCase(),
            fmtNum(it.quantidade, 3),
            it.unidade?.toUpperCase() || 'UN',
            it.unit_price > 0 ? fmtBRL(it.unit_price) : '—',
            it.valor_total > 0 ? fmtBRL(it.valor_total) : '—',
          ]),
          ['', 'TOTAL DO DIA', '', '', '', dayTotal > 0 ? fmtBRL(dayTotal) : '—'],
        ],
        theme: 'plain',
        headStyles: { textColor: [100, 100, 100], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 18 },
          2: { halign: 'right', cellWidth: 28 },
          3: { halign: 'center', cellWidth: 14 },
          4: { halign: 'right', cellWidth: 28 },
          5: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
        },
        didParseCell: (data: any) => {
          if (data.row.index === day.items.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
        margin: { left: 14, right: 14, top: 35 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
      
      if (currentY > 265) {
        doc.addPage();
        currentY = 40; // Space for header
      }
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addLayout(doc, i, totalPages);
    }

    doc.save(`analitico_faturamento_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Analítico gerado com sucesso.');
  };

  // ── PDF Consolidado por Data (sem preços, igual à aba da tela) ─────────────
  const exportConsolidadoPorData = () => {
    if (consolidadoPorData.length === 0) { toast.error('Sem dados para exportar'); return; }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const addLayout = (d: jsPDF, pageNum: number, totalPages: number) => {
      try {
        d.addImage('/logo-nograu.png', 'PNG', 14, 10, 40, 11);
      } catch (e) {
        d.setFontSize(14); d.setFont('helvetica', 'bold'); d.text('NOGRAU | AMAZFRUT', 14, 15);
      }

      d.setFontSize(12); d.setFont('helvetica', 'bold');
      d.text('CONSOLIDADO POR DATA', pw - 14, 15, { align: 'right' });

      d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(100, 100, 100);
      d.text(`PERÍODO: ${dateFrom.split('-').reverse().join('/')} A ${dateTo.split('-').reverse().join('/')}`, 14, 25);
      d.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pw - 14, 25, { align: 'right' });

      d.setDrawColor(200, 200, 200); d.setLineWidth(0.1);
      d.line(14, 28, pw - 14, 28);

      d.setFontSize(7); d.setTextColor(150, 150, 150);
      d.text(`Página ${pageNum} de ${totalPages}`, pw / 2, ph - 10, { align: 'center' });
    };

    let currentY = 38;

    consolidadoPorData.forEach((day: any) => {
      doc.setFillColor(252, 252, 252);
      doc.rect(14, currentY, pw - 28, 7, 'F');
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(`DATA: ${format(parseISO(day.date), 'dd/MM/yyyy')}`, 17, currentY + 5);

      currentY += 7;

      autoTable(doc, {
        startY: currentY,
        head: [['ITEM', 'QTD TOTAL', 'UN']],
        body: day.items.map((it: any) => [
          it.descricao.toUpperCase(),
          fmtNum(it.quantidade, 3),
          it.unidade?.toUpperCase() || '—',
        ]),
        theme: 'plain',
        headStyles: { textColor: [100, 100, 100], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
        columnStyles: {
          1: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 18 },
        },
        margin: { left: 14, right: 14, top: 35 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      if (currentY > 265) {
        doc.addPage();
        currentY = 40;
      }
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addLayout(doc, i, totalPages);
    }

    doc.save(`consolidado_por_data_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Consolidado por data gerado com sucesso.');
  };

  // ── PDF Baixa em Estoque Sintético (Corporativo) ───────────────────────────
  const exportBaixaSintetica = () => {
    if (consolidado.length === 0) { toast.error('Sem dados para exportar'); return; }
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const addLayout = (d: jsPDF, pageNum: number, totalPages: number) => {
      try {
        d.addImage('/logo-nograu.png', 'PNG', 14, 10, 40, 11);
      } catch (e) {
        d.setFontSize(14); d.setFont('helvetica', 'bold'); d.text('NOGRAU | AMAZFRUT', 14, 15);
      }
      
      d.setFontSize(12); d.setFont('helvetica', 'bold');
      d.text('BAIXA EM ESTOQUE (SINTÉTICO)', pw - 14, 15, { align: 'right' });
      
      d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(100, 100, 100);
      d.text(`PERÍODO: ${dateFrom.split('-').reverse().join('/')} A ${dateTo.split('-').reverse().join('/')}`, 14, 25);
      d.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pw - 14, 25, { align: 'right' });

      d.setDrawColor(200, 200, 200); d.setLineWidth(0.1);
      d.line(14, 28, pw - 14, 28);

      d.setFontSize(7); d.setTextColor(150, 150, 150);
      d.text(`Página ${pageNum} de ${totalPages}`, pw / 2, ph - 10, { align: 'center' });
    };

    // Header informativo
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
    doc.text('RESUMO GERAL PARA BAIXA DE ESTOQUE', 14, 38);

    const calcConsolidado = (items_list: any[]) => {
      const map: Record<string, { descricao: string; unidade: string; quantidade: number; code: string; unit_price: number; valor_total: number }> = {};
      items_list.forEach((b: any) => {
        (b.stock_bonificacao_items || []).forEach((it: any) => {
          const key = it.item_id || it.descricao;
          const price = resolvePrice(it);
          const qty = Number(it.quantidade) || 0;
          if (!map[key]) map[key] = { descricao: it.descricao, unidade: it.unidade || '', quantidade: 0, code: resolveCode(it), unit_price: price, valor_total: 0 };
          map[key].quantidade += qty;
          map[key].valor_total += qty * price;
        });
      });
      return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
    };

    const consolidadoMarketing = calcConsolidado(filtered.filter(b => !b.is_internal_consumption));
    const consolidadoInternal  = calcConsolidado(filtered.filter(b => b.is_internal_consumption));

    let currentY = 42;

    if (consolidadoMarketing.length > 0) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
      doc.text('1. BAIXA: BONIFICAÇÕES (MARKETING / CLIENTES)', 14, currentY);
      currentY += 4;

      const totalMkt = consolidadoMarketing.reduce((s: number, it: any) => s + (it.valor_total || 0), 0);
      autoTable(doc, {
        startY: currentY,
        head: [['CÓD.', 'ITEM / PRODUTO', 'QTD TOTAL', 'UN', 'PREÇO UNIT.', 'VALOR TOTAL']],
        body: [
          ...consolidadoMarketing.map((it: any) => [
            it.code || '—',
            it.descricao.toUpperCase(),
            fmtNum(it.quantidade, 3),
            it.unidade?.toUpperCase() || 'UN',
            it.unit_price > 0 ? fmtBRL(it.unit_price) : '—',
            it.valor_total > 0 ? fmtBRL(it.valor_total) : '—',
          ]),
          ['', 'TOTAL GERAL', '', '', '', totalMkt > 0 ? fmtBRL(totalMkt) : '—'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [245, 245, 245], textColor: [40, 40, 40], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1 },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60], lineWidth: 0.1 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          2: { halign: 'right', cellWidth: 28 },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'right', cellWidth: 32 },
          5: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
        },
        didParseCell: (data: any) => {
          if (data.row.index === consolidadoMarketing.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
        margin: { left: 14, right: 14, top: 35 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    if (consolidadoInternal.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 40; }
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
      doc.text('2. BAIXA: CONSUMO INTERNO DA LOJA', 14, currentY);
      currentY += 4;

      const totalInt = consolidadoInternal.reduce((s: number, it: any) => s + (it.valor_total || 0), 0);
      autoTable(doc, {
        startY: currentY,
        head: [['CÓD.', 'ITEM / PRODUTO', 'QTD TOTAL', 'UN', 'PREÇO UNIT.', 'VALOR TOTAL']],
        body: [
          ...consolidadoInternal.map((it: any) => [
            it.code || '—',
            it.descricao.toUpperCase(),
            fmtNum(it.quantidade, 3),
            it.unidade?.toUpperCase() || 'UN',
            it.unit_price > 0 ? fmtBRL(it.unit_price) : '—',
            it.valor_total > 0 ? fmtBRL(it.valor_total) : '—',
          ]),
          ['', 'TOTAL GERAL', '', '', '', totalInt > 0 ? fmtBRL(totalInt) : '—'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [255, 245, 230], textColor: [100, 70, 0], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1 },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60], lineWidth: 0.1 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          2: { halign: 'right', cellWidth: 28 },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'right', cellWidth: 32 },
          5: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
        },
        didParseCell: (data: any) => {
          if (data.row.index === consolidadoInternal.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
        margin: { left: 14, right: 14, top: 35 },
      });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addLayout(doc, i, totalPages);
    }

    doc.save(`baixa_estoque_sintetica_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Relatório sintético gerado.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Estoque & Operações
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <Gift className="text-primary shrink-0" size={34} />
            Bonificações
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Controle de saídas para degustação e brindes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="glass-card gap-2 text-primary border-primary/20">
                <FileDown size={16} /> Exportar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start gap-2 h-9 text-xs" onClick={exportRelatorio}>
                  <LayoutList size={14} className="text-muted-foreground" /> Relatório Detalhado
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-xs" onClick={exportConsolidadoAnalitico}>
                  <History size={14} className="text-muted-foreground" /> Analítico (por Data)
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-xs" onClick={exportConsolidadoPorData}>
                  <CalendarDays size={14} className="text-muted-foreground" /> Consolidado por Data
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-xs" onClick={exportBaixaSintetica}>
                  <Package size={14} className="text-muted-foreground" /> Baixa em Estoque (Sintético)
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2">
            <Plus size={16} /> Novo Recibo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Recibos no Período', value: totalRecibos, icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-500/10' },
          { label: 'Total de Itens', value: totalItens.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), icon: Package, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Autorizadores', value: autUnicos, icon: User, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-black">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-muted-foreground shrink-0" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent border-none focus-visible:ring-0 w-[140px]" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-transparent border-none focus-visible:ring-0 w-[140px]" />
        </div>
        <Select value={filterAut} onValueChange={setFilterAut}>
          <SelectTrigger className="w-[200px] bg-transparent border-none focus-visible:ring-0">
            <SelectValue placeholder="Autorizado por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos autorizadores</SelectItem>
            {autorizadores.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por item ou autorizador..." className="pl-10 bg-muted/50 border-none"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table & Tabs */}
      <Tabs defaultValue="detalhado" onValueChange={(v: any) => setViewMode(v)} className="w-full">
        <TabsList className="glass-card mb-4 bg-muted/30 p-1 h-10">
          <TabsTrigger value="detalhado" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 text-xs font-bold gap-2">
            <LayoutList size={14} /> Lista Detalhada
          </TabsTrigger>
          <TabsTrigger value="consolidado" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 text-xs font-bold gap-2">
            <History size={14} /> Consolidado por Data
          </TabsTrigger>
          <TabsTrigger value="crm" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 text-xs font-bold gap-2">
            <User size={14} /> Pós-Venda (CRM)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhado" className="glass-card overflow-hidden border-none p-0 outline-none">
          {isLoading ? (
            <div className="p-20 text-center animate-pulse text-muted-foreground flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={30} />
              <span className="text-xs font-bold uppercase tracking-widest">Carregando recibos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold">Nenhum recibo encontrado</h3>
              <p className="text-muted-foreground mt-1 text-sm">Ajuste os filtros ou registre uma nova bonificação.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Data</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Autorizado por</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Itens Bonificados</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Motivo</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Favorecido</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b: any) => {
                    const items = b.stock_bonificacao_items || [];
                    return (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors group">
                        <td className="p-4">
                          <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{format(parseISO(b.data), 'dd/MM/yyyy')}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{format(parseISO(b.created_at), 'HH:mm')}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                              {b.autorizado_por?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{b.autorizado_por}</span>
                              {b.is_internal_consumption && (
                                <Badge variant="outline" className="w-fit text-[9px] h-4 py-0 px-1.5 border-amber-500/30 text-amber-600 bg-amber-500/5 gap-1 font-bold">
                                  <Coffee size={8} /> CONSUMO INTERNO
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {items.slice(0, 3).map((it: any, i: number) => (
                              <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Package size={10} className="shrink-0 opacity-50" />
                                {resolveCode(it) !== '—' && (
                                  <span className="font-black text-primary/70 text-[9px] bg-primary/5 px-1 py-0.5 rounded">
                                    {resolveCode(it)}
                                  </span>
                                )}
                                {it.descricao} — <strong className="text-gray-700 dark:text-gray-300">{it.quantidade} {it.unidade || ''}</strong>
                              </span>
                            ))}
                            {items.length > 3 && (
                              <Badge variant="secondary" className="text-[9px] font-bold w-fit px-1 py-0 h-4 bg-primary/5 text-primary border-none">
                                +{items.length - 3} mais
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-muted-foreground italic max-w-[150px] truncate">{b.motivo || '—'}</td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{b.favorecido || '—'}</span>
                            {b.whatsapp && <span className="text-[10px] text-muted-foreground">{b.whatsapp}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                              onClick={() => setEditingBonif(b)} title="Editar">
                              <Pencil size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-lg"
                              onClick={() => printRecibo(b)} title="Imprimir recibo">
                              <FileDown size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                              onClick={() => confirm('Excluir este recibo?') && deleteMutation.mutate(b.id)}
                              title="Excluir">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="consolidado" className="space-y-4 outline-none border-none p-0">
          {isLoading ? (
             <div className="p-20 text-center animate-pulse text-muted-foreground flex flex-col items-center gap-3">
               <Loader2 className="animate-spin text-primary" size={30} />
               <span className="text-xs font-bold uppercase tracking-widest">Calculando consolidados...</span>
             </div>
          ) : consolidadoPorData.length === 0 ? (
            <div className="py-20 glass-card text-center">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold">Sem dados consolidados</h3>
              <p className="text-muted-foreground mt-1 text-sm">Registre bonificações para ver o resumo por data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {consolidadoPorData.map((day) => (
                <div key={day.date} className="glass-card overflow-hidden border-primary/5 hover:border-primary/20 transition-colors">
                  <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-primary" />
                      <span className="font-black text-sm uppercase tracking-tighter">{format(parseISO(day.date), "eeee, dd 'de' MMMM", { locale: ptBR })}</span>
                    </div>
                    <Badge variant="outline" className="bg-white/50 text-[10px] font-black">{day.items.length} itens únicos</Badge>
                  </div>
                  <div className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-muted/30">
                          <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Item</th>
                          <th className="px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Qtd Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.items.map((it, idx) => (
                          <tr key={idx} className="border-b border-muted/10 last:border-0 hover:bg-muted/5 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium">{it.descricao}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-black text-primary text-base">{it.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
                              <span className="text-[10px] text-muted-foreground font-bold ml-1 uppercase">{it.unidade}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="crm" className="glass-card overflow-hidden border-none p-0 outline-none">
          {isLoading ? (
            <div className="p-20 text-center animate-pulse text-muted-foreground">Carregando dados CRM...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Data</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Favorecido</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp</th>
                    <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Feedback / Pós-Venda</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b: any) => {
                    const cleanPhone = b.whatsapp?.replace(/\D/g, '');
                    const waLink = `https://wa.me/55${cleanPhone}`;
                    return (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors group">
                        <td className="p-4 text-xs font-medium text-muted-foreground">{format(parseISO(b.data), 'dd/MM/yyyy')}</td>
                        <td className="p-4 font-bold text-sm">{b.favorecido || '—'}</td>
                        <td className="p-4">
                          {b.whatsapp ? (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" 
                               className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold hover:bg-green-500/20 transition-all">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              {b.whatsapp}
                            </a>
                          ) : <span className="text-xs text-muted-foreground italic">Não informado</span>}
                        </td>
                        <td className="p-4">
                          <Select 
                            value={b.feedback_status || 'Sem resposta'} 
                            onValueChange={(v) => updateStatusMutation.mutate({ id: b.id, status: v })}
                          >
                            <SelectTrigger className={cn(
                              "w-[240px] h-8 text-[11px] font-bold border-none shadow-none focus:ring-0 transition-colors",
                              b.feedback_status === 'Convertido em cliente' ? "bg-green-500/10 text-green-700" :
                              b.feedback_status === 'Disse que gostou e irá comprar' ? "bg-blue-500/10 text-blue-700" :
                              b.feedback_status === 'Não gostou' ? "bg-red-500/10 text-red-700" : "bg-gray-100 text-gray-500"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sem resposta" className="text-xs">Sem resposta</SelectItem>
                              <SelectItem value="Disse que gostou e irá comprar" className="text-xs">Disse que gostou e irá comprar</SelectItem>
                              <SelectItem value="Convertido em cliente" className="text-xs">Convertido em cliente</SelectItem>
                              <SelectItem value="Não gostou" className="text-xs">Não gostou</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal novo */}
      <BonifDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        products={products}
        storeId={currentStore?.id || ''}
        userId={user?.id || ''}
        printReciboFn={printRecibo}
        onSaved={() => {
          setIsOpen(false);
          qc.invalidateQueries({ queryKey: ['bonificacoes'] });
        }}
      />

      {/* Modal editar */}
      <BonifDialog
        open={!!editingBonif}
        onClose={() => setEditingBonif(null)}
        products={products}
        storeId={currentStore?.id || ''}
        userId={user?.id || ''}
        printReciboFn={printRecibo}
        initialData={editingBonif}
        onSaved={() => {
          setEditingBonif(null);
          qc.invalidateQueries({ queryKey: ['bonificacoes'] });
        }}
      />
    </div>
  );
}

// ── Form Dialog ────────────────────────────────────────────────────────────────

function BonifDialog({ open, onClose, products, storeId, userId, onSaved, printReciboFn, initialData }: {
  open: boolean; onClose: () => void; products: any[];
  storeId: string; userId: string; onSaved: () => void;
  printReciboFn: (bonif: any) => void;
  initialData?: any;
}) {
  const isEdit = !!initialData;

  const [data, setData]           = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [autPor, setAutPor]       = useState('');
  const [motivo, setMotivo]       = useState('');
  const [respEntr, setRespEntr]   = useState('');
  const [favorecido, setFavorecido] = useState('');
  const [whatsapp, setWhatsapp]   = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [obs, setObs]             = useState('');
  const [lines, setLines]         = useState<BonifItem[]>([emptyItem()]);
  const [openCombo, setOpenCombo] = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);

  // Preenche o formulário quando abrir no modo edição
  useEffect(() => {
    if (initialData && open) {
      setData(initialData.data || format(new Date(), 'yyyy-MM-dd'));
      setAutPor(initialData.autorizado_por || '');
      setMotivo(initialData.motivo || '');
      setRespEntr(initialData.responsavel_entrega || '');
      setFavorecido(initialData.favorecido || initialData.responsavel_recebimento || '');
      setWhatsapp(initialData.whatsapp || '');
      setIsInternal(initialData.is_internal_consumption || false);
      setObs(initialData.observacoes || '');
      const existingItems = (initialData.stock_bonificacao_items || []).map((i: any) => ({
        item_id: i.item_id || '',
        descricao: i.descricao || '',
        quantidade: i.quantidade || 1,
        unidade: i.unidade || '',
        unit_price: Number(i.unit_price) || 0,
      }));
      setLines(existingItems.length > 0 ? existingItems : [emptyItem()]);
    }
  }, [initialData, open]);

  const reset = () => {
    setData(format(new Date(), 'yyyy-MM-dd'));
    setAutPor(''); setMotivo(''); setRespEntr(''); setFavorecido(''); setWhatsapp(''); setIsInternal(false); setObs('');
    setLines([emptyItem()]);
  };

  const updateLine = (idx: number, field: keyof BonifItem, val: any) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));

  const addLine   = () => setLines(p => [...p, emptyItem()]);
  const removeLine = (idx: number) => lines.length > 1 && setLines(p => p.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!autPor.trim()) { toast.error('Informe quem autorizou'); return; }
    const valid = lines.filter(l => l.descricao.trim() && l.quantidade > 0);
    if (valid.length === 0) { toast.error('Adicione ao menos um item'); return; }

    setSaving(true);
    try {
      const payload = {
        store_id: storeId,
        data,
        autorizado_por: autPor,
        motivo: motivo || null,
        responsavel_entrega: respEntr || null,
        favorecido: favorecido || null,
        whatsapp: whatsapp || null,
        is_internal_consumption: isInternal,
        observacoes: obs || null,
        registrado_por: userId,
      };

      let bonifId: string;

      if (isEdit) {
        // UPDATE cabeçalho
        const { error: uErr } = await (supabase as any)
          .from('stock_bonificacoes')
          .update(payload)
          .eq('id', initialData.id);
        if (uErr) throw uErr;
        bonifId = initialData.id;

        // Recria os itens (delete + insert)
        await (supabase as any).from('stock_bonificacao_items').delete().eq('bonificacao_id', bonifId);
      } else {
        const { data: bonif, error: bErr } = await (supabase as any)
          .from('stock_bonificacoes')
          .insert([payload])
          .select()
          .single();
        if (bErr) throw bErr;
        bonifId = bonif.id;
      }

      const itemRows = valid.map(l => ({
        bonificacao_id: bonifId,
        item_id: l.item_id || null,
        descricao: l.descricao,
        quantidade: l.quantidade,
        unidade: l.unidade || null,
        unit_price: l.unit_price || 0,
      }));
      const { error: iErr } = await (supabase as any).from('stock_bonificacao_items').insert(itemRows);
      if (iErr) throw iErr;

      const bonifCompleto = {
        id: bonifId, data, autorizado_por: autPor, motivo,
        responsavel_entrega: respEntr, favorecido: favorecido,
        is_internal_consumption: isInternal,
        stock_bonificacao_items: itemRows.map((it, i) => ({
          ...it, descricao: valid[i].descricao, unidade: valid[i].unidade, unit_price: valid[i].unit_price || 0,
        })),
      };

      onSaved();
      toast.success(isEdit ? 'Recibo atualizado! Gerando PDF...' : 'Recibo registrado! Gerando PDF...');
      setTimeout(() => printReciboFn(bonifCompleto), 300);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="glass-card border-none sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Gift size={20} className="text-primary" />
            {isEdit ? 'Editar Recibo de Bonificação' : 'Novo Recibo de Bonificação'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Linha 1: Data + Autorizado por */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-muted/50 border-none" />
            </div>
            <div className="space-y-2">
              <Label>Autorizado por *</Label>
              <Input placeholder="Nome do responsável" value={autPor} onChange={e => setAutPor(e.target.value)} className="bg-muted/50 border-none" />
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo da Bonificação</Label>
            <Input placeholder="Ex: Compensação, Promoção, Cortesia, Degustação..."
              value={motivo} onChange={e => setMotivo(e.target.value)}
              className="bg-muted/50 border-none" />
          </div>

          {/* Linha 2: Responsáveis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável pela Entrega</Label>
              <Input placeholder="Nome" value={respEntr} onChange={e => setRespEntr(e.target.value)} className="bg-muted/50 border-none" />
            </div>
            <div className="space-y-2">
              <Label>Nome do Favorecido</Label>
              <Input placeholder="Nome de quem recebeu" value={favorecido} onChange={e => setFavorecido(e.target.value)} className="bg-muted/50 border-none" />
            </div>
          </div>

          {/* WhatsApp do Favorecido */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              WhatsApp do Favorecido
              <span className="text-[10px] font-normal text-muted-foreground">(Opcional para Pós-Venda)</span>
            </Label>
            <Input 
              placeholder="(00) 00000-0000" 
              value={whatsapp} 
              onChange={e => setWhatsapp(e.target.value)} 
              className="bg-muted/50 border-none font-medium" 
            />
          </div>

          {/* Consumo Interno Flag */}
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10">
            <Checkbox 
              id="internal_consumption" 
              checked={isInternal} 
              onCheckedChange={(v) => setIsInternal(v === true)} 
            />
            <div className="grid gap-1.5 leading-none">
              <label 
                htmlFor="internal_consumption" 
                className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Coffee size={14} className="text-primary" />
                Consumo Interno da Loja
              </label>
              <p className="text-[10px] text-muted-foreground font-medium">
                Marque se estes itens foram consumidos pela equipe ou operação interna.
              </p>
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px_90px_32px] gap-2 px-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Descrição do Item</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Qtd</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Preço Venda</p>
              <span />
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                <Popover open={openCombo === idx} onOpenChange={v => setOpenCombo(v ? idx : null)}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox"
                      className="w-full justify-between bg-muted/50 border-input font-normal truncate">
                      <span className="truncate">{line.descricao || 'Buscar produto...'}</span>
                      <ChevronsUpDown size={13} className="ml-2 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar pelo nome..." />
                      <CommandList>
                        <CommandEmpty>Não encontrado. Digite para usar descrição livre.</CommandEmpty>
                        <CommandGroup>
                          {(products as any[]).map((p: any) => (
                            <CommandItem key={p.id} value={p.name}
                              onSelect={() => {
                                updateLine(idx, 'item_id', p.id);
                                updateLine(idx, 'descricao', p.name);
                                updateLine(idx, 'unidade', p.unit);
                                updateLine(idx, 'unit_price', Number(p.avg_price) || 0);
                                setOpenCombo(null);
                              }}>
                              <Check size={13} className={cn('mr-2 shrink-0', line.item_id === p.id ? 'opacity-100 text-primary' : 'opacity-0')} />
                              {p.name}
                              <span className="ml-auto text-[10px] text-muted-foreground">{p.unit}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {/* Permitir descrição livre */}
                    <div className="p-2 border-t">
                      <Input
                        placeholder="Ou digite uma descrição livre..."
                        className="h-8 text-xs bg-muted/50 border-none"
                        value={line.item_id ? '' : line.descricao}
                        onChange={e => {
                          updateLine(idx, 'item_id', '');
                          updateLine(idx, 'descricao', e.target.value);
                          updateLine(idx, 'unidade', '');
                          updateLine(idx, 'unit_price', 0);
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                <Input type="number" step="0.01" min="0" placeholder="0"
                  value={line.quantidade || ''}
                  onChange={e => updateLine(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                  className="bg-muted/50 border-none text-center font-bold" />

                <Input type="number" step="0.01" min="0" placeholder="R$ 0,00"
                  value={line.unit_price || ''}
                  onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="bg-muted/50 border-none text-right text-xs font-bold" />

                <Button type="button" variant="ghost" size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                  <X size={14} />
                </Button>
              </div>
            ))}

            {/* Subtotal dos itens */}
            {lines.some(l => l.unit_price > 0 && l.quantidade > 0) && (
              <div className="flex justify-end pt-1">
                <div className="text-right px-3 py-1.5 bg-primary/5 rounded-xl">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Total estimado</p>
                  <p className="text-base font-black text-primary">
                    {fmtBRL(lines.reduce((s, l) => s + (l.unit_price || 0) * (l.quantidade || 0), 0))}
                  </p>
                </div>
              </div>
            )}

            <Button type="button" variant="outline"
              className="w-full gap-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary"
              onClick={addLine}>
              <Plus size={14} /> Adicionar Item
            </Button>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea placeholder="Motivo, cliente, etc." value={obs} onChange={e => setObs(e.target.value)}
              className="bg-muted/50 border-none resize-none" rows={2} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full font-bold gap-2 text-base">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Registrar Recibo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
