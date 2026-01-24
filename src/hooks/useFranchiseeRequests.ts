import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FranchiseeRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  store_name: string;
  preferred_slug: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useFranchiseeRequests() {
  return useQuery({
    queryKey: ['franchisee-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchisee_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FranchiseeRequest[];
    },
  });
}

export function useCreateFranchiseeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<FranchiseeRequest, 'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'rejection_reason' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('franchisee_requests')
        .insert([request as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchisee-requests'] });
      toast.success('Solicitação enviada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar solicitação: ' + error.message);
    },
  });
}

export function useApproveFranchiseeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      password,
    }: {
      requestId: string;
      password: string;
    }) => {
      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('franchisee_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: request.full_name,
          phone: request.phone,
        },
      });

      if (authError) throw authError;

      // Create store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert([
          {
            name: request.store_name,
            slug: request.preferred_slug,
            city: request.city,
            state: request.state,
            status: 'active',
            franchisee_user_id: authData.user.id,
            approved_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (storeError) throw storeError;

      // Assign admin role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: authData.user.id,
            role: 'admin',
          },
        ]);

      if (roleError) throw roleError;

      // Update request status
      const { error: updateError } = await supabase
        .from('franchisee_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return { request, store, user: authData.user };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchisee-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Franqueado aprovado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao aprovar franqueado: ' + error.message);
    },
  });
}

export function useRejectFranchiseeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from('franchisee_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchisee-requests'] });
      toast.success('Solicitação rejeitada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao rejeitar solicitação: ' + error.message);
    },
  });
}
