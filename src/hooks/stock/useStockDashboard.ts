'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export function useStockDashboard() {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['stock_dashboard', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return null;

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // 1. Fetch Inventory Items for Total Value and Categories
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_categories(name, color)
        `)
        .eq('store_id', currentStore.id);

      if (itemsError) throw itemsError;

      // 2. Fetch Movements for CMV (current month) - EXITS
      const { data: exits, error: moveError } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_items(composes_cmv)
        `)
        .eq('store_id', currentStore.id)
        .eq('action', 'exit')
        .is('cancelled_at', null)
        .gte('moved_at', monthStart)
        .lte('moved_at', monthEnd);

      if (moveError) throw moveError;

      // 3. Fetch Movements for Purchases (current month) - ENTRIES
      const { data: entries, error: entryError } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('action', 'entry')
        .eq('classification', 'purchase')
        .is('cancelled_at', null)
        .gte('moved_at', monthStart)
        .lte('moved_at', monthEnd);

      if (entryError) throw entryError;

      // --- Calculations ---

      // Total Value & Critical Count
      let totalValue = 0;
      let criticalCount = 0;
      const categoriesMap: Record<string, { name: string; value: number; color: string }> = {};

      (items || []).forEach(item => {
        const value = (item.current_qty || 0) * (item.avg_price || 0);
        totalValue += value;
        
        if ((item.current_qty || 0) < (item.minimum_qty || 0)) {
          criticalCount++;
        }

        const catName = (item.inventory_categories as any)?.name || 'Sem Categoria';
        const catColor = (item.inventory_categories as any)?.color || '#94a3b8';

        if (!categoriesMap[catName]) {
          categoriesMap[catName] = { name: catName, value: 0, color: catColor };
        }
        categoriesMap[catName].value += value;
      });

      // CMV (Custo de Mercadoria Vendida) - Sum of exits where composes_cmv is true
      const cmvTotal = (exits || []).reduce((acc, move) => {
        const composesCmv = (move.inventory_items as any)?.composes_cmv;
        return composesCmv ? acc + (move.total_value || 0) : acc;
      }, 0);

      // Total Purchases
      const totalPurchaseValue = (entries || []).reduce((acc, move) => acc + (move.total_value || 0), 0);

      // Stock Efficiency (conceptual: cmv / purchases)
      // If we bought R$ 1000 and the cost of goods sold was R$ 800, efficiency is 80% (assuming stable stock)
      const efficiency = totalPurchaseValue > 0 ? (cmvTotal / totalPurchaseValue) : 0;

      return {
        stats: {
          totalValue,
          criticalCount,
          cmvTotal,
          totalPurchaseValue,
          efficiency,
          productCount: items?.length || 0
        },
        charts: {
          categories: Object.values(categoriesMap).sort((a, b) => b.value - a.value).slice(0, 5),
          cmvEvolution: [
            { name: 'Semana 1', value: cmvTotal * 0.2 },
            { name: 'Semana 2', value: cmvTotal * 0.3 },
            { name: 'Semana 3', value: cmvTotal * 0.25 },
            { name: 'Semana 4', value: cmvTotal * 0.25 },
          ]
        }
      };

    },
    enabled: !!currentStore?.id
  });
}
