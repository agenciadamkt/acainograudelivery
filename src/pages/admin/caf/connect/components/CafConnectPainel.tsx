import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Video, Plus, Play, CheckSquare, RotateCcw, XCircle, ExternalLink,
  PencilLine, Loader2, Clock, Users, Star, History, Calendar,
} from 'lucide-react';
import {
  useSessoesPorTicket, useEventosDaSessao, useIniciarSessao, useDefinirMeetUrl,
  useRegistrarAcessoQuadro, useReagendarSessao, useCancelarSessao,
  type CafSession,
} from '@/hooks/useCafConnect';
import { CriarSessaoDialog } from './CriarSessaoDialog';
import { EncerrarSessaoDialog } from './EncerrarSessaoDialog';
import { NpsSessaoDialog } from './NpsSessaoDialog';
import { ArtigosRelacionadosPanel } from './ArtigosRelacionadosPanel';

interface CafConnectPainelProps {
  ticketId: string;
  ticketProtocolo: string;
  ticketCategoria: string;
  ticketPrioridade?: string;
  ticketStatus?: string;
  ticketLoja?: string;
  ticketDestinatarioNome?: string;
  currentUserId?: string | null;
  currentUserNome?: string | null;
  canUseConnect: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Mapas de cor só pra exibição aqui dentro — não importa nada de
// AtendimentosPage.tsx, pra manter esse painel 100% independente daquele
// arquivo (só os já existentes props/dados são lidos, nada é alterado lá).
const PRIORIDADE_COLOR: Record<string, string> = {
  Baixa: 'bg-gray-100 text-gray-600 border-gray-200',
  Média: 'bg-blue-50 text-blue-700 border-blue-200',
  Alta: 'bg-orange-50 text-orange-700 border-orange-200',
  Crítica: 'bg-red-50 text-red-700 border-red-200',
};

const TICKET_STATUS_COLOR: Record<string, string> = {
  'Aberto': 'bg-blue-50 text-blue-700 border-blue-200',
  'Em Atendimento': 'bg-amber-50 text-amber-700 border-amber-200',
  'Aguardando Franqueado': 'bg-orange-50 text-orange-700 border-orange-200',
  'Resolvido': 'bg-green-50 text-green-700 border-green-200',
  'Encerrado': 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  agendada: { label: 'Agendada', className: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  aguardando_participantes: { label: 'Aguardando Participantes', className: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_andamento: { label: 'Em Andamento', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  encerrada: { label: 'Encerrada', className: 'bg-gray-500/10 text-gray-500 border-gray-200' },
  cancelada: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500 border-red-200' },
};

// Rótulos de exibição pros tipos de evento já gravados em
// caf_connect_eventos — só texto, não cria nenhuma estrutura nova.
const EVENTO_LABEL: Record<string, string> = {
  criada: 'Sessão criada',
  sessao_iniciada: 'Sessão iniciada',
  meet_definido: 'Link do Meet vinculado',
  quadro_criado: 'Quadro Excalidraw criado',
  quadro_acessado: 'Quadro acessado',
  participante_entrou: 'Participante entrou',
  participante_saiu: 'Participante saiu',
  resumo_salvo: 'Resumo salvo',
  encerrada: 'Sessão encerrada',
  reagendada: 'Sessão reagendada',
  cancelada: 'Sessão cancelada',
};

function fmtData(ts: string | null): string {
  if (!ts) return '—';
  return format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

interface SessaoCardProps {
  sessao: CafSession;
  meetUrlValue: string;
  onMeetUrlChange: (v: string) => void;
  onSalvarMeet: () => void;
  salvandoMeet: boolean;
  onAbrirQuadro: () => void;
  onIniciar: () => void;
  iniciarPending: boolean;
  onFinalizar: () => void;
  onReagendar: () => void;
  onCancelar: () => void;
}

// Componente próprio por sessão — necessário pra poder chamar
// useEventosDaSessao (hook) uma vez por sessão dentro do .map() do painel,
// sem violar as regras de hooks do React. A consulta em si já existia
// (useEventosDaSessao, em useCafConnect.ts); só passou a ser usada aqui.
function SessaoCard({
  sessao, meetUrlValue, onMeetUrlChange, onSalvarMeet, salvandoMeet,
  onAbrirQuadro, onIniciar, iniciarPending, onFinalizar, onReagendar, onCancelar,
}: SessaoCardProps) {
  const { data: eventos = [] } = useEventosDaSessao(sessao.id);

  const status = STATUS_LABEL[sessao.status] ?? STATUS_LABEL.agendada;
  const podeIniciar = sessao.status === 'agendada' || sessao.status === 'aguardando_participantes';
  const emAndamento = sessao.status === 'em_andamento';
  const finalizada = sessao.status === 'encerrada';
  const cancelada = sessao.status === 'cancelada';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Cabeçalho do card — título nunca é cortado */}
      <div className="px-5 py-4 border-b border-slate-100 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-base leading-snug text-slate-900 [overflow-wrap:anywhere] break-words">
            {sessao.title}
          </h3>
          <Badge variant="outline" className={`text-xs shrink-0 ${status.className}`}>{status.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {sessao.scheduled_at && (
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmtData(sessao.scheduled_at)}</span>
          )}
          {sessao.created_by_nome && (
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Criada por {sessao.created_by_nome}</span>
          )}
          {sessao.duration_min != null && (
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {sessao.duration_min} min</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Bloco Google Meet — layout vertical, espaço pra link longo */}
        {!cancelada && (
          <div className="space-y-2 bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" /> Link Google Meet
            </p>
            {sessao.google_meet_url ? (
              <Button variant="outline" className="w-full justify-center gap-2 h-11 rounded-xl bg-white border-slate-200" asChild>
                <a href={sessao.google_meet_url} target="_blank" rel="noreferrer">
                  <Video className="h-4 w-4" /> Entrar no Meet
                </a>
              </Button>
            ) : !finalizada ? (
              <div className="space-y-2">
                <Input
                  placeholder="Cole o link do Meet aqui..."
                  value={meetUrlValue}
                  onChange={e => onMeetUrlChange(e.target.value)}
                  className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 [overflow-wrap:anywhere]"
                />
                <Button variant="outline" className="w-full gap-2 h-11 rounded-xl bg-white border-slate-200" onClick={onSalvarMeet} disabled={salvandoMeet || !meetUrlValue.trim()}>
                  {salvandoMeet && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Link
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Bloco Excalidraw — visualmente separado do Meet */}
        {sessao.excalidraw_room_url && !cancelada && (
          <div className="space-y-2 rounded-xl bg-violet-50/70 dark:bg-violet-500/[0.06] border border-violet-100 dark:border-violet-500/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              <PencilLine className="h-3.5 w-3.5" /> Quadro Colaborativo
            </p>
            <p className="text-xs text-violet-700/80 dark:text-violet-300/70 leading-relaxed">
              Use este quadro para desenhar processos, explicar operações, apresentar indicadores ou treinar o franqueado em tempo real.
            </p>
            <Button className="w-full h-11 rounded-xl gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-600/20" onClick={onAbrirQuadro}>
              <PencilLine className="h-4 w-4" /> Abrir Quadro
            </Button>
          </div>
        )}

        {/* Resumo da sessão encerrada */}
        {finalizada && (
          <div className="space-y-2 bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Resumo</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap [overflow-wrap:anywhere]">{sessao.summary}</p>
            {sessao.next_steps && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pt-1">Próximos Passos</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap [overflow-wrap:anywhere]">{sessao.next_steps}</p>
              </>
            )}
            {sessao.recording_url && (
              <a href={sessao.recording_url} target="_blank" rel="noreferrer" className="text-xs text-violet-600 underline inline-flex items-center gap-1 pt-1">
                <ExternalLink className="h-3 w-3" /> Ver gravação
              </a>
            )}
            {sessao.nps_nota != null && (
              <p className="text-xs flex items-center gap-1 pt-1 text-amber-600">
                <Star className="h-3 w-3" /> NPS: {sessao.nps_nota}/10 {sessao.nps_problema_resolvido ? '· Resolvido' : '· Não resolvido'}
              </p>
            )}
          </div>
        )}

        {/* Ações — botão principal em largura total, secundários em grid */}
        {(podeIniciar || emAndamento || (!finalizada && !cancelada)) && (
          <div className="space-y-2">
            {podeIniciar && (
              <Button className="w-full h-12 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" onClick={onIniciar} disabled={iniciarPending}>
                {iniciarPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Iniciar Sessão
              </Button>
            )}
            {emAndamento && (
              <Button className="w-full h-12 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" onClick={onFinalizar}>
                <CheckSquare className="h-4 w-4" /> Finalizar Sessão
              </Button>
            )}
            {!finalizada && !cancelada && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 rounded-xl gap-1.5 bg-white border-slate-200" onClick={onReagendar}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reagendar
                </Button>
                <Button variant="outline" className="h-11 rounded-xl gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={onCancelar}>
                  <XCircle className="h-3.5 w-3.5" /> Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Timeline — consome caf_connect_eventos já existente, sem nova estrutura */}
        {eventos.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Histórico da Sessão
            </p>
            <ul className="space-y-2">
              {eventos.map(ev => (
                <li key={ev.id} className="flex items-start gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                  <span className="flex-1 text-slate-600">{EVENTO_LABEL[ev.tipo] ?? ev.tipo}</span>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                    {format(new Date(ev.created_at), 'dd/MM HH:mm')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function CafConnectPainel({
  ticketId, ticketProtocolo, ticketCategoria, ticketPrioridade, ticketStatus, ticketLoja, ticketDestinatarioNome,
  currentUserId, currentUserNome, canUseConnect, open, onOpenChange,
}: CafConnectPainelProps) {
  const { data: sessoes = [], isLoading } = useSessoesPorTicket(open ? ticketId : undefined);
  const iniciar = useIniciarSessao();
  const definirMeet = useDefinirMeetUrl();
  const acessarQuadro = useRegistrarAcessoQuadro();
  const reagendar = useReagendarSessao();
  const cancelar = useCancelarSessao();

  const [criarOpen, setCriarOpen] = useState(false);
  const [encerrando, setEncerrando] = useState<CafSession | null>(null);
  const [npsSessionId, setNpsSessionId] = useState<string | null>(null);
  const [reagendando, setReagendando] = useState<CafSession | null>(null);
  const [novaData, setNovaData] = useState('');
  const [cancelando, setCancelando] = useState<CafSession | null>(null);
  const [meetUrlEdit, setMeetUrlEdit] = useState<Record<string, string>>({});

  const handleAbrirQuadro = (sessao: CafSession) => {
    window.open(sessao.excalidraw_room_url ?? undefined, '_blank');
    acessarQuadro.mutate({ sessionId: sessao.id, createdBy: currentUserId });
  };

  const handleSalvarMeet = (sessao: CafSession) => {
    const url = meetUrlEdit[sessao.id]?.trim();
    if (!url) return;
    definirMeet.mutate({ sessionId: sessao.id, ticketId, meetUrl: url, createdBy: currentUserId });
  };

  const handleConfirmarReagendar = () => {
    if (!reagendando || !novaData) return;
    reagendar.mutate(
      { sessionId: reagendando.id, ticketId, scheduledAt: new Date(novaData).toISOString(), createdBy: currentUserId },
      { onSuccess: () => { setReagendando(null); setNovaData(''); } },
    );
  };

  const handleConfirmarCancelar = () => {
    if (!cancelando) return;
    cancelar.mutate({ sessionId: cancelando.id, ticketId, createdBy: currentUserId }, { onSuccess: () => setCancelando(null) });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[90vw] lg:w-[720px] p-0 flex flex-col gap-0 bg-white">
          {/* Cabeçalho rico — protocolo + badges de categoria/prioridade/status */}
          <SheetHeader className="px-6 py-5 border-b border-slate-100 space-y-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              🎥 CAF Connect
            </SheetTitle>
            <p className="text-sm text-slate-500">Sessão colaborativa de suporte e treinamento.</p>
            <div className="space-y-2">
              <p className="font-mono font-bold text-violet-600 text-base">{ticketProtocolo}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs font-semibold text-slate-500 bg-slate-50 border-slate-200">{ticketCategoria}</Badge>
                {ticketPrioridade && (
                  <Badge variant="outline" className={`text-xs font-semibold ${PRIORIDADE_COLOR[ticketPrioridade] ?? ''}`}>{ticketPrioridade}</Badge>
                )}
                {ticketStatus && (
                  <Badge variant="outline" className={`text-xs font-semibold ${TICKET_STATUS_COLOR[ticketStatus] ?? ''}`}>{ticketStatus}</Badge>
                )}
              </div>
              {ticketLoja && <p className="text-xs text-slate-500">{ticketLoja}</p>}
            </div>
          </SheetHeader>

          {!canUseConnect ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-500">
              <Video className="h-10 w-10 opacity-30" />
              <p className="text-sm">Você não tem permissão para usar o CAF Connect.</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 bg-slate-50/50">
              <div className="p-6 space-y-6">
                <Button onClick={() => setCriarOpen(true)} className="w-full h-12 rounded-xl gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-600/20">
                  <Plus className="h-4 w-4" /> Criar Sessão
                </Button>

                {isLoading && (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                )}

                {!isLoading && sessoes.length === 0 && (
                  <p className="text-sm text-center text-slate-500 py-8">Nenhuma sessão registrada ainda para este atendimento.</p>
                )}

                <div className="space-y-4">
                  {sessoes.map(sessao => (
                    <SessaoCard
                      key={sessao.id}
                      sessao={sessao}
                      meetUrlValue={meetUrlEdit[sessao.id] ?? ''}
                      onMeetUrlChange={(v) => setMeetUrlEdit(prev => ({ ...prev, [sessao.id]: v }))}
                      onSalvarMeet={() => handleSalvarMeet(sessao)}
                      salvandoMeet={definirMeet.isPending}
                      onAbrirQuadro={() => handleAbrirQuadro(sessao)}
                      onIniciar={() => iniciar.mutate({ sessionId: sessao.id, ticketId, createdBy: currentUserId })}
                      iniciarPending={iniciar.isPending}
                      onFinalizar={() => setEncerrando(sessao)}
                      onReagendar={() => setReagendando(sessao)}
                      onCancelar={() => setCancelando(sessao)}
                    />
                  ))}
                </div>

                <Separator />

                <ArtigosRelacionadosPanel categoria={ticketCategoria} destinatarioNome={ticketDestinatarioNome} />
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      <CriarSessaoDialog
        open={criarOpen}
        onOpenChange={setCriarOpen}
        ticketId={ticketId}
        ticketProtocolo={ticketProtocolo}
        currentUserId={currentUserId}
        currentUserNome={currentUserNome}
      />

      <EncerrarSessaoDialog
        sessao={encerrando}
        ticketId={ticketId}
        currentUserId={currentUserId}
        onClose={() => setEncerrando(null)}
        onEncerrada={(sessionId) => setNpsSessionId(sessionId)}
      />

      <NpsSessaoDialog sessionId={npsSessionId} onClose={() => setNpsSessionId(null)} />

      {/* Reagendar — inline, sem precisar de um arquivo próprio */}
      <Dialog open={!!reagendando} onOpenChange={(v) => !v && setReagendando(null)}>
        <DialogContent className="max-w-xs bg-white border border-slate-200 shadow-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <RotateCcw className="h-5 w-5 text-violet-600" /> Reagendar Sessão
            </DialogTitle>
          </DialogHeader>
          <Input type="datetime-local" value={novaData} onChange={e => setNovaData(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReagendando(null)} disabled={reagendar.isPending} className="rounded-xl border-slate-200">Cancelar</Button>
            <Button onClick={handleConfirmarReagendar} disabled={!novaData || reagendar.isPending} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
              {reagendar.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelando} onOpenChange={(v) => !v && setCancelando(null)}>
        <AlertDialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar "{cancelando?.title}"? Essa ação não exclui o registro, só marca a sessão como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmarCancelar}>
              Cancelar Sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
