// Fase 1 da integração com Google Calendar: gera um link que abre o evento
// já preenchido na tela de criação do Google Calendar (action=TEMPLATE) —
// sem OAuth, sem credencial, sem chamada de API. O usuário só confirma do
// lado do Google. Mesmo espírito do botão "meet.new" já usado no CAF Connect.
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function gerarLinkGoogleCalendar({
  titulo,
  descricao,
  inicio,
  duracaoMin = 60,
}: {
  titulo: string;
  descricao?: string | null;
  inicio: string | Date;
  duracaoMin?: number;
}): string {
  const inicioDate = typeof inicio === 'string' ? new Date(inicio) : inicio;
  const fimDate = new Date(inicioDate.getTime() + duracaoMin * 60_000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${formatGoogleDate(inicioDate)}/${formatGoogleDate(fimDate)}`,
  });
  if (descricao) params.set('details', descricao);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
