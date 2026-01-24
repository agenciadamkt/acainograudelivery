import { Card } from '@/components/ui/card';
import { ShoppingBag, DollarSign, TrendingUp, Clock } from 'lucide-react';

interface OrderStatsProps {
  stats: {
    total: number;
    totalRevenue: number;
    avgTicket: number;
    byStatus: Record<string, number>;
  };
}

export function OrderStats({ stats }: OrderStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Pedidos</p>
            <p className="text-3xl font-bold mt-2">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Faturamento</p>
            <p className="text-3xl font-bold mt-2">R$ {stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
            <p className="text-3xl font-bold mt-2">R$ {stats.avgTicket.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
            <p className="text-3xl font-bold mt-2">
              {(stats.byStatus?.pending || 0) + 
               (stats.byStatus?.confirmed || 0) + 
               (stats.byStatus?.preparing || 0) + 
               (stats.byStatus?.ready || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </Card>
    </div>
  );
}
