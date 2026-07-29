/**
 * Catálogo dos tipos de item de checklist (Operações 2.0 — M2) e a validação
 * automática (temperatura/faixa → passou/não passou). Funções puras.
 */

export type ItemType =
  | 'boolean'
  | 'number'
  | 'text'
  | 'date'
  | 'photo'
  | 'rating'
  | 'temperature'
  | 'range'
  | 'single_choice'
  | 'multi_choice'
  | 'qr'
  | 'barcode';

export interface ItemTypeInfo {
  value: ItemType;
  label: string;
  /** Precisa de opções (single/multi choice). */
  hasOptions?: boolean;
  /** Usa min/max (faixa) ou apenas max como limite (temperatura). */
  usesRange?: 'minmax' | 'limit';
  hint?: string;
}

export const ITEM_TYPES: ItemTypeInfo[] = [
  { value: 'boolean', label: 'Sim / Não' },
  { value: 'number', label: 'Número' },
  { value: 'text', label: 'Texto' },
  { value: 'date', label: 'Data' },
  { value: 'photo', label: 'Foto' },
  { value: 'rating', label: 'Avaliação (1–5)' },
  { value: 'temperature', label: 'Temperatura', usesRange: 'limit', hint: 'Aprova dentro do limite.' },
  { value: 'range', label: 'Faixa numérica', usesRange: 'minmax', hint: 'Aprova entre mínimo e máximo.' },
  { value: 'single_choice', label: 'Escolha única', hasOptions: true },
  { value: 'multi_choice', label: 'Escolha múltipla', hasOptions: true },
  { value: 'qr', label: 'QR Code' },
  { value: 'barcode', label: 'Código de barras' },
];

export function itemTypeLabel(type: string): string {
  return ITEM_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface ItemConfig {
  min_value?: number | null;
  max_value?: number | null;
}

/**
 * Validação automática de um valor numérico segundo o tipo/config.
 * @returns `true`/`false` quando há regra (temperatura/faixa); `null` quando
 *   não se aplica.
 */
export function validateItemValue(
  type: string,
  value: number | null | undefined,
  cfg: ItemConfig,
): boolean | null {
  if (value == null || Number.isNaN(value)) {
    // sem valor: temperatura/faixa reprovam; demais não se aplicam
    return type === 'temperature' || type === 'range' ? false : null;
  }
  if (type === 'temperature') {
    if (cfg.max_value != null && value > cfg.max_value) return false;
    if (cfg.min_value != null && value < cfg.min_value) return false;
    return true;
  }
  if (type === 'range') {
    const min = cfg.min_value ?? -Infinity;
    const max = cfg.max_value ?? Infinity;
    return value >= min && value <= max;
  }
  return null;
}

/** Descreve o critério de aprovação de forma legível (para o cadastro/execução). */
export function ruleText(type: string, cfg: ItemConfig): string | null {
  if (type === 'temperature') {
    if (cfg.min_value != null && cfg.max_value != null) return `Entre ${cfg.min_value}° e ${cfg.max_value}°`;
    if (cfg.max_value != null) return `Até ${cfg.max_value}°`;
    if (cfg.min_value != null) return `A partir de ${cfg.min_value}°`;
    return null;
  }
  if (type === 'range') {
    if (cfg.min_value != null && cfg.max_value != null) return `Entre ${cfg.min_value} e ${cfg.max_value}`;
    if (cfg.max_value != null) return `Até ${cfg.max_value}`;
    if (cfg.min_value != null) return `A partir de ${cfg.min_value}`;
    return null;
  }
  return null;
}
