import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle, Clock, CheckCircle2, Video, Timer, TrendingUp, Users, Lock, Loader2, LayoutDashboard,
} from 'lucide-react';
import { useAgendaDashboard } from '@/hooks/useAgendaEventos';
import { EventoCard } from './components/EventoCard';

function KPICard({ title, value, icon: Icon, accent, tone }: { title: string; value: string; icon: any; accent?: boolean; tone?: 'red' | 'amber' | 'emerald' }) {
  const toneClass = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : tone === 'emerald' ? 'text-emerald-600' : accent ? 'text-violet-600' : 'text-slate-900';
  return (
    <Card className="bg-white border border-slate-200">
      <CardContent className="p-4">
        <Icon className={`h-4 w-4 mb-2 ${tone || accent ? toneClass : 'text-slate-400'}`} />
        <p className={`text-2xl font-black leading-tight ${toneClass}`}>{value}</p>
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

export default function AgendaDashboardPage() {
  const { profile: myProfile } = usePermissions();
  const isMaster = myProfile?.perfil === 'MASTER';
  const cafAtivo = (myProfile as any)?.caf_ativo === true;
  const canUseAgenda = isMaster || cafAtivo;

  const [from, setFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));

  const { data, isLoading } = useAgendaDashboard(from, to);

  if (!canUseAgenda) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Lock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Sem permissão para acessar a Agenda.</p>
      </div>
    );
  }

  const atrasadosTop = (data?.itens ?? []).filter(i => i.slaStatus === 'atrasado').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-900">
          <LayoutDashboard className="text-violet-600" size={26} /> Agenda — Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium whitespace-nowrap">De:</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-36 text-sm bg-white border-slate-200" />
          <Label className="text-xs font-medium whitespace-nowrap">Até:</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-36 text-sm bg-white border-slate-200" />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard title="Atrasados" value={String(data.atrasados)} icon={AlertTriangle} tone="red" />
            <KPICard title="Vencem Hoje" value={String(data.hoje)} icon={Clock} tone="amber" />
            <KPICard title="Futuros" value={String(data.futuros)} icon={CheckCircle2} tone="emerald" />
            <KPICard title="CAF Connect Agendados" value={String(data.cafConnectAgendados)} icon={Video} />
            <KPICard title="Tempo Médio até Conclusão" value={data.tempoMedioConclusaoMin != null ? `${Math.round(data.tempoMedioConclusaoMin / 60)}h` : '—'} icon={Timer} />
            <KPICard title="Taxa de Cumprimento" value={data.taxaCumprimento != null ? `${data.taxaCumprimento}%` : '—'} icon={TrendingUp} accent />
          </div>

          {data.maisSobrecarregado && (
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-violet-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{data.maisSobrecarregado.nome}</p>
                  <p className="text-xs text-slate-500">Atendente com mais pendências no período ({data.maisSobrecarregado.quantidade})</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-red-500 shrink-0" /> Pendências Atrasadas
            </h3>
            {atrasadosTop.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma pendência atrasada no período. 🎉</p>
            ) : (
              <div className="space-y-3">
                {atrasadosTop.map(item => (
                  <EventoCard key={`${item.origem}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
