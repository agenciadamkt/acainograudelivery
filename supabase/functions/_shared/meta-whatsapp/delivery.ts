export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
export function serviceWindow(lastInbound: string | null | undefined, now = Date.now()) {
  const at = lastInbound ? Date.parse(lastInbound) : NaN;
  const expiresAt = Number.isFinite(at) ? at + SERVICE_WINDOW_MS : null;
  return { open: expiresAt !== null && at <= now && now < expiresAt, expiresAt, lastInbound: Number.isFinite(at) ? lastInbound! : null };
}
export function deliveryFailure(metadata: Record<string, any> | null | undefined) {
  const error = metadata?.delivery_error || metadata?.error;
  const code = Number(error?.meta_code ?? error?.code);
  if (code === 131047) return 'A janela de 24 horas terminou. Retome com um modelo aprovado e aguarde a resposta do contato.';
  if (code === 131026) return 'A Meta não conseguiu entregar a mensagem. Verifique o número e a disponibilidade do contato.';
  if (code === 131049) return 'A Meta limitou a entrega deste modelo ao contato. Aguarde antes de tentar novamente.';
  if (code === 190 || error?.code === 'AUTH_ERROR') return 'A conexão com a Meta precisa ser reautenticada.';
  if (error?.message) return `Falha na entrega${Number.isFinite(code) ? ` (${code})` : ''}: ${String(error.message).slice(0, 240)}`;
  return 'A mensagem não foi entregue. O motivo desta falha não foi registrado pelo serviço.';
}
