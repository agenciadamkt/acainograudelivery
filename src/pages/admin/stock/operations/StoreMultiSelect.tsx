/**
 * Filtro multi-loja para o painel operacional — um gerente pode acompanhar uma
 * ou mais unidades ao mesmo tempo. Mantém sempre ≥1 loja selecionada.
 */

import { Store as StoreIcon, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface StoreOpt { id: string; name: string }

export function StoreMultiSelect({
  stores, selected, onChange, className,
}: {
  stores: StoreOpt[];
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  const allIds = stores.map((s) => s.id);
  const allSelected = stores.length > 0 && selected.length === stores.length;
  const label = allSelected
    ? 'Todas as lojas'
    : selected.length === 1
      ? (stores.find((s) => s.id === selected[0])?.name ?? '1 loja')
      : selected.length === 0 ? 'Nenhuma loja' : `${selected.length} lojas`;

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm ${className ?? 'w-[190px]'}`}>
          <StoreIcon className="h-4 w-4 shrink-0 text-purple-500" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[250px] p-2">
        <button
          onClick={() => onChange(allSelected ? [] : allIds)}
          className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5"
        >
          <Checkbox checked={allSelected} /> {allSelected ? 'Desmarcar todas' : 'Todas as lojas'}
        </button>
        <div className="max-h-60 space-y-0.5 overflow-y-auto border-t border-gray-100 pt-1 dark:border-white/10">
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Checkbox checked={selected.includes(s.id)} />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
