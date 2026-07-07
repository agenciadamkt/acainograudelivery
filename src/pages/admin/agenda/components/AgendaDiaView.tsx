import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronLeft, ChevronRight, Plus, CalendarDays, Lock } from 'lucide-react';
import {
  useEventosDoDia, useConcluirEvento, useCancelarEvento, useExcluirEvento,
} from '@/hooks/useAgendaEventos';
import { EventoCard } from './EventoCard';
import { NovoEventoDialog } from './NovoEventoDialog';

interface AgendaDiaViewProps {
  modoEquipe: boolean;
}

// View compartilhada por "Minha Agenda" e "Equipe" — só muda o filtro de
// responsável padrão. Mesmo padrão de permissão já validado no CAF
// (isMaster || cafAtivo, checado dentro do componente).
export function AgendaDiaView({ modoEquipe }: AgendaDiaViewProps) {
  const { user } = useAuth();
  const { profile: myProfile } = usePermissions();
  const isMaster = myProfile?.perfil === 'MASTER';
  const cafAtivo = (myProfile as any)?.caf_ativo === true;
  const canUseAgenda = isMaster || cafAtivo;

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos');
  const [novoOpen, setNovoOpen] = useState(false);

  const responsavelId = modoEquipe
    ? (responsavelFiltro === 'todos' ? undefined : responsavelFiltro)
    : user?.id;

  const { data: itens = [], isLoading } = useEventosDoDia(selectedDate, responsavelId);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['user_profiles_agenda_filtro'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, nome').eq('ativo', true).or('caf_ativo.eq.true,is_protected.eq.true').order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
    enabled: modoEquipe,
  });

  const concluir = useConcluirEvento();
  const cancelar = useCancelarEvento();
  const excluir = useExcluirEvento();

  if (!canUseAgenda) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Lock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Sem permissão para acessar a Agenda.</p>
      </div>
    );
  }

  const dataLabelRaw = format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const dataLabel = dataLabelRaw.charAt(0).toUpperCase() + dataLabelRaw.slice(1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-900">
          <CalendarDays className="text-violet-600" size={26} /> {modoEquipe ? 'Equipe' : 'Minha Agenda'}
        </h1>
        <Button
          onClick={() => setNovoOpen(true)}
          className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        >
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-slate-200" onClick={() => setSelectedDate(format(subDays(new Date(selectedDate + 'T12:00:00'), 1), 'yyyy-MM-dd'))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-9 w-40 text-sm bg-white border-slate-200" />
        <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-slate-200" onClick={() => setSelectedDate(format(addDays(new Date(selectedDate + 'T12:00:00'), 1), 'yyyy-MM-dd'))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-slate-500">{dataLabel}</span>

        {modoEquipe && (
          <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
            <SelectTrigger className="h-9 w-48 text-xs ml-auto bg-white border-slate-200">
              <SelectValue placeholder="Atendente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os atendentes</SelectItem>
              {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : itens.length === 0 ? (
        <div className="p-12 text-center text-slate-500 border border-slate-200 rounded-2xl flex flex-col items-center gap-3 bg-white">
          <CalendarDays className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum evento para este dia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map(item => (
            <EventoCard
              key={`${item.origem}-${item.id}`}
              item={item}
              onConcluir={() => concluir.mutate(item.id)}
              onCancelar={() => cancelar.mutate(item.id)}
              onExcluir={() => excluir.mutate(item.id)}
              concluirPending={concluir.isPending}
            />
          ))}
        </div>
      )}

      <NovoEventoDialog open={novoOpen} onOpenChange={setNovoOpen} currentUserId={user?.id} />
    </div>
  );
}
