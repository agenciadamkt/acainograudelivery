import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarPlus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCriarEvento, type AgendaEventoTipo } from '@/hooks/useAgendaEventos';

interface NovoEventoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId?: string | null;
  defaultTicketId?: string | null;
  defaultTicketProtocolo?: string | null;
  defaultOrigemModulo?: string;
  defaultOrigemTabela?: string | null;
  defaultDataHora?: string | null;
}

const TIPO_LABELS: Record<AgendaEventoTipo, string> = {
  compromisso: 'Compromisso (tem hora marcada)',
  tarefa: 'Tarefa (tem prazo, não hora fixa)',
  retorno: 'Retorno ao franqueado/cliente',
};

export function NovoEventoDialog({
  open, onOpenChange, currentUserId,
  defaultTicketId = null, defaultTicketProtocolo = null,
  defaultOrigemModulo = 'caf', defaultOrigemTabela = 'caf_atendimentos',
  defaultDataHora = null,
}: NovoEventoDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<AgendaEventoTipo>('compromisso');
  const [dataHora, setDataHora] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [responsavelId, setResponsavelId] = useState<string>('');
  const criarEvento = useCriarEvento();

  useEffect(() => {
    if (open) {
      setResponsavelId(currentUserId ?? '');
      setDataHora(defaultDataHora ? format(new Date(defaultDataHora), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
  }, [open, currentUserId, defaultDataHora]);

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ['user_profiles_agenda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, nome')
        .eq('ativo', true)
        .or('caf_ativo.eq.true,is_protected.eq.true')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
    enabled: open,
  });

  const reset = () => {
    setTitulo('');
    setDescricao('');
    setTipo('compromisso');
    setDataHora(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setResponsavelId(currentUserId ?? '');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!titulo.trim() || !dataHora) return;
    criarEvento.mutate(
      {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        dataHora: new Date(dataHora).toISOString(),
        responsavelId: responsavelId || null,
        origemModulo: defaultTicketId ? defaultOrigemModulo : 'agenda',
        origemTabela: defaultTicketId ? defaultOrigemTabela : null,
        origemId: defaultTicketId ?? null,
        createdBy: currentUserId,
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CalendarPlus className="h-5 w-5 text-violet-600" /> Novo Evento na Agenda
          </DialogTitle>
          {defaultTicketProtocolo && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Vinculado ao atendimento {defaultTicketProtocolo}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Responder franqueado sobre apoio iFood"
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as AgendaEventoTipo)}>
                <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tipo === 'tarefa' ? 'Prazo' : 'Data e Horário'} *</Label>
              <Input
                type="datetime-local"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              {loadingUsuarios ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : (
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20">
                    <SelectValue placeholder="Selecionar responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Detalhes do que precisa ser feito..."
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 min-h-[60px] resize-none text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={criarEvento.isPending} className="rounded-xl border-slate-200">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!titulo.trim() || !dataHora || criarEvento.isPending}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-600/20"
          >
            {criarEvento.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
