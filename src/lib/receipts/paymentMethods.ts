/**
 * Formas de pagamento dos recibos de baixa (ERP Cefas).
 *
 * O relatório do Cefas traz a forma entre colchetes na observação, ex:
 *   "Obs.:RB BORGES ... [PIXPAG]"
 * Aqui mapeamos esses códigos para os rótulos exibidos ao usuário e usados
 * no recibo. Quando o código não é reconhecido, retornamos `UNIDENTIFIED`.
 */

/** Rótulo especial para forma não reconhecida no PDF. */
export const UNIDENTIFIED = 'Forma de pagamento não identificada';

/** Opções que o usuário pode escolher na tela de conferência. */
export const PAYMENT_METHOD_OPTIONS = [
  'PIX',
  'QR Code PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'TED',
  'Depósito',
  'Dinheiro',
  'Transferência Bancária',
  'Outro',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number];

/**
 * Mapa código do Cefas (dentro dos colchetes, normalizado) → rótulo.
 * As chaves são comparadas em maiúsculas e sem espaços nas bordas.
 */
const CEFAS_PAYMENT_MAP: Record<string, PaymentMethod> = {
  PIXPAG: 'PIX',
  PIX: 'PIX',
  'CARTAO DE CREDITO': 'Cartão de Crédito',
  'CARTAO DE DEBITO': 'Cartão de Débito',
  BOLETO: 'Boleto',
  'BOLETO BANCARIO': 'Boleto',
  TED: 'TED',
  DEPOSITO: 'Depósito',
};

/**
 * Detecta a forma de pagamento a partir do código bruto do PDF.
 * @param raw texto entre colchetes, ex: "PIXPAG", "CARTAO DE CREDITO".
 * @returns o rótulo mapeado ou {@link UNIDENTIFIED} quando não reconhecido.
 */
export function detectPaymentMethod(raw: string | undefined | null): string {
  if (!raw) return UNIDENTIFIED;
  const key = raw.trim().toUpperCase();
  return CEFAS_PAYMENT_MAP[key] ?? UNIDENTIFIED;
}

/** Indica se a forma precisa de escolha manual do usuário. */
export function isUnidentified(method: string): boolean {
  return method === UNIDENTIFIED;
}
