import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfDay, endOfDay, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AgendaEventoTipo = 'compromisso' | 'tarefa' | 'retorno';
export type AgendaOrigem = 'agenda' | 'caf_connect';
export type AgendaStatus = 'pendente' | 'concluido' | 'cancelado';
export type SlaStatus = 'atrasado' | 'hoje' | 'futuro' | 'resolvido';

export interface AgendaItem {
  id: string;
  origem: AgendaOrigem;
  tipo: AgendaEventoTipo | 'caf_connect';
  titulo: string;
  descricao: string | null;
  dataHora: string;
  status: AgendaStatus;
  slaStatus: SlaStatus;
  responsavelId: string | null;
  responsavelNome: string | null;
  origemModulo: string;
  origemTabela: string | null;
  origemId: string | null;
  // Só quando origem === 'caf_connect' — pra abrir direto da agenda
  ticketId?: string | null;
  ticketProtocolo?: string | null;
  googleMeetUrl?: string | null;
  excalidrawRoomUrl?: string | null;
  concluidoEm: string | null;
  createdAt: string;
}

// SLA é sempre calculado na leitura — nunca armazenado. "Atrasado" é qualquer
// pendente cujo momento já passou (não importa se foi hoje ou há 3 dias);
// "Hoje" é pendente cujo momento ainda não passou mas é hoje; "Futuro" é
// depois de hoje. Resolvido (concluído/cancelado) não entra em nenhum bucket.
function calcularSlaStatus(dataHoraIso: string, status: AgendaStatus): SlaStatus {
  if (status !== 'pendente') return 'resolvido';
  const dataHora = new Date(dataHoraIso);
  const agora = new Date();
  if (dataHora.getTime() < agora.getTime()) return 'atrasado';
  if (isSameDay(dataHora, agora)) return 'hoje';
  return 'futuro';
}

function mapCafConnectStatus(status: string): AgendaStatus {
  if (status === 'encerrada') return 'concluido';
  if (status === 'cancelada') return 'cancelado';
  return 'pendente';
}

// Resolve nome de exibição por id de usuário — segunda consulta manual em
// user_profiles (mesmo padrão de useCafConnect.ts: não há FK real entre
// auth.users e user_profiles neste projeto, e não duplicamos nome em coluna).
async function resolverNomesUsuarios(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
  if (uniqueIds.length === 0) return {};
  const { data } = await supabase.from('user_profiles').select('id, nome').in('id', uniqueIds);
  return Object.fromEntries((data ?? []).map((p: any) => [p.id, p.nome]));
}

async function fetchAgendaEventosRaw(fromIso: string, toIso: string, responsavelId?: string) {
  let q = supabase
    .from('agenda_eventos' as any)
    .select('*')
    .gte('data_hora', fromIso)
    .lte('data_hora', toIso)
    .order('data_hora', { ascending: true });
  if (responsavelId) q = q.eq('responsavel_id', responsavelId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any[];
}

async function fetchCafConnectEventosRaw(fromIso: string, toIso: string, responsavelId?: string) {
  let q = supabase
    .from('caf_sessions' as any)
    .select(`
      id, title, description, status, scheduled_at, created_at, ended_at,
      created_by, ticket_id, google_meet_url, excalidraw_room_url,
      ticket:caf_atendimentos(protocolo)
    `)
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', fromIso)
    .lte('scheduled_at', toIso)
    .order('scheduled_at', { ascending: true });
  if (responsavelId) q = q.eq('created_by', responsavelId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any[];
}

// Junta as duas fontes (agenda_eventos + caf_sessions.scheduled_at) num único
// array ordenado. CAF Connect nunca é duplicado em agenda_eventos — é só
// "etiquetado" como tipo='caf_connect' aqui, na leitura. Exportada (não só
// usada via hook) pra permitir buscas pontuais fora do ciclo de render, como
// nos exports de PDF em RelatoriosAgendaPage.tsx.
export async function montarAgendaItens(from: Date, to: Date, responsavelId?: string): Promise<AgendaItem[]> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [eventos, sessoes] = await Promise.all([
    fetchAgendaEventosRaw(fromIso, toIso, responsavelId),
    fetchCafConnectEventosRaw(fromIso, toIso, responsavelId),
  ]);

  const nomes = await resolverNomesUsuarios([
    ...eventos.map((e: any) => e.responsavel_id),
    ...sessoes.map((s: any) => s.created_by),
  ]);

  const itensAgenda: AgendaItem[] = eventos.map((e: any) => ({
    id: e.id,
    origem: 'agenda',
    tipo: e.tipo,
    titulo: e.titulo,
    descricao: e.descricao,
    dataHora: e.data_hora,
    status: e.status,
    slaStatus: calcularSlaStatus(e.data_hora, e.status),
    responsavelId: e.responsavel_id,
    responsavelNome: e.responsavel_id ? nomes[e.responsavel_id] ?? null : null,
    origemModulo: e.origem_modulo,
    origemTabela: e.origem_tabela,
    origemId: e.origem_id,
    concluidoEm: e.concluido_em,
    createdAt: e.created_at,
  }));

  const itensCafConnect: AgendaItem[] = sessoes.map((s: any) => {
    const status = mapCafConnectStatus(s.status);
    const ticket = Array.isArray(s.ticket) ? s.ticket[0] : s.ticket;
    return {
      id: s.id,
      origem: 'caf_connect',
      tipo: 'caf_connect',
      titulo: s.title,
      descricao: s.description,
      dataHora: s.scheduled_at,
      status,
      slaStatus: calcularSlaStatus(s.scheduled_at, status),
      responsavelId: s.created_by,
      responsavelNome: s.created_by ? nomes[s.created_by] ?? null : null,
      origemModulo: 'caf',
      origemTabela: 'caf_sessions',
      origemId: s.id,
      ticketId: s.ticket_id,
      ticketProtocolo: ticket?.protocolo ?? null,
      googleMeetUrl: s.google_meet_url,
      excalidrawRoomUrl: s.excalidraw_room_url,
      concluidoEm: s.ended_at,
      createdAt: s.created_at,
    };
  });

  return [...itensAgenda, ...itensCafConnect].sort(
    (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
  );
}

export function useEventosDoDia(data: string, responsavelId?: string) {
  return useQuery({
    queryKey: ['agenda-eventos', 'dia', data, responsavelId ?? 'todos'],
    queryFn: () => {
      const dia = new Date(data + 'T00:00:00');
      return montarAgendaItens(startOfDay(dia), endOfDay(dia), responsavelId);
    },
  });
}

export function useEventosDoPeriodo(from: string, to: string, responsavelId?: string) {
  return useQuery({
    queryKey: ['agenda-eventos', 'periodo', from, to, responsavelId ?? 'todos'],
    queryFn: () => montarAgendaItens(
      startOfDay(new Date(from + 'T00:00:00')),
      endOfDay(new Date(to + 'T00:00:00')),
      responsavelId,
    ),
  });
}

export function useCriarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      titulo: string;
      descricao?: string;
      tipo: AgendaEventoTipo;
      dataHora: string;
      responsavelId?: string | null;
      origemModulo?: string;
      origemTabela?: string | null;
      origemId?: string | null;
      createdBy?: string | null;
    }) => {
      const { error } = await supabase.from('agenda_eventos' as any).insert({
        titulo: payload.titulo,
        descricao: payload.descricao ?? null,
        tipo: payload.tipo,
        data_hora: payload.dataHora,
        responsavel_id: payload.responsavelId ?? null,
        origem_modulo: payload.origemModulo ?? 'caf',
        origem_tabela: payload.origemTabela ?? null,
        origem_id: payload.origemId ?? null,
        created_by: payload.createdBy ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-eventos'] });
      qc.invalidateQueries({ queryKey: ['agenda-dashboard'] });
      toast.success('Evento criado na agenda!');
    },
    onError: (err: any) => toast.error('Erro ao criar evento: ' + err.message),
  });
}

export function useAtualizarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      titulo: string;
      descricao?: string;
      tipo: AgendaEventoTipo;
      dataHora: string;
      responsavelId?: string | null;
    }) => {
      const { error } = await supabase
        .from('agenda_eventos' as any)
        .update({
          titulo: payload.titulo,
          descricao: payload.descricao ?? null,
          tipo: payload.tipo,
          data_hora: payload.dataHora,
          responsavel_id: payload.responsavelId ?? null,
        } as any)
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-eventos'] });
      qc.invalidateQueries({ queryKey: ['agenda-dashboard'] });
      toast.success('Evento atualizado!');
    },
    onError: (err: any) => toast.error('Erro ao atualizar evento: ' + err.message),
  });
}

export function useConcluirEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_eventos' as any)
        .update({ status: 'concluido', concluido_em: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-eventos'] });
      qc.invalidateQueries({ queryKey: ['agenda-dashboard'] });
      toast.success('Marcado como concluído!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export function useCancelarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_eventos' as any)
        .update({ status: 'cancelado' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-eventos'] });
      qc.invalidateQueries({ queryKey: ['agenda-dashboard'] });
      toast.success('Evento cancelado.');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export function useExcluirEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agenda_eventos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-eventos'] });
      qc.invalidateQueries({ queryKey: ['agenda-dashboard'] });
      toast.success('Evento excluído.');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export interface AgendaDashboardStats {
  atrasados: number;
  hoje: number;
  futuros: number;
  cafConnectAgendados: number;
  tempoMedioConclusaoMin: number | null;
  taxaCumprimento: number | null;
  maisSobrecarregado: { nome: string; quantidade: number } | null;
  itens: AgendaItem[];
}

export function useAgendaDashboard(from: string, to: string) {
  return useQuery({
    queryKey: ['agenda-dashboard', from, to],
    queryFn: async (): Promise<AgendaDashboardStats> => {
      const itens = await montarAgendaItens(
        startOfDay(new Date(from + 'T00:00:00')),
        endOfDay(new Date(to + 'T00:00:00')),
      );

      const pendentes = itens.filter(i => i.status === 'pendente');
      const atrasados = pendentes.filter(i => i.slaStatus === 'atrasado').length;
      const hoje = pendentes.filter(i => i.slaStatus === 'hoje').length;
      const futuros = pendentes.filter(i => i.slaStatus === 'futuro').length;
      const cafConnectAgendados = itens.filter(i => i.origem === 'caf_connect' && i.status === 'pendente').length;

      const concluidosComTempo = itens.filter(i => i.status === 'concluido' && i.concluidoEm);
      const tempoMedioConclusaoMin = concluidosComTempo.length
        ? concluidosComTempo.reduce((acc, i) => acc + (new Date(i.concluidoEm!).getTime() - new Date(i.createdAt).getTime()) / 60000, 0) / concluidosComTempo.length
        : null;

      const naoCancelados = itens.filter(i => i.status !== 'cancelado');
      const taxaCumprimento = naoCancelados.length
        ? Math.round((naoCancelados.filter(i => i.status === 'concluido').length / naoCancelados.length) * 100)
        : null;

      const cargaPorResponsavel = new Map<string, number>();
      pendentes.forEach(i => {
        if (!i.responsavelNome) return;
        cargaPorResponsavel.set(i.responsavelNome, (cargaPorResponsavel.get(i.responsavelNome) ?? 0) + 1);
      });
      const top = [...cargaPorResponsavel.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        atrasados,
        hoje,
        futuros,
        cafConnectAgendados,
        tempoMedioConclusaoMin,
        taxaCumprimento,
        maisSobrecarregado: top ? { nome: top[0], quantidade: top[1] } : null,
        itens,
      };
    },
  });
}
