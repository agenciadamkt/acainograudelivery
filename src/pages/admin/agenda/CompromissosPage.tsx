import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays } from 'date-fns';
import { usePermissions } from '@/contexts/PermissionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Loader2, ListChecks, Lock, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import {
  useEventosDoPeriodo, useConcluirEvento, useCancelarEvento, useExcluirEvento, type AgendaItem,
} from '@/hooks/useAgendaEventos';

const TIPO_LABEL: Record<string, string> = {
  compromisso: 'Compromisso', tarefa: 'Tarefa', retorno: 'Retorno', caf_connect: 'CAF Connect',
};
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', concluido: 'Concluído', cancelado: 'Cancelado' };
const SLA_CLASS: Record<string, string> = {
  atrasado: 'text-red-600 font-bold', hoje: 'text-amber-600 font-bold', futuro: 'text-emerald-600', resolvido: 'text-slate-400',
};
const SLA_LABEL: Record<string, string> = { atrasado: 'Atrasado', hoje: 'Hoje', futuro: 'Futuro', resolvido: '—' };

export default function CompromissosPage() {
  const { profile: myProfile } = usePermissions();
  const isMaster = myProfile?.perfil === 'MASTER';
  const cafAtivo = (myProfile as any)?.caf_ativo === true;
  const canUseAgenda = isMaster || cafAtivo;

  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterResponsavel, setFilterResponsavel] = useState('todos');
  const [excluindo, setExcluindo] = useState<AgendaItem | null>(null);

  const { data: itens = [], isLoading } = useEventosDoPeriodo(from, to, filterResponsavel === 'todos' ? undefined : filterResponsavel);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['user_profiles_agenda_filtro'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, nome').eq('ativo', true).or('caf_ativo.eq.true,is_protected.eq.true').order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const concluir = useConcluirEvento();
  const cancelar = useCancelarEvento();
  const excluir = useExcluirEvento();

  const filtrados = useMemo(() => itens.filter(i => {
    if (filterTipo !== 'todos' && i.tipo !== filterTipo) return false;
    if (filterStatus !== 'todos' && i.status !== filterStatus) return false;
    return true;
  }), [itens, filterTipo, filterStatus]);

  if (!canUseAgenda) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Lock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Sem permissão para acessar a Agenda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-900">
        <ListChecks className="text-violet-600" size={26} /> Compromissos
      </h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium whitespace-nowrap">De:</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-36 text-sm bg-white border-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium whitespace-nowrap">Até:</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-36 text-sm bg-white border-slate-200" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-9 w-40 text-xs bg-white border-slate-200"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-40 text-xs bg-white border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="h-9 w-44 text-xs bg-white border-slate-200"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os atendentes</SelectItem>
            {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-slate-500">{filtrados.length} evento(s)</p>

      <Card className="bg-white border border-slate-200">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5 font-bold">Data/Hora</th>
                  <th className="px-3 py-2.5 font-bold">Título</th>
                  <th className="px-3 py-2.5 font-bold">Tipo</th>
                  <th className="px-3 py-2.5 font-bold">Responsável</th>
                  <th className="px-3 py-2.5 font-bold">Ticket</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">SLA</th>
                  <th className="px-3 py-2.5 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Nenhum evento encontrado para os filtros selecionados.</td></tr>
                ) : filtrados.map(item => {
                  const isCafConnect = item.origem === 'caf_connect';
                  return (
                    <tr key={`${item.origem}-${item.id}`}>
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">{format(new Date(item.dataHora), 'dd/MM HH:mm')}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 max-w-[220px] truncate">{item.titulo}</td>
                      <td className="px-3 py-2.5 text-slate-600">{TIPO_LABEL[item.tipo] ?? item.tipo}</td>
                      <td className="px-3 py-2.5 text-slate-600">{item.responsavelNome ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600 font-mono">{item.ticketProtocolo ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[item.status] ?? item.status}</Badge>
                      </td>
                      <td className={`px-3 py-2.5 ${SLA_CLASS[item.slaStatus]}`}>{SLA_LABEL[item.slaStatus]}</td>
                      <td className="px-3 py-2.5 text-right">
                        {!isCafConnect && item.status === 'pendente' && (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Concluir" onClick={() => concluir.mutate(item.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" title="Cancelar" onClick={() => cancelar.mutate(item.id)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" title="Excluir" onClick={() => setExcluindo(item)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{excluindo?.titulo}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (excluindo) excluir.mutate(excluindo.id); setExcluindo(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
