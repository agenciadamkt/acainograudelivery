/**
 * CheckGrau — gestão de colaboradores (Bloco A). CRUD sobre
 * `checkgrau_collaborators` + vínculo N:N com lojas (`checkgrau_collaborator_stores`).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Cargo = 'operador' | 'lider' | 'supervisor' | 'franqueado';
export type CollabStatus = 'ativo' | 'inativo' | 'afastado' | 'desligado';

export interface Collaborator {
  id: string;
  company_id: string | null;
  auth_user_id: string | null;
  name: string;
  whatsapp: string;
  cpf: string | null;
  cargo: Cargo;
  photo_url: string | null;
  status: CollabStatus;
  store_ids: string[];
  last_seen_at?: string | null;
}

export interface NewCollaborator {
  name: string;
  whatsapp: string;
  cpf?: string | null;
  cargo: Cargo;
  photo_url?: string | null;
  status: CollabStatus;
  store_ids: string[];
}

const QK = ['checkgrau_collaborators'];

export const CARGO_LABEL: Record<Cargo, string> = {
  operador: 'Operador', lider: 'Líder', supervisor: 'Supervisor', franqueado: 'Franqueado',
};
export const STATUS_LABEL: Record<CollabStatus, string> = {
  ativo: 'Ativo', inativo: 'Inativo', afastado: 'Afastado', desligado: 'Desligado',
};

export function useCollaborators() {
  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<Collaborator[]> => {
      const { data, error } = await (supabase as any)
        .from('checkgrau_collaborators')
        .select('*, stores:checkgrau_collaborator_stores(store_id)')
        .order('name');
      if (error) throw error;
      return ((data ?? []) as any[]).map((c) => ({
        ...c,
        store_ids: (c.stores ?? []).map((s: any) => s.store_id),
      })) as Collaborator[];
    },
  });
}

/** Normaliza o WhatsApp para E.164 (+55...). */
export function normalizeWhatsapp(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits.startsWith('55') ? digits : '55' + digits}`;
}

async function syncStores(collaboratorId: string, storeIds: string[]) {
  await (supabase as any).from('checkgrau_collaborator_stores').delete().eq('collaborator_id', collaboratorId);
  if (storeIds.length > 0) {
    const rows = storeIds.map((store_id) => ({ collaborator_id: collaboratorId, store_id }));
    const { error } = await (supabase as any).from('checkgrau_collaborator_stores').insert(rows);
    if (error) throw error;
  }
}

export function useCollaboratorMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const create = useMutation({
    mutationFn: async (c: NewCollaborator) => {
      const { store_ids, ...fields } = c;
      const { data, error } = await (supabase as any)
        .from('checkgrau_collaborators')
        .insert({ ...fields, whatsapp: normalizeWhatsapp(c.whatsapp) })
        .select('id')
        .single();
      if (error) throw error;
      await syncStores(data.id, store_ids);
    },
    onSuccess: () => { invalidate(); toast.success('Colaborador cadastrado.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao cadastrar colaborador.'),
  });

  const update = useMutation({
    mutationFn: async (c: Pick<Collaborator, 'id'> & Partial<NewCollaborator>) => {
      const { id, store_ids, ...fields } = c;
      const payload: any = { ...fields, updated_at: new Date().toISOString() };
      if (fields.whatsapp) payload.whatsapp = normalizeWhatsapp(fields.whatsapp);
      const { error } = await (supabase as any).from('checkgrau_collaborators').update(payload).eq('id', id);
      if (error) throw error;
      if (store_ids) await syncStores(id, store_ids);
    },
    onSuccess: () => { invalidate(); toast.success('Colaborador atualizado.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('checkgrau_collaborators').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Colaborador removido.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao remover.'),
  });

  return { create, update, remove };
}
