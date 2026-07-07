import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Star, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function SatisfacaoPublicaPage() {
  const { token } = useParams<{ token: string }>();

  const [pResolv, setPResolv]     = useState('');
  const [nota, setNota]           = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [nps, setNps]             = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);

  const { data: atendimento, isLoading } = useQuery({
    queryKey: ['caf_satisfacao_public', token],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('caf_atendimentos')
        .select('id, protocolo, loja_franqueada, solicitante_nome, status, caf_satisfacao(id)')
        .eq('satisfacao_token', token)
        .single();
      if (error) throw error;
      if (data?.caf_satisfacao?.length > 0) setAlreadyAnswered(true);
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!atendimento) throw new Error('Atendimento não encontrado');
      const { error } = await (supabase as any).from('caf_satisfacao').insert([{
        atendimento_id:    atendimento.id,
        problema_resolvido: pResolv || null,
        nota:              nota > 0 ? nota : null,
        comentario:        comentario.trim() || null,
        nps:               nps,
      }]);
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => toast.error('Erro ao enviar: ' + e.message),
  });

  const handleSubmit = () => {
    if (!pResolv) { toast.error('Por favor, responda se o problema foi resolvido'); return; }
    if (!nota)    { toast.error('Por favor, avalie o atendimento com uma nota'); return; }
    if (nps === null) { toast.error('Por favor, informe o NPS (0 a 10)'); return; }
    submitMutation.mutate();
  };

  const RESOLV_OPTIONS = ['Sim', 'Parcialmente', 'Não'];
  const NPS_COLORS = (v: number) =>
    nps === v ? v >= 9 ? 'bg-green-500 text-white border-green-500'
    : v >= 7 ? 'bg-amber-400 text-white border-amber-400'
    : 'bg-red-500 text-white border-red-500'
    : 'border-gray-200 hover:border-gray-400';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center p-8">
          <p className="text-2xl font-black text-gray-800">Link inválido</p>
          <p className="text-muted-foreground mt-2">Este link de avaliação não é válido ou expirou.</p>
        </div>
      </div>
    );
  }

  if (alreadyAnswered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">Pesquisa já respondida</h1>
          <p className="text-gray-500 mt-2">Este atendimento já possui uma avaliação registrada. Obrigado!</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-800">Obrigado! 🎉</h1>
          <p className="text-gray-500 mt-3 leading-relaxed">
            Sua avaliação foi registrada com sucesso.<br />
            Ela nos ajuda a melhorar cada vez mais o suporte à rede.
          </p>
          <p className="text-xs text-gray-400 mt-6">Equipe Açaí no Grau</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-start justify-center p-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black">Pesquisa de Satisfação</h1>
          <p className="text-purple-200 text-sm mt-1">Açaí no Grau — Suporte à Rede</p>
        </div>

        {/* Ticket info */}
        <div className="px-8 py-4 bg-purple-50 border-b border-purple-100">
          <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Atendimento</p>
          <p className="font-black text-purple-800 font-mono">{atendimento.protocolo}</p>
          {atendimento.loja_franqueada && (
            <p className="text-xs text-purple-600 mt-0.5">{atendimento.loja_franqueada}</p>
          )}
        </div>

        <div className="p-8 space-y-8">
          {/* Q1: Problema resolvido? */}
          <div className="space-y-3">
            <p className="font-bold text-gray-800">1. Seu problema foi resolvido?</p>
            <div className="flex gap-3">
              {RESOLV_OPTIONS.map(opt => (
                <button key={opt}
                  onClick={() => setPResolv(opt)}
                  className={cn(
                    'flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all',
                    pResolv === opt
                      ? opt === 'Sim' ? 'bg-green-500 border-green-500 text-white'
                        : opt === 'Parcialmente' ? 'bg-amber-400 border-amber-400 text-white'
                        : 'bg-red-500 border-red-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  )}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Q2: Nota 1-5 */}
          <div className="space-y-3">
            <p className="font-bold text-gray-800">2. Como você avalia o atendimento?</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n}
                  onMouseEnter={() => setHoverNota(n)}
                  onMouseLeave={() => setHoverNota(0)}
                  onClick={() => setNota(n)}>
                  <Star size={36}
                    className={cn('transition-all',
                      n <= (hoverNota || nota)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200'
                    )} />
                </button>
              ))}
            </div>
            {nota > 0 && (
              <p className="text-center text-sm font-bold text-amber-600">
                {['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente!'][nota]}
              </p>
            )}
          </div>

          {/* Q3: Comentário */}
          <div className="space-y-3">
            <p className="font-bold text-gray-800">3. Comentário <span className="font-normal text-gray-400 text-sm">(opcional)</span></p>
            <Textarea
              placeholder="Conte-nos mais sobre sua experiência..."
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              className="bg-gray-50 border-gray-200 resize-none"
              rows={3}
            />
          </div>

          {/* Q4: NPS */}
          <div className="space-y-3">
            <p className="font-bold text-gray-800">4. De 0 a 10, quanto você recomendaria o suporte da franquia?</p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i}
                  onClick={() => setNps(i)}
                  className={cn(
                    'aspect-square rounded-lg border-2 text-xs font-black transition-all',
                    NPS_COLORS(i)
                  )}>
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>Muito improvável</span>
              <span>Muito provável</span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full h-12 font-black text-base rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 gap-2">
            {submitMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Enviar Avaliação
          </Button>

          <p className="text-center text-[11px] text-gray-400">
            Sua resposta é anônima e nos ajuda a melhorar.<br />
            <strong>Equipe Açaí no Grau</strong> 🍇
          </p>
        </div>
      </div>
    </div>
  );
}
