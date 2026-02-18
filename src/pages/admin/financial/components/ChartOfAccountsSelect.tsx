'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChartOfAccountsSelectProps {
    value: string;
    onChange: (value: string) => void;
    costCenterId?: string; // Filter by cost center
    placeholder?: string;
}

export default function ChartOfAccountsSelect({ value, onChange, costCenterId, placeholder = 'Selecionar plano de contas...' }: ChartOfAccountsSelectProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [newName, setNewName] = useState('');

    const { data: items = [] } = useQuery({
        queryKey: ['chart_of_accounts', costCenterId],
        queryFn: async () => {
            let query = supabase
                .from('chart_of_accounts' as any)
                .select('*')
                .eq('active', true)
                .order('name');

            if (costCenterId) {
                query = query.eq('cost_center_id', costCenterId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as any[];
        },
        enabled: !!costCenterId,
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            if (!costCenterId) {
                throw new Error('Selecione um centro de custos antes');
            }
            const { data, error } = await supabase
                .from('chart_of_accounts' as any)
                .insert({ name, cost_center_id: costCenterId })
                .select()
                .single();
            if (error) throw error;
            return data as any;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
            onChange(data.id);
            setNewName('');
            setOpen(false);
            toast.success('Plano de contas cadastrado!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao cadastrar');
        },
    });

    const selected = items.find((i: any) => i.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal text-left"
                    disabled={!costCenterId}
                >
                    <span className="flex items-center gap-2 truncate">
                        <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                        {selected ? selected.name : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Buscar..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="flex flex-col items-center gap-2 p-3">
                                <p className="text-xs text-gray-400">Nenhum encontrado</p>
                                <div className="flex items-center gap-2 w-full">
                                    <input
                                        className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 outline-none"
                                        placeholder="Nome da conta"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newName.trim()) {
                                                e.preventDefault();
                                                createMutation.mutate(newName.trim());
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        disabled={!newName.trim() || createMutation.isPending}
                                        onClick={() => createMutation.mutate(newName.trim())}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {items.map((item: any) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={() => {
                                        onChange(item.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} />
                                    {item.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {items.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <div className="flex items-center gap-2 px-2 py-2">
                                        <input
                                            className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 outline-none"
                                            placeholder="Novo plano de contas..."
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newName.trim()) {
                                                    e.preventDefault();
                                                    createMutation.mutate(newName.trim());
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            disabled={!newName.trim() || createMutation.isPending}
                                            onClick={() => createMutation.mutate(newName.trim())}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
