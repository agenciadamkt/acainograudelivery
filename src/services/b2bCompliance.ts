// =============================================
// B2B Compliance Service
// Validação de CNPJ e Compliance Legal
// =============================================

import { supabase } from '@/integrations/supabase/client';

// =============================================
// TIPOS
// =============================================

export interface CNPJValidationResult {
    valid: boolean;
    active: boolean;
    is_mei: boolean;
    razao_social: string;
    nome_fantasia: string;
    situacao: string;
    cnae_principal: string;
    cnae_compatible: boolean;
    cnae_warning: string | null;
    mei_status: 'active' | 'divergent' | 'rejected' | 'pending';
    rejection_reason: string | null;
}

export interface BrasilAPIResponse {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    descricao_situacao_cadastral: string;
    situacao_cadastral: string;
    data_situacao_cadastral: string;
    data_inicio_atividade: string;
    cnae_fiscal: number;
    cnae_fiscal_descricao: string;
    cnaes_secundarios: Array<{
        codigo: number;
        descricao: string;
    }>;
    natureza_juridica: string;
    capital_social: number;
    porte: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
    qsa: Array<{
        nome: string;
        qual: string;
    }>;
}

export interface B2BTerms {
    id: string;
    version: string;
    title: string;
    content: string;
    effective_date: string;
    mandatory: boolean;
}

export interface DriverCompliance {
    compliant: boolean;
    checks: {
        cnpj_registered: boolean;
        cnpj_value: string | null;
        mei_status: string;
        mei_active: boolean;
        cnae_compatible: boolean;
        cnae_warning: string | null;
        terms_accepted: boolean;
        terms_version: string | null;
        bank_configured: boolean;
    };
    blocks: string[];
    warnings: string[];
}

// =============================================
// FUNÇÕES: Validação de CNPJ via BrasilAPI
// =============================================

/**
 * Formata CNPJ removendo caracteres não numéricos
 */
export function formatCNPJ(cnpj: string): string {
    return cnpj.replace(/[^\d]/g, '');
}

/**
 * Valida formato do CNPJ (14 dígitos)
 */
export function isValidCNPJFormat(cnpj: string): boolean {
    const cleaned = formatCNPJ(cnpj);
    return cleaned.length === 14;
}

/**
 * Formata CNPJ para exibição
 */
export function displayCNPJ(cnpj: string): string {
    const cleaned = formatCNPJ(cnpj);
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    );
}

/**
 * Consulta CNPJ na BrasilAPI
 */
export async function fetchCNPJData(cnpj: string): Promise<BrasilAPIResponse | null> {
    const cleaned = formatCNPJ(cnpj);

    if (!isValidCNPJFormat(cleaned)) {
        throw new Error('CNPJ inválido. Deve conter 14 dígitos.');
    }

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('CNPJ não encontrado na base da Receita Federal.');
            }
            throw new Error(`Erro ao consultar CNPJ: ${response.status}`);
        }

        const data: BrasilAPIResponse = await response.json();
        return data;
    } catch (error: any) {
        if (error.message.includes('CNPJ')) {
            throw error;
        }
        throw new Error('Erro de conexão ao validar CNPJ. Tente novamente.');
    }
}

/**
 * Valida CNPJ e registra no banco
 */
export async function validateAndRegisterCNPJ(
    driverId: string,
    cnpj: string
): Promise<CNPJValidationResult> {
    // Buscar dados do CNPJ
    const cnpjData = await fetchCNPJData(cnpj);

    if (!cnpjData) {
        throw new Error('Não foi possível obter dados do CNPJ.');
    }

    // Registrar no banco via função RPC
    const { data, error } = await supabase.rpc('register_cnpj_validation' as any, {
        p_driver_id: driverId,
        p_cnpj: formatCNPJ(cnpj),
        p_api_source: 'brasilapi',
        p_api_response: cnpjData,
    });

    if (error) {
        console.error('Erro ao registrar validação:', error);
        throw new Error('Erro ao processar validação do CNPJ.');
    }

    return data as CNPJValidationResult;
}

// =============================================
// FUNÇÕES: Termos B2B
// =============================================

/**
 * Busca termos B2B ativos
 */
export async function getActiveB2BTerms(): Promise<B2BTerms | null> {
    const { data, error } = await supabase
        .from('b2b_terms_versions' as any)
        .select('*')
        .eq('active', true)
        .eq('mandatory', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Erro ao buscar termos:', error);
        return null;
    }

    return data as unknown as B2BTerms;
}

/**
 * Aceita termos B2B
 */
export async function acceptB2BTerms(
    driverId: string,
    termsVersionId: string,
    declarationText: string,
    fullScrollCompleted: boolean,
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        deviceFingerprint?: string;
    }
): Promise<{ success: boolean; acceptance_id?: string; error?: string }> {
    const { data, error } = await supabase.rpc('accept_b2b_terms' as any, {
        p_driver_id: driverId,
        p_terms_version_id: termsVersionId,
        p_declaration_text: declarationText,
        p_full_scroll_completed: fullScrollCompleted,
        p_ip_address: metadata?.ipAddress,
        p_user_agent: metadata?.userAgent,
        p_device_fingerprint: metadata?.deviceFingerprint,
    });

    if (error) {
        console.error('Erro ao aceitar termos:', error);
        return { success: false, error: 'Erro ao processar aceite dos termos.' };
    }

    return data as { success: boolean; acceptance_id?: string; error?: string };
}

// =============================================
// FUNÇÕES: Conta Bancária
// =============================================

export interface BankAccountData {
    bankCode: string;
    bankName: string;
    agency: string;
    accountNumber: string;
    accountType: 'corrente' | 'poupanca';
    holderName: string;
    holderDocument: string;
    holderDocumentType: 'cnpj' | 'cpf';
}

/**
 * Registra conta bancária PJ
 */
export async function registerBankAccount(
    driverId: string,
    bankData: BankAccountData
): Promise<{ success: boolean; is_pj_account: boolean; is_mei_holder: boolean; warning?: string }> {
    const { data, error } = await supabase.rpc('validate_bank_account' as any, {
        p_driver_id: driverId,
        p_bank_code: bankData.bankCode,
        p_bank_name: bankData.bankName,
        p_agency: bankData.agency,
        p_account_number: bankData.accountNumber,
        p_account_type: bankData.accountType,
        p_holder_name: bankData.holderName,
        p_holder_document: bankData.holderDocument,
        p_holder_document_type: bankData.holderDocumentType,
    });

    if (error) {
        console.error('Erro ao registrar conta:', error);
        throw new Error('Erro ao processar conta bancária.');
    }

    return data as any;
}

// =============================================
// FUNÇÕES: Compliance Check
// =============================================

/**
 * Verifica compliance completo do driver
 */
export async function checkDriverCompliance(driverId: string): Promise<DriverCompliance> {
    const { data, error } = await supabase.rpc('check_driver_compliance' as any, {
        p_driver_id: driverId,
    });

    if (error) {
        console.error('Erro ao verificar compliance:', error);
        throw new Error('Erro ao verificar status de compliance.');
    }

    const result = data as any;

    // Filtrar arrays removendo nulls
    return {
        ...result,
        blocks: (result.blocks || []).filter((b: any) => b !== null),
        warnings: (result.warnings || []).filter((w: any) => w !== null),
    };
}

// =============================================
// Lista de Bancos Brasileiros
// =============================================

export const BRAZILIAN_BANKS = [
    { code: '001', name: 'Banco do Brasil S.A.' },
    { code: '033', name: 'Banco Santander (Brasil) S.A.' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '237', name: 'Banco Bradesco S.A.' },
    { code: '341', name: 'Itaú Unibanco S.A.' },
    { code: '422', name: 'Banco Safra S.A.' },
    { code: '745', name: 'Banco Citibank S.A.' },
    { code: '212', name: 'Banco Original S.A.' },
    { code: '260', name: 'Nu Pagamentos S.A. (Nubank)' },
    { code: '077', name: 'Banco Inter S.A.' },
    { code: '336', name: 'Banco C6 S.A.' },
    { code: '290', name: 'PagSeguro Internet S.A.' },
    { code: '323', name: 'Mercado Pago' },
    { code: '380', name: 'PicPay Servicos S.A.' },
    { code: '197', name: 'Stone Pagamentos S.A.' },
    { code: '403', name: 'Cora SCD S.A.' },
    { code: '756', name: 'Banco Cooperativo do Brasil S.A. (Sicoob)' },
    { code: '748', name: 'Banco Cooperativo Sicredi S.A.' },
    { code: '041', name: 'Banco do Estado do Rio Grande do Sul S.A. (Banrisul)' },
    { code: '070', name: 'Banco de Brasília S.A. (BRB)' },
    { code: '136', name: 'Unicred' },
    { code: '389', name: 'Banco Mercantil do Brasil S.A.' },
    { code: '218', name: 'Banco BS2 S.A.' },
    { code: '655', name: 'Banco Votorantim S.A.' },
    { code: '707', name: 'Banco Daycoval S.A.' },
];

/**
 * Busca nome do banco pelo código
 */
export function getBankName(code: string): string {
    const bank = BRAZILIAN_BANKS.find(b => b.code === code);
    return bank?.name || 'Banco não identificado';
}
