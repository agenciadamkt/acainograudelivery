import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, Wallet, TrendingUp, Truck, ArrowDownCircle, ArrowUpCircle,
  CheckCircle2, Clock, ListChecks, Receipt, Printer, FileText, FileDown, RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePdvSettings } from '@/hooks/pdv/usePdvSettings';
import { usePdvCashRegister } from '@/hooks/pdv/usePdvCashRegister';
import { exportShiftPdf, printShiftThermal, exportShiftExcel, type ShiftReportData } from '@/lib/shiftReport';
import { toast } from 'sonner';

const BRL = (v: number | null | undefined) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// Normaliza forma de pagamento para rótulo amigável
const PAY_LABEL: Record<string, string> = {
  money: 'Dinheiro', dinheiro: 'Dinheiro', cash: 'Dinheiro',
  pix: 'PIX',
  credit: 'Crédito', credito: 'Crédito', credit_card: 'Crédito', cartao_credito: 'Crédito',
  debit: 'Débito', debito: 'Débito', debit_card: 'Débito', cartao_debito: 'Débito',
  card: 'Cartão', cartao: 'Cartão',
};
const payLabel = (m?: string | null) => PAY_LABEL[(m || '').toLowerCase()] || (m ? m : 'Outro');
const isCash = (m?: string | null) => ['money', 'dinheiro', 'cash'].includes((m || '').toLowerCase());

function durationLabel(fromIso?: string | null, toIso?: string | null): string {
  if (!fromIso) return '—';
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const ms = end - new Date(fromIso).getTime();
  if (ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function DetalheTurno() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = usePdvSettings();
  const { reopenRegister } = usePdvCashRegister();
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const { data: shift, isLoading } = useQuery({
    queryKey: ['pdv_shift_detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pdv_cash_registers')
        .select('*, operator:cash_operators!operator_id(name), checked_by:cash_operators!checked_by_id(name), physical:pdv_physical_registers!physical_register_id(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: pdvSales = [] } = useQuery({
    queryKey: ['pdv_shift_pdv_sales', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pdv_orders')
        .select('id, created_at, amount_paid, total, payment_method, customer_name')
        .eq('cash_register_id', id)
        .eq('status', 'paid')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: deliverySales = [] } = useQuery({
    queryKey: ['pdv_shift_delivery_sales', id, shift?.store_id, shift?.opened_at, shift?.closed_at],
    enabled: !!id && !!shift?.store_id && !!shift?.opened_at,
    queryFn: async () => {
      let q = (supabase as any)
        .from('orders')
        .select('id, created_at, total_amount, payment_method, order_type, customer:customers(name)')
        .eq('store_id', shift!.store_id)
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .gte('created_at', shift!.opened_at);
      if (shift!.closed_at) q = q.lte('created_at', shift!.closed_at);
      const { data, error } = await q.order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['pdv_shift_movements', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pdv_cash_movements')
        .select('*')
        .eq('cash_register_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: conference = [] } = useQuery({
    queryKey: ['pdv_shift_conference', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pdv_cash_conference')
        .select('*')
        .eq('cash_register_id', id);
      if (error) throw error;
      return data || [];
    },
  });

  // Totais por forma de pagamento (PDV + Delivery)
  const totals = useMemo(() => {
    const byMethod: Record<string, number> = {};
    let pdvTotal = 0, deliveryTotal = 0, cashSales = 0;
    for (const s of pdvSales) {
      const amt = Number(s.amount_paid ?? s.total ?? 0);
      byMethod[payLabel(s.payment_method)] = (byMethod[payLabel(s.payment_method)] || 0) + amt;
      pdvTotal += amt;
      if (isCash(s.payment_method)) cashSales += amt;
    }
    for (const s of deliverySales) {
      const amt = Number(s.total_amount ?? 0);
      byMethod[payLabel(s.payment_method)] = (byMethod[payLabel(s.payment_method)] || 0) + amt;
      deliveryTotal += amt;
      if (isCash(s.payment_method)) cashSales += amt;
    }
    const suprimentos = movements.filter((m: any) => m.type === 'suprimento').reduce((a: number, m: any) => a + Number(m.amount), 0);
    const sangrias = movements.filter((m: any) => m.type === 'sangria').reduce((a: number, m: any) => a + Number(m.amount), 0);
    const opening = Number(shift?.opening_amount || 0);
    const expectedCash = opening + cashSales + suprimentos - sangrias;
    return { byMethod, pdvTotal, deliveryTotal, cashSales, suprimentos, sangrias, opening, expectedCash };
  }, [pdvSales, deliverySales, movements, shift]);

  // Conferência: usa registros salvos; se vazio, deriva do sistema (por forma de pagamento)
  const conferenceRows = useMemo(() => {
    if (conference.length > 0) {
      return conference.map((c: any) => ({
        method: payLabel(c.payment_method),
        system: Number(c.system_amount || 0),
        counted: Number(c.counted_amount || 0),
        diff: Number(c.counted_amount || 0) - Number(c.system_amount || 0),
      }));
    }
    return Object.entries(totals.byMethod).map(([method, system]) => ({ method, system, counted: null as number | null, diff: null as number | null }));
  }, [conference, totals.byMethod]);

  // Timeline: eventos concretos do turno (abertura, movimentações, fechamento, reabertura)
  const timeline = useMemo(() => {
    const events: { at: string; icon: 'open' | 'in' | 'out' | 'close' | 'reopen'; label: string; detail?: string }[] = [];
    if (shift?.opened_at) events.push({ at: shift.opened_at, icon: 'open', label: 'Abertura de caixa', detail: `Fundo ${BRL(shift.opening_amount)}` });
    for (const m of movements) {
      events.push({
        at: m.created_at,
        icon: m.type === 'suprimento' ? 'in' : 'out',
        label: m.type === 'suprimento' ? 'Suprimento' : 'Sangria',
        detail: `${BRL(m.amount)}${m.reason ? ' — ' + m.reason : ''}`,
      });
    }
    if (shift?.reopened_at) events.push({ at: shift.reopened_at, icon: 'reopen', label: 'Reabertura', detail: shift.reopen_reason || undefined });
    if (shift?.closed_at) events.push({ at: shift.closed_at, icon: 'close', label: 'Fechamento de caixa', detail: shift.difference != null ? `Diferença ${BRL(shift.difference)}` : undefined });
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [shift, movements]);

  // Extrato: vendas PDV + Delivery em ordem cronológica
  const extrato = useMemo(() => {
    const rows = [
      ...pdvSales.map((s: any) => ({ at: s.created_at, origin: 'PDV', method: payLabel(s.payment_method), customer: s.customer_name, amount: Number(s.amount_paid ?? s.total ?? 0) })),
      ...deliverySales.map((s: any) => ({ at: s.created_at, origin: 'Delivery', method: payLabel(s.payment_method), customer: s.customer?.name, amount: Number(s.total_amount ?? 0) })),
    ];
    return rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [pdvSales, deliverySales]);

  const grandTotal = totals.pdvTotal + totals.deliveryTotal;

  // Payload para impressão/PDF/Excel
  const reportData: ShiftReportData = useMemo(() => ({
    id: shift?.id,
    operatorName: shift?.operator?.name || 'Operador',
    physicalName: shift?.physical?.name,
    openedAt: shift?.opened_at,
    closedAt: shift?.closed_at,
    status: shift?.status || 'closed',
    opening: totals.opening,
    pdvTotal: totals.pdvTotal,
    deliveryTotal: totals.deliveryTotal,
    grandTotal,
    suprimentos: totals.suprimentos,
    sangrias: totals.sangrias,
    expectedCash: shift?.expected_amount ?? totals.expectedCash,
    countedCash: shift?.closing_amount ?? null,
    difference: shift?.difference ?? null,
    checkedByName: shift?.checked_by?.name,
    conference: conferenceRows,
    movements: movements.map((m: any) => ({ at: m.created_at, type: m.type, reason: m.reason, amount: Number(m.amount) })),
    extrato,
  }), [shift, totals, grandTotal, conferenceRows, movements, extrato]);

  const handleReopen = () => {
    if (!reopenReason.trim()) { toast.error('Informe o motivo da reabertura.'); return; }
    reopenRegister.mutate({ registerId: id!, reason: reopenReason.trim() }, {
      onSuccess: () => { setReopenOpen(false); setReopenReason(''); },
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando turno...</div>;
  if (!shift) return <div className="p-8 text-center text-muted-foreground">Turno não encontrado.</div>;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pdv/caixa/historico')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Turno — {shift.operator?.name || 'Operador'}
            <Badge className={shift.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
              {shift.status === 'open' ? 'Aberto' : 'Fechado'}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {shift.opened_at ? format(new Date(shift.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
            {shift.closed_at ? ` → ${format(new Date(shift.closed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}` : ' (em aberto)'}
            {' · '}{durationLabel(shift.opened_at, shift.closed_at)}
            {shift.physical?.name ? ` · ${shift.physical.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printShiftThermal(reportData, (settings as any)?.qz_printer_name)}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportShiftPdf(reportData)}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportShiftExcel(reportData)}>
            <FileDown className="h-4 w-4" /> Excel
          </Button>
          {shift.status === 'closed' && (
            <Button variant="outline" size="sm" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => setReopenOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Reabrir
            </Button>
          )}
        </div>
      </div>

      {shift.reopened_at && (
        <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
          Turno reaberto em {format(new Date(shift.reopened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          {shift.reopen_reason ? ` — ${shift.reopen_reason}` : ''}
        </div>
      )}

      {/* Cards de totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Wallet className="h-4 w-4" />} label="Fundo de caixa" value={BRL(totals.opening)} />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Vendas PDV" value={BRL(totals.pdvTotal)} sub={`${pdvSales.length} vendas`} />
        <SummaryCard icon={<Truck className="h-4 w-4" />} label="Vendas Delivery" value={BRL(totals.deliveryTotal)} sub={`${deliverySales.length} pedidos`} />
        <SummaryCard icon={<Receipt className="h-4 w-4" />} label="Total vendido" value={BRL(grandTotal)} highlight />
        <SummaryCard icon={<ArrowUpCircle className="h-4 w-4" />} label="Suprimentos" value={BRL(totals.suprimentos)} />
        <SummaryCard icon={<ArrowDownCircle className="h-4 w-4" />} label="Sangrias" value={BRL(totals.sangrias)} />
        <SummaryCard icon={<Wallet className="h-4 w-4" />} label="Dinheiro esperado" value={BRL(shift.expected_amount ?? totals.expectedCash)} />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Diferença"
          value={shift.difference != null ? BRL(shift.difference) : '—'}
          tone={shift.difference != null ? (Number(shift.difference) < 0 ? 'red' : Number(shift.difference) > 0 ? 'amber' : 'green') : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Conferência por forma de pagamento */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4" /> Conferência por forma de pagamento</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Forma</th>
                  <th className="px-4 py-2 text-right">Sistema</th>
                  <th className="px-4 py-2 text-right">Conferido</th>
                  <th className="px-4 py-2 text-right">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {conferenceRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Sem movimento.</td></tr>
                ) : conferenceRows.map((r: any) => (
                  <tr key={r.method} className="border-b">
                    <td className="px-4 py-2">{r.method}</td>
                    <td className="px-4 py-2 text-right">{BRL(r.system)}</td>
                    <td className="px-4 py-2 text-right">{r.counted != null ? BRL(r.counted) : '—'}</td>
                    <td className={`px-4 py-2 text-right ${r.diff != null && r.diff < 0 ? 'text-red-600' : r.diff ? 'text-amber-600' : ''}`}>{r.diff != null ? BRL(r.diff) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {conference.length === 0 && conferenceRows.length > 0 && (
              <p className="px-4 py-2 text-xs text-muted-foreground">Valores do sistema. A conferência contada é registrada no fechamento (Fase 3).</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Linha do tempo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos.</p>
            ) : timeline.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${
                  e.icon === 'open' ? 'bg-emerald-100 text-emerald-700' :
                  e.icon === 'close' ? 'bg-gray-200 text-gray-700' :
                  e.icon === 'in' ? 'bg-blue-100 text-blue-700' :
                  e.icon === 'reopen' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {e.icon === 'open' ? <Wallet className="h-4 w-4" /> :
                   e.icon === 'close' ? <CheckCircle2 className="h-4 w-4" /> :
                   e.icon === 'in' ? <ArrowUpCircle className="h-4 w-4" /> :
                   e.icon === 'reopen' ? <Clock className="h-4 w-4" /> :
                   <ArrowDownCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">{e.label}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(e.at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                  </div>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Movimentações */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Movimentações de caixa <span className="text-muted-foreground font-normal">({movements.length})</span></CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Horário</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Motivo</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma sangria ou suprimento.</td></tr>
                ) : movements.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="px-4 py-2 text-muted-foreground">{format(new Date(m.created_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                    <td className="px-4 py-2">
                      <Badge className={m.type === 'suprimento' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                        {m.type === 'suprimento' ? 'Suprimento' : 'Sangria'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">{m.reason || '—'}</td>
                    <td className={`px-4 py-2 text-right font-medium ${m.type === 'sangria' ? 'text-orange-600' : 'text-blue-600'}`}>
                      {m.type === 'sangria' ? '- ' : '+ '}{BRL(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Extrato do turno */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Extrato de vendas <span className="text-muted-foreground font-normal">({extrato.length})</span></CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Horário</th>
                  <th className="px-4 py-2">Origem</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Pagamento</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {extrato.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma venda no turno.</td></tr>
                ) : extrato.map((r: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{format(new Date(r.at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={r.origin === 'Delivery' ? 'border-purple-300 text-purple-700' : 'border-primary/30 text-primary'}>{r.origin}</Badge>
                    </td>
                    <td className="px-4 py-2">{r.customer || '—'}</td>
                    <td className="px-4 py-2">{r.method}</td>
                    <td className="px-4 py-2 text-right font-medium">{BRL(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              {extrato.length > 0 && (
                <tfoot>
                  <tr className="border-t font-bold">
                    <td className="px-4 py-2" colSpan={4}>Total</td>
                    <td className="px-4 py-2 text-right">{BRL(grandTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reabertura de turno */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir turno</DialogTitle>
            <DialogDescription>
              Reabrir um turno fechado é uma ação de correção e fica registrada na auditoria. Informe o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo da reabertura</Label>
            <Input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Ex: correção de conferência" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>Cancelar</Button>
            <Button onClick={handleReopen} disabled={reopenRegister.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
              {reopenRegister.isPending ? 'Reabrindo...' : 'Confirmar Reabertura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, highlight, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean;
  tone?: 'red' | 'amber' | 'green';
}) {
  const toneCls = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : '';
  return (
    <Card className={highlight ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}<span>{label}</span></div>
        <div className={`text-lg font-bold ${toneCls}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
