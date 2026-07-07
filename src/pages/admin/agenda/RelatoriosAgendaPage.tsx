import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, User, Users, CalendarRange, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { startOfDay, endOfDay } from 'date-fns';
import { montarAgendaItens } from '@/hooks/useAgendaEventos';
import {
  exportarAgendaIndividual, exportarAgendaEquipe, exportarAgendaSemanal, exportarPendenciasAtrasadas,
} from '@/lib/agendaPdf';

export default function RelatoriosAgendaPage() {
  const { user } = useAuth();
  const { profile: myProfile } = usePermissions();
  const isMaster = myProfile?.perfil === 'MASTER';
  const cafAtivo = (myProfile as any)?.caf_ativo === true;
  const canUseAgenda = isMaster || cafAtivo;

  const [exportando, setExportando] = useState<string | null>(null);
  const [atendenteId, setAtendenteId] = useState<string>(user?.id ?? '');

  const { data: usuarios = [] } = useQuery({
    queryKey: ['user_profiles_agenda_filtro'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('id, nome').eq('ativo', true).or('caf_ativo.eq.true,is_protected.eq.true').order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const hoje = format(new Date(), 'yyyy-MM-dd');
  const inicioSemana = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const fimSemana = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const periodoAmplo30 = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const periodoAmplo7Atras = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const handleExportar = async (tipo: 'individual' | 'equipe' | 'semanal' | 'atrasados') => {
    setExportando(tipo);
    try {
      if (tipo === 'individual') {
        const itens = await fetchPeriodo(hoje, hoje, atendenteId);
        const nome = usuarios.find(u => u.id === atendenteId)?.nome ?? 'Atendente';
        await exportarAgendaIndividual(itens, nome, format(new Date(), "dd 'de' MMMM", { locale: ptBR }));
      } else if (tipo === 'equipe') {
        const itens = await fetchPeriodo(hoje, hoje);
        await exportarAgendaEquipe(itens, format(new Date(), "dd 'de' MMMM", { locale: ptBR }));
      } else if (tipo === 'semanal') {
        const itens = await fetchPeriodo(inicioSemana, fimSemana, atendenteId);
        const nome = usuarios.find(u => u.id === atendenteId)?.nome ?? 'Atendente';
        await exportarAgendaSemanal(itens, nome, `${format(new Date(inicioSemana), 'dd/MM')} a ${format(new Date(fimSemana), 'dd/MM')}`);
      } else {
        const itens = await fetchPeriodo(periodoAmplo7Atras, periodoAmplo30);
        await exportarPendenciasAtrasadas(itens);
      }
      toast.success('PDF gerado!');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    } finally {
      setExportando(null);
    }
  };

  if (!canUseAgenda) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Lock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Sem permissão para acessar a Agenda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-900">
        <CalendarRange className="text-violet-600" size={26} /> Relatórios da Agenda
      </h1>

      <div className="flex items-center gap-2 max-w-xs">
        <Label className="text-xs font-medium whitespace-nowrap">Atendente:</Label>
        <Select value={atendenteId} onValueChange={setAtendenteId}>
          <SelectTrigger className="h-9 text-xs bg-white border-slate-200"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          icon={User} title="Agenda Individual (Hoje)" desc="Compromissos e tarefas do atendente selecionado para hoje."
          loading={exportando === 'individual'} onClick={() => handleExportar('individual')}
        />
        <ReportCard
          icon={Users} title="Agenda da Equipe (Hoje)" desc="Visão consolidada de todos os atendentes para hoje."
          loading={exportando === 'equipe'} onClick={() => handleExportar('equipe')}
        />
        <ReportCard
          icon={CalendarRange} title="Agenda Semanal" desc="Semana atual do atendente selecionado."
          loading={exportando === 'semanal'} onClick={() => handleExportar('semanal')}
        />
        <ReportCard
          icon={AlertTriangle} title="Pendências Atrasadas" desc="Tudo que está atrasado, de todos os atendentes."
          loading={exportando === 'atrasados'} onClick={() => handleExportar('atrasados')} tone="red"
        />
      </div>
    </div>
  );
}

function ReportCard({ icon: Icon, title, desc, onClick, loading, tone }: { icon: any; title: string; desc: string; onClick: () => void; loading?: boolean; tone?: 'red' }) {
  return (
    <Card className="bg-white border border-slate-200 flex flex-col">
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        <Icon className={`h-6 w-6 ${tone === 'red' ? 'text-red-600' : 'text-violet-600'}`} />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
        <Button
          onClick={onClick} disabled={loading}
          className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Exportar PDF
        </Button>
      </CardContent>
    </Card>
  );
}

// Busca pontual (fora do ciclo de render) reaproveitando a mesma função de
// merge usada pelos hooks — chamada a partir de um onClick, não de useQuery.
async function fetchPeriodo(from: string, to: string, responsavelId?: string) {
  return montarAgendaItens(
    startOfDay(new Date(from + 'T00:00:00')),
    endOfDay(new Date(to + 'T00:00:00')),
    responsavelId,
  );
}
