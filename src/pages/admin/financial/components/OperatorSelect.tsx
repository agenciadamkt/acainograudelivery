'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFranchiseeId } from '@/hooks/useFranchiseeId';

interface OperatorSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function OperatorSelect({ value, onChange, placeholder = 'Selecionar...' }: OperatorSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();
    const { data: franchiseeId } = useFranchiseeId();

    const { data: operators = [], isLoading } = useQuery({
        queryKey: ['cash_operators'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cash_operators' as any)
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data as any[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase
                .from('cash_operators' as any)
                .insert({ name, franchisee_user_id: franchiseeId })
                .select()
                .single();
            if (error) throw error;
            return data as any;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['cash_operators'] });
            onChange(data.id);
            setOpen(false);
            toast.success('Operador cadastrado!');
        },
        onError: () => toast.error('Erro ao cadastrar operador'),
    });

    const selectedName = operators.find((o: any) => o.id === value)?.name;
    const canCreate = search.trim().length > 1 && !operators.some((o: any) => o.name.toLowerCase() === search.trim().toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 h-9"
                >
                    {selectedName || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Buscar ou cadastrar..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-3 text-sm text-gray-500">
                            Nenhum encontrado.
                        </CommandEmpty>
                        <CommandGroup>
                            {operators.map((op: any) => (
                                <CommandItem
                                    key={op.id}
                                    value={op.name}
                                    onSelect={() => {
                                        onChange(op.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', value === op.id ? 'opacity-100' : 'opacity-0')} />
                                    {op.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {canCreate && (
                            <CommandGroup heading="Cadastro rápido">
                                <CommandItem
                                    onSelect={() => createMutation.mutate(search.trim())}
                                    className="text-purple-600 dark:text-purple-400"
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4" />
                                    )}
                                    Cadastrar "{search.trim()}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
