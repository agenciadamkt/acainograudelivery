/**
 * PDF executivo dos Relatórios Operacionais do CheckGrau.
 *
 * Design: relatório corporativo limpo — um único acento (roxo CheckGrau) usado
 * com parcimônia, tipografia com hierarquia (eyebrow/título/corpo), KPIs em
 * scorecard, tabelas com um estilo único e discreto, muito espaço em branco.
 *
 * Tamanho: o logo é reduzido para ~160px via canvas ANTES de embutir. jsPDF
 * embute imagens como bitmap cru — o PNG original 1920×1920 gerava ~14 MB de
 * pixels; reduzido, o arquivo fica em poucos KB.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoCircular from '@/assets/logo-circular.png';
import type {
  ReportData, WeeklyPoint, CriticalFailureRow, HistoryRow, ReportAlertsData,
} from '@/hooks/checkgrau/useCheckgrauReports';
import type { EngajamentoData } from '@/hooks/checkgrau/useEngajamento';
import type { IntelligentReport } from '@/hooks/operations/useAiAnalysis';

// ── Paleta (contida: 1 acento + neutros) ──
const INK: [number, number, number] = [24, 24, 37];
const ACCENT: [number, number, number] = [124, 58, 237];
const ACCENT_DEEP: [number, number, number] = [76, 45, 130];
const MUTED: [number, number, number] = [120, 125, 138];
const HAIR: [number, number, number] = [228, 229, 236];
const TINT: [number, number, number] = [245, 243, 251];
const ZEBRA: [number, number, number] = [250, 250, 252];

export interface ReportPdfInput {
  unitLabel: string;
  periodFrom: string;
  periodTo: string;
  data: ReportData;
  engajamento?: EngajamentoData | null;
  alerts?: ReportAlertsData | null;
  intelligent?: IntelligentReport | null;
  executiveSummary: string;
}

/** Reduz o logo a ~px de lado via canvas (evita embutir 14 MB de bitmap). */
async function loadLogoSmall(px = 160): Promise<string | null> {
  try {
    const img = new Image();
    img.src = logoCircular;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, px, px);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

function fmtDate(iso: string): string {
  try { return format(new Date(`${iso}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR }); } catch { return iso; }
}

export async function generateReportPdf(input: ReportPdfInput): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 16;                 // margem
  const contentW = pageW - M * 2;
  const logo = await loadLogoSmall();

  let y = 0;

  const ensure = (need: number) => {
    if (y + need > pageH - 20) { doc.addPage(); y = 22; }
  };

  // ───────── Masthead ─────────
  const drawMasthead = () => {
    y = M + 2;
    if (logo) { try { doc.addImage(logo, 'PNG', M, y, 13, 13); } catch { /* ignora */ } }
    const tx = M + (logo ? 17 : 0);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CheckNoGrau', tx, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('R E L A T Ó R I O   O P E R A C I O N A L', tx, y + 11);

    // metadados à direita
    doc.setFontSize(8);
    const rx = pageW - M;
    const meta = [
      ['UNIDADE', input.unitLabel],
      ['PERÍODO', `${fmtDate(input.periodFrom)} — ${fmtDate(input.periodTo)}`],
      ['EMISSÃO', format(new Date(), "dd/MM/yyyy 'às' HH:mm")],
    ];
    let my = y + 1;
    let metaBottom = my;
    for (const [label, value] of meta) {
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(label, rx, my, { align: 'right' });
      doc.setTextColor(...INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(value, rx, my + 3.6, { align: 'right' });
      metaBottom = my + 3.6;     // baseline do último valor
      my += 7.2;
    }

    // A linha de acento fica ABAIXO tanto do bloco à esquerda (logo+wordmark)
    // quanto do bloco de metadados à direita — evita o EMISSÃO cair sobre a linha.
    y = Math.max(y + 15, metaBottom + 4);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(M, y, pageW - M, y);
    y += 9;
  };
  drawMasthead();

  // ───────── Cabeçalho de seção (eyebrow + título + hairline) ─────────
  const section = (title: string) => {
    ensure(16);
    doc.setFillColor(...ACCENT);
    doc.rect(M, y - 3.4, 2, 4.6, 'F');
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, M + 5, y);
    y += 3;
    doc.setDrawColor(...HAIR);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 7;
  };

  // ───────── Tabela (estilo único e discreto) ─────────
  const rightCols = (n: number, from = 1): Record<number, any> => {
    const cs: Record<number, any> = {};
    for (let i = from; i < n; i++) cs[i] = { halign: 'right' };
    return cs;
  };
  const table = (
    head: string[], body: (string | number)[][], columnStyles?: Record<number, any>,
  ) => {
    ensure(24);
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body.map((r) => r.map((c) => String(c))),
      theme: 'plain',
      styles: {
        font: 'helvetica', fontSize: 8.3, textColor: INK,
        cellPadding: { top: 2.3, bottom: 2.3, left: 3, right: 3 }, lineWidth: 0,
      },
      headStyles: {
        fillColor: TINT, textColor: ACCENT_DEEP, fontStyle: 'bold', fontSize: 7.3,
        cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles,
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  };

  // ───────── 1. Indicadores (scorecard) ─────────
  const s = input.data.score;
  const m = input.data.metrics;
  section('Indicadores Gerais');
  const kpis: { label: string; value: string; accent?: boolean }[] = [
    { label: 'SCORE', value: String(s.score), accent: true },
    { label: 'CONCLUSÃO', value: `${s.conclusao}%` },
    { label: 'CONFORMIDADE', value: `${s.conformidade}%` },
    { label: 'PONTUALIDADE', value: `${s.pontualidade}%` },
    { label: 'FALHAS CRÍTICAS', value: String(m.criticalFailures) },
    { label: 'PENDÊNCIAS', value: String(m.pending) },
  ];
  ensure(24);
  const gap = 3;
  const cardW = (contentW - gap * (kpis.length - 1)) / kpis.length;
  const cardH = 20;
  kpis.forEach((k, i) => {
    const x = M + i * (cardW + gap);
    doc.setDrawColor(...HAIR);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 1.6, 1.6, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...(k.accent ? ACCENT : INK));
    doc.text(k.value, x + cardW / 2, y + 9.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(...MUTED);
    const ll = doc.splitTextToSize(k.label, cardW - 3);
    doc.text(ll, x + cardW / 2, y + 14.5, { align: 'center' });
  });
  y += cardH + 11;

  // ───────── 2. Resumo Executivo (caixa tint com corpo) ─────────
  section('Resumo Executivo');
  {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(input.executiveSummary, contentW - 12);
    const boxH = lines.length * 5 + 10;
    ensure(boxH + 2);
    doc.setFillColor(...TINT);
    doc.setDrawColor(...HAIR);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, contentW, boxH, 2, 2, 'FD');
    doc.setTextColor(...INK);
    doc.text(lines, M + 6, y + 7);
    y += boxH + 11;
  }

  // ───────── 3. Análise Inteligente (IA) ─────────
  if (input.intelligent && hasAnyIntelligent(input.intelligent)) {
    const ir = input.intelligent;
    section('Análise Inteligente');
    const block = (label: string, items: string[]) => {
      if (!items || items.length === 0) return;
      ensure(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...ACCENT_DEEP);
      doc.text(label.toUpperCase(), M, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      for (const it of items) {
        const wrapped = doc.splitTextToSize(it, contentW - 5);
        ensure(wrapped.length * 4.6 + 2);
        doc.setFillColor(...ACCENT);
        doc.circle(M + 0.9, y - 1.2, 0.7, 'F');
        doc.text(wrapped, M + 4, y);
        y += wrapped.length * 4.6 + 1.5;
      }
      y += 3.5;
    };
    if (ir.tendencia) block('Tendência operacional', [ir.tendencia]);
    block('Principais riscos', ir.riscos);
    block('Destaques', ir.destaques);
    block('Em risco', ir.em_risco);
    block('Recomendações', ir.recomendacoes);
    y += 2;
  }

  // ───────── 4. Performance (série semanal, tabela enxuta) ─────────
  if (input.data.weekly.length > 0) {
    section('Performance por Semana');
    table(
      ['Semana', 'Score', 'Conformidade', 'Pontualidade'],
      input.data.weekly.map((w: WeeklyPoint) => [
        `Sem. ${w.week}`, w.score, `${w.conformidade}%`, `${w.pontualidade}%`,
      ]),
      rightCols(4),
    );
  }

  // ───────── 5. Ranking de Colaboradores (top 10) ─────────
  if (input.data.byCollaborator.length > 0) {
    section('Ranking de Colaboradores');
    table(
      ['#', 'Colaborador', 'Execuções', 'Conformidade', 'Pontualidade', 'Score'],
      input.data.byCollaborator.slice(0, 10).map((c, i) => [
        i + 1, c.name, c.execucoes, `${c.conformidade}%`, `${c.pontualidade}%`, c.score,
      ]),
      { 0: { cellWidth: 8, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
    );
  }

  // ───────── 6. Ranking de Lojas ─────────
  if (input.data.byStore.length > 0) {
    section('Ranking de Lojas');
    table(
      ['Loja', 'Score', 'Conformidade', 'Pendências', 'Falhas'],
      input.data.byStore.map((r) => [r.name, r.score, `${r.conformidade}%`, r.pendencias, r.falhas]),
      { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    );
  }

  // ───────── 7. Engajamento (scorecard compacto) ─────────
  if (input.engajamento) {
    const e = input.engajamento.kpis;
    section('Engajamento da Equipe');
    table(
      ['Ativos', 'Já acessaram', 'Ativação', 'Ativos 7 dias', 'Execuções', 'Média / colab.'],
      [[e.totalAtivos, e.acessaram, `${e.taxaAtivacao}%`, e.ativos7, e.execucoes, e.mediaPorColaborador]],
      { 0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
    );
  }

  // ───────── 8. Falhas Críticas (top 15) ─────────
  if (input.data.criticalFailures.length > 0) {
    section('Falhas Críticas');
    const fails = input.data.criticalFailures;
    table(
      ['Data', 'Loja', 'Checklist', 'Item', 'Responsável', 'Status'],
      fails.slice(0, 15).map((f: CriticalFailureRow) => [
        fmtDate(f.date), f.storeName, f.checklistName, f.itemName, f.responsible, f.resolved ? 'Resolvido' : 'Aberto',
      ]),
      { 5: { halign: 'right' } },
    );
    if (fails.length > 15) noteMore(fails.length - 15);
  }

  // ───────── 9. Alertas (resumo por tipo) ─────────
  if (input.alerts && input.alerts.total > 0) {
    section('Alertas Disparados');
    table(
      ['Tipo de alerta', 'Quantidade'],
      input.alerts.byType.map((a) => [a.type, a.count]),
      { 1: { halign: 'right', fontStyle: 'bold' } },
    );
  }

  // ───────── 10. Histórico (25 mais recentes) ─────────
  if (input.data.history.length > 0) {
    section('Histórico de Execuções');
    const hist = input.data.history;
    table(
      ['Data', 'Loja', 'Colaborador', 'Checklist', 'Score', 'Tempo (min)'],
      hist.slice(0, 25).map((h: HistoryRow) => [
        fmtDate(h.date), h.storeName, h.collaborator, h.checklistName,
        h.score != null ? h.score : '—', h.durationMin != null ? h.durationMin : '—',
      ]),
      { 4: { halign: 'right' }, 5: { halign: 'right' } },
    );
    if (hist.length > 25) noteMore(hist.length - 25);
  }

  function noteMore(n: number) {
    ensure(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`+ ${n} registro(s) — consulte o painel para a lista completa.`, M, y);
    y += 8;
  }

  // ───────── Rodapé em todas as páginas ─────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...HAIR);
    doc.setLineWidth(0.2);
    doc.line(M, pageH - 12, pageW - M, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Gerado automaticamente pelo CheckNoGrau', M, pageH - 7.5);
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageW / 2, pageH - 7.5, { align: 'center' });
    doc.text(`Página ${i} de ${pages}`, pageW - M, pageH - 7.5, { align: 'right' });
  }

  doc.save(`CheckNoGrau_Relatorio_${input.periodFrom}_a_${input.periodTo}.pdf`);
}

function hasAnyIntelligent(ir: IntelligentReport): boolean {
  return (
    (ir.riscos?.length ?? 0) + (ir.destaques?.length ?? 0) + (ir.em_risco?.length ?? 0) +
    (ir.recomendacoes?.length ?? 0) > 0 || !!ir.tendencia
  );
}

/** Texto do Resumo Executivo a partir das métricas do período. */
export function buildExecutiveSummary(data: ReportData, weekly: WeeklyPoint[]): string {
  const s = data.score;
  const m = data.metrics;
  const tendencia = weekly.length >= 2
    ? (weekly[weekly.length - 1].score > weekly[0].score
        ? ' A tendência do período é de melhora no score operacional.'
        : weekly[weekly.length - 1].score < weekly[0].score
          ? ' A tendência do período é de queda no score operacional, exigindo atenção.'
          : ' O score operacional manteve-se estável no período.')
    : '';
  return (
    `No período analisado foram agendados ${m.scheduled} checklists, com ${m.executed} concluídos ` +
    `(taxa de conclusão de ${s.conclusao}%), conformidade de ${s.conformidade}% e pontualidade de ${s.pontualidade}%. ` +
    `Foram identificadas ${m.criticalFailures} falhas críticas e ${m.pending} pendências operacionais. ` +
    `O score operacional geral foi de ${s.score} pontos.${tendencia}`
  );
}
