import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addPdfBranding } from '@/pages/admin/financial/utils/pdfBranding';
import type { AgendaItem } from '@/hooks/useAgendaEventos';

const TIPO_LABEL: Record<string, string> = {
  compromisso: 'Compromisso',
  tarefa: 'Tarefa',
  retorno: 'Retorno',
  caf_connect: 'CAF Connect',
};

const SLA_LABEL: Record<string, string> = {
  atrasado: 'Atrasado',
  hoje: 'Hoje',
  futuro: 'Futuro',
  resolvido: 'Resolvido',
};

const SLA_COLOR: Record<string, [number, number, number]> = {
  atrasado: [153, 27, 27],
  hoje: [146, 64, 14],
  futuro: [22, 101, 52],
  resolvido: [107, 114, 128],
};

function montarLinhas(itens: AgendaItem[]) {
  return itens.map(i => [
    format(new Date(i.dataHora), "dd/MM HH:mm", { locale: ptBR }),
    i.titulo,
    TIPO_LABEL[i.tipo] ?? i.tipo,
    i.responsavelNome ?? '—',
    i.ticketProtocolo ?? '—',
    SLA_LABEL[i.slaStatus] ?? i.slaStatus,
  ]);
}

async function criarDocumentoBase(titulo: string, subtitulo: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  let y = await addPdfBranding(doc, undefined, true);
  y += 5;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(titulo, margin, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(subtitulo, margin, y);
  y += 5;

  return { doc, y, margin, pageWidth };
}

function desenharTabela(doc: jsPDF, startY: number, margin: number, itens: AgendaItem[]) {
  autoTable(doc, {
    startY,
    head: [['Horário', 'Título', 'Tipo', 'Responsável', 'Ticket', 'SLA']],
    body: montarLinhas(itens),
    theme: 'plain',
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { lineColor: [229, 231, 235], lineWidth: 0.15 },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const item = itens[data.row.index];
        data.cell.styles.textColor = SLA_COLOR[item.slaStatus] ?? [31, 41, 55];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
}

export async function exportarAgendaIndividual(itens: AgendaItem[], atendenteNome: string, dataLabel: string) {
  const { doc, y, margin } = await criarDocumentoBase(
    'Agenda Individual',
    `${atendenteNome} · ${dataLabel}`,
  );
  desenharTabela(doc, y, margin, itens);
  doc.save(`agenda-individual_${atendenteNome.replace(/\s+/g, '-')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportarAgendaEquipe(itens: AgendaItem[], dataLabel: string) {
  const { doc, y, margin } = await criarDocumentoBase('Agenda da Equipe', dataLabel);
  desenharTabela(doc, y, margin, itens);
  doc.save(`agenda-equipe_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportarAgendaSemanal(itens: AgendaItem[], atendenteNome: string, periodoLabel: string) {
  const { doc, y, margin } = await criarDocumentoBase(
    'Agenda Semanal',
    `${atendenteNome} · ${periodoLabel}`,
  );
  desenharTabela(doc, y, margin, itens);
  doc.save(`agenda-semanal_${atendenteNome.replace(/\s+/g, '-')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportarPendenciasAtrasadas(itens: AgendaItem[]) {
  const atrasados = itens.filter(i => i.slaStatus === 'atrasado');
  const { doc, y, margin } = await criarDocumentoBase(
    'Pendências Atrasadas',
    `${atrasados.length} compromisso(s)/tarefa(s) atrasado(s) — todos os atendentes`,
  );
  desenharTabela(doc, y, margin, atrasados);
  doc.save(`agenda-pendencias-atrasadas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
