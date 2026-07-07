import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, Settings2 } from 'lucide-react';
import CurrencyInput from '@/pages/admin/financial/components/CurrencyInput';
import { useFleetSettings, useUpdateFleetSettings } from '@/hooks/useFleetSettings';

export function FleetSettingsTab() {
  const { data: settings, isLoading } = useFleetSettings();
  const updateSettings = useUpdateFleetSettings();

  const [minOrderValue, setMinOrderValue] = useState(0);

  // Sincroniza com o valor salvo sempre que ele chega/recarrega — sem isso,
  // o campo ficaria sempre em 0 (valor inicial do estado local) até o admin
  // editar manualmente.
  useEffect(() => {
    if (settings) setMinOrderValue(settings.minOrderValue);
  }, [settings]);

  const isDirty = settings ? minOrderValue !== settings.minOrderValue : false;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-400 shadow-lg shadow-indigo-500/20">
          <Settings2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Regras de Despacho</h3>
          <p className="text-sm text-gray-500 dark:text-white/40">
            Parâmetros que controlam quais pedidos são sinalizados para o gestor
          </p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
        <Label htmlFor="min-order-value" className="text-sm font-semibold">
          Valor Mínimo do Pedido
        </Label>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <CurrencyInput
            value={minOrderValue}
            onChange={setMinOrderValue}
            className="h-10 max-w-xs"
          />
        )}

        <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Pedidos de cliente (delivery ou manual) com valor abaixo deste limite são marcados
          automaticamente como "Abaixo do mínimo" em todo o módulo Frota. Deixe em R$ 0,00 para
          desativar a regra. Pedidos de abastecimento entre franquias não são afetados.
        </p>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => updateSettings.mutate({ minOrderValue })}
            disabled={!isDirty || isLoading || updateSettings.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
