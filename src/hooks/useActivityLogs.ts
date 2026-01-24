import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export function useActivityLogs(limit = 100) {
  return useQuery({
    queryKey: ['activity-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}
