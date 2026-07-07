'use client';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Camera, User, Clock, Search, ExternalLink, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChecklistReportsPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['checklist_reports', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      
      const { data, error } = await supabase
        .from('inventory_checklist_responses')
        .select(`
          id,
          completed_at,
          employee_name,
          date_reference,
          checklist:inventory_checklists(name),
          values:inventory_checklist_values(
            id,
            value_boolean,
            value_text,
            value_number,
            photo_url,
            item:inventory_checklist_items(name, type)
          )
        `)
        .eq('store_id', currentStore.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentStore?.id
  });

  const filteredReports = reports.filter(r => {
    const term = searchTerm.toLowerCase();
    const checklistName = r.checklist?.name?.toLowerCase() || '';
    const employeeName = r.employee_name?.toLowerCase() || '';
    
    return checklistName.includes(term) || employeeName.includes(term);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Relatórios de Rotinas
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Acompanhe a execução dos checklists e visualize fotos
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Buscar por funcionária ou rotina..."
            className="pl-10 h-12 rounded-2xl bg-white/60 dark:bg-black/60 backdrop-blur-xl border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-3xl bg-muted/20 animate-pulse" />)}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="glass-card border-none text-center p-16">
          <CardContent className="flex flex-col items-center">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary/30 mb-4">
              <FileText size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Nenhum relatório encontrado</h3>
            <p className="text-muted-foreground">Não há checklists preenchidos ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredReports.map((report: any) => {
              const hasPhotos = report.values?.some((v: any) => !!v.photo_url);
              
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card 
                    className="glass-card border-none hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden relative"
                    onClick={() => setSelectedResponse(report)}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ExternalLink size={16} />
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div>
                        <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/20">
                          {format(new Date(report.date_reference), "dd 'de' MMM", { locale: ptBR })}
                        </Badge>
                        <h3 className="text-xl font-black truncate">{report.checklist?.name || 'Rotina Oculta'}</h3>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User size={16} className="text-indigo-500" />
                          <span className="font-bold text-foreground">
                            {report.employee_name || 'Não informado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock size={16} className="text-orange-500" />
                          <span>Finalizado às {format(new Date(report.completed_at), 'HH:mm')}</span>
                        </div>
                        {hasPhotos && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Camera size={16} className="text-green-500" />
                            <span className="text-green-600 font-bold bg-green-500/10 px-2 py-0.5 rounded-md">Contém Fotos</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal / Dialog to visualize Report details */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-3xl glass-card border-none shadow-2xl max-h-[85vh] overflow-y-auto w-[90vw]">
          {selectedResponse && (
            <>
              <DialogHeader className="pb-4 border-b border-black/5 dark:border-white/5 mb-4">
                <DialogTitle className="text-3xl font-black">
                  {selectedResponse.checklist?.name}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <Badge variant="secondary" className="px-3 py-1 font-bold">
                    <User size={14} className="mr-1" /> {selectedResponse.employee_name || 'Sem nome'}
                  </Badge>
                  <span className="text-muted-foreground text-sm flex items-center">
                    <Clock size={14} className="mr-1" /> 
                    {format(new Date(selectedResponse.completed_at), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {selectedResponse.values?.map((val: any) => (
                  <div key={val.id} className="bg-white/60 dark:bg-black/60 p-5 rounded-2xl border border-white/20 shadow-sm">
                    <h4 className="font-bold text-lg mb-3">{val.item?.name}</h4>
                    
                    {val.item?.type === 'boolean' && (
                      <Badge className={val.value_boolean ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                        {val.value_boolean ? 'SIM' : 'NÃO'}
                      </Badge>
                    )}

                    {val.item?.type === 'number' && (
                      <p className="text-xl font-black font-mono bg-muted/50 inline-block px-3 py-1 rounded-lg">
                        {val.value_number}
                      </p>
                    )}

                    {val.item?.type === 'text' && (
                      <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg border-l-2 border-primary/40">
                        {val.value_text || 'Sem observações.'}
                      </p>
                    )}

                    {val.item?.type === 'photo' && (
                      <div className="mt-3">
                        {val.photo_url ? (
                          <a href={val.photo_url} target="_blank" rel="noreferrer" className="block w-full max-w-sm rounded-xl overflow-hidden hover:opacity-90 transition-opacity border-4 border-white/50 shadow-lg">
                            <img src={val.photo_url} alt="Evidência" className="w-full aspect-video object-cover" />
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Nenhuma foto anexada.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
