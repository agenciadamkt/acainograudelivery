import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Eye, Link2, Send } from 'lucide-react';

interface Artigo {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string | null;
}

interface ArtigosRelacionadosPanelProps {
  categoria: string;
  destinatarioNome?: string;
}

// Não existe rota de detalhe por artigo em BaseConhecimentoPage.tsx hoje (a
// visualização é um dialog local naquela página, sem id na URL) — por isso
// "Abrir Artigo" mostra o conteúdo aqui mesmo, e "Copiar Link" copia a URL
// da Base de Conhecimento (mais específico que isso não é possível sem
// alterar aquela página, o que está fora do escopo desta feature).
export function ArtigosRelacionadosPanel({ categoria, destinatarioNome }: ArtigosRelacionadosPanelProps) {
  const [viewing, setViewing] = useState<Artigo | null>(null);

  const { data: artigos = [], isLoading } = useQuery({
    queryKey: ['caf_artigos_relacionados', categoria],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('caf_artigos')
        .select('id, titulo, conteudo, categoria')
        .eq('categoria', categoria)
        .eq('publicado', true)
        .order('visualizacoes', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Artigo[];
    },
    enabled: !!categoria,
  });

  const copiarLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/admin/caf/base-conhecimento`);
    toast.success('Link da Base de Conhecimento copiado!');
  };

  const enviarParaFranqueado = (artigo: Artigo) => {
    const msg = `Olá, ${destinatarioNome || 'Franqueado'}! 👋\n\n*${artigo.titulo}*\n\n${artigo.conteudo}\n\n_Equipe Açaí no Grau_ 🍇`;
    navigator.clipboard.writeText(msg);
    toast.success('Mensagem copiada! Cole no WhatsApp do franqueado.');
  };

  if (!categoria) return null;
  if (isLoading) return null;
  if (artigos.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" /> Artigos Relacionados
        </p>
        <div className="space-y-1.5">
          {artigos.map(artigo => (
            <div key={artigo.id} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-semibold text-slate-700 truncate flex-1">{artigo.titulo}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6" title="Abrir Artigo" onClick={() => setViewing(artigo)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" title="Copiar Link" onClick={copiarLink}>
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" title="Enviar para Franqueado" onClick={() => enviarParaFranqueado(artigo)}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">{viewing?.titulo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewing?.conteudo}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
