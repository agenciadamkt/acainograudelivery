'use client';

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BookOpen, Plus, Search, ArrowLeft, Eye, Pencil, Trash2,
  Tag, Loader2, Save, X, Star, CheckCircle2, Globe, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CATEGORIAS } from './AtendimentosPage';

const CAT_COLORS: Record<string, string> = {
  'Suporte ao Sistema': 'bg-violet-50 text-violet-700 border-violet-200',
  'Marketing':          'bg-blue-50 text-blue-700 border-blue-200',
  'Financeiro':         'bg-green-50 text-green-700 border-green-200',
  'Pedidos':            'bg-amber-50 text-amber-700 border-amber-200',
  'Processos':          'bg-red-50 text-red-700 border-red-200',
};

export default function BaseConhecimentoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('todas');
  const [isNewOpen, setIsNewOpen]   = useState(false);
  const [viewing, setViewing]       = useState<any>(null);
  const [editing, setEditing]       = useState<any>(null);

  const { data: artigos = [], isLoading } = useQuery({
    queryKey: ['caf_artigos'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('caf_artigos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => artigos.filter((a: any) => {
    if (filterCat !== 'todas' && a.categoria !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.titulo?.toLowerCase().includes(q) ||
        a.conteudo?.toLowerCase().includes(q) ||
        (a.tags || []).some((t: string) => t.toLowerCase().includes(q));
    }
    return true;
  }), [artigos, filterCat, search]);

  const incrementView = async (id: string, current: number) => {
    await (supabase as any).from('caf_artigos').update({ visualizacoes: current + 1 }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['caf_artigos'] });
  };

  const togglePublicado = useMutation({
    mutationFn: async ({ id, publicado }: { id: string; publicado: boolean }) => {
      const { error } = await (supabase as any).from('caf_artigos').update({ publicado }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Artigo atualizado'); qc.invalidateQueries({ queryKey: ['caf_artigos'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('caf_artigos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Artigo excluído'); qc.invalidateQueries({ queryKey: ['caf_artigos'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => ({
    total:     artigos.length,
    publicados: artigos.filter((a: any) => a.publicado).length,
    views:     artigos.reduce((s: number, a: any) => s + (a.visualizacoes || 0), 0),
  }), [artigos]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/caf/dashboard')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        CAF Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <BookOpen className="text-primary shrink-0" size={34} />
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Artigos e procedimentos da rede</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
          <Plus size={16} /> Novo Artigo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total de Artigos', value: stats.total, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-500/10' },
          { label: 'Publicados', value: stats.publicados, icon: Globe, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Visualizações', value: stats.views, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-black">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar artigos, tags..." className="pl-9 bg-muted/50 border-none"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[200px] bg-transparent border-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {Object.keys(CATEGORIAS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Articles grid */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin text-primary" size={28} />
          <span className="text-xs font-bold uppercase tracking-widest">Carregando artigos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 glass-card text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold">Nenhum artigo encontrado</h3>
          <p className="text-muted-foreground mt-1 text-sm">Crie o primeiro artigo ou ajuste os filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a: any) => (
            <div key={a.id}
              className="glass-card p-4 flex flex-col gap-3 hover:border-primary/20 transition-colors group cursor-pointer"
              onClick={() => { setViewing(a); incrementView(a.id, a.visualizacoes || 0); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2">{a.titulo}</h3>
                </div>
                {!a.publicado && (
                  <Badge variant="outline" className="text-[9px] shrink-0 bg-gray-100 text-gray-500">Rascunho</Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{a.conteudo}</p>

              <div className="flex flex-wrap gap-1">
                {a.categoria && (
                  <Badge variant="outline" className={cn('text-[9px] font-bold', CAT_COLORS[a.categoria] || 'bg-gray-50')}>
                    {a.categoria}
                  </Badge>
                )}
                {(a.tags || []).slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                ))}
                {(a.tags || []).length > 2 && (
                  <Badge variant="secondary" className="text-[9px]">+{a.tags.length - 2}</Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-muted/30">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye size={10} /> {a.visualizacoes || 0}</span>
                  <span>{format(parseISO(a.created_at), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}>
                  <button className="p-1 rounded hover:bg-muted"
                    onClick={() => setEditing(a)} title="Editar">
                    <Pencil size={12} className="text-muted-foreground" />
                  </button>
                  <button className="p-1 rounded hover:bg-muted"
                    onClick={() => togglePublicado.mutate({ id: a.id, publicado: !a.publicado })}
                    title={a.publicado ? 'Despublicar' : 'Publicar'}>
                    {a.publicado ? <Lock size={12} className="text-muted-foreground" /> : <Globe size={12} className="text-green-600" />}
                  </button>
                  <button className="p-1 rounded hover:bg-red-50"
                    onClick={() => { if (confirm('Excluir este artigo?')) deleteMutation.mutate(a.id); }}
                    title="Excluir">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {isNewOpen && (
        <ArtigoDialog
          onClose={() => setIsNewOpen(false)}
          currentUser={user}
          onSaved={() => { setIsNewOpen(false); qc.invalidateQueries({ queryKey: ['caf_artigos'] }); }}
        />
      )}

      {editing && (
        <ArtigoDialog
          initialData={editing}
          onClose={() => setEditing(null)}
          currentUser={user}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['caf_artigos'] }); }}
        />
      )}

      {viewing && (
        <ArtigoViewDialog artigo={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

// ── Artigo Create/Edit Dialog ─────────────────────────────────────────────────

function ArtigoDialog({ initialData, currentUser, onClose, onSaved }: {
  initialData?: any; currentUser: any; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!initialData;
  const [titulo, setTitulo]       = useState(initialData?.titulo || '');
  const [conteudo, setConteudo]   = useState(initialData?.conteudo || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || '');
  const [subcat, setSubcat]       = useState(initialData?.subcategoria || '');
  const [tags, setTags]           = useState((initialData?.tags || []).join(', '));
  const [publicado, setPublicado] = useState(initialData?.publicado ?? true);
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error('Informe o título'); return; }
    if (!conteudo.trim()) { toast.error('Informe o conteúdo'); return; }
    setSaving(true);
    try {
      const payload = {
        titulo, conteudo, categoria: categoria || null, subcategoria: subcat || null,
        tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        publicado,
        criado_por: currentUser?.id, criado_por_nome: currentUser?.user_metadata?.full_name || currentUser?.email,
      };
      if (isEdit) {
        const { error } = await (supabase as any).from('caf_artigos').update(payload).eq('id', initialData.id);
        if (error) throw error;
        toast.success('Artigo atualizado');
      } else {
        const { error } = await (supabase as any).from('caf_artigos').insert([payload]);
        if (error) throw error;
        toast.success('Artigo criado');
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-3xl sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            📚 {isEdit ? 'Editar Artigo' : 'Novo Artigo'}
          </DialogTitle>
          <p className="text-sm text-slate-500">Crie procedimentos, treinamentos e materiais de apoio para a rede.</p>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Informações do Artigo</p>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500"
                placeholder="Ex: Como criar promoções no PDV" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={v => { setCategoria(v); setSubcat(''); }}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORIAS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subcategoria</Label>
                <Select value={subcat} onValueChange={setSubcat} disabled={!categoria}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {(CATEGORIAS[categoria] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags <span className="text-slate-400 font-normal text-xs">(separadas por vírgula)</span></Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500"
                placeholder="pdv, promoção, cadastro..." />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Conteúdo</p>
            <Textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
              className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 resize-none" rows={8}
              placeholder="Descreva o procedimento passo a passo..." />
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <button
              onClick={() => setPublicado(!publicado)}
              className={cn('w-10 h-6 rounded-full transition-colors relative', publicado ? 'bg-violet-600' : 'bg-slate-300')}>
              <span className={cn('w-4 h-4 rounded-full bg-white absolute top-1 transition-all', publicado ? 'left-5' : 'left-1')} />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-900">{publicado ? 'Publicado' : 'Rascunho'}</p>
              <p className="text-[10px] text-slate-500">{publicado ? 'Visível para toda a rede' : 'Somente admins'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 rounded-xl font-bold gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-600/20"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? 'Atualizar' : 'Publicar'} Artigo
            </Button>
            <Button variant="outline" onClick={onClose} className="h-12 rounded-xl border-slate-200">Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Artigo View Dialog ────────────────────────────────────────────────────────

function ArtigoViewDialog({ artigo, onClose }: { artigo: any; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="glass-card border-none sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black leading-tight">{artigo.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap gap-2">
            {artigo.categoria && (
              <Badge variant="outline" className="text-xs">{artigo.categoria}</Badge>
            )}
            {artigo.subcategoria && (
              <Badge variant="outline" className="text-xs">{artigo.subcategoria}</Badge>
            )}
            {(artigo.tags || []).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
          <div className="bg-muted/30 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {artigo.conteudo}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t pt-3">
            <span className="flex items-center gap-1"><Eye size={11} /> {artigo.visualizacoes || 0} visualizações</span>
            {artigo.criado_por_nome && <span>Por: {artigo.criado_por_nome}</span>}
            <span>{format(parseISO(artigo.created_at), "dd/MM/yyyy")}</span>
            {artigo.atendimento_origem_id && (
              <Badge variant="outline" className="text-[9px] ml-auto">Origem: Atendimento</Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
