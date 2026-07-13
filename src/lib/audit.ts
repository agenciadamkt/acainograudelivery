import { supabase } from '@/integrations/supabase/client';

/**
 * Registro genérico de auditoria — reutilizável por todo o sistema (Caixa,
 * Pedidos, Financeiro, Estoque, Delivery, etc.). Grava em audit_logs.
 * A auditoria nunca pode quebrar a operação: falhas são silenciosas.
 */
export interface AuditEntry {
  entity_type: string;              // 'pdv_cash_register', 'pdv_order', ...
  entity_id?: string | null;
  action: string;                   // 'abertura','fechamento','reabertura','suprimento','sangria','cancelamento','impressao','reimpressao','exportacao', ...
  user_id?: string | null;
  operator_id?: string | null;
  store_id?: string | null;
  reason?: string | null;
  details?: Record<string, any> | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await (supabase as any).from('audit_logs').insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      action: entry.action,
      user_id: entry.user_id ?? null,
      operator_id: entry.operator_id ?? null,
      store_id: entry.store_id ?? null,
      reason: entry.reason ?? null,
      details: entry.details ?? null,
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
    });
  } catch {
    // silencioso por design
  }
}
