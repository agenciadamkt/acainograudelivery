// Contratos compartilhados do módulo Fiscal (frontend).
// Espelham as tabelas fiscal_* e a máquina de estados do documento.

export type FiscalAmbiente = 'sandbox' | 'homologacao' | 'producao';
export type FiscalTipo = 'NFCE' | 'NFE' | 'NFSE' | 'MDFE' | 'CFE';
export type FiscalStatus =
  | 'RASCUNHO' | 'PROCESSANDO' | 'AUTORIZADO'
  | 'REJEITADO' | 'CANCELADO' | 'INUTILIZADO' | 'ERRO';

export interface FiscalDocument {
  id: string;
  store_id: string;
  fiscal_company_id: string | null;
  order_id: string | null;
  pdv_order_id: string | null;
  tipo_documento: FiscalTipo;
  status: FiscalStatus;
  ambiente: FiscalAmbiente;
  plugnotas_id: string | null;
  protocolo: string | null;
  chave: string | null;
  numero: number | null;
  serie: number | null;
  valor_total: number | null;
  destinatario_nome: string | null;
  destinatario_documento: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  motivo_rejeicao: string | null;
  emitido_em: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
}

export type FiscalProvider = 'plugnotas' | 'focusnfe';

export const FISCAL_PROVIDER_LABEL: Record<FiscalProvider, string> = {
  plugnotas: 'PlugNotas (TecnoSpeed)',
  focusnfe: 'Focus NFe',
};

export interface FiscalCompany {
  id: string;
  store_id: string;
  provider: FiscalProvider;
  plugnotas_company_id: string | null;
  ambiente: FiscalAmbiente;
  regime_tributario: number | null;
  codigo_municipio_ibge: string | null;
  certificado_ativo_id: string | null;
  auto_emitir: boolean;
  timeout_seg: number;
  danfe_logo_url: string | null;
  danfe_rodape: string | null;
  ativo: boolean;
  ultimo_sync: string | null;
  // token_encrypted NUNCA é exposto ao frontend
}

// Colunas seguras da empresa (sem token) — usar em todo SELECT do cliente
export const FISCAL_COMPANY_SAFE_COLS =
  'id, store_id, provider, plugnotas_company_id, ambiente, regime_tributario, codigo_municipio_ibge, certificado_ativo_id, auto_emitir, timeout_seg, danfe_logo_url, danfe_rodape, ativo, ultimo_sync';

// Rótulos e cores de status (UI em tempo real)
export const FISCAL_STATUS_META: Record<FiscalStatus, { label: string; dot: string; className: string }> = {
  RASCUNHO:    { label: 'Rascunho',    dot: '⚪', className: 'bg-gray-100 text-gray-700' },
  PROCESSANDO: { label: 'Processando', dot: '🟡', className: 'bg-amber-100 text-amber-700' },
  AUTORIZADO:  { label: 'Autorizada',  dot: '🟢', className: 'bg-emerald-100 text-emerald-700' },
  REJEITADO:   { label: 'Rejeitada',   dot: '🔴', className: 'bg-red-100 text-red-700' },
  CANCELADO:   { label: 'Cancelada',   dot: '⚫', className: 'bg-gray-200 text-gray-800' },
  INUTILIZADO: { label: 'Inutilizada', dot: '⚫', className: 'bg-gray-200 text-gray-800' },
  ERRO:        { label: 'Erro',        dot: '🔴', className: 'bg-red-100 text-red-700' },
};

export const FISCAL_TIPO_LABEL: Record<FiscalTipo, string> = {
  NFCE: 'NFC-e', NFE: 'NF-e', NFSE: 'NFS-e', MDFE: 'MDF-e', CFE: 'CF-e',
};
