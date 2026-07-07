'use client';

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  FileDown, 
  AlertCircle, 
  CheckCircle2, 
  Truck,
  ArrowRight,
  Package,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function StockPurchasesPage() {
  const navigate = useNavigate();
  const { currentStore } = useStore();

  // Fetch items that need replenishment
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopping_list', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_categories(name, color),
          inventory_suppliers(name)
        `)
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Filter client-side: items where current stock is below minimum
      return (data || []).filter(item => 
        item.minimum_qty > 0 && item.current_qty < item.minimum_qty
      );
    },
    enabled: !!currentStore?.id
  });


  const totalItemsToBuy = items.length;
  const estimatedCost = items.reduce((acc, i) => acc + ((i.minimum_qty * 1.5 - i.current_qty) * (i.avg_price || 0)), 0);

  const handleExport = () => {
    if (items.length === 0) {
      toast.error('Não há itens na lista para exportar');
      return;
    }

    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [141, 66, 221]; // #8D42DD
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Compras (Reposição)', 14, 16);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${currentStore?.name || 'Loja'}`, pageWidth - 14, 11, { align: 'right' });
      doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 17, { align: 'right' });

      // Summary
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO', 14, 35);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Itens Críticos: ${totalItemsToBuy}`, 14, 42);
      doc.text(`Custo Estimado de Reposição: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedCost)}`, 14, 47);

      // Table
      const tableBody = items.map(item => {
        const missing = item.minimum_qty - item.current_qty;
        const suggestion = Math.ceil(missing * 1.5);
        return [
          item.name,
          item.inventory_categories?.name || 'Geral',
          `${item.current_qty} ${item.unit}`,
          `${item.minimum_qty} ${item.unit}`,
          `${suggestion} ${item.unit}`,
          item.inventory_suppliers?.name || '—'
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [['Insumo', 'Categoria', 'Estoque Atual', 'Mínimo', 'Sugestão', 'Fornecedor']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: brandColor, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          4: { fontStyle: 'bold' }
        }
      });

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`lista_compras_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Lista exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF da lista');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <button onClick={() => navigate('/admin/stock/dashboard')} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary/50 hover:text-primary hover:bg-primary/10 transition-all w-fit">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /><span>Estoque & Operações</span>
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Lista de Compras
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Reposição inteligente baseada em níveis críticos
          </p>
        </div>
        
        <Button onClick={handleExport} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          <FileDown size={20} /> Exportar Lista (PDF)
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none bg-orange-500/10 text-orange-600">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Itens Críticos</p>
              <h3 className="text-3xl font-black">{totalItemsToBuy}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none bg-emerald-500/10 text-emerald-600">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Custo Estimado</p>
              <h3 className="text-3xl font-black">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedCost)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="py-20 text-center animate-pulse">Calculando reposição...</div>
      ) : items.length === 0 ? (
        <div className="py-32 text-center glass-card">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black">Tudo em conformidade!</h3>
          <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
            Não há itens abaixo do estoque mínimo no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item, idx) => {
            const missing = item.minimum_qty - item.current_qty;
            const suggestion = Math.ceil(missing * 1.5); // Sugestão: chegar a 50% acima do mínimo

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-5 flex flex-col md:flex-row items-center justify-between gap-6 group hover:bg-white/40 dark:hover:bg-black/30"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: item.inventory_categories?.color || '#94a3b8' }}>
                    <Package size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{item.inventory_categories?.name}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Truck size={12} /> {item.inventory_suppliers?.name || 'Fornecedor não definido'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 md:gap-16">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Status Atual</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-orange-500">{item.current_qty}</span>
                      <span className="text-xs text-muted-foreground font-medium">/ {item.minimum_qty} {item.unit}</span>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <ArrowRight className="text-muted-foreground opacity-30" />
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Sugestão de Compra</p>
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-2xl font-black text-primary">{suggestion}</span>
                      <span className="text-sm text-primary font-bold">{item.unit}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
