import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addPdfBranding } from '@/pages/admin/financial/utils/pdfBranding';
import { qzPrinter } from '@/lib/qz-printer';
import { toast } from 'sonner';

const BRL = (v: number | null | undefined) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const dt = (iso?: string | null, fmt = "dd/MM/yyyy HH:mm") => (iso ? format(new Date(iso), fmt, { locale: ptBR }) : '—');

export interface ShiftReportData {
  id?: string;
  operatorName: string;
  physicalName?: string;
  openedAt?: string | null;
  closedAt?: string | null;
  status: string;
  opening: number;
  pdvTotal: number;
  deliveryTotal: number;
  grandTotal: number;
  suprimentos: number;
  sangrias: number;
  expectedCash: number;
  countedCash?: number | null;
  difference?: number | null;
  checkedByName?: string;
  conference: { method: string; system: number; counted: number | null; diff: number | null }[];
  movements: { at: string; type: string; reason?: string; amount: number }[];
  extrato: { at: string; origin: string; customer?: string; method: string; amount: number }[];
}

const BRAND: [number, number, number] = [141, 66, 221];

// ── PDF (A4) ────────────────────────────────────────────────────────────────
export async function exportShiftPdf(d: ShiftReportData) {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = await addPdfBranding(doc, 'Fechamento de Turno de Caixa');

    doc.setFontSize(11);
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text(`Operador: ${d.operatorName}`, 14, y + 4);
    doc.setFont(doc.getFont().fontName, 'normal');
    doc.setFontSize(9);
    doc.text(`Abertura: ${dt(d.openedAt)}    Fechamento: ${dt(d.closedAt)}`, 14, y + 10);
    if (d.physicalName) doc.text(`Caixa físico: ${d.physicalName}`, 14, y + 15);
    if (d.checkedByName) doc.text(`Conferente: ${d.checkedByName}`, 120, y + 15);

    // Resumo
    autoTable(doc, {
      startY: y + 20,
      head: [['Resumo', 'Valor']],
      body: [
        ['Fundo de caixa', BRL(d.opening)],
        ['Vendas PDV', BRL(d.pdvTotal)],
        ['Vendas Delivery', BRL(d.deliveryTotal)],
        ['Total vendido', BRL(d.grandTotal)],
        ['Suprimentos', BRL(d.suprimentos)],
        ['Sangrias', BRL(d.sangrias)],
        ['Dinheiro esperado', BRL(d.expectedCash)],
        ['Dinheiro contado', d.countedCash != null ? BRL(d.countedCash) : '—'],
        ['Diferença', d.difference != null ? BRL(d.difference) : '—'],
      ],
      theme: 'striped',
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    // Conferência
    if (d.conference.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Conferência — Forma', 'Sistema', 'Conferido', 'Diferença']],
        body: d.conference.map(c => [c.method, BRL(c.system), c.counted != null ? BRL(c.counted) : '—', c.diff != null ? BRL(c.diff) : '—']),
        theme: 'grid',
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      });
    }

    // Movimentações
    if (d.movements.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Movimentação', 'Tipo', 'Motivo', 'Valor']],
        body: d.movements.map(m => [dt(m.at, 'dd/MM HH:mm'), m.type === 'suprimento' ? 'Suprimento' : 'Sangria', m.reason || '—', BRL(m.amount)]),
        theme: 'striped',
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'right' } },
      });
    }

    // Extrato
    if (d.extrato.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Horário', 'Origem', 'Cliente', 'Pagamento', 'Valor']],
        body: d.extrato.map(r => [dt(r.at, 'dd/MM HH:mm'), r.origin, r.customer || '—', r.method, BRL(r.amount)]),
        theme: 'striped',
        headStyles: { fillColor: BRAND },
        styles: { fontSize: 7 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        foot: [['', '', '', 'Total', BRL(d.grandTotal)]],
        footStyles: { fillColor: BRAND, textColor: 255 },
      });
    }

    doc.save(`turno_${d.operatorName.replace(/\s+/g, '_')}_${format(new Date(d.closedAt || d.openedAt || Date.now()), 'yyyy-MM-dd_HHmm')}.pdf`);
    toast.success('PDF gerado.');
  } catch (e) {
    console.error(e);
    toast.error('Erro ao gerar PDF do turno.');
  }
}

// ── Impressão térmica (HTML via QZ Tray) ──────────────────────────────────────
function thermalHtml(d: ShiftReportData): string {
  const line = (l: string, r: string) => `<div style="display:flex;justify-content:space-between"><span>${l}</span><span>${r}</span></div>`;
  const conf = d.conference.map(c => line(c.method, `${BRL(c.system)}${c.counted != null ? ' / ' + BRL(c.counted) : ''}`)).join('');
  const movs = d.movements.map(m => line(`${m.type === 'suprimento' ? '+' : '-'} ${m.reason || m.type}`, BRL(m.amount))).join('');
  return `
  <div style="font-family:monospace;font-size:12px;width:280px;color:#000">
    <div style="text-align:center;font-weight:bold;font-size:14px">FECHAMENTO DE TURNO</div>
    <div style="text-align:center">Açaí no Grau</div>
    <hr/>
    <div>Operador: ${d.operatorName}</div>
    <div>Abertura: ${dt(d.openedAt, 'dd/MM HH:mm')}</div>
    <div>Fechamento: ${dt(d.closedAt, 'dd/MM HH:mm')}</div>
    ${d.physicalName ? `<div>Caixa: ${d.physicalName}</div>` : ''}
    <hr/>
    ${line('Fundo', BRL(d.opening))}
    ${line('Vendas PDV', BRL(d.pdvTotal))}
    ${line('Vendas Delivery', BRL(d.deliveryTotal))}
    ${line('Total vendido', BRL(d.grandTotal))}
    ${line('Suprimentos', BRL(d.suprimentos))}
    ${line('Sangrias', BRL(d.sangrias))}
    <hr/>
    <div style="font-weight:bold">CONFERÊNCIA (sist./conf.)</div>
    ${conf || '<div>—</div>'}
    <hr/>
    ${line('Dinheiro esperado', BRL(d.expectedCash))}
    ${d.countedCash != null ? line('Dinheiro contado', BRL(d.countedCash)) : ''}
    ${d.difference != null ? line('DIFERENÇA', BRL(d.difference)) : ''}
    ${movs ? `<hr/><div style="font-weight:bold">MOVIMENTAÇÕES</div>${movs}` : ''}
    <hr/>
    <div style="text-align:center;font-size:10px">${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
    <br/><br/>
  </div>`;
}

export async function printShiftThermal(d: ShiftReportData, printerName?: string | null) {
  if (!printerName) {
    toast.error('Nenhuma impressora configurada (Configurações → PDV → QZ Tray).');
    return;
  }
  try {
    await qzPrinter.printHtml(printerName, thermalHtml(d));
    toast.success('Enviado para impressão.');
  } catch (e) {
    // toast tratado no serviço
    console.error(e);
  }
}

// ── Exportação Excel (extrato) ────────────────────────────────────────────────
export async function exportShiftExcel(d: ShiftReportData) {
  try {
    const XLSX = await import('xlsx');
    const resumo = [
      ['Operador', d.operatorName],
      ['Abertura', dt(d.openedAt)],
      ['Fechamento', dt(d.closedAt)],
      ['Fundo de caixa', d.opening],
      ['Vendas PDV', d.pdvTotal],
      ['Vendas Delivery', d.deliveryTotal],
      ['Total vendido', d.grandTotal],
      ['Suprimentos', d.suprimentos],
      ['Sangrias', d.sangrias],
      ['Dinheiro esperado', d.expectedCash],
      ['Dinheiro contado', d.countedCash ?? ''],
      ['Diferença', d.difference ?? ''],
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      d.conference.map(c => ({ Forma: c.method, Sistema: c.system, Conferido: c.counted, Diferença: c.diff }))
    ), 'Conferência');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      d.extrato.map(r => ({ Horário: dt(r.at), Origem: r.origin, Cliente: r.customer || '', Pagamento: r.method, Valor: r.amount }))
    ), 'Extrato');
    XLSX.writeFile(wb, `turno_${d.operatorName.replace(/\s+/g, '_')}_${format(new Date(d.closedAt || d.openedAt || Date.now()), 'yyyy-MM-dd_HHmm')}.xlsx`);
    toast.success('Excel gerado.');
  } catch (e) {
    console.error(e);
    toast.error('Erro ao gerar Excel do turno.');
  }
}
