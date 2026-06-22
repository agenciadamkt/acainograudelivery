import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HistoricoTabProps {
  motoristaId: string;
}

interface RotaHistorico {
  id: string;
  name: string;
  started_at: string | null;
  completed_at: string | null;
  totalParadas: number;
}

export function HistoricoTab({ motoristaId }: HistoricoTabProps) {
  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['frota-historico-motorista', motoristaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_routes' as any)
        .select('id, name, started_at, completed_at, order_ids, manual_order_ids')
        .eq('driver_id', motoristaId)
        .eq('status', 'concluida')
        .order('completed_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r: any): RotaHistorico => ({
        id: r.id,
        name: r.name,
        started_at: r.started_at,
        completed_at: r.completed_at,
        totalParadas: (Array.isArray(r.order_ids) ? r.order_ids.length : 0)
          + (Array.isArray(r.manual_order_ids) ? r.manual_order_ids.length : 0),
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (rotas.length === 0) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma rota concluída ainda.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
      {rotas.map(rota => (
        <Card key={rota.id} className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{rota.name}</p>
              <p className="text-xs text-muted-foreground">
                {rota.completed_at
                  ? format(parseISO(rota.completed_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
                  : '—'}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">{rota.totalParadas} parada{rota.totalParadas !== 1 ? 's' : ''}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
