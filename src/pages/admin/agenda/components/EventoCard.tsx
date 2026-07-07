import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock, Video, PencilLine, CheckCircle2, XCircle, Trash2, CalendarPlus, FileText, Loader2,
} from 'lucide-react';
import { type AgendaItem } from '@/hooks/useAgendaEventos';
import { gerarLinkGoogleCalendar } from '@/lib/googleCalendarLink';

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  compromisso: { label: 'Compromisso', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  tarefa:      { label: 'Tarefa',      className: 'bg-violet-50 text-violet-700 border-violet-200' },
  retorno:     { label: 'Retorno',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  caf_connect: { label: 'CAF Connect', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const SLA_BADGE: Record<string, { label: string; className: string; dot: string }> = {
  atrasado:  { label: 'Atrasado',  className: 'text-red-600',    dot: 'bg-red-500' },
  hoje:      { label: 'Hoje',      className: 'text-amber-600',  dot: 'bg-amber-500' },
  futuro:    { label: 'Futuro',    className: 'text-emerald-600', dot: 'bg-emerald-500' },
  resolvido: { label: 'Resolvido', className: 'text-slate-400',  dot: 'bg-slate-300' },
};

interface EventoCardProps {
  item: AgendaItem;
  onConcluir?: () => void;
  onCancelar?: () => void;
  onExcluir?: () => void;
  concluirPending?: boolean;
}

// Card único reaproveitado em Minha Agenda / Equipe / Compromissos. Quando a
// origem é CAF Connect, as ações de concluir/cancelar/excluir não aparecem —
// o ciclo de vida da sessão é gerenciado no próprio CAF Connect, a agenda só
// reflete o status (sem duplicar lógica), mas abre Meet/Quadro/Ticket direto.
export function EventoCard({ item, onConcluir, onCancelar, onExcluir, concluirPending }: EventoCardProps) {
  const navigate = useNavigate();
  const tipoBadge = TIPO_BADGE[item.tipo] ?? TIPO_BADGE.compromisso;
  const slaBadge = SLA_BADGE[item.slaStatus];
  const isCafConnect = item.origem === 'caf_connect';
  const isPendente = item.status === 'pendente';

  const linkGoogle = gerarLinkGoogleCalendar({
    titulo: item.titulo,
    descricao: item.descricao,
    inicio: item.dataHora,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" /> {format(new Date(item.dataHora), 'HH:mm')}
          </span>
          <Badge variant="outline" className={`text-[10px] font-bold ${tipoBadge.className}`}>{tipoBadge.label}</Badge>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-bold shrink-0 ${slaBadge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${slaBadge.dot}`} /> {slaBadge.label}
        </span>
      </div>

      <div>
        <p className="font-semibold text-sm text-slate-900 [overflow-wrap:anywhere] break-words">{item.titulo}</p>
        {item.descricao && <p className="text-xs text-slate-500 mt-0.5 [overflow-wrap:anywhere] break-words">{item.descricao}</p>}
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
        {item.responsavelNome && <span>👤 {item.responsavelNome}</span>}
        {item.ticketProtocolo && <span className="font-mono">{item.ticketProtocolo}</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {item.ticketId && (
          <Button
            size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-white border-slate-200"
            onClick={() => navigate(`/admin/caf/atendimentos?ticket=${item.ticketId}`)}
          >
            <FileText className="h-3.5 w-3.5" /> Abrir Ticket
          </Button>
        )}
        {isCafConnect && item.googleMeetUrl && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-white border-slate-200" asChild>
            <a href={item.googleMeetUrl} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5" /> Entrar no Meet</a>
          </Button>
        )}
        {isCafConnect && item.excalidrawRoomUrl && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-white border-slate-200" asChild>
            <a href={item.excalidrawRoomUrl} target="_blank" rel="noreferrer"><PencilLine className="h-3.5 w-3.5" /> Abrir Quadro</a>
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-white border-slate-200" asChild>
          <a href={linkGoogle} target="_blank" rel="noreferrer"><CalendarPlus className="h-3.5 w-3.5" /> Google Calendar</a>
        </Button>

        {!isCafConnect && isPendente && onConcluir && (
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onConcluir} disabled={concluirPending}>
            {concluirPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Concluir
          </Button>
        )}
        {!isCafConnect && isPendente && onCancelar && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={onCancelar}>
            <XCircle className="h-3.5 w-3.5" /> Cancelar
          </Button>
        )}
        {!isCafConnect && onExcluir && (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={onExcluir} title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
