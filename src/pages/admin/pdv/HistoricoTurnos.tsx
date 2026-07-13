import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Eye } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OperatorSelect from '@/pages/admin/financial/components/OperatorSelect';

const BRL = (v: number | null | undefined) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function durationLabel(fromIso?: string | null, toIso?: string | null): string {
  if (!fromIso || !toIso) return '—';
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function HistoricoTurnos() {
  const { currentStore } = useStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyAgo = format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(thirtyAgo);
  const [dateTo, setDateTo] = useState(today);
  const [operatorId, setOperatorId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'open'>('all');
  const [selected, setSelected] = useState<any | null>(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['pdv_cash_shifts', currentStore?.id, dateFrom, dateTo],
    enabled: !!currentStore?.id,
    queryFn: async () => {
      let q = (supabase as any)
        .from('pdv_cash_registers')
        .select('*, operator:cash_operators!operator_id(name), checked_by:cash_operators!checked_by_id(name)')
        .eq('store_id', currentStore!.id)
        .gte('opened_at', startOfDay(new Date(`${dateFrom}T12:00:00`)).toISOString())
        .lte('opened_at', endOfDay(new Date(`${dateTo}T12:00:00`)).toISOString())
        .order('opened_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo(() => shifts.filter((s: any) => {
    if (operatorId !== 'all' && s.operator_id !== operatorId) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  }), [shifts, operatorId, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Histórico de Turnos</h1>
          <p className="text-sm text-muted-foreground">Consulta oficial de todos os turnos de caixa da loja.</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Operador</label>
            <OperatorSelect value={operatorId === 'all' ? '' : operatorId} onChange={(v) => setOperatorId(v || 'all')} placeholder="Todos" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Turnos <span className="text-muted-foreground font-normal">({rows.length})</span></CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Operador</th>
                  <th className="px-4 py-2">Abertura</th>
                  <th className="px-4 py-2">Fechamento</th>
                  <th className="px-4 py-2">Tempo</th>
                  <th className="px-4 py-2 text-right">Fundo</th>
                  <th className="px-4 py-2 text-right">Fechado</th>
                  <th className="px-4 py-2 text-right">Diferença</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhum turno no período.</td></tr>
                ) : rows.map((s: any) => {
                  const diff = Number(s.difference ?? 0);
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{s.operator?.name || '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.opened_at ? format(new Date(s.opened_at), 'dd/MM HH:mm', { locale: ptBR }) : '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.closed_at ? format(new Date(s.closed_at), 'dd/MM HH:mm', { locale: ptBR }) : '—'}</td>
                      <td className="px-4 py-2">{durationLabel(s.opened_at, s.closed_at)}</td>
                      <td className="px-4 py-2 text-right">{BRL(s.opening_amount)}</td>
                      <td className="px-4 py-2 text-right">{s.closing_amount != null ? BRL(s.closing_amount) : '—'}</td>
                      <td className={`px-4 py-2 text-right font-medium ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-amber-600' : ''}`}>
                        {s.difference != null ? BRL(diff) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={s.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                          {s.status === 'open' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(s)}><Eye className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resumo do turno (o detalhe completo — timeline, conferência, impressão — vem na Fase 2) */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Turno — {selected?.operator?.name || 'Operador'}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Abertura</span><span>{selected.opened_at ? format(new Date(selected.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fechamento</span><span>{selected.closed_at ? format(new Date(selected.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duração</span><span>{durationLabel(selected.opened_at, selected.closed_at)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Fundo de caixa</span><span>{BRL(selected.opening_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Esperado</span><span>{selected.expected_amount != null ? BRL(selected.expected_amount) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Conferido</span><span>{selected.closing_amount != null ? BRL(selected.closing_amount) : '—'}</span></div>
              <div className="flex justify-between font-bold"><span className="text-muted-foreground">Diferença</span><span className={Number(selected.difference) < 0 ? 'text-red-600' : ''}>{selected.difference != null ? BRL(selected.difference) : '—'}</span></div>
              {selected.checked_by?.name && <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Conferente</span><span>{selected.checked_by.name}</span></div>}
              <p className="text-xs text-muted-foreground pt-3 border-t">Detalhe completo (timeline, conferência por forma de pagamento, extrato e impressão) chega na Fase 2.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
