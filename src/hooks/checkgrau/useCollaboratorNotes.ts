/** Notas do gestor sobre um colaborador (aba Notas do modal de detalhe). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CollabNote { id: string; author_name: string | null; body: string; created_at: string }

export function useCollaboratorNotes(collaboratorId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['cg_collab_notes', collaboratorId],
    enabled: !!collaboratorId,
    queryFn: async (): Promise<CollabNote[]> => {
      const { data, error } = await (supabase as any)
        .from('checkgrau_collaborator_notes')
        .select('id, author_name, body, created_at')
        .eq('collaborator_id', collaboratorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CollabNote[];
    },
  });

  const add = useMutation({
    mutationFn: async (body: string) => {
      const author = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gestor';
      const { error } = await (supabase as any)
        .from('checkgrau_collaborator_notes')
        .insert([{ collaborator_id: collaboratorId, author_name: author, body: body.trim() }]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cg_collab_notes', collaboratorId] }),
  });

  return { ...query, add };
}
