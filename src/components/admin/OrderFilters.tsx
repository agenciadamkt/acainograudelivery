import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface OrderFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    order_type?: string;
    date_from?: string;
    date_to?: string;
  }) => void;
}

export function OrderFilters({ onFilterChange }: OrderFiltersProps) {
  const [status, setStatus] = useState<string>('all');
  const [orderType, setOrderType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const handleApply = () => {
    onFilterChange({
      status: status !== 'all' ? status : undefined,
      order_type: orderType !== 'all' ? orderType : undefined,
      date_from: dateFrom?.toISOString(),
      date_to: dateTo?.toISOString(),
    });
  };

  const handleClear = () => {
    setStatus('all');
    setOrderType('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    onFilterChange({});
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="preparing">Em Preparo</SelectItem>
            <SelectItem value="ready">Pronto</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Tipo</label>
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="pickup">Retirada</SelectItem>
            <SelectItem value="dine_in">Mesa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Data inicial</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Data final</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button onClick={handleApply}>Filtrar</Button>
      <Button variant="outline" onClick={handleClear}>
        <X className="w-4 h-4 mr-2" />
        Limpar
      </Button>
    </div>
  );
}
