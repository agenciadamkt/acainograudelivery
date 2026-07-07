import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Route, Package, CheckCircle2, Clock, Timer, MapPin,
  User, Hourglass, Truck, TrendingUp,
  Download, Navigation, Banknote, AlertTriangle,
} from 'lucide-react';
import { useRotaDoDia, RotaDoDia, RotaOrdem } from '@/hooks/useRotaDoDia';
import { formatBRL } from '@/lib/utils';
import { addPdfBranding } from '@/pages/admin/financial/utils/pdfBranding';
import { STORE_CENTER } from '@/lib/optimizeRoute';

// Paleta neutra — roxo institucional do GrauOS só como destaque pontual,
// nunca como cor dominante. Badges de status discretos (fundo claro, texto escuro).
const STATUS_PEDIDO: Record<string, { label: string; className: string }> = {
  pending:           { label: 'Pendente',    className: 'bg-amber-50 text-amber-700 border-amber-100' },
  confirmed:         { label: 'Pendente',    className: 'bg-amber-50 text-amber-700 border-amber-100' },
  preparing:         { label: 'Pendente',    className: 'bg-amber-50 text-amber-700 border-amber-100' },
  ready:             { label: 'Pendente',    className: 'bg-amber-50 text-amber-700 border-amber-100' },
  out_for_delivery:  { label: 'Em Rota',     className: 'bg-blue-50 text-blue-700 border-blue-100' },
  delivered:         { label: 'Concluído',   className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  cancelled:         { label: 'Cancelado',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const STATUS_ROTA: Record<string, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',   className: 'bg-amber-50 text-amber-700 border-amber-100' },
  em_progresso: { label: 'Em Rota',    className: 'bg-blue-50 text-blue-700 border-blue-100' },
  concluida:    { label: 'Concluída',  className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  cancelada:    { label: 'Cancelada',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  return format(new Date(ts), 'HH:mm', { locale: ptBR });
}

function fmtDuration(minutes: number | null): string {
  if (minutes === null || !isFinite(minutes) || minutes < 0) return '—';
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

function diffMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return diff >= 0 ? diff : null;
}

function addressLabel(addr: RotaOrdem['address']): string {
  if (!addr) return '—';
  const parts = [
    [addr.street, addr.number].filter(Boolean).join(', '),
    addr.neighborhood,
    addr.city,
  ].filter(Boolean);
  return parts.join(' · ') || '—';
}

function getRouteStats(rota: RotaDoDia) {
  const total      = rota.orders.length;
  const entregues  = rota.orders.filter(o => o.status === 'delivered').length;
  const canceladas = rota.orders.filter(o => o.status === 'cancelled').length;
  const emRota     = rota.orders.filter(o => o.status === 'out_for_delivery').length;
  const pendentes  = total - entregues - canceladas - emRota;

  const duracaoRota = diffMinutes(rota.startedAt, rota.completedAt);
  const valorTotal = rota.orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const temposEntrega = rota.orders
    .map(o => diffMinutes(o.outForDeliveryAt, o.deliveredAt))
    .filter((v): v is number => v !== null);
  const tempoMedio = temposEntrega.length > 0
    ? temposEntrega.reduce((a, b) => a + b, 0) / temposEntrega.length
    : null;

  return { total, entregues, canceladas, emRota, pendentes, duracaoRota, valorTotal, tempoMedio };
}

// O campo `rota.status` é um estado salvo manualmente (alguém precisa clicar
// "Concluir Rota"); ele pode ficar desatualizado mesmo depois de todas as
// entregas terem sido feitas, gerando badge "Em Rota" com a tabela mostrando
// 100% concluído. Para o relatório, o status exibido é sempre DERIVADO dos
// dados reais dos pedidos — nunca pode contradizer a tabela.
// pendente/cancelada são estados de ciclo de vida que não são inferíveis a
// partir dos pedidos (a rota pode estar "pendente" mesmo sem nenhum pedido
// "em rota" ainda), então esses dois continuam vindo do campo salvo.
function getDisplayRouteStatus(rota: RotaDoDia): 'pendente' | 'em_progresso' | 'concluida' | 'cancelada' {
  if (rota.status === 'cancelada' || rota.status === 'pendente') return rota.status;
  const stats = getRouteStats(rota);
  if (stats.total > 0 && stats.pendentes === 0 && stats.emRota === 0) return 'concluida';
  return 'em_progresso';
}

interface DriverSummary {
  driverName: string;
  entregasTotal: number;
  entregasConcluidas: number;
  canceladas: number;
  kmTotal: number;
  tempoMedio: number | null;
  duracaoTotal: number | null;
}

// O gestor pensa por motorista, não por rota — agrupa as rotas do dia por
// motorista para responder rápido: quem entregou, quantas entregas, quanto
// tempo levou, quantos km rodou e se houve problema (cancelamentos).
// Ordenado por volume de entregas (ranking).
function getDriverSummaries(rotas: RotaDoDia[], distances: Record<string, { km: number; min: number } | null>): DriverSummary[] {
  const map = new Map<string, DriverSummary & { tempos: number[] }>();

  rotas.forEach(rota => {
    const key = rota.driver?.name ?? 'Sem motorista';
    const stats = getRouteStats(rota);
    const km = distances[rota.routeId]?.km ?? 0;
    const tempos = rota.orders
      .map(o => diffMinutes(o.outForDeliveryAt, o.deliveredAt))
      .filter((v): v is number => v !== null);

    if (!map.has(key)) {
      map.set(key, {
        driverName: key, entregasTotal: 0, entregasConcluidas: 0,
        canceladas: 0, kmTotal: 0, tempoMedio: null, duracaoTotal: 0, tempos: [],
      });
    }
    const entry = map.get(key)!;
    entry.entregasTotal += stats.total;
    entry.entregasConcluidas += stats.entregues;
    entry.canceladas += stats.canceladas;
    entry.kmTotal += km;
    entry.duracaoTotal = (entry.duracaoTotal ?? 0) + (stats.duracaoRota ?? 0);
    entry.tempos.push(...tempos);
  });

  return Array.from(map.values())
    .map(({ tempos, ...rest }) => ({
      ...rest,
      tempoMedio: tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null,
    }))
    .sort((a, b) => b.entregasTotal - a.entregasTotal);
}

// ── Hook: calcula distância/duração estimada de cada rota via OSRM ──
function useRouteDistances(rotas: RotaDoDia[]) {
  const [distances, setDistances] = useState<Record<string, { km: number; min: number } | null>>({});
  const [loading, setLoading] = useState(false);

  const signature = useMemo(
    () =>
      rotas
        .map(r => {
          const coords = r.orders
            .filter(o => o.address?.latitude && o.address?.longitude)
            .map(o => `${o.address!.latitude},${o.address!.longitude}`)
            .join('|');
          return `${r.routeId}:${coords}`;
        })
        .join(';;'),
    [rotas]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (rotas.length === 0) {
        setDistances({});
        return;
      }
      setLoading(true);
      const entries = await Promise.all(
        rotas.map(async (rota) => {
          const validOrders = rota.orders.filter(o => o.address?.latitude && o.address?.longitude);
          if (validOrders.length === 0) return [rota.routeId, { km: 0, min: 0 }] as const;

          const waypoints: [number, number][] = [
            STORE_CENTER,
            ...validOrders.map(o => [o.address!.latitude!, o.address!.longitude!] as [number, number]),
          ];
          const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`);
            if (!res.ok) return [rota.routeId, null] as const;
            const data = await res.json();
            const r0 = data?.routes?.[0];
            if (!r0) return [rota.routeId, null] as const;
            return [rota.routeId, { km: r0.distance / 1000, min: r0.duration / 60 }] as const;
          } catch {
            return [rota.routeId, null] as const;
          }
        })
      );

      if (!cancelled) {
        setDistances(Object.fromEntries(entries));
        setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { distances, loading };
}

// ── Cores PDF (RGB) — mesma paleta neutra da tela, roxo institucional só como destaque ──
const PDF = {
  purple: [124, 58, 237] as [number, number, number],   // #7C3AED — mesma cor do cabeçalho GrauOS
  textDark: [31, 41, 55] as [number, number, number],   // #1F2937
  textMuted: [107, 114, 128] as [number, number, number], // #6B7280
  border: [229, 231, 235] as [number, number, number],  // #E5E7EB
  bgSubtle: [249, 250, 251] as [number, number, number], // #F9FAFB
  headerBg: [243, 244, 246] as [number, number, number], // #F3F4F6 — cinza claro, leve (não compete com o conteúdo)
  green: { bg: [220, 252, 231] as [number, number, number], fg: [22, 101, 52] as [number, number, number] },
  blue: { bg: [219, 234, 254] as [number, number, number], fg: [30, 64, 175] as [number, number, number] },
  amber: { bg: [254, 243, 199] as [number, number, number], fg: [146, 64, 14] as [number, number, number] },
  gray: { bg: [243, 244, 246] as [number, number, number], fg: [55, 65, 81] as [number, number, number] },
};

const STATUS_PEDIDO_PDF: Record<string, { label: string; bg: [number, number, number]; fg: [number, number, number] }> = {
  pending: { label: 'Pendente', ...PDF.amber },
  confirmed: { label: 'Pendente', ...PDF.amber },
  preparing: { label: 'Pendente', ...PDF.amber },
  ready: { label: 'Pendente', ...PDF.amber },
  out_for_delivery: { label: 'Em Rota', ...PDF.blue },
  delivered: { label: 'Concluído', ...PDF.green },
  cancelled: { label: 'Cancelado', ...PDF.gray },
};

function drawBadgePdf(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  colors: { bg: [number, number, number]; fg: [number, number, number] },
  align: 'left' | 'right' | 'center' = 'left'
) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const textW = doc.getTextWidth(text);
  const padX = 2.5;
  const w = textW + padX * 2;
  const h = 5;
  let boxX = x;
  if (align === 'right') boxX = x - w;
  if (align === 'center') boxX = x - w / 2;
  doc.setFillColor(...colors.bg);
  doc.roundedRect(boxX, y, w, h, 1, 1, 'F');
  doc.setTextColor(...colors.fg);
  doc.text(text, boxX + w / 2, y + h / 2 + 1.2, { align: 'center' });
}

interface KpiItem { label: string; value: string }

function drawKpiRow(doc: jsPDF, items: KpiItem[], x: number, y: number, totalWidth: number, boxH = 19) {
  const gap = 3;
  const boxW = (totalWidth - (items.length - 1) * gap) / items.length;
  items.forEach((item, i) => {
    const bx = x + i * (boxW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...PDF.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD');

    // Número grande em destaque — título pequeno e discreto abaixo. O peso
    // visual deve estar no valor, não no rótulo (mais contraste).
    // Posições relativas à altura da caixa, pra funcionar bem mesmo quando
    // boxH é reduzido (ex: resumo final mais compacto).
    doc.setTextColor(...PDF.textDark);
    doc.setFontSize(boxH >= 18 ? 17 : 14);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, bx + boxW / 2, y + boxH * 0.55, { align: 'center' });

    doc.setTextColor(...PDF.textMuted);
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, bx + boxW / 2, y + boxH * 0.85, { align: 'center', maxWidth: boxW - 4 });
  });
  return boxH;
}

// Filtro de exibição/exportação por situação de valor mínimo — não altera
// a rota real (km, paradas), só quais pedidos aparecem nas tabelas/PDF.
type FiltroValorMinimo = 'todos' | 'abaixo' | 'dentro';

export function RelatorioRotasTab() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroValorMinimo, setFiltroValorMinimo] = useState<FiltroValorMinimo>('todos');
  const [exporting, setExporting] = useState(false);
  const { data: rotas = [], isLoading } = useRotaDoDia({ start: dateFrom, end: dateTo });
  // Quilometragem é um fato físico da rota real — sempre calculada a partir
  // das paradas reais (rotas), nunca da lista filtrada na tela.
  const { distances, loading: loadingDistances } = useRouteDistances(rotas);

  // Estatísticas de "abaixo do mínimo" do dia (item 9) refletem sempre o dia
  // inteiro, independente do filtro selecionado na tela/PDF.
  const allOrdersDoDia = useMemo(() => rotas.flatMap(r => r.orders), [rotas]);
  const pedidosAbaixoMinimo = allOrdersDoDia.filter(o => o.ruleViolations.length > 0);
  const valorTotalAbaixoMinimo = pedidosAbaixoMinimo.reduce((acc, o) => acc + o.totalAmount, 0);
  const percentualAbaixoMinimo = allOrdersDoDia.length > 0
    ? Math.round((pedidosAbaixoMinimo.length / allOrdersDoDia.length) * 100)
    : 0;

  // rotas com os pedidos já filtrados pela situação escolhida — usado em
  // todas as tabelas/KPIs de "entregas" e na exportação em PDF.
  const filteredRotas = useMemo(() => {
    if (filtroValorMinimo === 'todos') return rotas;
    return rotas.map(r => ({
      ...r,
      orders: r.orders.filter(o =>
        filtroValorMinimo === 'abaixo' ? o.ruleViolations.length > 0 : o.ruleViolations.length === 0
      ),
    }));
  }, [rotas, filtroValorMinimo]);

  const allOrders = useMemo(() => filteredRotas.flatMap(r => r.orders), [filteredRotas]);

  const totalEntregas  = allOrders.length;
  const concluidas     = allOrders.filter(o => o.status === 'delivered').length;
  const canceladas     = allOrders.filter(o => o.status === 'cancelled').length;
  const emRota         = allOrders.filter(o => o.status === 'out_for_delivery').length;
  const pendentes      = totalEntregas - concluidas - canceladas - emRota;

  const kmTotal = rotas.reduce((acc, r) => acc + (distances[r.routeId]?.km ?? 0), 0);

  const temposEntrega = allOrders
    .map(o => diffMinutes(o.outForDeliveryAt, o.deliveredAt))
    .filter((v): v is number => v !== null);
  const tempoMedioEntrega = temposEntrega.length > 0
    ? temposEntrega.reduce((a, b) => a + b, 0) / temposEntrega.length
    : null;

  const taxaSucesso = totalEntregas > 0 ? Math.round((concluidas / totalEntregas) * 100) : 0;
  const driverSummaries = useMemo(() => getDriverSummaries(filteredRotas, distances), [filteredRotas, distances]);

  // Período de um único dia é exibido como "Quinta, 12 de junho"; quando o
  // intervalo abrange mais de um dia, mostra "dd/MM/yyyy a dd/MM/yyyy" — não
  // faz sentido nomear o dia da semana de um período de várias datas.
  const periodoLabel = useMemo(() => {
    if (dateFrom === dateTo) {
      const raw = format(new Date(dateFrom + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    return `${format(new Date(dateFrom + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(dateTo + 'T12:00:00'), 'dd/MM/yyyy')}`;
  }, [dateFrom, dateTo]);
  const periodoFileSlug = dateFrom === dateTo ? dateFrom : `${dateFrom}_a_${dateTo}`;

  const handleExportPDF = async () => {
    if (rotas.length === 0) {
      toast.error('Não há rotas para exportar neste período.');
      return;
    }

    setExporting(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      let y = await addPdfBranding(doc, undefined, true);
      y += 5; // respiro entre a linha divisória e o título — evita sensação de elemento colado

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF.textDark);
      doc.text('Relatório de Rotas de Entrega', margin, y);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF.textMuted);
      doc.text(`Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, y, { align: 'right' });
      y += 5;

      doc.setFontSize(9);
      doc.setTextColor(...PDF.textMuted);
      doc.text(`Período analisado: ${periodoLabel}`, margin, y);
      y += 7;

      // ── Indicadores do dia ──
      const kpiBoxes: KpiItem[] = [
        { label: 'ROTAS DO DIA', value: String(rotas.length) },
        { label: 'TOTAL DE ENTREGAS', value: String(totalEntregas) },
        { label: 'ENTREGAS CONCLUÍDAS', value: String(concluidas) },
        { label: 'PENDENTES / EM ROTA', value: String(pendentes + emRota) },
        { label: 'QUILOMETRAGEM TOTAL', value: `${kmTotal.toFixed(1)} km` },
        { label: 'TEMPO MÉDIO DE ENTREGA', value: fmtDuration(tempoMedioEntrega) },
      ];
      const boxH = drawKpiRow(doc, kpiBoxes, margin, y, contentWidth);
      y += boxH + 8;

      // ── Resumo por motorista — o gestor pensa por motorista, não por rota.
      //    Responde de cara: quem entregou, quantas entregas, km, tempo médio
      //    e se houve problema (cancelamentos). Ordenado por volume (ranking).
      const driverSummaries = getDriverSummaries(filteredRotas, distances);
      if (driverSummaries.length > 0) {
        doc.setFillColor(...PDF.purple);
        doc.rect(margin, y - 3, 2.2, 2.2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF.textDark);
        doc.text('Resumo por Motorista', margin + 5, y);
        y += 5;

        const driverBody = driverSummaries.map(d => [
          d.driverName,
          `${d.entregasConcluidas}/${d.entregasTotal}`,
          `${d.kmTotal.toFixed(1)} km`,
          fmtDuration(d.tempoMedio),
          fmtDuration(d.duracaoTotal),
          d.canceladas > 0 ? `${d.canceladas} cancelada(s)` : 'Sem problemas',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Motorista', 'Entregas (Concl./Total)', 'KM Percorrido', 'Tempo Médio Entrega', 'Duração Total', 'Status']],
          body: driverBody,
          theme: 'plain',
          headStyles: { fillColor: PDF.headerBg, textColor: PDF.textDark, fontSize: 8, halign: 'left', fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5, textColor: PDF.textDark },
          alternateRowStyles: { fillColor: PDF.bgSubtle },
          styles: { lineColor: PDF.border, lineWidth: 0.15 },
          columnStyles: { 0: { fontStyle: 'bold' }, 5: { fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
              const d = driverSummaries[data.row.index];
              data.cell.styles.textColor = d.canceladas > 0 ? [146, 64, 14] : [22, 101, 52];
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ── Detalhe por rota ──
      filteredRotas.forEach((rota) => {
        const stats = getRouteStats(rota);
        const dist = distances[rota.routeId];

        if (y > pageHeight - 45) { doc.addPage(); y = 20; }

        // Cabeçalho executivo da rota — barra de destaque roxa fina à esquerda
        const headerH = 14;
        doc.setFillColor(...PDF.bgSubtle);
        doc.setDrawColor(...PDF.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentWidth, headerH, 1.5, 1.5, 'FD');
        doc.setFillColor(...PDF.purple);
        doc.rect(margin, y, 1.2, headerH, 'F');

        // Motorista em destaque (é nele que o gestor pensa primeiro) — nome
        // da rota vira subtítulo discreto ao lado, não mais o título principal.
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF.textDark);
        const driverLabel = rota.driver?.name ?? 'Sem motorista';
        doc.text(driverLabel, margin + 5, y + 6);
        const driverLabelWidth = doc.getTextWidth(driverLabel);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF.textMuted);
        doc.text(`  ·  ${rota.routeName}`, margin + 5 + driverLabelWidth, y + 6);

        const displayStatus = getDisplayRouteStatus(rota);
        const statusLabelPdf = STATUS_ROTA[displayStatus]?.label ?? displayStatus;
        const statusColorsPdf =
          displayStatus === 'em_progresso' ? PDF.blue :
          displayStatus === 'concluida' ? PDF.green :
          displayStatus === 'cancelada' ? PDF.gray : PDF.amber;
        drawBadgePdf(doc, statusLabelPdf, pageWidth - margin - 2, y + 2.2, statusColorsPdf, 'right');

        doc.setFontSize(7.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF.textMuted);
        const infoLine = [
          rota.startedAt ? `Saída: ${fmtTime(rota.startedAt)}` : null,
          rota.completedAt ? `Conclusão: ${fmtTime(rota.completedAt)}` : null,
          stats.duracaoRota !== null ? `Duração: ${fmtDuration(stats.duracaoRota)}` : null,
          dist ? `KM: ${dist.km.toFixed(1)} km` : null,
          `Entregas: ${stats.entregues}/${stats.total}`,
        ].filter(Boolean).join('   ·   ');
        doc.text(infoLine, margin + 5, y + 11.5, { maxWidth: contentWidth - 50 });

        y += headerH + 3;

        if (rota.orders.length === 0) {
          doc.setFontSize(8);
          doc.setTextColor(...PDF.textMuted);
          doc.text('Nenhum pedido nesta rota.', margin + 2, y + 4);
          y += 12;
          return;
        }

        const body = rota.orders.map(o => {
          const tempoEntrega = diffMinutes(o.outForDeliveryAt, o.deliveredAt);
          const tipo = o.isManualOrder ? 'Manual' : o.isFranchiseeOrder ? 'Franquia' : '';
          return [
            String(o.sequencia),
            `#${o.orderNumber}${tipo ? ` (${tipo})` : ''}`,
            o.customer.name,
            addressLabel(o.address),
            '',
            '',
            fmtTime(o.createdAt),
            fmtTime(o.confirmedAt),
            fmtTime(o.outForDeliveryAt),
            fmtTime(o.deliveredAt),
            fmtDuration(tempoEntrega),
            formatBRL(o.totalAmount),
          ];
        });

        autoTable(doc, {
          startY: y,
          head: [['#', 'Pedido', 'Cliente', 'Endereço', 'Status', 'Situação', 'Recebido', 'Aprovado', 'Saída', 'Entregue', 'T. Entrega', 'Valor']],
          body,
          foot: [[
            '', '', '', '', '', '',
            '', '', '', '',
            stats.tempoMedio !== null ? `${fmtDuration(stats.tempoMedio)} (méd.)` : '—',
            formatBRL(stats.valorTotal),
          ]],
          theme: 'plain',
          headStyles: { fillColor: PDF.headerBg, textColor: PDF.textDark, fontSize: 7.3, halign: 'center', fontStyle: 'bold' },
          footStyles: { fillColor: PDF.bgSubtle, textColor: PDF.textDark, fontSize: 7.3, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7, textColor: PDF.textDark },
          alternateRowStyles: { fillColor: PDF.bgSubtle },
          styles: { overflow: 'linebreak', lineColor: PDF.border, lineWidth: 0.15 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 27 },
            2: { cellWidth: 32 },
            3: { cellWidth: 48 },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 14, halign: 'center' },
            7: { cellWidth: 14, halign: 'center' },
            8: { cellWidth: 14, halign: 'center' },
            9: { cellWidth: 14, halign: 'center' },
            10: { cellWidth: 16, halign: 'center' },
            11: { cellWidth: 20, halign: 'right' },
          },
          margin: { left: margin, right: margin },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const order = rota.orders[data.row.index];
              const st = STATUS_PEDIDO_PDF[order.status] ?? STATUS_PEDIDO_PDF.pending;
              const cx = data.cell.x + data.cell.width / 2;
              const cy = data.cell.y + data.cell.height / 2 - 2.3;
              drawBadgePdf(doc, st.label, cx, cy, st, 'center');
            }
            if (data.section === 'body' && data.column.index === 5) {
              const order = rota.orders[data.row.index];
              const abaixo = order.ruleViolations.length > 0;
              const st = abaixo ? { label: 'Abaixo do mínimo', ...PDF.gray, fg: [153, 27, 27] as [number, number, number] } : { label: 'Dentro do mínimo', ...PDF.green };
              const cx = data.cell.x + data.cell.width / 2;
              const cy = data.cell.y + data.cell.height / 2 - 2.3;
              drawBadgePdf(doc, st.label, cx, cy, st, 'center');
            }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 10) {
              const order = rota.orders[data.row.index];
              const tempo = diffMinutes(order.outForDeliveryAt, order.deliveredAt);
              if (tempo !== null) {
                data.cell.styles.textColor = tempo > 60 ? [153, 27, 27] : tempo > 30 ? [146, 64, 14] : [22, 101, 52];
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.section === 'body' && data.column.index === 11) {
              const order = rota.orders[data.row.index];
              if (order.ruleViolations.length > 0) {
                data.cell.styles.textColor = [153, 27, 27];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      });

      // ── Resumo geral (indicadores finais) ── bloco compacto (linha + título
      // + caixas ≈ 26mm); só quebra página se realmente não houver espaço —
      // se o conteúdo cabe numa página, o PDF deve ter só uma página.
      const resumoFinalHeight = 27;
      if (y > pageHeight - resumoFinalHeight) { doc.addPage(); y = 20; }
      doc.setDrawColor(...PDF.border);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFillColor(...PDF.purple);
      doc.rect(margin, y - 3, 2.2, 2.2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF.textDark);
      doc.text('Resumo Geral', margin + 5, y);
      y += 4;

      const finalKpis: KpiItem[] = [
        { label: 'TOTAL DE ROTAS', value: String(rotas.length) },
        { label: 'TOTAL DE ENTREGAS', value: String(totalEntregas) },
        { label: 'ENTREGAS CONCLUÍDAS', value: String(concluidas) },
        { label: 'TAXA DE SUCESSO', value: `${taxaSucesso}%` },
        { label: 'TEMPO MÉDIO', value: fmtDuration(tempoMedioEntrega) },
        { label: 'QUILOMETRAGEM TOTAL', value: `${kmTotal.toFixed(1)} km` },
        { label: 'ABAIXO DO MÍNIMO', value: `${pedidosAbaixoMinimo.length} (${percentualAbaixoMinimo}%)` },
      ];
      drawKpiRow(doc, finalKpis, margin, y, contentWidth, 16);

      // ── Rodapé com numeração de páginas ──
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF.textMuted);
        doc.text(`Relatório de Rotas · ${periodoLabel}`, margin, pageHeight - 8);
        doc.text(`Pág. ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      doc.save(`relatorio-rotas_${periodoFileSlug}.pdf`);
      toast.success('Relatório exportado com sucesso!');
    } catch (e) {
      console.error('Erro ao exportar relatório de rotas:', e);
      toast.error('Erro ao gerar o PDF do relatório.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho / seletor de período */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <Label htmlFor="data-relatorio-de" className="text-sm font-medium whitespace-nowrap">
            De:
          </Label>
          <Input
            id="data-relatorio-de"
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 w-40 text-sm"
          />
          <Label htmlFor="data-relatorio-ate" className="text-sm font-medium whitespace-nowrap">
            Até:
          </Label>
          <Input
            id="data-relatorio-ate"
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 w-40 text-sm"
          />
          {(isLoading || loadingDistances) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {rotas.length === 0
                ? 'Nenhuma rota neste período'
                : `${rotas.length} rota(s) · ${periodoLabel}`}
            </span>
          )}
          <Label htmlFor="filtro-valor-minimo" className="text-sm font-medium whitespace-nowrap ml-2">
            Situação:
          </Label>
          <Select value={filtroValorMinimo} onValueChange={(v) => setFiltroValorMinimo(v as FiltroValorMinimo)}>
            <SelectTrigger id="filtro-valor-minimo" className="h-9 w-56 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os pedidos</SelectItem>
              <SelectItem value="abaixo">Somente abaixo do mínimo</SelectItem>
              <SelectItem value="dentro">Somente dentro do mínimo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={exporting || rotas.length === 0}
          className="gap-2 text-foreground border-gray-300"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>

      {rotas.length === 0 && !isLoading ? (
        <div className="p-12 text-center text-muted-foreground border border-gray-200 rounded-xl flex flex-col items-center gap-3">
          <Route className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhuma rota encontrada para este período.</p>
        </div>
      ) : (
        <>
          {/* ── Indicadores do dia ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard title="Rotas do Dia" value={rotas.length} icon={Truck} />
            <KPICard title="Total de Entregas" value={totalEntregas} icon={Package} />
            <KPICard title="Entregas Concluídas" value={concluidas} icon={CheckCircle2} />
            <KPICard title="Pendentes / Em Rota" value={pendentes + emRota} icon={Hourglass} />
            <KPICard title="Quilometragem Total" value={`${kmTotal.toFixed(1)} km`} icon={Navigation} />
            <KPICard title="Tempo Médio de Entrega" value={fmtDuration(tempoMedioEntrega)} icon={Timer} />
          </div>

          {/* ── Resumo por motorista — o gestor pensa por motorista, não por rota ── */}
          {driverSummaries.length > 0 && (
            <div className="space-y-2">
              <SectionTitle>Resumo por Motorista</SectionTitle>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2 font-bold">Motorista</th>
                      <th className="px-3 py-2 font-bold text-center">Entregas (Concl./Total)</th>
                      <th className="px-3 py-2 font-bold text-center">KM Percorrido</th>
                      <th className="px-3 py-2 font-bold text-center">Tempo Médio</th>
                      <th className="px-3 py-2 font-bold text-center">Duração Total</th>
                      <th className="px-3 py-2 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {driverSummaries.map((d, idx) => (
                      <tr key={d.driverName} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                        <td className="px-3 py-2 font-bold text-gray-900">{d.driverName}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{d.entregasConcluidas}/{d.entregasTotal}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{d.kmTotal.toFixed(1)} km</td>
                        <td className="px-3 py-2 text-center text-gray-700">{fmtDuration(d.tempoMedio)}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{fmtDuration(d.duracaoTotal)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${d.canceladas > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {d.canceladas > 0 ? `${d.canceladas} cancelada(s)` : 'Sem problemas'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Detalhe por rota ── */}
          <div className="space-y-2">
            <SectionTitle>Detalhe por Rota</SectionTitle>
            <div className="space-y-4">
              {filteredRotas.map(rota => (
                <RouteReportCard key={rota.routeId} rota={rota} distance={distances[rota.routeId]} />
              ))}
            </div>
          </div>

          {/* ── Resumo geral ── */}
          <div className="pt-2 border-t border-gray-200 space-y-3">
            <SectionTitle>Resumo Geral</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <KPICard title="Total de Rotas" value={rotas.length} icon={Route} />
              <KPICard title="Total de Entregas" value={totalEntregas} icon={Package} />
              <KPICard title="Entregas Concluídas" value={concluidas} icon={CheckCircle2} />
              <KPICard title="Taxa de Sucesso" value={`${taxaSucesso}%`} icon={TrendingUp} accent />
              <KPICard title="Tempo Médio" value={fmtDuration(tempoMedioEntrega)} icon={Clock} />
              <KPICard title="Quilometragem Total" value={`${kmTotal.toFixed(1)} km`} icon={Navigation} />
              <KPICard
                title="Pedidos Abaixo do Mínimo"
                value={pedidosAbaixoMinimo.length}
                icon={Banknote}
                footer={`Representam ${percentualAbaixoMinimo}% das entregas · ${formatBRL(valorTotalAbaixoMinimo)}`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Título de seção com pequeno marcador roxo institucional — identidade
// visual discreta, sem dominar a página. ──
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
      <span className="w-2 h-2 rounded-sm bg-primary shrink-0" />
      {children}
    </h3>
  );
}

// ── Card de indicador — neutro, branco, borda discreta. Número grande em
// destaque, título pequeno e discreto abaixo (o peso visual é do valor, não
// do rótulo). Roxo institucional só aparece quando `accent` é passado (use
// com moderação, no máximo 1 card). ──
function KPICard({ title, value, icon: Icon, footer, accent }: any) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
      <Icon className="h-4 w-4 text-gray-400 mb-2" />
      <p className={`text-3xl font-bold leading-tight ${accent ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      <p className="text-[10.5px] text-gray-500 font-medium uppercase tracking-wider mt-1">{title}</p>
      {footer && <p className="text-[10px] text-gray-400 mt-1">{footer}</p>}
    </div>
  );
}

// ── Mini estatística no cabeçalho de cada rota — neutra, sem cores variadas ──
function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-3">
      <span className="text-base font-bold text-gray-900 dark:text-white">{value}</span>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider whitespace-nowrap">{label}</span>
    </div>
  );
}

// ── Relatório detalhado de uma rota — bloco executivo ──
function RouteReportCard({ rota, distance }: { rota: RotaDoDia; distance?: { km: number; min: number } | null }) {
  const { total, entregues, canceladas, emRota, pendentes, duracaoRota, valorTotal, tempoMedio } = getRouteStats(rota);
  const displayStatus = getDisplayRouteStatus(rota);
  const abaixoMinimo = rota.orders.filter(o => o.ruleViolations.length > 0).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:bg-card overflow-hidden break-inside-avoid">
      {/* Cabeçalho da rota — barra de destaque roxa à esquerda */}
      <div className="relative p-4 border-b border-gray-200 bg-gray-50/60 dark:bg-muted/20 flex flex-wrap items-center justify-between gap-4">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        <div className="space-y-1.5 min-w-0 pl-2">
          <div className="flex items-center gap-2 flex-wrap">
            <User className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-bold text-base text-foreground">{rota.driver?.name ?? 'Sem motorista'}</h4>
            <span className="text-xs text-muted-foreground">· {rota.routeName}</span>
            <Badge variant="outline" className={`text-xs ${STATUS_ROTA[displayStatus]?.className ?? ''}`}>
              {STATUS_ROTA[displayStatus]?.label ?? displayStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {rota.startedAt && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" /> Saída: {fmtTime(rota.startedAt)}
              </span>
            )}
            {rota.completedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Conclusão: {fmtTime(rota.completedAt)}
              </span>
            )}
            {duracaoRota !== null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Duração total: {fmtDuration(duracaoRota)}
              </span>
            )}
          </div>
        </div>

        {/* Mini estatísticas — neutras */}
        <div className="flex items-center divide-x divide-gray-200 flex-wrap pl-2">
          <MiniStat label="KM Rota" value={distance ? `${distance.km.toFixed(1)} km` : '—'} />
          <MiniStat label="Pedidos" value={total} />
          <MiniStat label="Entregues" value={entregues} />
          <MiniStat label="Pendentes" value={pendentes + emRota} />
          <MiniStat label="Canceladas" value={canceladas} />
          <MiniStat label="Tempo Médio" value={fmtDuration(tempoMedio)} />
          <MiniStat label="Valor Total" value={formatBRL(valorTotal)} />
          <div className="flex flex-col items-center px-3">
            <span className={`text-base font-bold flex items-center gap-1 ${abaixoMinimo > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {abaixoMinimo > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
              {abaixoMinimo}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider whitespace-nowrap">Abaixo do Mínimo</span>
          </div>
        </div>
      </div>

      {/* Tabela de pedidos da rota */}
      {total === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Nenhum pedido nesta rota.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2 font-bold">#</th>
                <th className="px-3 py-2 font-bold">Pedido</th>
                <th className="px-3 py-2 font-bold">Cliente</th>
                <th className="px-3 py-2 font-bold">Endereço</th>
                <th className="px-3 py-2 font-bold text-center">Status</th>
                <th className="px-3 py-2 font-bold text-center">Recebido</th>
                <th className="px-3 py-2 font-bold text-center">Aprovado</th>
                <th className="px-3 py-2 font-bold text-center">Saída</th>
                <th className="px-3 py-2 font-bold text-center">Entregue</th>
                <th className="px-3 py-2 font-bold text-center">Tempo de Entrega</th>
                <th className="px-3 py-2 font-bold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rota.orders.map((o, idx) => {
                const tempoEntrega = diffMinutes(o.outForDeliveryAt, o.deliveredAt);
                const status = STATUS_PEDIDO[o.status] ?? STATUS_PEDIDO.pending;
                const abaixo = o.ruleViolations.length > 0;
                return (
                  <tr key={o.orderId} className={`${abaixo ? 'bg-red-50/60' : idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-3 py-2 font-bold text-gray-400">{o.sequencia}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900">#{o.orderNumber}</span>
                        {o.isManualOrder && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-gray-100 text-gray-600 border-gray-200">Manual</Badge>
                        )}
                        {!o.isManualOrder && o.isFranchiseeOrder && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-gray-100 text-gray-600 border-gray-200">Franquia</Badge>
                        )}
                        {abaixo && (
                          <Badge
                            className="text-[9px] h-4 px-1 gap-0.5 bg-red-100 text-red-700 border-red-200"
                            title={o.ruleViolations[0].message}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" /> Abaixo do mínimo
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[160px] truncate text-gray-700">{o.customer.name}</td>
                    <td className="px-3 py-2 max-w-[220px]">
                      <span className="flex items-start gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="break-words">{addressLabel(o.address)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtTime(o.createdAt)}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtTime(o.confirmedAt)}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtTime(o.outForDeliveryAt)}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtTime(o.deliveredAt)}</td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-700">
                      {tempoEntrega !== null ? fmtDuration(tempoEntrega) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${abaixo ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                      {formatBRL(o.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-bold bg-gray-50">
                <td colSpan={9} className="px-3 py-2 text-right uppercase tracking-wider text-[10px] text-gray-500">Total da Rota</td>
                <td className="px-3 py-2 text-center text-gray-700">
                  {tempoMedio !== null ? `${fmtDuration(tempoMedio)} (média)` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-900">{formatBRL(valorTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
