import { useStore } from '@/contexts/StoreContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store } from 'lucide-react';

export function StoreSelector() {
  const { currentStore, stores, switchStore, isLoading } = useStore();

  if (isLoading || stores.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4">
      <Store className="w-4 h-4 text-muted-foreground" />
      <Select
        value={currentStore?.id}
        onValueChange={switchStore}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione uma loja" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
