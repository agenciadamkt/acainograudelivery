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
import { Check, ChevronsUpDown, Plus, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DistributionCenterSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function DistributionCenterSelect({ value, onChange, placeholder = 'Selecionar CD...' }: DistributionCenterSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: centers = [], isLoading } = useQuery({
        queryKey: ['distribution_centers'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .select('*')
                .eq('active', true)
                .or(`franchisee_user_id.in.(${user?.id},97cc4f78-31e6-4113-a8a6-6d14d4166c38),franchisee_user_id.is.null`)
                .order('name');

            if (error) throw error;
            return data as any[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .insert({ name, franchisee_user_id: user?.id })
                .select()
                .single();
            if (error) throw error;
            return data as any;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['distribution_centers'] });
            onChange(data.id);
            setOpen(false);
            toast.success('CD cadastrado!');
        },
        onError: () => toast.error('Erro ao cadastrar CD'),
    });

    const selectedName = centers.find((c: any) => c.id === value)?.name;
    const canCreate = search.trim().length > 1 && !centers.some((c: any) => c.name.toLowerCase() === search.trim().toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 h-9"
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
                        placeholder="Buscar ou cadastrar CD..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-3 text-sm text-gray-500">
                            Nenhum CD encontrado.
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
                                    Cadastrar CD "{search.trim()}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
