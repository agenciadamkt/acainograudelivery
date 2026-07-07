import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, dateFnsLocalizer, type View, type SlotInfo,
} from 'react-big-calendar';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './components/agendaCalendario.css';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarRange, Lock, Loader2, Users, User } from 'lucide-react';
import {
  useEventosDoPeriodo, useAtualizarEvento, useConcluirEvento, useCancelarEvento, useExcluirEvento,
  type AgendaItem, type AgendaEventoTipo,
} from '@/hooks/useAgendaEventos';
import { EventoCard } from './components/EventoCard';
import { NovoEventoDialog } from './components/NovoEventoDialog';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales,
});

const MESSAGES = {
  date: 'Data', time: 'Hora', event: 'Evento', allDay: 'Dia todo',
  week: 'Semana', work_week: 'Semana útil', day: 'Dia', month: 'Mês',
  previous: 'Anterior', next: 'Próximo', yesterday: 'Ontem', tomorrow: 'Amanhã',
  today: 'Hoje', agenda: 'Lista', noEventsInRange: 'Nenhum evento neste período.',
  showMore: (total: number) => `+${total} mais`,
};

const TIPO_COLOR: Record<string, string> = {
  compromisso: '#2563eb',
  tarefa: '#7c3aed',
  retorno: '#d97706',
  caf_connect: '#059669',
};

interface RbcEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AgendaItem;
}

const DnDCalendar = withDragAndDrop<RbcEvent>(Calendar as any);

function getRange(date: Date, view: View): [Date, Date] {
  if (view === 'month') return [startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), endOfWeek(endOfMonth(date), { weekStartsOn: 1 })];
  if (view === 'day') return [startOfDay(date), endOfDay(date)];
  return [startOfWeek(date, { weekStartsOn: 1 }), endOfWeek(date, { weekStartsOn: 1 })];
}

export default function CalendarioAgendaPage() {
  const { user } = useAuth();
  const { profile: myProfile } = usePermissions();
  const isMaster = myProfile?.perfil === 'MASTER';
  const cafAtivo = (myProfile as any)?.caf_ativo === true;
  const canUseAgenda = isMaster || cafAtivo;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');
  const [modo, setModo] = useState<'eu' | 'equipe'>('eu');
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos');
  const [novoOpen, setNovoOpen] = useState(false);
  const [novaDataHora, setNovaDataHora] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<AgendaItem | null>(null);

  const [from, to] = useMemo(() => getRange(currentDate, currentView), [currentDate, currentView]);

  const responsavelId = modo === 'eu' ? user?.id : (responsavelFiltro === 'todos' ? undefined : responsavelFiltro);

  const { data: itens = [], isLoading } = useEventosDoPeriodo(
    format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'), responsavelId,
  );

  const { data: usuarios = [] } = useQuery({
    queryKey: ['user_profiles_agenda_filtro'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, nome').eq('ativo', true).or('caf_ativo.eq.true,is_protected.eq.true').order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
    enabled: modo === 'equipe',
  });

  const atualizar = useAtualizarEvento();
  const concluir = useConcluirEvento();
  const cancelar = useCancelarEvento();
  const excluir = useExcluirEvento();

  const events: RbcEvent[] = useMemo(() => itens.map(item => {
    const start = new Date(item.dataHora);
    const end = new Date(start.getTime() + 30 * 60_000);
    return { id: `${item.origem}-${item.id}`, title: item.titulo, start, end, resource: item };
  }), [itens]);

  if (!canUseAgenda) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Lock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Sem permissão para acessar a Agenda.</p>
      </div>
    );
  }

  const eventPropGetter = (event: RbcEvent) => {
    const item = event.resource;
    let bg = TIPO_COLOR[item.tipo] ?? '#2563eb';
    let opacity = 1;
    if (item.status === 'concluido') { bg = '#94a3b8'; }
    if (item.status === 'cancelado') { bg = '#cbd5e1'; opacity = 0.7; }
    if (item.status === 'pendente' && item.slaStatus === 'atrasado') { bg = '#dc2626'; }
    return { style: { backgroundColor: bg, opacity, color: '#fff' } };
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    setNovaDataHora(slot.start.toISOString());
    setNovoOpen(true);
  };

  const handleSelectEvent = (event: RbcEvent) => setSelecionado(event.resource);

  const handleEventDrop = ({ event, start }: EventInteractionArgs<RbcEvent>) => {
    const item = event.resource;
    if (item.origem !== 'agenda' || item.status !== 'pendente') return;
    atualizar.mutate({
      id: item.id,
      titulo: item.titulo,
      descricao: item.descricao ?? undefined,
      tipo: item.tipo as AgendaEventoTipo,
      dataHora: new Date(start).toISOString(),
      responsavelId: item.responsavelId,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-900">
          <CalendarRange className="text-violet-600" size={26} /> Calendário
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setModo('eu')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${modo === 'eu' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}
            >
              <User className="h-3.5 w-3.5" /> Meus eventos
            </button>
            <button
              onClick={() => setModo('equipe')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${modo === 'equipe' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}
            >
              <Users className="h-3.5 w-3.5" /> Equipe
            </button>
          </div>

          {modo === 'equipe' && (
            <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
              <SelectTrigger className="h-9 w-44 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Atendente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os atendentes</SelectItem>
                {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={() => { setNovaDataHora(null); setNovoOpen(true); }}
            className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          >
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
        {[
          ['Compromisso', '#2563eb'], ['Tarefa', '#7c3aed'], ['Retorno', '#d97706'],
          ['CAF Connect', '#059669'], ['Atrasado', '#dc2626'], ['Concluído/Cancelado', '#94a3b8'],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} /> {label}
          </span>
        ))}
      </div>

      <div className="grauos-calendar bg-white border border-slate-200 rounded-2xl p-3 relative" style={{ height: 700 }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
          </div>
        )}
        <DnDCalendar
          localizer={localizer}
          culture="pt-BR"
          messages={MESSAGES}
          events={events}
          date={currentDate}
          view={currentView}
          views={['month', 'week', 'day']}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          startAccessor="start"
          endAccessor="end"
          selectable
          resizable={false}
          draggableAccessor={(event: RbcEvent) => event.resource.origem === 'agenda' && event.resource.status === 'pendente'}
          eventPropGetter={eventPropGetter}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          style={{ height: '100%' }}
        />
      </div>

      <NovoEventoDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        currentUserId={user?.id}
        defaultDataHora={novaDataHora}
      />

      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <EventoCard
              item={selecionado}
              onConcluir={selecionado.origem === 'agenda' ? () => { concluir.mutate(selecionado.id); setSelecionado(null); } : undefined}
              onCancelar={selecionado.origem === 'agenda' ? () => { cancelar.mutate(selecionado.id); setSelecionado(null); } : undefined}
              onExcluir={selecionado.origem === 'agenda' ? () => { excluir.mutate(selecionado.id); setSelecionado(null); } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
