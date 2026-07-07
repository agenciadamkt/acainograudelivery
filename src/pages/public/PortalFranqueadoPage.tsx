import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Headphones, CheckCircle2, Loader2, ChevronsUpDown, Check,
  Send, Lock, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CATEGORIAS, CARGOS } from '@/pages/admin/caf/AtendimentosPage';

const SENHA = 'nograu';

export default function PortalFranqueadoPage() {
  const [autenticado, setAutenticado]     = useState(false);
  const [senha, setSenha]                 = useState('');
  const [mostrarSenha, setMostrarSenha]   = useState(false);
  const [erroSenha, setErroSenha]         = useState(false);
  const [protocolo, setProtocolo]         = useState('');

  // Campos do formulário
  const [lojaNome, setLojaNome]           = useState('');
  const [lojaId, setLojaId]               = useState('');
  const [lojaCidade, setLojaCidade]       = useState('');
  const [lojaEstado, setLojaEstado]       = useState('');
  const [lojaOpen, setLojaOpen]           = useState(false);
  const [solNome, setSolNome]             = useState('');
  const [solCargo, setSolCargo]           = useState('');
  const [categoria, setCategoria]         = useState('');
  const [descricao, setDescricao]         = useState('');

  const { data: stores = [] } = useQuery({
    queryKey: ['stores_portal'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('stores')
        .select('id, name, city, state')
        .eq('active', true)
        .order('name');
      return data || [];
    },
    enabled: autenticado,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from('caf_atendimentos')
        .insert([{
          loja_franqueada:   lojaNome || null,
          cidade:            lojaCidade || null,
          estado:            lojaEstado || null,
          solicitante_nome:  solNome || null,
          solicitante_cargo: solCargo || null,
          canal:             'Portal do Franqueado',
          categoria,
          prioridade:        'Média',
          descricao,
          status:            'Aberto',
        }])
        .select('protocolo')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      setProtocolo(data.protocolo);
    },
    onError: (e: any) => toast.error('Erro ao enviar: ' + e.message),
  });

  const handleSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.toLowerCase().trim() === SENHA) {
      setAutenticado(true);
      setErroSenha(false);
    } else {
      setErroSenha(true);
      setSenha('');
    }
  };

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaNome) { toast.error('Selecione ou informe a loja'); return; }
    if (!categoria) { toast.error('Selecione a categoria'); return; }
    if (!descricao.trim()) { toast.error('Descreva a solicitação'); return; }
    submitMutation.mutate();
  };

  const resetForm = () => {
    setLojaNome(''); setLojaId(''); setLojaCidade(''); setLojaEstado('');
    setSolNome(''); setSolCargo(''); setCategoria(''); setDescricao('');
    setProtocolo('');
  };

  // ── Tela de Senha ────────────────────────────────────────────────────────
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Headphones size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Suporte ao Franqueado</h1>
            <p className="text-purple-300 text-sm mt-1">Açaí no Grau — Rede de Franquias</p>
          </div>

          {/* Card de senha */}
          <form onSubmit={handleSenha} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <Lock size={14} />
              <span className="text-sm font-medium">Acesso restrito à rede</span>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Senha de acesso</Label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Digite a senha da rede"
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErroSenha(false); }}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10',
                    erroSenha && 'border-red-400 bg-red-500/10'
                  )}
                  autoFocus
                />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  onClick={() => setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {erroSenha && (
                <p className="text-red-400 text-xs font-medium">Senha incorreta. Tente novamente.</p>
              )}
            </div>

            <Button type="submit" className="w-full font-bold gap-2 bg-white text-purple-900 hover:bg-white/90 h-11">
              Entrar <ChevronRight size={16} />
            </Button>
          </form>

          <p className="text-center text-purple-400 text-xs mt-4">
            Use a senha fornecida pela franqueadora.
          </p>
        </div>
      </div>
    );
  }

  // ── Tela de Sucesso ──────────────────────────────────────────────────────
  if (protocolo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 space-y-4">
            <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Solicitação enviada!</h2>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-purple-300 text-xs uppercase tracking-wider font-bold">Seu protocolo</p>
              <p className="text-2xl font-black text-white font-mono mt-1">{protocolo}</p>
            </div>
            <p className="text-purple-300 text-sm leading-relaxed">
              Nossa equipe recebeu sua solicitação e entrará em contato em breve.
            </p>
            <Button onClick={resetForm} variant="outline"
              className="w-full border-white/20 text-white bg-white/10 hover:bg-white/20 font-bold">
              Enviar outra solicitação
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Headphones size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Abrir Solicitação</h1>
          <p className="text-purple-300 text-sm mt-1">Açaí no Grau — Suporte à Rede</p>
        </div>

        <form onSubmit={handleEnviar}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-5">

          {/* Loja */}
          <div className="space-y-2">
            <Label className="text-white/80 text-sm font-bold">Sua Loja *</Label>
            <Popover open={lojaOpen} onOpenChange={setLojaOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox"
                  className={cn(
                    'w-full justify-between bg-white/10 border-white/20 text-white font-normal hover:bg-white/20',
                    !lojaNome && 'text-white/50'
                  )}>
                  <span className="truncate">{lojaNome || 'Selecionar loja...'}</span>
                  <ChevronsUpDown size={14} className="ml-2 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar sua loja..." />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>Loja não encontrada.</CommandEmpty>
                    <CommandGroup>
                      {(stores as any[]).map((s: any) => (
                        <CommandItem key={s.id} value={s.name}
                          onSelect={() => {
                            setLojaNome(s.name);
                            setLojaId(s.id);
                            setLojaCidade(s.city || '');
                            setLojaEstado(s.state || '');
                            setLojaOpen(false);
                          }}>
                          <Check size={13} className={cn('mr-2 shrink-0', lojaNome === s.name ? 'opacity-100 text-primary' : 'opacity-0')} />
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            {(s.city || s.state) && (
                              <p className="text-xs text-muted-foreground">{[s.city, s.state].filter(Boolean).join(' / ')}</p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Separador */}
          <div className="border-t border-white/10 pt-1">
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-3">Solicitante</p>
          </div>

          {/* Solicitante */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label className="text-white/80 text-sm">Nome do Solicitante</Label>
              <Input
                placeholder="Seu nome"
                value={solNome}
                onChange={e => setSolNome(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-white/80 text-sm">Cargo</Label>
              <Select value={solCargo} onValueChange={setSolCargo}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecionar cargo" className="text-white/50" />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-white/10 pt-1">
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-3">Solicitação</p>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-white/80 text-sm font-bold">Categoria *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIAS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-white/80 text-sm font-bold">Descrição da Solicitação *</Label>
            <Textarea
              placeholder="Descreva detalhadamente o que você precisa de suporte..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
              rows={4}
            />
            <p className="text-white/30 text-[11px]">{descricao.length} caracteres</p>
          </div>

          <Button type="submit" disabled={submitMutation.isPending}
            className="w-full h-12 font-black text-base bg-white text-purple-900 hover:bg-white/90 gap-2">
            {submitMutation.isPending
              ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
              : <><Send size={18} /> Enviar Solicitação</>
            }
          </Button>
        </form>

        <p className="text-center text-purple-400 text-xs mt-4">
          Açaí no Grau · Central de Atendimento ao Franqueado
        </p>
      </div>
    </div>
  );
}
