import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CafSessionStatus = 'agendada' | 'aguardando_participantes' | 'em_andamento' | 'encerrada' | 'cancelada';
export type CafSessionType = 'suporte' | 'treinamento' | 'demonstracao' | 'outro';
export type CafParticipanteTipo = 'atendente' | 'franqueado' | 'convidado';

export interface CafSessionParticipante {
  nome: string;
  email?: string;
  // Opcional pra não travar quem já tiver registros sem o campo — evita
  // limitações futuras quando for preciso distinguir quem é quem na sessão.
  tipo?: CafParticipanteTipo;
}

export interface CafSession {
  id: string;
  ticket_id: string;
  created_by: string | null;
  created_by_nome?: string | null; // resolvido em memória (lookup), não persistido
  title: string;
  description: string | null;
  session_type: CafSessionType;
  status: CafSessionStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_min: number | null;
  google_event_id: string | null;
  google_meet_url: string | null;
  excalidraw_room_id: string | null;
  excalidraw_room_url: string | null;
  excalidraw_snapshot_url: string | null;
  excalidraw_last_access: string | null;
  participantes: CafSessionParticipante[];
  summary: string | null;
  ai_summary: string | null;
  next_steps: string | null;
  recording_url: string | null;
  recording_provider: string | null;
  recording_duration_seg: number | null;
  recording_size_bytes: number | null;
  nps_nota: number | null;
  nps_problema_resolvido: boolean | null;
  nps_comentario: string | null;
  nps_respondido_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface CafConnectEvento {
  id: string;
  session_id: string;
  tipo: string;
  descricao: string | null;
  created_by: string | null;
  created_at: string;
}

async function registrarEvento(sessionId: string, tipo: string, descricao?: string, createdBy?: string | null) {
  await supabase.from('caf_connect_eventos' as any).insert({
    session_id: sessionId,
    tipo,
    descricao: descricao ?? null,
    created_by: createdBy ?? null,
  } as any);
}

// Resolve nome de exibição por id de usuário — segunda consulta manual em
// user_profiles, mesmo padrão já usado em AtendimentosPage.tsx (não há FK
// real entre auth.users e user_profiles neste projeto pra embutir via join).
async function resolverNomesUsuarios(ids: (string | null)[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
  if (uniqueIds.length === 0) return {};
  const { data } = await supabase.from('user_profiles').select('id, nome').in('id', uniqueIds);
  return Object.fromEntries((data ?? []).map((p: any) => [p.id, p.nome]));
}

export function useSessoesPorTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['caf_sessions', 'ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caf_sessions' as any)
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const sessoes = (data ?? []) as unknown as CafSession[];
      const nomes = await resolverNomesUsuarios(sessoes.map(s => s.created_by));
      return sessoes.map(s => ({ ...s, created_by_nome: s.created_by ? nomes[s.created_by] : null }));
    },
    enabled: !!ticketId,
  });
}

export function useEventosDaSessao(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['caf_connect_eventos', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caf_connect_eventos' as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CafConnectEvento[];
    },
    enabled: !!sessionId,
  });
}

export function useCriarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ticketId: string;
      title: string;
      description?: string;
      sessionType: CafSessionType;
      scheduledAt?: string | null;
      participantes: CafSessionParticipante[];
      excalidrawRoomId: string;
      excalidrawRoomUrl: string;
      googleMeetUrl?: string | null;
      createdBy?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('caf_sessions' as any)
        .insert({
          ticket_id: payload.ticketId,
          title: payload.title,
          description: payload.description ?? null,
          session_type: payload.sessionType,
          status: payload.scheduledAt ? 'agendada' : 'aguardando_participantes',
          scheduled_at: payload.scheduledAt ?? null,
          participantes: payload.participantes,
          excalidraw_room_id: payload.excalidrawRoomId,
          excalidraw_room_url: payload.excalidrawRoomUrl,
          google_meet_url: payload.googleMeetUrl ?? null,
          created_by: payload.createdBy ?? null,
        } as any)
        .select('*')
        .single();
      if (error) throw error;

      const sessao = data as unknown as CafSession;
      await registrarEvento(sessao.id, 'criada', undefined, payload.createdBy);
      await registrarEvento(sessao.id, 'quadro_criado', payload.excalidrawRoomUrl, payload.createdBy);
      if (payload.googleMeetUrl) {
        await registrarEvento(sessao.id, 'meet_definido', payload.googleMeetUrl, payload.createdBy);
      }
      return sessao;
    },
    onSuccess: (sessao) => {
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'ticket', sessao.ticket_id] });
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'dashboard'] });
      toast.success('Sessão CAF Connect criada!');
    },
    onError: (err: any) => toast.error('Erro ao criar sessão: ' + err.message),
  });
}

export function useDefinirMeetUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, ticketId, meetUrl, createdBy }: { sessionId: string; ticketId: string; meetUrl: string; createdBy?: string | null }) => {
      const { error } = await supabase.from('caf_sessions' as any).update({ google_meet_url: meetUrl } as any).eq('id', sessionId);
      if (error) throw error;
      await registrarEvento(sessionId, 'meet_definido', meetUrl, createdBy);
      return { sessionId, ticketId };
    },
    onSuccess: ({ ticketId }) => {
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'ticket', ticketId] });
      toast.success('Link do Meet salvo!');
    },
    onError: (err: any) => toast.error('Erro ao salvar link do Meet: ' + err.message),
  });
}

export function useIniciarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, ticketId, createdBy }: { sessionId: string; ticketId: string; createdBy?: string | null }) => {
      const { error } = await supabase.from('caf_sessions' as any).update({ status: 'em_andamento', started_at: new Date().toISOString() } as any).eq('id', sessionId);
      if (error) throw error;
      await registrarEvento(sessionId, 'sessao_iniciada', undefined, createdBy);
      return { sessionId, ticketId };
    },
    onSuccess: ({ ticketId }) => qc.invalidateQueries({ queryKey: ['caf_sessions', 'ticket', ticketId] }),
    onError: (err: any) => toast.error('Erro ao iniciar sessão: ' + err.message),
  });
}

export function useRegistrarAcessoQuadro() {
  return useMutation({
    mutationFn: async ({ sessionId, createdBy }: { sessionId: string; createdBy?: string | null }) => {
      await supabase.from('caf_sessions' as any).update({ excalidraw_last_access: new Date().toISOString() } as any).eq('id', sessionId);
      await registrarEvento(sessionId, 'quadro_acessado', undefined, createdBy);
    },
  });
}

export function useEncerrarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      sessionId: string; ticketId: string; summary: string; nextSteps?: string;
      recordingUrl?: string; recordingProvider?: string; recordingDurationSeg?: number; recordingSizeBytes?: number;
      startedAt: string | null; createdBy?: string | null;
    }) => {
      const endedAt = new Date();
      const durationMin = payload.startedAt
        ? Math.max(0, Math.round((endedAt.getTime() - new Date(payload.startedAt).getTime()) / 60000))
        : null;

      const { error } = await supabase
        .from('caf_sessions' as any)
        .update({
          status: 'encerrada',
          ended_at: endedAt.toISOString(),
          duration_min: durationMin,
          summary: payload.summary,
          next_steps: payload.nextSteps ?? null,
          recording_url: payload.recordingUrl ?? null,
          recording_provider: payload.recordingProvider ?? null,
          recording_duration_seg: payload.recordingDurationSeg ?? null,
          recording_size_bytes: payload.recordingSizeBytes ?? null,
        } as any)
        .eq('id', payload.sessionId);
      if (error) throw error;

      await registrarEvento(payload.sessionId, 'resumo_salvo', payload.summary, payload.createdBy);
      await registrarEvento(payload.sessionId, 'encerrada', undefined, payload.createdBy);
      return payload;
    },
    onSuccess: (payload) => {
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'ticket', payload.ticketId] });
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'dashboard'] });
      toast.success('Sessão encerrada!');
    },
    onError: (err: any) => toast.error('Erro ao encerrar sessão: ' + err.message),
  });
}

export function useReagendarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, ticketId, scheduledAt, createdBy }: { sessionId: string; ticketId: string; scheduledAt: string; createdBy?: string | null }) => {
      const { error } = await supabase.from('caf_sessions' as any).update({ status: 'agendada', scheduled_at: scheduledAt } as any).eq('id', sessionId);
      if (error) throw error;
      await registrarEvento(sessionId, 'reagendada', scheduledAt, createdBy);
      return ticketId;
    },
    onSuccess: (ticketId) => {
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'ticket', ticketId] });
      toast.success('Sessão reagendada!');
    },
    onError: (err: any) => toast.error('Erro ao reagendar: ' + err.message),
  });
}

export function useCancelarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, ticketId, createdBy }: { sessionId: string; ticketId: string; createdBy?: string | null }) => {
      const { error } = await supabase.from('caf_sessions' as any).update({ status: 'cancelada' } as any).eq('id', sessionId);
      if (error) throw error;
      await registrarEvento(sessionId, 'cancelada', undefined, createdBy);
      return ticketId;
    },
    onSuccess: (ticketId) => {
      qc.invalidateQueries({ queryKey: ['caf_sessions', 'ticket', ticketId] });
      toast.success('Sessão cancelada.');
    },
    onError: (err: any) => toast.error('Erro ao cancelar: ' + err.message),
  });
}

export function useNpsSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, nota, problemaResolvido, comentario }: { sessionId: string; nota: number; problemaResolvido: boolean; comentario?: string }) => {
      const { error } = await supabase
        .from('caf_sessions' as any)
        .update({ nps_nota: nota, nps_problema_resolvido: problemaResolvido, nps_comentario: comentario ?? null, nps_respondido_em: new Date().toISOString() } as any)
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caf_sessions'] });
      toast.success('Avaliação enviada. Obrigado!');
    },
    onError: (err: any) => toast.error('Erro ao enviar avaliação: ' + err.message),
  });
}

// Dashboard principal. .limit(500) como rede de segurança simples — não é
// paginação completa, mas evita buscar a tabela inteira sem limite nenhum
// enquanto o volume de sessões ainda é pequeno.
export function useSessoesDashboard(filtros: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['caf_sessions', 'dashboard', filtros],
    queryFn: async () => {
      let q = supabase
        .from('caf_sessions' as any)
        .select('*, ticket:caf_atendimentos(protocolo, categoria, loja_franqueada, atendente_nome)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (filtros.from) q = q.gte('created_at', filtros.from);
      if (filtros.to) q = q.lte('created_at', filtros.to);
      const { data, error } = await q;
      if (error) throw error;
      const sessoes = (data ?? []) as any[];
      const nomes = await resolverNomesUsuarios(sessoes.map(s => s.created_by));
      return sessoes.map(s => ({ ...s, created_by_nome: s.created_by ? nomes[s.created_by] : null }));
    },
  });
}
