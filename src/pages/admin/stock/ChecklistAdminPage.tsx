'use client';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  ChevronRight, 
  Settings2,
  ListChecks,
  CheckCircle2,
  X,
  Type,
  Hash,
  ToggleLeft,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ChecklistAdminPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    frequency: 'daily'
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklist_templates', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_checklists')
        .select(`
          *,
          items:inventory_checklist_items(*)
        `)
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentStore?.id
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('inventory_checklists')
        .insert([{ 
          ...payload, 
          store_id: currentStore?.id 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });
      setIsNewDialogOpen(false);
      setNewTemplate({ name: '', description: '', frequency: 'daily' });
      toast.success('Checklist criado com sucesso!');
    },
    onError: (err: any) => toast.error('Erro ao criar: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_checklists')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });
      toast.success('Checklist removido');
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Gerenciar Rotinas
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Configure os checklists operacionais da sua loja
          </p>
        </div>

        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2 px-6 h-12 rounded-2xl">
              <Plus size={20} /> Novo Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Criar Novo Checklist</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nome da Rotina</Label>
                <Input 
                  placeholder="Ex: Abertura de Loja" 
                  className="h-12 bg-muted/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate(n => ({ ...n, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Frequência</Label>
                <Select 
                  value={newTemplate.frequency} 
                  onValueChange={v => setNewTemplate(n => ({ ...n, frequency: v }))}
                >
                  <SelectTrigger className="h-12 bg-muted/40 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descrição (Opcional)</Label>
                <Input 
                  placeholder="Instruções breves para a equipe..." 
                  className="h-12 bg-muted/40 border-none"
                  value={newTemplate.description}
                  onChange={e => setNewTemplate(n => ({ ...n, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button 
                className="w-full h-12 bg-primary font-black text-white"
                onClick={() => createMutation.mutate(newTemplate)}
                disabled={!newTemplate.name}
              >
                Criar Checklist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-[200px] rounded-3xl bg-muted/20 animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="glass-card p-20 text-center flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/30">
            <ClipboardList size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Nenhuma rotina configurada</h3>
            <p className="text-muted-foreground">Crie seu primeiro checklist para começar a organizar a operação.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="glass-card border-none overflow-hidden group hover:shadow-2xl transition-all duration-500">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Deseja excluir este checklist e todas as suas perguntas?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <ClipboardList size={20} />
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest tracking-tighter">
                        {template.frequency === 'daily' ? 'Diário' : 'Semanal'}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-black">{template.name}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                      {template.description || 'Nenhuma descrição fornecida.'}
                    </p>
                    
                    <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {template.items?.length > 0 ? (
                          <div className="text-xs font-bold text-muted-foreground">
                            {template.items.length} perguntas configuradas
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-amber-600 flex items-center gap-1">
                             Nenhuma pergunta adicionada
                          </div>
                        )}
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="font-bold gap-1 text-primary hover:bg-primary/5">
                            Configurar <ChevronRight size={14} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-none shadow-2xl sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                          <ChecklistEditor template={template} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['checklist_templates'] })} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ChecklistEditor({ template, onRefresh }: { template: any, onRefresh: () => void }) {
  const [items, setItems] = useState<any[]>(template.items || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'boolean',
    is_required: true
  });

  const saveItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from('inventory_checklist_items')
        .insert([{ 
          ...item, 
          checklist_id: template.id,
          sort_order: items.length
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setItems(prev => [...prev, data]);
      setIsAdding(false);
      setNewItem({ name: '', type: 'boolean', is_required: true });
      onRefresh();
      toast.success('Pergunta adicionada');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_checklist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      setItems(prev => prev.filter(i => i.id !== id));
      onRefresh();
      toast.success('Pergunta removida');
    }
  });

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-2xl font-black flex items-center gap-2">
          <Settings2 size={24} className="text-primary" />
          Editar Questões
        </DialogTitle>
        <p className="text-muted-foreground text-sm">Checklist: {template.name}</p>
      </DialogHeader>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl group">
            <div className="w-6 h-6 flex items-center justify-center text-muted-foreground/30">
              <GripVertical size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{item.name}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] uppercase">
                  {item.type === 'boolean' && <ToggleLeft size={10} className="mr-1" />}
                  {item.type === 'number' && <Hash size={10} className="mr-1" />}
                  {item.type === 'text' && <Type size={10} className="mr-1" />}
                  {item.type === 'photo' && <Camera size={10} className="mr-1" />}
                  {item.type}
                </Badge>
                {item.is_required && <Badge className="text-[9px] bg-red-100 text-red-600 border-none">Obrigatório</Badge>}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50"
              onClick={() => deleteItemMutation.mutate(item.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}

        {isAdding ? (
          <div className="p-6 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 space-y-4 animate-in zoom-in duration-300">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Texto da Pergunta</Label>
              <Input 
                autoFocus
                placeholder="Ex: Todas as janelas estão trancadas?" 
                className="bg-white"
                value={newItem.name}
                onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Tipo de Resposta</Label>
                <Select value={newItem.type} onValueChange={v => setNewItem(n => ({ ...n, type: v }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Sim/Não</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="photo">Foto (Evidência)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Obrigatório?</Label>
                <Select 
                  value={newItem.is_required ? 'yes' : 'no'} 
                  onValueChange={v => setNewItem(n => ({ ...n, is_required: v === 'yes' }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)} className="flex-1">Cancelar</Button>
              <Button 
                variant="default" 
                className="flex-1 bg-primary text-white"
                onClick={() => saveItemMutation.mutate(newItem)}
                disabled={!newItem.name}
              >
                Salvar Pergunta
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full h-12 border-dashed border-primary/30 text-primary hover:bg-primary/5 gap-2 rounded-2xl"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={18} /> Adicionar Pergunta
          </Button>
        )}
      </div>
    </div>
  );
}
