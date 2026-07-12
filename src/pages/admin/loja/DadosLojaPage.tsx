import { StoreSettingsTab } from '@/pages/admin/settings/StoreSettingsTab';
import { Building2 } from 'lucide-react';

/**
 * Dados da Loja — página de autoatendimento do franqueado para editar os dados
 * básicos da unidade (nome, endereço, telefones, horários, etc.) sem depender
 * do administrador. Reaproveita o StoreSettingsTab, que já persiste na loja
 * atual (useStore + useUpdateStore).
 */
export default function DadosLojaPage() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dados da Loja</h1>
          <p className="text-sm text-muted-foreground">
            Atualize as informações públicas da sua unidade.
          </p>
        </div>
      </div>

      <StoreSettingsTab />
    </div>
  );
}
