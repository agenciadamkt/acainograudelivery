// Motor de regras de despacho da Frota — pensado pra crescer sem reescrever
// telas. Cada regra nova vira: uma coluna em fleet_settings + um `if` aqui
// embaixo. A UI (badges/tooltips/KPIs) sempre itera `ruleViolations` de forma
// genérica, nunca verifica um tipo de regra específico — então uma regra
// nova (ex: distância máxima, peso máximo, mínimo de itens, tempo máximo de
// entrega, região permitida) aparece em todo lugar automaticamente.

export type FleetRuleType = 'min_order_value';

export interface FleetSettings {
  /** 0 = regra desativada (nenhum pedido é marcado) */
  minOrderValue: number;
}

export interface FleetRuleViolation {
  rule: FleetRuleType;
  label: string;
  message: string;
}

const RULE_DEFINITIONS: Record<FleetRuleType, { label: string; message: string }> = {
  min_order_value: {
    label: 'Abaixo do mínimo',
    message: 'Pedido abaixo do valor mínimo configurado para entrega.',
  },
};

// Pedidos de franquia (abastecimento interno entre franqueados) ficam fora
// de qualquer regra aqui — não são pedidos de cliente final, não fazem parte
// da política comercial de entrega.
export function evaluateFleetRules(
  order: { totalAmount: number; isFranchiseeOrder?: boolean },
  settings: FleetSettings
): FleetRuleViolation[] {
  if (order.isFranchiseeOrder) return [];

  const violations: FleetRuleViolation[] = [];

  if (settings.minOrderValue > 0 && order.totalAmount < settings.minOrderValue) {
    violations.push({ rule: 'min_order_value', ...RULE_DEFINITIONS.min_order_value });
  }

  return violations;
}
