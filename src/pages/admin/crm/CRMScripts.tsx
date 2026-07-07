'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked, Plus, Copy, Check, Pencil, Trash2,
  ToggleLeft, ToggleRight, Save, X, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { key: 'abertura',       label: '👋 Abertura' },
  { key: 'qualificacao',   label: '🔍 Qualificação' },
  { key: 'iniciante',      label: '🌱 Iniciante' },
  { key: 'experiente',     label: '⚡ Experiente' },
  { key: 'tabela',         label: '📋 Tabela' },
  { key: 'posicionamento', label: '🎯 Posicionamento' },
  { key: 'objecao',        label: '🛡 Objeção' },
  { key: 'fechamento',     label: '✅ Fechamento' },
  { key: 'followup',       label: '🔔 Follow-up' },
  { key: 'audio',          label: '🎙 Áudio' },
  { key: 'conhecer_acai',  label: '🍦 Conhecer Açaí' },
];

const EMPTY_FORM = { categoria: 'abertura', nome: '', conteudo: '', atalho: '' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function CRMScripts() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['crm_scripts_all'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('crm_scripts')
        .select('*')
        .order('categoria')
        .order('ordem');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim() || !form.conteudo.trim()) throw new Error('Nome e conteúdo são obrigatórios');
      const payload = {
        categoria: form.categoria,
        nome: form.nome.trim(),
        conteudo: form.conteudo.trim(),
        atalho: form.atalho.trim() || null,
        ativo: true,
      };
      if (editTarget) {
        const { error } = await (supabase as any).from('crm_scripts').update(payload).eq('id', editTarget.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('crm_scripts').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_scripts_all'] });
      setDialogOpen(false);
      setEditTarget(null);
      setForm({ ...EMPTY_FORM });
      toast.success(editTarget ? 'Script atualizado!' : 'Script criado!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      await (supabase as any).from('crm_scripts').update({ ativo }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_scripts_all'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from('crm_scripts').delete().eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_scripts_all'] });
      toast.success('Script removido');
    },
  });

  const openEdit = (s: any) => {
    setEditTarget(s);
    setForm({ categoria: s.categoria, nome: s.nome, conteudo: s.conteudo, atalho: s.atalho || '' });
    setDialogOpen(true);
  };

  const copyScript = async (s: any) => {
    await navigator.clipboard.writeText(s.conteudo);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Script copiado!');
  };

  const scriptsByCategory = (cat: string) => scripts.filter((s: any) => s.categoria === cat);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button
        onClick={() => navigate('/admin/crm/pipeline')}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all w-fit"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Pipeline
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 flex items-center gap-3">
            <BookMarked className="text-rose-500 shrink-0" size={32} />
            Biblioteca de Scripts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Playbook completo da AmazFrut — {scripts.filter((s: any) => s.ativo).length} scripts ativos
          </p>
        </div>
        <Button
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2 rounded-2xl shadow-lg shadow-rose-500/20"
          onClick={() => { setEditTarget(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); }}
        >
          <Plus size={18} /> Novo Script
        </Button>
      </div>

      <Tabs defaultValue="abertura" className="space-y-4">
        <TabsList className="glass-card border-none p-1 h-auto rounded-2xl flex-wrap gap-1">
          {CATEGORIAS.map(c => (
            <TabsTrigger
              key={c.key}
              value={c.key}
              className="rounded-xl text-xs font-bold h-9 px-4 whitespace-nowrap"
            >
              {c.label}
              <span className="ml-1.5 text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">
                {scriptsByCategory(c.key).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIAS.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="space-y-3 outline-none">
            <AnimatePresence>
              {scriptsByCategory(cat.key).map((s: any) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'glass-card border-none p-4 space-y-3 transition-all',
                    !s.ativo && 'opacity-40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-sm">{s.nome}</span>
                        {s.atalho && (
                          <Badge variant="outline" className="text-[9px] font-black font-mono border-primary/30 text-primary">
                            {s.atalho}
                          </Badge>
                        )}
                        {!s.ativo && <Badge variant="outline" className="text-[9px]">Desativado</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 bg-muted/30 rounded-xl p-2.5">
                        {s.conteudo}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className={cn('h-8 w-8 rounded-xl', copiedId === s.id ? 'text-green-500' : 'text-primary')}
                        onClick={() => copyScript(s)}
                        title="Copiar"
                      >
                        {copiedId === s.id ? <Check size={14} /> : <Copy size={14} />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-xl"
                        onClick={() => openEdit(s)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className={cn('h-8 w-8 rounded-xl', s.ativo ? 'text-amber-500' : 'text-green-500')}
                        onClick={() => toggleMutation.mutate({ id: s.id, ativo: !s.ativo })}
                        title={s.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {s.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50"
                        onClick={() => confirm('Excluir este script?') && deleteMutation.mutate(s.id)}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {scriptsByCategory(cat.key).length === 0 && (
              <div className="glass-card border-none p-12 text-center">
                <p className="text-muted-foreground text-sm">Nenhum script nesta categoria ainda.</p>
                <Button
                  variant="outline" size="sm"
                  className="mt-3 rounded-2xl gap-2 font-bold"
                  onClick={() => { setForm({ ...EMPTY_FORM, categoria: cat.key }); setDialogOpen(true); }}
                >
                  <Plus size={14} /> Criar primeiro script
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditTarget(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editTarget ? 'Editar Script' : 'Novo Script'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger className="bg-muted/40 border-none h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Atalho</Label>
                <Input
                  placeholder="/abertura"
                  className="bg-muted/40 border-none h-11 font-mono"
                  value={form.atalho}
                  onChange={e => setForm(f => ({ ...f, atalho: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nome do Script</Label>
              <Input
                placeholder="Ex: Abertura padrão"
                className="bg-muted/40 border-none h-11"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Conteúdo da Mensagem</Label>
              <Textarea
                placeholder="Digite o script completo aqui..."
                className="bg-muted/40 border-none resize-none"
                rows={8}
                value={form.conteudo}
                onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">{form.conteudo.length} caracteres</p>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl"
              disabled={!form.nome.trim() || !form.conteudo.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {editTarget ? 'Salvar Alterações' : 'Criar Script'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
