/**
 * Geração do PDF dos recibos de quitação (1 baixa = 1 página).
 *
 * Layout com identidade do Açaí no Grau: faixa/detalhes em roxo (#7C3AED),
 * logomarca no cabeçalho, caixa de valor em destaque, bloco de dados, texto de
 * quitação, área de assinatura e rodapé. Usa jsPDF.
 *
 * A logomarca é carregada de forma assíncrona e reduzida via canvas (para não
 * inflar o PDF), por isso as funções de geração são assíncronas.
 */

import jsPDF from 'jspdf';
import { brToNumber } from './cefasParser';
import logoUrl from '@/assets/logo-acai.png';

/** Dados de uma baixa já confirmada para virar recibo. */
export interface ReceiptData {
  razaoSocial: string;
  documento: string;
  titulo: string;
  dataPagamento: string;
  formaPagamento: string;
  valorPago: string;
}

export interface ReceiptMeta {
  /** Nome do usuário responsável pela emissão. */
  usuario: string;
  /** Data de emissão (dd/mm/aaaa). Default: hoje. */
  dataEmissao?: string;
}

const EMPRESA = 'Açaí no Grau Distribuidora';

// Paleta
const ROXO: [number, number, number] = [124, 58, 237];
const ROXO_CLARO: [number, number, number] = [243, 240, 253];
const VERDE: [number, number, number] = [139, 195, 74];
const VERDE_TEXTO: [number, number, number] = [39, 119, 60];
const VERDE_BG: [number, number, number] = [232, 245, 224];
const TINTA: [number, number, number] = [33, 33, 45];
const CINZA: [number, number, number] = [120, 120, 132];
const LINHA: [number, number, number] = [225, 224, 233];

/** Formata número em Real brasileiro. */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function today(): string {
  return new Date().toLocaleDateString('pt-BR');
}

// ── Logomarca (carregada e reduzida uma vez, em cache) ───────────────────────

let logoCache: string | null | undefined; // undefined = ainda não tentou

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getLogoDataUrl(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const img = await loadImage(logoUrl);
    const size = 360;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas ctx');
    ctx.drawImage(img, 0, 0, size, size);
    logoCache = canvas.toDataURL('image/png');
  } catch {
    logoCache = null;
  }
  return logoCache;
}

// ── Desenho ──────────────────────────────────────────────────────────────────

function setColor(doc: jsPDF, c: [number, number, number], kind: 'text' | 'draw' | 'fill') {
  if (kind === 'text') doc.setTextColor(c[0], c[1], c[2]);
  else if (kind === 'draw') doc.setDrawColor(c[0], c[1], c[2]);
  else doc.setFillColor(c[0], c[1], c[2]);
}

function drawReceipt(
  doc: jsPDF,
  data: ReceiptData,
  meta: ReceiptMeta,
  logo: string | null,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const valorFmt = formatBRL(brToNumber(data.valorPago));
  const emissao = meta.dataEmissao || today();

  // Faixa superior
  setColor(doc, ROXO, 'fill');
  doc.rect(0, 0, pageW, 6, 'F');
  setColor(doc, VERDE, 'fill');
  doc.rect(0, 6, pageW, 1.4, 'F');

  // Cabeçalho: logo + empresa
  let headerTextX = marginX;
  if (logo) {
    doc.addImage(logo, 'PNG', marginX, 13, 24, 24);
    headerTextX = marginX + 30;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(doc, TINTA, 'text');
  doc.text(EMPRESA, headerTextX, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setColor(doc, CINZA, 'text');
  doc.text('Comprovante de quitação de título', headerTextX, 28.5);

  // Nº do recibo (direita)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, CINZA, 'text');
  doc.text('RECIBO Nº', pageW - marginX, 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(doc, ROXO, 'text');
  doc.text(data.titulo, pageW - marginX, 25, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, CINZA, 'text');
  doc.text(`Emitido em ${emissao}`, pageW - marginX, 30.5, { align: 'right' });

  // Divisória
  setColor(doc, LINHA, 'draw');
  doc.setLineWidth(0.3);
  doc.line(marginX, 42, pageW - marginX, 42);

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  setColor(doc, TINTA, 'text');
  doc.text('RECIBO DE QUITAÇÃO', pageW / 2, 56, { align: 'center' });

  // Caixa de valor
  const boxY = 64;
  const boxH = 22;
  setColor(doc, ROXO_CLARO, 'fill');
  doc.roundedRect(marginX, boxY, contentW, boxH, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc, ROXO, 'text');
  doc.text('VALOR PAGO', marginX + 8, boxY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setColor(doc, ROXO, 'text');
  doc.text(valorFmt, marginX + 8, boxY + 17.5);
  // Forma de pagamento à direita da caixa
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc, CINZA, 'text');
  doc.text('FORMA DE PAGAMENTO', pageW - marginX - 8, boxY + 8, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(doc, TINTA, 'text');
  doc.text(data.formaPagamento || '—', pageW - marginX - 8, boxY + 17, { align: 'right' });

  // Bloco de dados
  const cardY = boxY + boxH + 8;
  const cardH = 51;
  setColor(doc, LINHA, 'draw');
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, cardY, contentW, cardH, 2.5, 2.5, 'S');

  const padX = marginX + 8;
  const colRX = marginX + contentW / 2 + 4;
  const field = (label: string, value: string, x: number, y: number, maxW: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, CINZA, 'text');
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    setColor(doc, TINTA, 'text');
    const lines = doc.splitTextToSize(value || '—', maxW);
    doc.text(lines, x, y + 5.5);
  };

  let ry = cardY + 10;
  field('Cliente', data.razaoSocial, padX, ry, contentW - 16);
  ry += 15;
  field('CPF/CNPJ', data.documento, padX, ry, contentW / 2 - 14);
  field('Título', data.titulo, colRX, ry, contentW / 2 - 14);
  ry += 15;
  field('Data do Pagamento', data.dataPagamento, padX, ry, contentW / 2 - 14);
  field('Forma de Pagamento', data.formaPagamento, colRX, ry, contentW / 2 - 14);

  // Texto de quitação
  let ty = cardY + cardH + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setColor(doc, TINTA, 'text');
  const corpo =
    `Recebemos de ${data.razaoSocial} a importância de ${valorFmt}, ` +
    `referente ao título nº ${data.titulo}, considerando o pagamento efetuado ` +
    `em ${data.dataPagamento} através de ${data.formaPagamento}.`;
  const corpoLines = doc.splitTextToSize(corpo, contentW);
  doc.text(corpoLines, marginX, ty);
  ty += corpoLines.length * 6 + 4;
  const quitacao = doc.splitTextToSize(
    'Nada mais havendo a reclamar, damos plena e geral quitação deste título.',
    contentW,
  );
  doc.text(quitacao, marginX, ty);

  // Carimbo "PAGAMENTO CONFIRMADO" (substitui a assinatura manual)
  const stampW = 80;
  const stampH = 18;
  const stampX = pageW / 2 - stampW / 2;
  const stampY = 214;
  // fundo levemente verde
  setColor(doc, VERDE_BG, 'fill');
  doc.roundedRect(stampX, stampY, stampW, stampH, 3, 3, 'F');
  // borda tracejada (efeito de carimbo)
  setColor(doc, VERDE_TEXTO, 'draw');
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([1.4, 1.1], 0);
  doc.roundedRect(stampX, stampY, stampW, stampH, 3, 3, 'S');
  doc.setLineDashPattern([], 0);

  // texto + check
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  setColor(doc, VERDE_TEXTO, 'text');
  const stampLabel = 'PAGAMENTO CONFIRMADO';
  const labelW = doc.getTextWidth(stampLabel);
  const groupW = labelW + 9;
  const groupX = pageW / 2 - groupW / 2;
  const labelBaseline = stampY + 8;
  doc.text(stampLabel, groupX + 9, labelBaseline);
  // check desenhado (não depende de glyph da fonte)
  const cx = groupX + 3;
  const cy = stampY + 6.4;
  doc.setLineWidth(1.3);
  doc.setLineCap('round');
  doc.line(cx - 2.4, cy, cx - 0.6, cy + 2.4);
  doc.line(cx - 0.6, cy + 2.4, cx + 3.4, cy - 2.8);
  doc.setLineCap('butt');
  // subtítulo do carimbo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(doc, VERDE_TEXTO, 'text');
  doc.text(
    `Quitação registrada eletronicamente • ${emissao}`,
    pageW / 2,
    stampY + 14,
    { align: 'center' },
  );

  // Assinatura (logo abaixo do carimbo)
  const signY = stampY + stampH + 6;
  const signW = 84;
  const signX = pageW / 2 - signW / 2;
  setColor(doc, TINTA, 'draw');
  doc.setLineWidth(0.4);
  doc.line(signX, signY, signX + signW, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, TINTA, 'text');
  doc.text(EMPRESA, pageW / 2, signY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc, CINZA, 'text');
  doc.text(`Responsável: ${meta.usuario}`, pageW / 2, signY + 12, { align: 'center' });

  // Rodapé
  const footerY = 284;
  setColor(doc, LINHA, 'draw');
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY - 6, pageW - marginX, footerY - 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, CINZA, 'text');
  doc.text(
    `${EMPRESA}  •  Documento gerado eletronicamente pelo GrauOS em ${emissao}`,
    pageW / 2,
    footerY,
    { align: 'center' },
  );
}

// ── API pública (assíncrona por causa da logomarca) ──────────────────────────

/** Constrói o PDF consolidado (1 recibo por página). */
export async function buildReceiptsPdf(
  baixas: ReceiptData[],
  meta: ReceiptMeta,
): Promise<jsPDF> {
  const logo = await getLogoDataUrl();
  const doc = new jsPDF('p', 'mm', 'a4');
  baixas.forEach((b, i) => {
    if (i > 0) doc.addPage();
    drawReceipt(doc, b, meta, logo);
  });
  return doc;
}

/** Constrói o PDF de um único recibo (uma página). */
export async function buildSingleReceiptPdf(
  baixa: ReceiptData,
  meta: ReceiptMeta,
): Promise<jsPDF> {
  return buildReceiptsPdf([baixa], meta);
}

/** Retorna uma URL de objeto (blob) do recibo de um único título. */
export async function singleReceiptObjectUrl(
  baixa: ReceiptData,
  meta: ReceiptMeta,
): Promise<string> {
  const doc = await buildSingleReceiptPdf(baixa, meta);
  return URL.createObjectURL(doc.output('blob'));
}

/**
 * Nome de arquivo seguro para o recibo de um título, ex:
 * `recibo-161650-RB-BORGES-COMERCIO.pdf`.
 */
export function singleReceiptFilename(titulo: string, cliente: string): string {
  const slug = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `recibo-${titulo}${slug ? '-' + slug : ''}.pdf`;
}

/** Gera e baixa o recibo de um único título. */
export async function downloadSingleReceipt(
  baixa: ReceiptData,
  meta: ReceiptMeta,
): Promise<void> {
  const doc = await buildSingleReceiptPdf(baixa, meta);
  doc.save(singleReceiptFilename(baixa.titulo, baixa.razaoSocial));
}
