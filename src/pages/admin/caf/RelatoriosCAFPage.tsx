'use client';

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import logoWhite from '@/assets/logo-white.png';
import logoGrauOS from '@/assets/logo-grauos.png';
import {
  BarChart3, ArrowLeft, Filter, Download, Clock, Star,
  TrendingUp, Users, CheckCircle2, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CATEGORIAS, PRIORIDADES, STATUS_LIST } from './AtendimentosPage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtMin = (min: number | null) => {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
};

export default function RelatoriosCAFPage() {
  const navigate = useNavigate();

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo]     = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [filterCat, setFilterCat]         = useState('todas');
  const [filterStatus, setFilterStatus]   = useState('todos');
  const [filterAtend, setFilterAtend]     = useState('todos');
  const [filterFranquia, setFilterFranquia] = useState('todas');

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['caf_relatorios', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('caf_atendimentos')
        .select('*, caf_satisfacao(nota, nps, problema_resolvido)')
        .gte('created_at', dateFrom + 'T00:00:00')
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      const rows = data || [];

      // Coleta IDs e emails de atendentes para resolver nomes via user_profiles
      const ids    = [...new Set(rows.map((a: any) => a.atendente_id).filter(Boolean))];
      const emails = [...new Set(
        rows.map((a: any) => a.atendente_nome).filter((v: any) => typeof v === 'string' && v.includes('@'))
      )];

      let idMap:    Record<string, string> = {};
      let emailMap: Record<string, string> = {};

      if (ids.length > 0 || emails.length > 0) {
        let q = (supabase as any).from('user_profiles').select('id, nome, email');
        if (ids.length > 0 && emails.length > 0) {
          q = q.or(`id.in.(${ids.join(',')}),email.in.(${emails.map((e: string) => `"${e}"`).join(',')})`);
        } else if (ids.length > 0) {
          q = q.in('id', ids);
        } else {
          q = q.in('email', emails);
        }
        const { data: profiles } = await q;
        (profiles || []).forEach((p: any) => {
          if (p.nome) {
            if (p.id)    idMap[p.id]       = p.nome;
            if (p.email) emailMap[p.email]  = p.nome;
          }
        });
      }

      return rows.map((a: any) => ({
        ...a,
        atendente_nome_display:
          (a.atendente_id && idMap[a.atendente_id]) ||
          (a.atendente_nome && emailMap[a.atendente_nome]) ||
          a.atendente_nome || null,
      }));
    },
  });

  const franquias = useMemo(() =>
    [...new Set(atendimentos.map((a: any) => a.loja_franqueada).filter(Boolean))].sort() as string[]
  , [atendimentos]);

  const filtered = useMemo(() => atendimentos.filter((a: any) => {
    if (filterCat !== 'todas' && a.categoria !== filterCat) return false;
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false;
    if (filterAtend !== 'todos' && a.atendente_nome_display !== filterAtend) return false;
    if (filterFranquia !== 'todas' && a.loja_franqueada !== filterFranquia) return false;
    return true;
  }), [atendimentos, filterCat, filterStatus, filterAtend, filterFranquia]);

  const atendentes = useMemo(() =>
    [...new Set(atendimentos.map((a: any) => a.atendente_nome_display).filter(Boolean))] as string[]
  , [atendimentos]);

  // ── Rankings ────────────────────────────────────────────────────────────────
  const rankingFranquias = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((a: any) => { if (a.loja_franqueada) map[a.loja_franqueada] = (map[a.loja_franqueada] || 0) + 1; });
    return Object.entries(map).map(([loja, total]) => ({ loja, total })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const rankingProblemas = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((a: any) => {
      const key = a.subcategoria ? `${a.categoria} → ${a.subcategoria}` : a.categoria;
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([problema, total]) => ({ problema, total })).sort((a, b) => b.total - a.total).slice(0, 20);
  }, [filtered]);

  const rankingAtendentes = useMemo(() => {
    const map: Record<string, { total: number; resolvidos: number; tempoTotal: number; comTempo: number }> = {};
    filtered.forEach((a: any) => {
      const nome = a.atendente_nome_display || 'Sem atendente';
      if (!map[nome]) map[nome] = { total: 0, resolvidos: 0, tempoTotal: 0, comTempo: 0 };
      map[nome].total++;
      if (['Resolvido', 'Encerrado'].includes(a.status)) map[nome].resolvidos++;
      if (a.tempo_resolucao_min != null) { map[nome].tempoTotal += a.tempo_resolucao_min; map[nome].comTempo++; }
    });
    return Object.entries(map)
      .map(([nome, d]) => ({ nome, ...d, tempoMedio: d.comTempo ? Math.round(d.tempoTotal / d.comTempo) : null }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ── Summary Stats ───────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = filtered.length;
    const resolvidos = filtered.filter((a: any) => ['Resolvido', 'Encerrado'].includes(a.status)).length;
    const pendentes = total - resolvidos;
    const comTempo = filtered.filter((a: any) => a.tempo_resolucao_min != null);
    const tempoMedio = comTempo.length ? Math.round(comTempo.reduce((s: number, a: any) => s + a.tempo_resolucao_min, 0) / comTempo.length) : null;

    const allSat = filtered.flatMap((a: any) => a.caf_satisfacao || []);
    const comNota = allSat.filter((s: any) => s.nota != null);
    const notaMedia = comNota.length ? (comNota.reduce((s: number, r: any) => s + r.nota, 0) / comNota.length).toFixed(1) : '—';
    const comNps = allSat.filter((s: any) => s.nps != null);
    const npsMedia = comNps.length ? Math.round(comNps.reduce((s: number, r: any) => s + r.nps, 0) / comNps.length) : null;
    const promotores = comNps.filter((s: any) => s.nps >= 9).length;
    const neutros    = comNps.filter((s: any) => s.nps >= 7 && s.nps <= 8).length;
    const detratores = comNps.filter((s: any) => s.nps <= 6).length;

    return { total, resolvidos, pendentes, tempoMedio, notaMedia, npsMedia, promotores, neutros, detratores, totalNps: comNps.length };
  }, [filtered]);

  // ── Export PDF Analítico ────────────────────────────────────────────────────
  const exportPDF = async () => {
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const resizeImg = (img: HTMLImageElement, maxPxW: number): string => {
      const scale  = Math.min(1, maxPxW / (img.naturalWidth || maxPxW));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round((img.naturalWidth  || maxPxW) * scale);
      canvas.height = Math.round((img.naturalHeight || maxPxW * 0.35) * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    };
    const rawImgs = await Promise.all([loadImg(logoWhite), loadImg(logoGrauOS)]).catch(() => [null, null] as any);
    const imgWhiteB64 = rawImgs[0] ? resizeImg(rawImgs[0], 400) : null;
    const imgColorB64 = rawImgs[1] ? resizeImg(rawImgs[1], 280) : null;

    const doc = new jsPDF({ orientation: 'landscape' });
    const pw  = doc.internal.pageSize.getWidth();   // 297
    const ph  = doc.internal.pageSize.getHeight();  // 210
    const ML  = 14;
    const MR  = 14;
    const CW  = pw - ML - MR;
    const VIOLET: [number, number, number] = [109, 40, 217];
    const VIOLET_LIGHT: [number, number, number] = [237, 233, 254];
    const GREEN:  [number, number, number] = [22, 163, 74];
    const AMBER:  [number, number, number] = [217, 119, 6];
    const RED:    [number, number, number] = [220, 38, 38];
    const GRAY:   [number, number, number] = [107, 114, 128];
    const periodoLabel = `${dateFrom.split('-').reverse().join('/')} a ${dateTo.split('-').reverse().join('/')}`;
    let pageNum = 0;

    const addFooter = () => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(`Pagina ${pageNum}`, pw / 2, ph - 6, { align: 'center' });
      doc.text('Relatorio Analitico CAF — GrauOS', ML, ph - 6);
      doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pw - MR, ph - 6, { align: 'right' });
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
      doc.line(ML, ph - 9, pw - MR, ph - 9);
    };

    const newPage = () => {
      if (pageNum > 0) addFooter();
      if (pageNum > 0) doc.addPage();
      pageNum++;
    };

    // helper: draw star rating (nota 1-5) inline in PDF
    const drawStars = (x: number, y: number, nota: number | null) => {
      if (nota == null) { doc.setTextColor(...GRAY); doc.setFontSize(7); doc.text('—', x, y); return; }
      const size = 2.2; const gap = 0.5;
      for (let i = 1; i <= 5; i++) {
        const cx = x + (i - 1) * (size + gap);
        if (i <= nota) {
          doc.setFillColor(245, 158, 11); // amber-400
          doc.circle(cx + size / 2, y - size * 0.6, size / 2, 'F');
        } else {
          doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
          doc.circle(cx + size / 2, y - size * 0.6, size / 2, 'S');
        }
      }
    };

    // helper: NPS pill
    const npsColor = (nps: number | null): [number, number, number] => {
      if (nps == null) return GRAY;
      if (nps >= 9) return GREEN;
      if (nps >= 7) return AMBER;
      return RED;
    };

    const statusColor = (s: string): [number, number, number] => {
      if (['Resolvido', 'Encerrado'].includes(s)) return GREEN;
      if (s === 'Em Atendimento') return [37, 99, 235];
      if (s === 'Aguardando Franqueado') return AMBER;
      return GRAY;
    };

    const fmtDt = (iso: string | null | undefined) => {
      if (!iso) return '—';
      return format(parseISO(iso), 'dd/MM HH:mm', { locale: ptBR });
    };

    // ─── CAPA ──────────────────────────────────────────────────────────────────
    newPage();

    // Fundo: violeta profundo no topo (58%), branco suave na base (landscape: pw=297 ph=210)
    const splitY = ph * 0.58;                          // ≈ 121.8 mm
    doc.setFillColor(76, 29, 149);                     // violet-900
    doc.rect(0, 0, pw, splitY, 'F');
    doc.setFillColor(250, 248, 255);
    doc.rect(0, splitY, pw, ph - splitY, 'F');

    // Logo GrauOS (branca) — proporção preservada, centralizada na faixa violeta
    const logoMaxW = 75; const logoMaxH = 26;
    let logoW = logoMaxW; let logoH = logoMaxH;
    if (rawImgs[0]?.naturalWidth && rawImgs[0]?.naturalHeight) {
      const ratio = rawImgs[0].naturalWidth / rawImgs[0].naturalHeight;
      logoH = logoMaxW / ratio <= logoMaxH ? logoMaxW / ratio : logoMaxH;
      logoW = logoH * ratio;
    }
    const logoX = (pw - logoW) / 2; const logoY = 14;
    if (imgWhiteB64) {
      try { doc.addImage(imgWhiteB64, 'PNG', logoX, logoY, logoW, logoH); } catch (_) {}
    }

    // Linha fina elegante abaixo do logo
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(pw / 2 - 36, logoY + logoH + 5, pw / 2 + 36, logoY + logoH + 5);
    doc.setLineDashPattern([], 0);

    // Título principal
    const titleY = logoY + logoH + 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(255, 255, 255);
    doc.text('Relatorio Analitico', pw / 2, titleY, { align: 'center' });
    doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.setTextColor(216, 180, 254);
    doc.text('CAF — Central de Atendimento ao Franqueado', pw / 2, titleY + 11, { align: 'center' });

    // Período e contagem
    doc.setFontSize(9); doc.setTextColor(196, 181, 253);
    doc.text(`Periodo: ${periodoLabel}`, pw / 2, titleY + 26, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(167, 139, 250);
    doc.text(
      `${filtered.length} atendimento${filtered.length !== 1 ? 's' : ''}  |  Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm")}`,
      pw / 2, titleY + 35, { align: 'center' }
    );

    // ── KPI Cards na área branca ──────────────────────────────────────────────
    const kpis = [
      { label: 'Total',       val: String(summary.total),                                    accent: VIOLET },
      { label: 'Resolvidos',  val: String(summary.resolvidos),                               accent: GREEN  },
      { label: 'Pendentes',   val: String(summary.pendentes),                                accent: AMBER  },
      { label: 'Tempo Medio', val: fmtMin(summary.tempoMedio),                              accent: [37, 99, 235] as [number,number,number] },
      { label: 'Nota Media',  val: String(summary.notaMedia),                               accent: [234, 179, 8] as [number,number,number] },
      { label: 'NPS Medio',   val: summary.npsMedia != null ? String(summary.npsMedia) : '—', accent: [16, 185, 129] as [number,number,number] },
    ];
    const kpiCardW = (CW - kpis.length * 3 + 3) / kpis.length; const kpiCardH = 26;
    const kpiCardTop = splitY + 10;
    kpis.forEach((k, i) => {
      const cx = ML + i * (kpiCardW + 3);
      // Sombra suave
      doc.setFillColor(220, 215, 235);
      doc.roundedRect(cx + 0.8, kpiCardTop + 0.8, kpiCardW, kpiCardH, 2, 2, 'F');
      // Card branco
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, kpiCardTop, kpiCardW, kpiCardH, 2, 2, 'F');
      // Borda superior colorida
      doc.setFillColor(...k.accent);
      doc.roundedRect(cx, kpiCardTop, kpiCardW, 2, 1, 1, 'F');
      // Valor
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...k.accent);
      doc.text(k.val, cx + kpiCardW / 2, kpiCardTop + 14, { align: 'center' });
      // Label
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GRAY);
      doc.text(k.label.toUpperCase(), cx + kpiCardW / 2, kpiCardTop + 22, { align: 'center' });
    });

    // Logo colorida pequena + tagline no rodapé da capa (área branca) — proporção preservada
    const ftrLogoMaxW = 40; const ftrLogoMaxH = 13;
    let ftrLogoW = ftrLogoMaxW; let ftrLogoH = ftrLogoMaxH;
    if (rawImgs[1]?.naturalWidth && rawImgs[1]?.naturalHeight) {
      const ratio = rawImgs[1].naturalWidth / rawImgs[1].naturalHeight;
      ftrLogoH = ftrLogoMaxW / ratio <= ftrLogoMaxH ? ftrLogoMaxW / ratio : ftrLogoMaxH;
      ftrLogoW = ftrLogoH * ratio;
    }
    const coverFtrY = ph - 26;     // 184mm — bem acima da linha do footer (201mm)
    if (imgColorB64) {
      try { doc.addImage(imgColorB64, 'PNG', (pw - ftrLogoW) / 2, coverFtrY, ftrLogoW, ftrLogoH); } catch (_) {}
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text('Central de Atendimento ao Franqueado', pw / 2, coverFtrY + ftrLogoH + 4, { align: 'center' });

    // ─── PÁG 2 — SUMÁRIO EXECUTIVO ────────────────────────────────────────────
    newPage();
    // Header strip
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('SUMARIO EXECUTIVO', ML, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(221, 214, 254);
    doc.text(periodoLabel, pw - MR, 12, { align: 'right' });

    // KPI cards row
    let y = 26;
    const cardW = (CW - 10) / 6; const cardH = 22;
    kpis.forEach((k, i) => {
      const kx = ML + i * (cardW + 2);
      doc.setFillColor(...VIOLET_LIGHT);
      doc.roundedRect(kx, y, cardW, cardH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...VIOLET);
      doc.text(k.val, kx + cardW / 2, y + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY);
      doc.text(k.label.toUpperCase(), kx + cardW / 2, y + 19, { align: 'center' });
    });
    y += cardH + 10;

    // NPS Breakdown
    if (summary.totalNps > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
      doc.text('CLASSIFICACAO NPS', ML, y); y += 6;
      const npsW = CW / 3 - 4;
      const npsData = [
        { label: 'Promotores (9-10)', val: summary.promotores, pct: Math.round((summary.promotores / summary.totalNps) * 100), color: GREEN },
        { label: 'Neutros (7-8)',     val: summary.neutros,    pct: Math.round((summary.neutros    / summary.totalNps) * 100), color: AMBER },
        { label: 'Detratores (0-6)',  val: summary.detratores, pct: Math.round((summary.detratores / summary.totalNps) * 100), color: RED   },
      ];
      npsData.forEach((n, i) => {
        const nx = ML + i * (npsW + 6);
        doc.setFillColor(n.color[0], n.color[1], n.color[2]);
        doc.roundedRect(nx, y, npsW, 24, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
        doc.text(String(n.val), nx + npsW / 2, y + 13, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(`${n.label} — ${n.pct}%`, nx + npsW / 2, y + 21, { align: 'center' });
      });
      y += 32;
    }

    // Top problemas compacto
    if (rankingProblemas.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
      doc.text('TOP PROBLEMAS', ML, y); y += 2;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Categoria / Subcategoria', 'Ocorrencias', '%']],
        body: rankingProblemas.slice(0, 10).map((p, i) => [
          i + 1, p.problema, p.total,
          summary.total > 0 ? `${Math.round((p.total / summary.total) * 100)}%` : '0%',
        ]),
        theme: 'striped',
        headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center' }, 3: { halign: 'center' } },
        margin: { left: ML, right: MR },
      });
    }

    // ─── PÁG 3+ — LISTAGEM ANALÍTICA DETALHADA ────────────────────────────────
    newPage();
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('LISTAGEM ANALITICA DE ATENDIMENTOS', ML, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(221, 214, 254);
    doc.text(`${filtered.length} registros  |  ${periodoLabel}`, pw - MR, 12, { align: 'right' });

    const detailBody = filtered.map((a: any) => {
      const sat   = a.caf_satisfacao?.[0];
      const nota  = sat?.nota ?? null;
      const nps   = sat?.nps  ?? null;
      const abertura  = fmtDt(a.created_at);
      const fechamento = fmtDt(a.resolvido_em || a.encerrado_em);
      return [
        a.protocolo || '—',
        abertura,
        fechamento,
        fmtMin(a.tempo_resolucao_min),
        a.loja_franqueada || '—',
        a.categoria || '—',
        a.atendente_nome_display || a.atendente_nome || '—',
        a.status || '—',
        a.prioridade || '—',
        nota != null ? `${nota}/5` : '—',
        nps  != null ? String(nps)  : '—',
      ];
    });

    autoTable(doc, {
      startY: 22,
      head: [['Protocolo', 'Abertura', 'Fechamento', 'Tempo', 'Franquia', 'Categoria', 'Atendente', 'Status', 'Prioridade', 'Nota', 'NPS']],
      body: detailBody,
      theme: 'striped',
      headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 246, 255] },
      columnStyles: {
        0:  { cellWidth: 22, fontStyle: 'bold', textColor: VIOLET },
        1:  { cellWidth: 20, halign: 'center' },
        2:  { cellWidth: 20, halign: 'center' },
        3:  { cellWidth: 14, halign: 'center' },
        4:  { cellWidth: 38 },
        5:  { cellWidth: 34 },
        6:  { cellWidth: 32 },
        7:  { cellWidth: 26, halign: 'center' },
        8:  { cellWidth: 20, halign: 'center' },
        9:  { cellWidth: 14, halign: 'center' },
        10: { cellWidth: 12, halign: 'center' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          // colorir coluna Status
          if (data.column.index === 7) {
            const s = data.cell.raw as string;
            const c = statusColor(s);
            data.cell.styles.textColor = c;
            data.cell.styles.fontStyle = 'bold';
          }
          // colorir coluna Prioridade
          if (data.column.index === 8) {
            const p = data.cell.raw as string;
            if (p === 'Critica' || p === 'Crítica') data.cell.styles.textColor = RED;
            else if (p === 'Alta') data.cell.styles.textColor = AMBER;
            else if (p === 'Baixa') data.cell.styles.textColor = GREEN;
          }
          // colorir coluna NPS
          if (data.column.index === 10) {
            const n = parseInt(data.cell.raw as string, 10);
            if (!isNaN(n)) data.cell.styles.textColor = npsColor(n);
            data.cell.styles.fontStyle = 'bold';
          }
          // colorir coluna Nota
          if (data.column.index === 9 && data.cell.raw !== '—') {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: () => { addFooter(); },
      margin: { left: ML, right: MR, bottom: 14 },
    });

    // ─── PÁG — RANKING COLABORADORES ─────────────────────────────────────────
    doc.addPage(); pageNum++;
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('RANKING DE COLABORADORES', ML, 12);

    // Colaboradores com estrelas
    const collabBody = rankingAtendentes.map((a, i) => {
      const txPct = a.total > 0 ? `${Math.round((a.resolvidos / a.total) * 100)}%` : '0%';
      return [i + 1, a.nome, a.total, a.resolvidos, txPct, fmtMin(a.tempoMedio)];
    });

    autoTable(doc, {
      startY: 22,
      head: [['#', 'Colaborador', 'Total', 'Resolvidos', 'Tx. Resolucao', 'Tempo Medio']],
      body: collabBody,
      theme: 'striped',
      headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 246, 255] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', textColor: GREEN as [number,number,number] },
        4: { halign: 'center', fontStyle: 'bold' },
        5: { halign: 'center' },
      },
      didDrawPage: () => { addFooter(); },
      margin: { left: ML, right: MR, bottom: 14 },
    });

    // ─── PÁG — RANKING FRANQUIAS ──────────────────────────────────────────────
    doc.addPage(); pageNum++;
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('RANKING DE FRANQUIAS', ML, 12);

    autoTable(doc, {
      startY: 22,
      head: [['#', 'Loja Franqueada', 'Atendimentos', '% do Total']],
      body: rankingFranquias.map((f, i) => [
        i + 1, f.loja, f.total,
        summary.total > 0 ? `${Math.round((f.total / summary.total) * 100)}%` : '0%',
      ]),
      theme: 'striped',
      headStyles: { fillColor: VIOLET, textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 246, 255] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { halign: 'center', fontStyle: 'bold', textColor: VIOLET as [number,number,number] },
        3: { halign: 'center' },
      },
      didDrawPage: () => { addFooter(); },
      margin: { left: ML, right: MR, bottom: 14 },
    });

    addFooter();
    doc.save(`relatorio_analitico_caf_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  };

  // ── Export PDF Detalhado por Franqueado ─────────────────────────────────────
  const exportPDFFranqueado = async () => {
    // Pré-carrega e redimensiona logos para as dimensões de exibição (evita PDF gigante)
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

    const resizeImg = (img: HTMLImageElement, maxPxW: number, bgColor?: string): string => {
      const scale  = Math.min(1, maxPxW / (img.naturalWidth || maxPxW));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round((img.naturalWidth  || maxPxW) * scale);
      canvas.height = Math.round((img.naturalHeight || maxPxW * 0.35) * scale);
      const ctx = canvas.getContext('2d')!;
      if (bgColor) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    };

    const rawImgs = await Promise.all([loadImg(logoWhite), loadImg(logoGrauOS)]).catch(() => [null, null] as any);
    const imgWhiteB64 = rawImgs[0] ? resizeImg(rawImgs[0], 320) : null;       // ~300px → ≈15KB
    const imgColorB64 = rawImgs[1] ? resizeImg(rawImgs[1], 220) : null;       // ~200px → ≈10KB
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw    = doc.internal.pageSize.getWidth();   // 210
    const ph    = doc.internal.pageSize.getHeight();  // 297
    const ML    = 14; const MR = 14;
    const CW    = pw - ML - MR;
    const VIOLET:  [number,number,number] = [109, 40, 217];
    const VL:      [number,number,number] = [237, 233, 254];
    const GREEN:   [number,number,number] = [22, 163, 74];
    const AMBER:   [number,number,number] = [217, 119, 6];
    const RED:     [number,number,number] = [220, 38, 38];
    const GRAY:    [number,number,number] = [107, 114, 128];
    const DARK:    [number,number,number] = [30, 30, 30];

    const franquiaLabel = filterFranquia === 'todas' ? 'Todos os Franqueados' : filterFranquia;
    const periodoLabel  = `${dateFrom.split('-').reverse().join('/')} a ${dateTo.split('-').reverse().join('/')}`;
    let pageNum = 0;
    let y       = 0;

    const FOOTER_H = 10;
    const MARGIN_B = FOOTER_H + 6;

    const addFooter = () => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
      doc.line(ML, ph - FOOTER_H, pw - MR, ph - FOOTER_H);
      doc.text(`Pagina ${pageNum}`, pw / 2, ph - 5, { align: 'center' });
      doc.text('Relatorio por Franqueado — CAF GrauOS', ML, ph - 5);
      doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pw - MR, ph - 5, { align: 'right' });
    };

    const newPage = (withHeader = false) => {
      if (pageNum > 0) { addFooter(); doc.addPage(); }
      pageNum++;
      y = 14;
      if (withHeader) {
        doc.setFillColor(...VIOLET);
        doc.rect(0, 0, pw, 14, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text('Relatorio Detalhado por Franqueado — CAF GrauOS', ML, 9);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(221, 214, 254);
        doc.text(periodoLabel, pw - MR, 9, { align: 'right' });
        y = 18;
      }
    };

    const checkSpace = (needed: number) => {
      if (y + needed > ph - MARGIN_B) newPage(true);
    };

    const writeLine = (
      text: string,
      opts: { size?: number; bold?: boolean; color?: [number,number,number]; indent?: number; maxW?: number } = {}
    ) => {
      const { size = 9, bold = false, color = DARK, indent = 0, maxW } = opts;
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color);
      const w = maxW ?? (CW - indent);
      const lines = doc.splitTextToSize(text, w);
      const lh = size * 0.42;
      checkSpace(lines.length * lh + 1);
      doc.text(lines, ML + indent, y);
      y += lines.length * lh + 1;
    };

    const drawStarRow = (nota: number | null, nps: number | null, xStart: number, yPos: number) => {
      // Stars
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...DARK);
      doc.text('Nota:', xStart, yPos);
      const starR = 1.6; const starGap = 0.8; let sx = xStart + 10;
      for (let i = 1; i <= 5; i++) {
        const cx = sx + (i - 1) * (starR * 2 + starGap);
        if (nota != null && i <= nota) {
          doc.setFillColor(245, 158, 11); doc.circle(cx, yPos - starR * 0.7, starR, 'F');
        } else {
          doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.25); doc.circle(cx, yPos - starR * 0.7, starR, 'S');
        }
      }
      sx += 5 * (starR * 2 + starGap) + 6;
      if (nota != null) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(`(${nota}/5)`, sx, yPos);
        sx += 12;
      }
      // NPS
      if (nps != null) {
        const npsC = nps >= 9 ? GREEN : nps >= 7 ? AMBER : RED;
        const npsLabel = nps >= 9 ? 'Promotor' : nps >= 7 ? 'Neutro' : 'Detrator';
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...DARK);
        doc.text(`NPS: ${nps}/10`, sx, yPos);
        sx += 18;
        doc.setFillColor(...npsC);
        doc.roundedRect(sx, yPos - 4, 18, 5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
        doc.text(npsLabel, sx + 9, yPos - 0.5, { align: 'center' });
      } else if (nota == null) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text('Sem avaliacao', xStart + 10, yPos);
      }
    };

    const statusColor = (s: string): [number,number,number] => {
      if (['Resolvido','Encerrado'].includes(s)) return GREEN;
      if (s === 'Em Atendimento') return [37, 99, 235];
      if (s === 'Aguardando Franqueado') return AMBER;
      return GRAY;
    };

    const fmtDt = (iso?: string | null) =>
      iso ? format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';

    // ── CAPA ──────────────────────────────────────────────────────────────────
    newPage();

    // Fundo: violeta profundo no topo (60%), branco suave na base
    const splitY = ph * 0.60;
    doc.setFillColor(76, 29, 149);   // violet-900
    doc.rect(0, 0, pw, splitY, 'F');
    doc.setFillColor(250, 248, 255); // quase branco com toque violeta
    doc.rect(0, splitY, pw, ph - splitY, 'F');

    // Logo GrauOS (branca) — proporção preservada, centralizada
    const logoMaxW = 58; const logoMaxH = 22;
    let logoW = logoMaxW; let logoH = logoMaxH;
    if (rawImgs[0]?.naturalWidth && rawImgs[0]?.naturalHeight) {
      const ratio = rawImgs[0].naturalWidth / rawImgs[0].naturalHeight;
      logoH = logoMaxW / ratio <= logoMaxH ? logoMaxW / ratio : logoMaxH;
      logoW = logoH * ratio;
    }
    const logoX = (pw - logoW) / 2; const logoY = 28;
    if (imgWhiteB64) {
      try { doc.addImage(imgWhiteB64, 'PNG', logoX, logoY, logoW, logoH); } catch (_) {}
    }

    // Linha fina elegante abaixo do logo
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(pw / 2 - 28, logoY + logoH + 6, pw / 2 + 28, logoY + logoH + 6);
    doc.setLineDashPattern([], 0);

    // Título principal
    const titleY = logoY + logoH + 20;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text('Relatorio Detalhado', pw / 2, titleY, { align: 'center' });
    doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.setTextColor(216, 180, 254);
    doc.text('de Atendimentos — CAF', pw / 2, titleY + 11, { align: 'center' });

    // Nome da franquia — destaque grande
    const fqY = titleY + 30;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    const fqLines = doc.splitTextToSize(franquiaLabel, pw - 40);
    doc.text(fqLines, pw / 2, fqY, { align: 'center' });

    // Período e data
    const infoY = fqY + fqLines.length * 10 + 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(196, 181, 253);
    doc.text(`Periodo: ${periodoLabel}`, pw / 2, infoY, { align: 'center' });
    doc.text(
      `${filtered.length} atendimento${filtered.length !== 1 ? 's' : ''}  |  Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm")}`,
      pw / 2, infoY + 7, { align: 'center' }
    );

    // ── KPI Cards na área branca ─────────────────────────────────────────
    const stats = [
      { l: 'Total',       v: String(filtered.length),     accent: VIOLET },
      { l: 'Resolvidos',  v: String(summary.resolvidos),  accent: GREEN  },
      { l: 'Pendentes',   v: String(summary.pendentes),   accent: AMBER  },
      { l: 'Tempo Medio', v: fmtMin(summary.tempoMedio),  accent: [37, 99, 235] as [number,number,number] },
    ];
    const cardW = (pw - 28 - 9) / 4; const cardH = 28;
    const cardTop = splitY + 14;
    stats.forEach((s, i) => {
      const cx = 14 + i * (cardW + 3);
      // Sombra suave (rect levemente offset cinza)
      doc.setFillColor(220, 215, 235);
      doc.roundedRect(cx + 0.8, cardTop + 0.8, cardW, cardH, 3, 3, 'F');
      // Card branco
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, cardTop, cardW, cardH, 3, 3, 'F');
      // Borda superior colorida (accent)
      doc.setFillColor(...s.accent);
      doc.roundedRect(cx, cardTop, cardW, 2, 1, 1, 'F');
      // Valor
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...s.accent);
      doc.text(s.v, cx + cardW / 2, cardTop + 14, { align: 'center' });
      // Label
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY);
      doc.text(s.l.toUpperCase(), cx + cardW / 2, cardTop + 22, { align: 'center' });
    });

    // Logo colorida pequena + tagline no rodapé da capa (área branca) — proporção preservada
    const ftrLogoMaxW = 36; const ftrLogoMaxH = 12;
    let ftrLogoW = ftrLogoMaxW; let ftrLogoH = ftrLogoMaxH;
    if (rawImgs[1]?.naturalWidth && rawImgs[1]?.naturalHeight) {
      const ratio = rawImgs[1].naturalWidth / rawImgs[1].naturalHeight;
      ftrLogoH = ftrLogoMaxW / ratio <= ftrLogoMaxH ? ftrLogoMaxW / ratio : ftrLogoMaxH;
      ftrLogoW = ftrLogoH * ratio;
    }
    const ftrY = ph - 44;
    if (imgColorB64) {
      try { doc.addImage(imgColorB64, 'PNG', (pw - ftrLogoW) / 2, ftrY, ftrLogoW, ftrLogoH); } catch (_) {}
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text('Central de Atendimento ao Franqueado', pw / 2, ftrY + ftrLogoH + 5, { align: 'center' });

    // ── TICKETS ───────────────────────────────────────────────────────────────
    const ticketsFiltrados = filtered.slice().sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    ticketsFiltrados.forEach((a: any, idx: number) => {
      const sat  = a.caf_satisfacao?.[0];
      const nota = sat?.nota ?? null;
      const nps  = sat?.nps  ?? null;
      const sColor = statusColor(a.status);

      newPage(true);

      // ── Ticket header bar ─────────────────────────────────────────
      const headerH = 12;
      doc.setFillColor(...VL);
      doc.roundedRect(ML, y, CW, headerH, 2, 2, 'F');

      // Protocolo
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...VIOLET);
      doc.text(a.protocolo || `#${idx + 1}`, ML + 3, y + 7.5);

      // Status pill
      doc.setFillColor(...sColor);
      doc.roundedRect(ML + 44, y + 2.5, 32, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      doc.text(a.status || '—', ML + 60, y + 7, { align: 'center' });

      // Prioridade pill
      const prioC: [number,number,number] = a.prioridade === 'Crítica' || a.prioridade === 'Critica' ? RED
        : a.prioridade === 'Alta' ? AMBER
        : a.prioridade === 'Baixa' ? GREEN : GRAY;
      doc.setFillColor(...prioC);
      doc.roundedRect(ML + 80, y + 2.5, 26, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      doc.text(a.prioridade || '—', ML + 93, y + 7, { align: 'center' });

      // Categoria
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
      const catStr = a.subcategoria ? `${a.categoria} → ${a.subcategoria}` : (a.categoria || '—');
      doc.text(catStr, ML + 112, y + 7.5);

      y += headerH + 4;

      // ── Meta grid ─────────────────────────────────────────────────
      const metaItems = [
        { l: 'Franquia',    v: a.loja_franqueada    || '—' },
        { l: 'Solicitante', v: a.solicitante_nome   || '—' },
        { l: 'Canal',       v: a.canal              || '—' },
        { l: 'Atendente',   v: a.atendente_nome_display || a.atendente_nome || '—' },
        { l: 'Aberto em',   v: fmtDt(a.created_at) },
        { l: 'Fechado em',  v: fmtDt(a.resolvido_em || a.encerrado_em) },
        { l: '1a Resposta', v: a.tempo_resposta_min != null ? fmtMin(a.tempo_resposta_min) : '—' },
        { l: 'Tempo Total', v: fmtMin(a.tempo_resolucao_min) },
      ];

      const colW  = CW / 2 - 2;
      const rowH  = 7;
      metaItems.forEach((m, mi) => {
        const col = mi % 2;
        const row = Math.floor(mi / 2);
        const mx  = ML + col * (colW + 4);
        const my  = y + row * rowH;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...GRAY);
        doc.text(`${m.l}:`, mx, my);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
        doc.text(m.v, mx + 28, my);
      });
      y += Math.ceil(metaItems.length / 2) * rowH + 5;

      // ── Linha separadora ──────────────────────────────────────────
      doc.setDrawColor(...VL); doc.setLineWidth(0.4);
      doc.line(ML, y, ML + CW, y); y += 5;

      // ── Solicitação ───────────────────────────────────────────────
      writeLine('SOLICITACAO', { size: 7.5, bold: true, color: VIOLET });
      y += 1;
      const descTexto = a.descricao?.trim() || 'Nenhuma descricao informada.';
      writeLine(descTexto, { size: 8.5, color: DARK, indent: 0, maxW: CW });
      y += 4;

      // ── Solução ───────────────────────────────────────────────────
      doc.setDrawColor(...VL); doc.setLineWidth(0.4);
      checkSpace(5);
      doc.line(ML, y, ML + CW, y); y += 5;

      writeLine('SOLUCAO / RESPOSTA', { size: 7.5, bold: true, color: GREEN });
      y += 1;
      const solTexto = a.solucao?.trim() || 'Ainda sem resolucao registrada.';
      const solColor: [number,number,number] = a.solucao ? DARK : GRAY;
      writeLine(solTexto, { size: 8.5, color: solColor, indent: 0, maxW: CW });
      y += 4;

      // ── Avaliação ─────────────────────────────────────────────────
      doc.setDrawColor(...VL); doc.setLineWidth(0.4);
      checkSpace(14);
      doc.line(ML, y, ML + CW, y); y += 6;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...AMBER);
      doc.text('AVALIACAO', ML, y); y += 1;
      drawStarRow(nota, nps, ML, y + 4);
      y += 12;

      // Separador entre tickets
      if (idx < ticketsFiltrados.length - 1) {
        checkSpace(8);
        doc.setDrawColor(...VIOLET); doc.setLineWidth(0.6);
        doc.line(ML, y + 2, ML + CW, y + 2);
        y += 8;
      }
    });

    addFooter();
    const slug = filterFranquia === 'todas' ? 'todos' : filterFranquia.replace(/\s+/g, '_').slice(0, 30);
    doc.save(`relatorio_franqueado_caf_${slug}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/caf/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        CAF Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <BarChart3 className="text-primary shrink-0" size={34} />
            Relatórios CAF
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Análise de atendimentos da rede</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportPDF}>
            <Download size={15} /> Analítico
          </Button>
          <Button
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={exportPDFFranqueado}
          >
            <Download size={15} />
            {filterFranquia === 'todas' ? 'Rel. por Franqueado' : `Rel. — ${filterFranquia.split(' ').slice(0, 2).join(' ')}`}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-muted-foreground shrink-0" />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px] bg-transparent border-none" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px] bg-transparent border-none" />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {Object.keys(CATEGORIAS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAtend} onValueChange={setFilterAtend}>
          <SelectTrigger className="w-[180px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos atendentes</SelectItem>
            {atendentes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFranquia} onValueChange={setFilterFranquia}>
          <SelectTrigger className={`w-[220px] border-none font-semibold ${filterFranquia !== 'todas' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'bg-transparent'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as franquias</SelectItem>
            {franquias.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Atendimentos', value: summary.total, icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-500/10' },
          { label: 'Resolvidos', value: summary.resolvidos, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Tempo Médio', value: fmtMin(summary.tempoMedio), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'NPS Médio', value: summary.npsMedia ?? '—', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-black">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* NPS breakdown */}
      {summary.totalNps > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Classificação NPS</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Promotores', value: summary.promotores, pct: Math.round((summary.promotores / summary.totalNps) * 100), color: 'bg-green-500', text: 'text-green-700' },
              { label: 'Neutros', value: summary.neutros, pct: Math.round((summary.neutros / summary.totalNps) * 100), color: 'bg-amber-400', text: 'text-amber-700' },
              { label: 'Detratores', value: summary.detratores, pct: Math.round((summary.detratores / summary.totalNps) * 100), color: 'bg-red-500', text: 'text-red-700' },
            ].map(n => (
              <div key={n.label} className="text-center">
                <p className={cn('text-3xl font-black', n.text)}>{n.value}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{n.label}</p>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className={cn('h-full rounded-full', n.color)} style={{ width: `${n.pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.pct}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="franquias" className="w-full">
        <TabsList className="glass-card mb-4 bg-muted/30 p-1 h-10">
          <TabsTrigger value="franquias" className="text-xs font-bold px-4">Ranking Franquias</TabsTrigger>
          <TabsTrigger value="problemas" className="text-xs font-bold px-4">Top Problemas</TabsTrigger>
          <TabsTrigger value="atendentes" className="text-xs font-bold px-4">Colaboradores</TabsTrigger>
        </TabsList>

        <TabsContent value="franquias" className="glass-card overflow-hidden p-0 border-none">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['#', 'Loja Franqueada', 'Atendimentos', '% do Total'].map(h => (
                  <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingFranquias.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Nenhum dado no período</td></tr>
              ) : rankingFranquias.map((f, i) => (
                <tr key={f.loja} className="border-b last:border-0 hover:bg-muted/5">
                  <td className="p-4 text-sm font-black text-muted-foreground">{i + 1}</td>
                  <td className="p-4 font-semibold text-sm">{f.loja}</td>
                  <td className="p-4 font-black text-primary text-lg">{f.total}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-muted rounded-full flex-1 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(f.total / (rankingFranquias[0]?.total || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                        {summary.total > 0 ? Math.round((f.total / summary.total) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="problemas" className="glass-card overflow-hidden p-0 border-none">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['#', 'Problema / Subcategoria', 'Ocorrências', 'Tendência'].map(h => (
                  <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingProblemas.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Nenhum dado no período</td></tr>
              ) : rankingProblemas.map((p, i) => (
                <tr key={p.problema} className="border-b last:border-0 hover:bg-muted/5">
                  <td className="p-4 text-sm font-black text-muted-foreground">{i + 1}</td>
                  <td className="p-4 font-semibold text-sm">{p.problema}</td>
                  <td className="p-4 font-black text-primary text-lg">{p.total}</td>
                  <td className="p-4">
                    <div className="h-1.5 bg-muted rounded-full w-24 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.total / (rankingProblemas[0]?.total || 1)) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="atendentes" className="glass-card overflow-hidden p-0 border-none">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Atendente', 'Total', 'Resolvidos', 'Tx. Resolução', 'Tempo Médio'].map(h => (
                  <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingAtendentes.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Nenhum dado no período</td></tr>
              ) : rankingAtendentes.map((a) => (
                <tr key={a.nome} className="border-b last:border-0 hover:bg-muted/5">
                  <td className="p-4 font-semibold text-sm">{a.nome}</td>
                  <td className="p-4 font-black text-primary">{a.total}</td>
                  <td className="p-4 text-sm text-green-600 font-bold">{a.resolvidos}</td>
                  <td className="p-4 text-sm">{a.total > 0 ? Math.round((a.resolvidos / a.total) * 100) : 0}%</td>
                  <td className="p-4 text-sm font-mono">{fmtMin(a.tempoMedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
