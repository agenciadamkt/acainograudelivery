/**
 * Indicadores do módulo de Recibos: quantidade (hoje/semana/mês),
 * recebimentos por forma de pagamento e valor total recebido.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useReceiptKpis } from '@/hooks/useReceipts';
import { formatBRL } from '@/lib/receipts/receiptPdf';
import { Receipt, CalendarDays, CalendarRange, CalendarClock, Wallet } from 'lucide-react';

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-600/15">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/40">
              {label}
            </p>
            <p className="truncate text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            {hint && <p className="text-[11px] text-gray-400 dark:text-white/30">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReceiptKpis() {
  const { data, isLoading } = useReceiptKpis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
    );
  }

  const kpis = data;
  const methods = Object.entries(kpis?.byMethod ?? {}).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <StatCard icon={CalendarDays} label="Recibos hoje" value={String(kpis?.countToday ?? 0)} />
        <StatCard icon={CalendarRange} label="Na semana" value={String(kpis?.countWeek ?? 0)} />
        <StatCard icon={CalendarClock} label="No mês" value={String(kpis?.countMonth ?? 0)} />
        <StatCard
          icon={Wallet}
          label="Valor recebido"
          value={formatBRL(kpis?.totalReceived ?? 0)}
          hint="Total acumulado"
        />
        <StatCard
          icon={Receipt}
          label="Formas usadas"
          value={String(methods.length)}
          hint="Tipos distintos"
        />
      </div>

      {methods.length > 0 && (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/40">
              Recebimentos por forma
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {methods.map(([method, agg]) => (
                <div
                  key={method}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
                >
                  <p className="truncate text-xs font-medium text-gray-500 dark:text-white/50">
                    {method}
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {formatBRL(agg.total)}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-white/30">
                    {agg.count} {agg.count === 1 ? 'recibo' : 'recibos'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
