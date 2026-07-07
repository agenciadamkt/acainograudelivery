'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Camera, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  Save,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChecklistExecutionPage() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [employeeName, setEmployeeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active checklists and their status for today
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['available_checklists', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      
      // Get all active checklists
      const { data: templates, error: tError } = await supabase
        .from('inventory_checklists')
        .select(`
          *,
          items:inventory_checklist_items(*)
        `)
        .eq('store_id', currentStore.id)
        .eq('is_active', true);
      
      if (tError) throw tError;

      // Get responses for today
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: dailyResponses, error: rError } = await supabase
        .from('inventory_checklist_responses')
        .select('checklist_id')
        .eq('store_id', currentStore.id)
        .eq('date_reference', today);
      
      if (rError) throw rError;

      const completedIds = new Set(dailyResponses?.map(r => r.checklist_id));

      return templates.map(t => ({
        ...t,
        isCompletedToday: completedIds.has(t.id)
      }));
    },
    enabled: !!currentStore?.id
  });

  const handleSubmit = async () => {
    if (!selectedChecklist) return;

    // Validate required items
    const missing = selectedChecklist.items.filter((item: any) => 
      item.is_required && (responses[item.id] === undefined || responses[item.id] === '')
    );

    if (missing.length > 0) {
      toast.error(`Por favor, preencha todos os campos obrigatórios: ${missing.map((m: any) => m.name).join(', ')}`);
      return;
    }

    if (!employeeName.trim()) {
      toast.error('Por favor, informe seu nome (Responsável)');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create response record
      const { data: res, error: resError } = await supabase
        .from('inventory_checklist_responses')
        .insert([{
          checklist_id: selectedChecklist.id,
          store_id: currentStore?.id,
          user_id: user?.id,
          employee_name: employeeName.trim(),
          date_reference: format(new Date(), 'yyyy-MM-dd')
        }])
        .select()
        .single();

      if (resError) throw resError;

      // 2. Create individual values
      const valuesToInsert = selectedChecklist.items.map((item: any) => {
        const val = responses[item.id];
        return {
          response_id: res.id,
          item_id: item.id,
          value_boolean: item.type === 'boolean' ? val : null,
          value_number: item.type === 'number' ? Number(val) : null,
          value_text: item.type === 'text' ? val : null,
          photo_url: item.type === 'photo' ? val : null
        };
      });

      const { error: valError } = await supabase
        .from('inventory_checklist_values')
        .insert(valuesToInsert);

      if (valError) throw valError;

      toast.success('Checklist finalizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['available_checklists'] });
      setSelectedChecklist(null);
      setResponses({});
      setEmployeeName('');
    } catch (error: any) {
      toast.error('Erro ao salvar checklist: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}_${Date.now()}.${fileExt}`;
      const filePath = `${currentStore?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('checklist-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('checklist-photos')
        .getPublicUrl(filePath);

      setResponses(prev => ({ ...prev, [itemId]: publicUrl }));
      toast.success('Foto enviada!');
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message);
    }
  };

  if (selectedChecklist) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right duration-500">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2 font-bold" onClick={() => setSelectedChecklist(null)}>
            <ArrowLeft size={18} /> Voltar
          </Button>
          <div className="text-right">
            <h2 className="text-2xl font-black">{selectedChecklist.name}</h2>
            <p className="text-muted-foreground text-sm">Preenchendo rotina de hoje</p>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="glass-card border-none overflow-hidden bg-primary/5">
            <CardContent className="p-6">
              <Label className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">
                Nome da Funcionária / Responsável
              </Label>
              <Input 
                autoFocus
                placeholder="Ex: Maria" 
                className="h-14 bg-white text-lg font-bold border-none shadow-sm"
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
              />
            </CardContent>
          </Card>

          {selectedChecklist.items.sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => (
            <Card key={item.id} className="glass-card border-none overflow-hidden hover:bg-white/40 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    {item.is_required && <Badge variant="secondary" className="text-[9px] bg-red-100 text-red-600 mt-1">Obrigatório</Badge>}
                  </div>
                </div>

                {item.type === 'boolean' && (
                  <div className="flex gap-4">
                    <Button 
                      variant={responses[item.id] === true ? 'default' : 'outline'}
                      className={cn("flex-1 h-12 font-bold rounded-2xl", responses[item.id] === true && "bg-green-500")}
                      onClick={() => setResponses(prev => ({ ...prev, [item.id]: true }))}
                    >
                      SIM
                    </Button>
                    <Button 
                      variant={responses[item.id] === false ? 'default' : 'outline'}
                      className={cn("flex-1 h-12 font-bold rounded-2xl", responses[item.id] === false && "bg-red-500")}
                      onClick={() => setResponses(prev => ({ ...prev, [item.id]: false }))}
                    >
                      NÃO
                    </Button>
                  </div>
                )}

                {item.type === 'number' && (
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="h-12 text-lg font-bold bg-muted/20 border-none"
                    value={responses[item.id] || ''}
                    onChange={e => setResponses(prev => ({ ...prev, [item.id]: e.target.value }))}
                  />
                )}

                {item.type === 'text' && (
                  <Input 
                    placeholder="Sua resposta aqui..." 
                    className="h-12 bg-muted/20 border-none"
                    value={responses[item.id] || ''}
                    onChange={e => setResponses(prev => ({ ...prev, [item.id]: e.target.value }))}
                  />
                )}

                {item.type === 'photo' && (
                  <div className="space-y-4">
                    {responses[item.id] ? (
                      <div className="relative group rounded-2xl overflow-hidden aspect-video">
                        <img src={responses[item.id]} alt="Evidence" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="destructive" size="sm" onClick={() => setResponses(prev => ({ ...prev, [item.id]: null }))}>
                            Remover Foto
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                        <Camera className="text-primary mb-2" size={24} />
                        <span className="text-sm font-bold text-primary">Tirar Foto / Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          className="hidden" 
                          onChange={e => e.target.files?.[0] && handlePhotoUpload(item.id, e.target.files[0])}
                        />
                      </Label>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          className="w-full h-16 bg-primary text-white text-xl font-black rounded-3xl shadow-2xl shadow-primary/30"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" size={24} />}
          FINALIZAR CHECKLIST
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
          Rotinas de Hoje
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="h-40 rounded-3xl bg-muted/20 animate-pulse" />)}
        </div>
      ) : checklists.length === 0 ? (
        <div className="glass-card p-20 text-center text-muted-foreground">
          Nenhuma rotina disponível para hoje.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {checklists.map((t: any) => (
            <Card 
              key={t.id} 
              className={cn(
                "glass-card border-none p-8 flex items-center justify-between group transition-all duration-500",
                t.isCompletedToday ? "opacity-60 bg-green-50/10" : "cursor-pointer hover:bg-white/40 hover:shadow-2xl"
              )}
              onClick={() => !t.isCompletedToday && setSelectedChecklist(t)}
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl",
                  t.isCompletedToday ? "bg-green-100 text-green-600 scale-90" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                )}>
                  {t.isCompletedToday ? <CheckCircle2 size={32} /> : <ClipboardList size={32} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {t.isCompletedToday ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-none font-bold">CONCLUÍDO HOJE</Badge>
                    ) : (
                      <p className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                        <Clock size={14} /> Aguardando execução
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {!t.isCompletedToday && (
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center text-primary/40 group-hover:border-primary group-hover:text-primary transition-all">
                  <ChevronRight size={24} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none p-6 flex flex-col items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Total de Rotinas</p>
          <p className="text-3xl font-black">{checklists.length}</p>
        </Card>
        <Card className="glass-card border-none p-6 flex flex-col items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Concluídas Hoje</p>
          <p className="text-3xl font-black text-green-600">{checklists.filter(c => c.isCompletedToday).length}</p>
        </Card>
        <Card className="glass-card border-none p-6 flex flex-col items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Pendentes</p>
          <p className="text-3xl font-black text-amber-500">{checklists.filter(c => !c.isCompletedToday).length}</p>
        </Card>
      </div>
    </div>
  );
}
