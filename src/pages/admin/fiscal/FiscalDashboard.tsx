import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileCheck2, XCircle, Ban, Loader2, Timer, AlertTriangle, FileText, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { useFiscalDashboard } from '@/hooks/fiscal/useFiscalDashboard';

const BRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const PERIODOS = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
] as const;

function rangeFor(key: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (key === '7d') from.setDate(from.getDate() - 6);
  else if (key === '30d') from.setDate(from.getDate() - 29);
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
}

export default function FiscalDashboard() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<string>('hoje');
  const { from, to } = rangeFor(periodo);
  const { data, isLoading } = useFiscalDashboard(from, to);

  const tempoLabel = data?.tempoMedioSeg == null ? '—'
    : data.tempoMedioSeg < 60 ? `${data.tempoMedioSeg}s`
    : `${Math.floor(data.tempoMedioSeg / 60)}m ${data.tempoMedioSeg % 60}s`;

  const cards = [
    { label: 'Emitidas', value: data?.total ?? 0, icon: <FileText className="h-5 w-5" />, tone: '' },
    { label: 'Autorizadas', value: data?.autorizadas ?? 0, icon: <FileCheck2 className="h-5 w-5" />, tone: 'text-emerald-600' },
    { label: 'Pendentes', value: data?.pendentes ?? 0, icon: <Loader2 className="h-5 w-5" />, tone: 'text-amber-600' },
    { label: 'Rejeitadas', value: data?.rejeitadas ?? 0, icon: <XCircle className="h-5 w-5" />, tone: 'text-red-600' },
    { label: 'Canceladas', value: data?.canceladas ?? 0, icon: <Ban className="h-5 w-5" />, tone: 'text-gray-600' },
    { label: 'Erros', value: data?.erros ?? 0, icon: <AlertTriangle className="h-5 w-5" />, tone: 'text-red-600' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><LayoutDashboard className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Dashboard Fiscal</h1>
          <p className="text-sm text-muted-foreground">Indicadores de emissão da loja.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/fiscal/historico')}><FileText className="h-4 w-4" /> Histórico</Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/fiscal')}><Settings2 className="h-4 w-4" /> Configurações</Button>
      </div>

      {/* Período */}
      <div className="flex gap-2">
        {PERIODOS.map((p) => (
          <Button key={p.key} variant={periodo === p.key ? 'default' : 'outline'} size="sm" onClick={() => setPeriodo(p.key)}>{p.label}</Button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 text-xs text-muted-foreground mb-1`}>{c.icon}<span>{c.label}</span></div>
              <div className={`text-2xl font-bold ${c.tone}`}>{isLoading ? '—' : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><Timer className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Tempo médio de autorização</div>
              <div className="text-xl font-bold">{isLoading ? '—' : tempoLabel}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><FileCheck2 className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Valor autorizado no período</div>
              <div className="text-xl font-bold">{isLoading ? '—' : BRL(data?.valorAutorizado ?? 0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
