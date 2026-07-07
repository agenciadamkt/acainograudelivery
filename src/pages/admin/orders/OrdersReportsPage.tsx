'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';
import logoWhite from '@/assets/logo-white.png';
import logoGrauOS from '@/assets/logo-grauos.png';
import {
  BarChart2, Package, DollarSign, TrendingUp, Clock, Download, Search,
  Trophy, Boxes, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface FranchiseeOrderRow {
  id: string;
  franchisee_user_id: string;
  distribution_center_id: string | null;
  status: string;
  subtotal: number;
  fees_total: number;
  advertising_fee: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
  profiles: { full_name: string } | null;
  distribution_centers: { name: string } | null;
}

interface OrderItemRow {
  order_id: string;
  quantity: number;
  subtotal: number;
  franchisee_products: { name: string; unit: string; code: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  shipping: 'Em Trânsito',
  delivered: 'Entregue',
};

const STATUS_COLOR: Record<string, [number, number, number]> = {
  pending: [217, 119, 6],
  approved: [37, 99, 235],
  rejected: [220, 38, 38],
  shipping: [124, 58, 237],
  delivered: [22, 163, 74],
};

const PERIODOS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'todos', label: 'Todo o período' },
];

function calcularRange(periodo: string): { from: Date; to: Date } {
  const now = new Date();
  switch (periodo) {
    case 'hoje': return { from: startOfDay(now), to: endOfDay(now) };
    case '7d': return { from: startOfDay(new Date(now.getTime() - 6 * 86400000)), to: endOfDay(now) };
    case 'mes_anterior': {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case 'todos': return { from: new Date(2020, 0, 1), to: endOfDay(now) };
    case 'mes':
    default: return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export default function OrdersReportsPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterFranqueado, setFilterFranqueado] = useState('todos');
  const [filterCD, setFilterCD] = useState('todos');
  const [search, setSearch] = useState('');

  const { from, to } = useMemo(() => calcularRange(periodo), [periodo]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders_reports', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('franchisee_orders')
        .select(`
          id, franchisee_user_id, distribution_center_id, status, subtotal, fees_total,
          advertising_fee, total_amount, payment_method, created_at,
          profiles!franchisee_orders_franchisee_user_id_fkey(full_name),
          distribution_centers(name)
        `)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as FranchiseeOrderRow[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['orders_reports_items', orders.map(o => o.id).join(',')],
    queryFn: async () => {
      if (orders.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('franchisee_order_items')
        .select('order_id, quantity, subtotal, franchisee_products(name, unit, code)')
        .in('order_id', orders.map(o => o.id));
      if (error) throw error;
      return (data || []) as OrderItemRow[];
    },
    enabled: orders.length > 0,
  });

  // Nome da FRANQUIA (loja), não da pessoa — resolve via stores.franchisee_user_id
  // (vínculo direto/legado) e, pra quem só opera a unidade via user_unidades
  // (ex: conta promovida de cliente comum a operadora), cai nesse fallback.
  // profiles.full_name só entra como último recurso se nenhuma loja for achada.
  const franchiseeUserIds = useMemo(() => [...new Set(orders.map(o => o.franchisee_user_id))], [orders]);

  const { data: nomeLojaPorUsuario = {} } = useQuery({
    queryKey: ['orders_reports_store_names', franchiseeUserIds.join(',')],
    queryFn: async () => {
      if (franchiseeUserIds.length === 0) return {} as Record<string, string>;
      const map: Record<string, string> = {};

      const { data: lojasDirectas } = await supabase
        .from('stores')
        .select('franchisee_user_id, name')
        .in('franchisee_user_id', franchiseeUserIds);
      (lojasDirectas || []).forEach((s: any) => { if (s.franchisee_user_id) map[s.franchisee_user_id] = s.name; });

      const semVinculoDireto = franchiseeUserIds.filter(id => !map[id]);
      if (semVinculoDireto.length > 0) {
        const { data: unidades } = await (supabase as any)
          .from('user_unidades')
          .select('usuario_id, store:stores(name)')
          .in('usuario_id', semVinculoDireto);
        (unidades || []).forEach((u: any) => { if (u.store?.name && !map[u.usuario_id]) map[u.usuario_id] = u.store.name; });
      }

      return map;
    },
    enabled: franchiseeUserIds.length > 0,
  });

  const nomeFranquia = (o: FranchiseeOrderRow) =>
    nomeLojaPorUsuario[o.franchisee_user_id] || o.profiles?.full_name || 'Sem nome';

  const franqueados = useMemo(() =>
    [...new Map(orders.map(o => [o.franchisee_user_id, nomeFranquia(o)])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
  , [orders, nomeLojaPorUsuario]);

  const centrosDistribuicao = useMemo(() =>
    [...new Map(
      orders.filter(o => o.distribution_center_id).map(o => [o.distribution_center_id as string, o.distribution_centers?.name || '—'])
    ).entries()]
  , [orders]);

  const filtered = useMemo(() => orders.filter(o => {
    if (filterStatus !== 'todos' && o.status !== filterStatus) return false;
    if (filterFranqueado !== 'todos' && o.franchisee_user_id !== filterFranqueado) return false;
    if (filterCD !== 'todos' && o.distribution_center_id !== filterCD) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nome = nomeFranquia(o).toLowerCase();
      if (!nome.includes(q) && !o.id.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [orders, filterStatus, filterFranqueado, filterCD, search, nomeLojaPorUsuario]);

  const filteredIds = useMemo(() => new Set(filtered.map(o => o.id)), [filtered]);
  const filteredItems = useMemo(() => items.filter(i => filteredIds.has(i.order_id)), [items, filteredIds]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = filtered.length;
    const faturamento = filtered.reduce((s, o) => s + Number(o.total_amount), 0);
    const ticketMedio = total > 0 ? faturamento / total : 0;
    const taxaPublicidade = filtered.reduce((s, o) => s + Number(o.advertising_fee || 0), 0);
    const taxaBoleto = filtered.reduce((s, o) => s + Number(o.fees_total || 0), 0);
    const pendentes = filtered.filter(o => o.status === 'pending').length;

    const porStatus = Object.keys(STATUS_LABELS).map(status => {
      const lista = filtered.filter(o => o.status === status);
      return {
        status,
        label: STATUS_LABELS[status],
        total: lista.length,
        valor: lista.reduce((s, o) => s + Number(o.total_amount), 0),
        pct: total > 0 ? Math.round((lista.length / total) * 100) : 0,
        color: STATUS_COLOR[status],
      };
    }).filter(s => s.total > 0);

    return { total, faturamento, ticketMedio, taxaPublicidade, taxaBoleto, pendentes, porStatus };
  }, [filtered]);

  const rankingFranqueados = useMemo(() => {
    const map: Record<string, { nome: string; total: number; valor: number }> = {};
    filtered.forEach(o => {
      const key = o.franchisee_user_id;
      if (!map[key]) map[key] = { nome: nomeFranquia(o), total: 0, valor: 0 };
      map[key].total += 1;
      map[key].valor += Number(o.total_amount);
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filtered, nomeLojaPorUsuario]);

  const rankingProdutos = useMemo(() => {
    const map: Record<string, { nome: string; unidade: string; quantidade: number; valor: number }> = {};
    filteredItems.forEach(i => {
      const nome = i.franchisee_products?.name || 'Produto removido';
      const key = nome;
      if (!map[key]) map[key] = { nome, unidade: i.franchisee_products?.unit || '', quantidade: 0, valor: 0 };
      map[key].quantidade += Number(i.quantity);
      map[key].valor += Number(i.subtotal);
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filteredItems]);

  const rankingCDs = useMemo(() => {
    const map: Record<string, { nome: string; total: number; valor: number }> = {};
    filtered.forEach(o => {
      const key = o.distribution_center_id || '__sem_cd__';
      const nome = o.distribution_centers?.name || 'Sem centro definido';
      if (!map[key]) map[key] = { nome, total: 0, valor: 0 };
      map[key].total += 1;
      map[key].valor += Number(o.total_amount);
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [filtered]);

  const periodoLabel = `${format(from, 'dd/MM/yyyy')} a ${format(to, 'dd/MM/yyyy')}`;

  // ── PDF Analítico ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const resizeImg = (img: HTMLImageElement, maxPxW: number): string => {
      const scale = Math.min(1, maxPxW / (img.naturalWidth || maxPxW));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((img.naturalWidth || maxPxW) * scale);
      canvas.height = Math.round((img.naturalHeight || maxPxW * 0.35) * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    };
    const rawImgs = await Promise.all([loadImg(logoWhite), loadImg(logoGrauOS)]).catch(() => [null, null] as any);
    const imgWhiteB64 = rawImgs[0] ? resizeImg(rawImgs[0], 400) : null;
    const imgColorB64 = rawImgs[1] ? resizeImg(rawImgs[1], 280) : null;

    const doc = new jsPDF({ orientation: 'landscape' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ML = 14; const MR = 14; const CW = pw - ML - MR;
    const VIOLET: [number, number, number] = [109, 40, 217];
    const VIOLET_LIGHT: [number, number, number] = [237, 233, 254];
    const GRAY: [number, number, number] = [107, 114, 128];
    let pageNum = 0;

    const addFooter = () => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(`Pagina ${pageNum}`, pw / 2, ph - 6, { align: 'center' });
      doc.text('Relatorio de Pedidos — Franquia GrauOS', ML, ph - 6);
      doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pw - MR, ph - 6, { align: 'right' });
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
      doc.line(ML, ph - 9, pw - MR, ph - 9);
    };
    const newPage = () => {
      if (pageNum > 0) { addFooter(); doc.addPage(); }
      pageNum++;
    };

    // ─── CAPA ──────────────────────────────────────────────────────────────────
    newPage();
    const splitY = ph * 0.58;
    doc.setFillColor(76, 29, 149);
    doc.rect(0, 0, pw, splitY, 'F');
    doc.setFillColor(250, 248, 255);
    doc.rect(0, splitY, pw, ph - splitY, 'F');

    const logoMaxW = 75; const logoMaxH = 26;
    let logoW = logoMaxW; let logoH = logoMaxH;
    if (rawImgs[0]?.naturalWidth && rawImgs[0]?.naturalHeight) {
      const ratio = rawImgs[0].naturalWidth / rawImgs[0].naturalHeight;
      logoH = logoMaxW / ratio <= logoMaxH ? logoMaxW / ratio : logoMaxH;
      logoW = logoH * ratio;
    }
    const logoX = (pw - logoW) / 2; const logoY = 14;
    if (imgWhiteB64) { try { doc.addImage(imgWhiteB64, 'PNG', logoX, logoY, logoW, logoH); } catch (_) {} }

    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(pw / 2 - 36, logoY + logoH + 5, pw / 2 + 36, logoY + logoH + 5);
    doc.setLineDashPattern([], 0);

    const titleY = logoY + logoH + 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(255, 255, 255);
    doc.text('Relatorio Analitico', pw / 2, titleY, { align: 'center' });
    doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.setTextColor(216, 180, 254);
    doc.text('Pedidos de Insumos — Franquia', pw / 2, titleY + 11, { align: 'center' });

    doc.setFontSize(9); doc.setTextColor(196, 181, 253);
    doc.text(`Periodo: ${periodoLabel}`, pw / 2, titleY + 26, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(167, 139, 250);
    doc.text(
      `${summary.total} pedido${summary.total !== 1 ? 's' : ''}  |  Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm")}`,
      pw / 2, titleY + 35, { align: 'center' }
    );

    const kpis = [
      { label: 'Total Pedidos', val: String(summary.total) },
      { label: 'Faturamento', val: formatBRL(summary.faturamento) },
      { label: 'Ticket Medio', val: formatBRL(summary.ticketMedio) },
      { label: 'Tx Publicidade', val: formatBRL(summary.taxaPublicidade) },
      { label: 'Tx Boleto', val: formatBRL(summary.taxaBoleto) },
      { label: 'Pendentes', val: String(summary.pendentes) },
    ];
    const kpiCardW = (CW - kpis.length * 3 + 3) / kpis.length; const kpiCardH = 26;
    const kpiCardTop = splitY + 10;
    kpis.forEach((k, i) => {
      const cx = ML + i * (kpiCardW + 3);
      doc.setFillColor(220, 215, 235);
      doc.roundedRect(cx + 0.8, kpiCardTop + 0.8, kpiCardW, kpiCardH, 2, 2, 'F');
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, kpiCardTop, kpiCardW, kpiCardH, 2, 2, 'F');
      doc.setFillColor(...VIOLET);
      doc.roundedRect(cx, kpiCardTop, kpiCardW, 2, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...VIOLET);
      doc.text(k.val, cx + kpiCardW / 2, kpiCardTop + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GRAY);
      doc.text(k.label.toUpperCase(), cx + kpiCardW / 2, kpiCardTop + 22, { align: 'center' });
    });

    const ftrLogoMaxW = 40; const ftrLogoMaxH = 13;
    let ftrLogoW = ftrLogoMaxW; let ftrLogoH = ftrLogoMaxH;
    if (rawImgs[1]?.naturalWidth && rawImgs[1]?.naturalHeight) {
      const ratio = rawImgs[1].naturalWidth / rawImgs[1].naturalHeight;
      ftrLogoH = ftrLogoMaxW / ratio <= ftrLogoMaxH ? ftrLogoMaxW / ratio : ftrLogoMaxH;
      ftrLogoW = ftrLogoH * ratio;
    }
    const coverFtrY = ph - 26;
    if (imgColorB64) { try { doc.addImage(imgColorB64, 'PNG', (pw - ftrLogoW) / 2, coverFtrY, ftrLogoW, ftrLogoH); } catch (_) {} }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text('Gestao de Cargas — Franquia GrauOS', pw / 2, coverFtrY + ftrLogoH + 4, { align: 'center' });

    // ─── PÁG 2 — SUMÁRIO + RANKINGS ────────────────────────────────────────────
    newPage();
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('SUMARIO EXECUTIVO', ML, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(221, 214, 254);
    doc.text(periodoLabel, pw - MR, 12, { align: 'right' });

    let y = 26;
    const cardW = (CW - 10) / 6; const cardH = 22;
    kpis.forEach((k, i) => {
      const kx = ML + i * (cardW + 2);
      doc.setFillColor(...VIOLET_LIGHT);
      doc.roundedRect(kx, y, cardW, cardH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...VIOLET);
      doc.text(k.val, kx + cardW / 2, y + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY);
      doc.text(k.label.toUpperCase(), kx + cardW / 2, y + 19, { align: 'center' });
    });
    y += cardH + 10;

    // Status breakdown
    if (summary.porStatus.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
      doc.text('PEDIDOS POR STATUS', ML, y); y += 2;
      const halfW = CW / 2 - 20;
      autoTable(doc, {
        startY: y,
        head: [['Status', 'Pedidos', '%', 'Valor']],
        body: summary.porStatus.map(s => [s.label, String(s.total), `${s.pct}%`, formatBRL(s.valor)]),
        theme: 'striped',
        headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        tableWidth: halfW,
        margin: { left: ML },
      });

      autoTable(doc, {
        startY: y,
        head: [['Centro de Distribuicao', 'Pedidos', 'Valor']],
        body: rankingCDs.map(c => [c.nome, String(c.total), formatBRL(c.valor)]),
        theme: 'striped',
        headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        tableWidth: halfW,
        margin: { left: ML + halfW + 20 },
      });
    }

    // ─── PÁG 3 — RANKINGS ──────────────────────────────────────────────────────
    newPage();
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('RANKINGS', ML, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(221, 214, 254);
    doc.text(periodoLabel, pw - MR, 12, { align: 'right' });

    const halfW2 = CW / 2 - 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
    doc.text('TOP 10 FRANQUEADOS (POR VALOR)', ML, 26);
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Franqueado', 'Pedidos', 'Valor']],
      body: rankingFranqueados.map((f, i) => [i + 1, f.nome, String(f.total), formatBRL(f.valor)]),
      theme: 'striped',
      headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
      tableWidth: halfW2,
      margin: { left: ML },
    });

    doc.text('TOP 10 PRODUTOS (POR VALOR)', ML + halfW2 + 20, 26);
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Produto', 'Qtd', 'Valor']],
      body: rankingProdutos.map((p, i) => [i + 1, `${p.nome} (${p.unidade})`, String(p.quantidade), formatBRL(p.valor)]),
      theme: 'striped',
      headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 } },
      tableWidth: halfW2,
      margin: { left: ML + halfW2 + 20 },
    });

    // ─── PÁG 4+ — LISTAGEM DETALHADA ───────────────────────────────────────────
    newPage();
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('LISTAGEM DETALHADA DE PEDIDOS', ML, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(221, 214, 254);
    doc.text(`${filtered.length} registros  |  ${periodoLabel}`, pw - MR, 12, { align: 'right' });

    autoTable(doc, {
      startY: 22,
      head: [['ID', 'Franqueado', 'Data/Hora', 'CD', 'Status', 'Pagamento', 'Total']],
      body: filtered.map(o => [
        `#${o.id.slice(0, 8).toUpperCase()}`,
        nomeFranquia(o),
        format(parseISO(o.created_at), 'dd/MM/yy HH:mm'),
        o.distribution_centers?.name || '—',
        STATUS_LABELS[o.status] || o.status,
        o.payment_method || '—',
        formatBRL(o.total_amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: ML, right: MR },
      didDrawPage: () => { if (doc.internal.getNumberOfPages() > pageNum) { pageNum = doc.internal.getNumberOfPages(); } },
    });

    addFooter();
    doc.save(`relatorio-pedidos-franquia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-purple-600" /> Relatórios de Franquia
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Análise detalhada de pedidos, faturamento e desempenho das unidades.</p>
        </div>
        <Button onClick={exportPDF} className="gap-2 bg-purple-600 hover:bg-purple-700 h-12 rounded-xl">
          <Download className="h-4 w-4" /> Exportar PDF Analítico
        </Button>
      </header>

      {/* Filtros */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar franqueado ou ID..." className="pl-9 bg-muted/50 border-none"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[160px] bg-muted/50 border-none"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] bg-muted/50 border-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFranqueado} onValueChange={setFilterFranqueado}>
            <SelectTrigger className="w-[200px] bg-muted/50 border-none"><SelectValue placeholder="Franqueado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos franqueados</SelectItem>
              {franqueados.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {centrosDistribuicao.length > 0 && (
            <Select value={filterCD} onValueChange={setFilterCD}>
              <SelectTrigger className="w-[180px] bg-muted/50 border-none"><SelectValue placeholder="Centro de Distrib." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os CDs</SelectItem>
                {centrosDistribuicao.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="h-24 rounded-2xl animate-pulse bg-muted/50" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Pedidos', val: String(summary.total), icon: Package, color: 'text-purple-600 bg-purple-50' },
              { label: 'Faturamento', val: formatBRL(summary.faturamento), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Ticket Médio', val: formatBRL(summary.ticketMedio), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
              { label: 'Tx. Publicidade', val: formatBRL(summary.taxaPublicidade), icon: BarChart2, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Tx. Boleto', val: formatBRL(summary.taxaBoleto), icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
              { label: 'Pendentes', val: String(summary.pendentes), icon: Clock, color: 'text-red-600 bg-red-50' },
            ].map(k => (
              <Card key={k.label} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.color}`}>
                    <k.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-black mt-0.5">{k.val}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Status breakdown */}
          {summary.porStatus.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {summary.porStatus.map(s => (
                <Badge key={s.status} variant="outline" className="px-3 py-1.5 rounded-full text-xs font-bold gap-1.5"
                  style={{ borderColor: `rgb(${s.color.join(',')})`, color: `rgb(${s.color.join(',')})` }}>
                  {s.label}: {s.total} ({s.pct}%) — {formatBRL(s.valor)}
                </Badge>
              ))}
            </div>
          )}

          {/* Rankings */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Trophy className="h-4 w-4 text-amber-500" /> Top Franqueados
                </h3>
                <div className="space-y-2">
                  {rankingFranqueados.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período.</p>}
                  {rankingFranqueados.map((f, i) => (
                    <div key={f.nome + i} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{f.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{f.total} pedido{f.total !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-purple-600 shrink-0">{formatBRL(f.valor)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Boxes className="h-4 w-4 text-purple-600" /> Top Produtos
                </h3>
                <div className="space-y-2">
                  {rankingProdutos.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período.</p>}
                  {rankingProdutos.map((p, i) => (
                    <div key={p.nome + i} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{p.quantidade} {p.unidade}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-purple-600 shrink-0">{formatBRL(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {rankingCDs.length > 0 && (
            <Card className="rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-blue-600" /> Por Centro de Distribuição
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rankingCDs.map(c => (
                    <div key={c.nome} className="bg-muted/50 rounded-xl p-3">
                      <p className="text-sm font-bold truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.total} pedido{c.total !== 1 ? 's' : ''}</p>
                      <p className="text-sm font-black text-purple-600 mt-1">{formatBRL(c.valor)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela detalhada */}
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 border-b">
                <h3 className="font-bold">Pedidos no Período ({filtered.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left font-bold text-xs uppercase tracking-wide p-3">ID</th>
                      <th className="text-left font-bold text-xs uppercase tracking-wide p-3">Franqueado</th>
                      <th className="text-left font-bold text-xs uppercase tracking-wide p-3">Data</th>
                      <th className="text-left font-bold text-xs uppercase tracking-wide p-3">Status</th>
                      <th className="text-right font-bold text-xs uppercase tracking-wide p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum pedido encontrado no período.</td></tr>
                    )}
                    {filtered.slice(0, 100).map(o => (
                      <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-3 font-semibold">{nomeFranquia(o)}</td>
                        <td className="p-3 text-muted-foreground">{format(parseISO(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs"
                            style={{ borderColor: `rgb(${(STATUS_COLOR[o.status] || [107,114,128]).join(',')})`, color: `rgb(${(STATUS_COLOR[o.status] || [107,114,128]).join(',')})` }}>
                            {STATUS_LABELS[o.status] || o.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-bold text-purple-600">{formatBRL(o.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 100 && (
                <p className="text-xs text-muted-foreground text-center p-3">
                  Mostrando 100 de {filtered.length} pedidos — exporte o PDF para ver a listagem completa.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
