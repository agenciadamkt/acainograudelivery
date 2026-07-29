/**
 * Parser do relatório de Baixas do ERP Cefas
 * ("Relatório de Contas a Receber por Cliente").
 *
 * Estratégia: extração de texto nativa via pdfjs-dist (o relatório do Cefas é
 * um PDF digital, com texto selecionável) e reconhecimento por expressões
 * regulares linha a linha. OCR é um ponto de extensão futuro — ver
 * {@link parseCefasBaixasPdf} quando o texto extraído vier vazio.
 *
 * As regex foram validadas contra o arquivo real `erros/Baixas - Julho - 15.pdf`
 * (2 páginas, 7 títulos, Total geral R$ 16.629,50).
 */

import * as pdfjsLib from 'pdfjs-dist';
import { detectPaymentMethod } from './paymentMethods';
// Worker do pdfjs instanciado pelo próprio Vite (`?worker`) — sem CDN externo.
// Antes usávamos `?url` + workerSrc, mas o pdf.js importava esse `.mjs` de forma
// dinâmica (import()), e em produção o servidor servia o arquivo com MIME
// errado → "Failed to fetch dynamically imported module". Com `?worker` o Vite
// cria o Worker diretamente e injetamos via workerPort, sem depender do MIME.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

/** Uma baixa (título quitado) lida do relatório. */
export interface Baixa {
  /** Identificador estável dentro do lote (para keys de UI). */
  id: string;
  /** Código do cliente no Cefas. */
  codigo: string;
  /** Nome fantasia / conta no Cefas (ex: "ACAI NO GRAU RAISSA ALIMENTOS"). */
  nomeFantasia: string;
  /** Razão social lida da observação (ex: "RB BORGES COMERCIO..."). */
  razaoSocial: string;
  /** CPF ou CNPJ do bloco do cliente. */
  documento: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  /** Número do título / NF. */
  titulo: string;
  emissao: string;
  vencimento: string;
  /** Data de pagamento (dd/mm/aaaa). */
  dataPagamento: string;
  /** Valor original (formatado pt-BR, ex: "6.347,75"). */
  valor: string;
  juros: string;
  /** Valor efetivamente pago (formatado pt-BR). */
  valorPago: string;
  /** Forma detectada a partir do código entre colchetes na observação. */
  formaDetectada: string;
  /** Código bruto da forma no PDF (ex: "PIXPAG"), para depuração. */
  formaBruta: string;
}

/** Resultado do parse, com dados agregados úteis para a UI. */
export interface ParseResult {
  baixas: Baixa[];
  /** Total geral impresso no rodapé do relatório (formatado pt-BR), se achado. */
  totalGeralPdf: string | null;
  /** Soma dos valores pagos das baixas lidas (número). */
  somaValorPago: number;
  /** Nome do emissor no cabeçalho (ex: "M F ROCHA LTDA"), se achado. */
  emissor: string | null;
}

// ── Regex de reconhecimento (validadas contra o texto real do pdfjs) ─────────
//
// Após reconstruir as linhas por coordenada (ver `extractLines`), o layout do
// relatório do Cefas fica assim (uma linha por registro):
//
//   Código: - Nome: ACAI NO GRAU RAISSA ALIMENTOS CPF/CNPJ: 35.856.036/0001-56 Endereço: AV PIAUI Bairro: CENTRO
//   422
//   UF: MA Cidade: TIMON Ponto de refêrencia: Telefone: 8681056735 Limite de Crédito: 20.000,00
//   C 161650 03/07/2026 10/07/2026 6.347,75 15/07/2026 0,00 0 Dias 0,00 6.347,75 0,00
//   Obs.: RB BORGES COMERCIO DE PRODUTOS ALIMENTICIOS LTDA [PIXPAG]
//
// Colunas do título: [C] NF Emissão Vencto Valor Pagto Vl.Juro Atraso Desc Vl.Pago Vl.Total

// O campo "Nome:" (nome fantasia) vem VAZIO quando o cliente é pessoa física
// cadastrada só com CPF — ex.: `Nome: CPF/CNPJ: 055.645.373-51`. Por isso o
// grupo do nome é `(.*?)` com `\s*` dos dois lados, e não `(.+?)\s+`: com `\s+`
// a linha inteira deixava de casar, o bloco do cliente nunca era aberto e todos
// os títulos daquele PDF eram descartados. A razão social vem da linha `Obs.:`,
// e a UI já usa `razaoSocial || nomeFantasia`.
const RE_CLIENTE =
  /Código:.*?Nome:\s*(.*?)\s*CPF\/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})\s+Endereço:\s*(.*?)(?:\s+Bairro:\s*(.*))?$/;

/** Linha com apenas o código do cliente (aparece logo após a linha do Nome). */
const RE_CODIGO = /^(\d+)$/;

const RE_LOC =
  /UF:\s*([A-Z]{2})\s+Cidade:\s*(.+?)\s+Ponto de ref.*?Telefone:\s*(.+?)\s+Limite de Crédito/;

const RE_TITULO =
  /^C?\s*(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+\d+\s+Dias\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/;

const RE_OBS = /^Obs\.:\s*(.+?)\s*\[([^\]]+)\]\s*$/;

/** Emissor do cabeçalho, ex: "03 - M F ROCHA LTDA ILHOTAS ..." → "M F ROCHA LTDA". */
const RE_EMISSOR = /^\d+\s*-\s*(.+?\bLTDA)\b/;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Converte valor formatado pt-BR ("6.347,75") em número (6347.75). */
export function brToNumber(value: string): number {
  const n = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Extrai o texto de todas as páginas de um PDF, uma linha por item de texto.
 *
 * pdfjs entrega itens de texto soltos; reconstruímos as linhas agrupando por
 * coordenada vertical (Y), o que reproduz o layout usado pelas regex acima.
 */
async function extractLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Agrupa os fragmentos por linha (Y arredondado), preservando ordem em X.
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as { str: string; transform: number[] }[]) {
      if (!('str' in item)) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str });
    }

    // Y decrescente = de cima para baixo na página.
    const sortedY = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedY) {
      const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
      const line = parts.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
  }

  return lines;
}

// ── Parse principal ──────────────────────────────────────────────────────────

/**
 * Lê um relatório de Baixas do Cefas e devolve as baixas reconhecidas.
 *
 * @throws Error quando o PDF não tem texto extraível (candidato a OCR — não
 *   implementado nesta entrega) ou quando nenhum título é reconhecido.
 */
export async function parseCefasBaixasPdf(file: File): Promise<ParseResult> {
  const lines = await extractLines(file);

  if (lines.length === 0) {
    // Ponto de extensão futuro: cair para OCR (ex.: edge function ocr-receipt)
    // quando o PDF for uma imagem escaneada sem camada de texto.
    throw new Error(
      'Não foi possível extrair texto do PDF. Verifique se o arquivo é o relatório de Baixas do Cefas.',
    );
  }

  const baixas: Baixa[] = [];
  let emissor: string | null = null;
  const totalGeralPdf: string | null = null;

  // Estado do cliente corrente (dados repetidos entre suas baixas).
  let cliente: Partial<Baixa> | null = null;
  // Última baixa criada, para associar a observação da linha seguinte.
  let pendingObs: Baixa | null = null;
  // Cliente aguardando a linha do código (que vem logo após a linha do Nome).
  let awaitingCodigo = false;
  let seq = 0;

  for (const line of lines) {
    if (!emissor) {
      const em = RE_EMISSOR.exec(line);
      if (em) emissor = em[1].trim();
    }

    const cli = RE_CLIENTE.exec(line);
    if (cli) {
      cliente = {
        codigo: '',
        nomeFantasia: cli[1].trim(),
        documento: cli[2],
        endereco: (cli[3] || '').trim(),
        bairro: (cli[4] || '').trim(),
      };
      awaitingCodigo = true;
      continue;
    }

    // Código do cliente numa linha isolada, logo após a linha do Nome.
    if (awaitingCodigo && cliente) {
      const cod = RE_CODIGO.exec(line);
      if (cod) {
        cliente.codigo = cod[1];
        awaitingCodigo = false;
        continue;
      }
      awaitingCodigo = false; // não veio um código puro; segue o fluxo normal.
    }

    const loc = RE_LOC.exec(line);
    if (loc && cliente) {
      cliente.uf = loc[1].trim();
      cliente.cidade = loc[2].trim();
      cliente.telefone = loc[3].trim();
      continue;
    }

    const tit = RE_TITULO.exec(line);
    if (tit) {
      // Um título nunca é descartado por falta do bloco do cliente: se a linha
      // "Código:/Nome:" não foi reconhecida, a baixa entra com os campos do
      // cliente em branco (a razão social ainda vem da linha `Obs.:`). Perder
      // um título em silêncio é pior que um recibo com cadastro incompleto.
      const c = cliente ?? {};
      const baixa: Baixa = {
        id: `b${seq++}`,
        codigo: c.codigo ?? '',
        nomeFantasia: c.nomeFantasia ?? '',
        razaoSocial: '',
        documento: c.documento ?? '',
        endereco: c.endereco ?? '',
        bairro: c.bairro ?? '',
        cidade: c.cidade ?? '',
        uf: c.uf ?? '',
        telefone: c.telefone ?? '',
        titulo: tit[1],
        emissao: tit[2],
        vencimento: tit[3],
        valor: tit[4],
        dataPagamento: tit[5],
        juros: tit[6],
        valorPago: tit[8],
        formaDetectada: '',
        formaBruta: '',
      };
      baixas.push(baixa);
      pendingObs = baixa;
      continue;
    }

    const obs = RE_OBS.exec(line);
    if (obs && pendingObs) {
      pendingObs.razaoSocial = obs[1].trim();
      pendingObs.formaBruta = obs[2].trim();
      pendingObs.formaDetectada = detectPaymentMethod(obs[2]);
      pendingObs = null;
      continue;
    }
  }

  if (baixas.length === 0) {
    throw new Error(
      'Nenhum título foi reconhecido no PDF. O layout pode não ser o do relatório de Baixas do Cefas.',
    );
  }

  const somaValorPago = baixas.reduce((sum, b) => sum + brToNumber(b.valorPago), 0);

  return { baixas, totalGeralPdf, somaValorPago, emissor };
}
