/**
 * Operações 2.0 — Alertas WhatsApp (M4).
 * Configura o Notification Engine por unidade (habilitar, eventos, destinatário),
 * permite disparar manualmente e mostra o log das notificações.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Bell, Send, MessageSquareWarning, History } from 'lucide-react';
import {
  useAlertSettings, useSaveAlertSettings, useNotificationLogs, useRunAlerts,
  type AlertSettings, type AlertEvents,
} from '@/hooks/operations/useAlerts';

const EVENT_LABELS: { key: keyof AlertEvents; label: string; hint: string }[] = [
  { key: 'overdue', label: 'Checklist não executado', hint: 'Tarefa que venceu sem ser concluída.' },
  { key: 'critical', label: 'Falha crítica', hint: 'Tarefa crítica não executada ou com item reprovado.' },
  { key: 'out_of_standard', label: 'Fora do padrão', hint: 'Item de temperatura/faixa reprovado.' },
];

const STATUS_CLS: Record<string, string> = {
  sent: 'text-green-600 dark:text-green-400',
  failed: 'text-red-600 dark:text-red-400',
  skipped: 'text-gray-400',
};

export default function AlertsPage() {
  const { data: loaded, isLoading } = useAlertSettings();
  const save = useSaveAlertSettings();
  const run = useRunAlerts();
  const { data: logs, isLoading: logsLoading } = useNotificationLogs();

  const [form, setForm] = useState<AlertSettings | null>(null);
  useEffect(() => { if (loaded) setForm(loaded); }, [loaded]);

  if (isLoading || !form) {
    return <div className="mx-auto max-w-3xl p-4 md:p-8"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  const setEvent = (key: keyof AlertEvents, v: boolean) =>
    setForm({ ...form, events: { ...form.events, [key]: v } });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Alertas WhatsApp</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">
          Avise o responsável quando algo sair do padrão. Envio pelo WhatsApp da unidade (UazAPI).
        </p>
      </div>

      {/* Configuração */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-purple-600" /> Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Alertas ativos</span>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </label>

          <div className="space-y-2">
            <Label className="text-[11px] uppercase text-gray-400">Eventos</Label>
            {EVENT_LABELS.map(({ key, label, hint }) => (
              <label key={key} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/[0.06]">
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-white/80">
                    <MessageSquareWarning className="h-3.5 w-3.5 text-amber-500" /> {label}
                  </span>
                  <span className="text-xs text-gray-400">{hint}</span>
                </span>
                <Switch checked={form.events[key]} onCheckedChange={(v) => setEvent(key, v)} />
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase text-gray-400">Número destinatário</Label>
              <Input placeholder="(86) 9 9999-9999" value={form.recipient_phone ?? ''} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase text-gray-400">Nome (opcional)</Label>
              <Input placeholder="Responsável" value={form.recipient_name ?? ''} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" className="gap-1.5" disabled={run.isPending || !form.enabled} onClick={() => run.mutate()}>
              <Send className="h-4 w-4" /> {run.isPending ? 'Enviando…' : 'Enviar agora'}
            </Button>
            <Button className="gap-1.5 bg-purple-600 hover:bg-purple-700" disabled={save.isPending} onClick={() => save.mutate(form)}>
              Salvar configuração
            </Button>
          </div>
          <p className="text-[11px] text-gray-400">
            Para envio automático, a edge function <code>operations-alerts</code> deve ser agendada
            (cron) no Supabase. "Enviar agora" dispara manualmente.
          </p>
        </CardContent>
      </Card>

      {/* Log */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-purple-600" /> Notificações enviadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (logs?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Nenhuma notificação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs!.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs text-gray-500">
                        {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-sm">{l.event_type}</TableCell>
                      <TableCell className="text-xs text-gray-500">{l.phone ?? '—'}</TableCell>
                      <TableCell className={`text-right text-xs font-semibold ${STATUS_CLS[l.status] ?? ''}`}>{l.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
