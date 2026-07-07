'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalDistributionCenterSelectProps {
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    className?: string;
}

const MASTER_EMAIL = 'agenciadamkt@gmail.com';

export default function GlobalDistributionCenterSelect({ 
    value, 
    onChange, 
    placeholder = 'Selecionar CD...',
    className
}: GlobalDistributionCenterSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const { data: centers = [], isLoading } = useQuery({
        queryKey: ['global_distribution_centers'],
        queryFn: async () => {
            // Buscamos os CDs ativos - o RLS garantirá o isolamento por franquia
            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) {
                console.error("Erro ao buscar CDs:", error);
                throw error;
            }
            return data as any[];
        },
    });

    const selectedName = centers.find((c: any) => c.id === value)?.name;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 h-10",
                        className
                    )}
                >
                    <span className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        {selectedName || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Buscar CD..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-3 text-sm text-gray-500">
                            {isLoading ? 'Carregando...' : 'Nenhum CD encontrado.'}
                        </CommandEmpty>
                        <CommandGroup>
                            {centers.map((c: any) => (
                                <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => {
                                        onChange(c.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
                                    <Building2 className="mr-2 h-4 w-4 text-gray-400" />
                                    {c.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
