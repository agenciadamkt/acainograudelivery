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
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ClientSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
    const [open, setOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const queryClient = useQueryClient();

    // Fetch clients
    const { data: clients, isLoading } = useQuery({
        queryKey: ['financial_clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('financial_clients' as any)
                .select('*')
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    // Create client mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const { data, error } = await supabase
                .from('financial_clients' as any)
                .insert({
                    name: newClientName,
                    phone: newClientPhone,
                    created_by: user.id
                })
                .select()
                .single();
            if (error) throw error;
            return data as any;
        },
        onSuccess: (newClient) => {
            queryClient.invalidateQueries({ queryKey: ['financial_clients'] });
            onChange(newClient.id); // Auto-select the new client
            setIsCreateOpen(false);
            setNewClientName('');
            setNewClientPhone('');
            toast.success('Cliente cadastrado com sucesso!');
        },
        onError: (error) => toast.error('Erro ao cadastrar: ' + error.message)
    });

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {value
                            ? clients?.find((client: any) => client.id === value)?.name
                            : "Selecione um cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                            <CommandEmpty className="py-2 px-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-xs"
                                    onClick={() => {
                                        setOpen(false);
                                        setIsCreateOpen(true);
                                    }}
                                >
                                    <UserPlus className="mr-2 h-3 w-3" />
                                    Cadastrar novo cliente
                                </Button>
                            </CommandEmpty>
                            <CommandGroup>
                                {clients?.map((client: any) => (
                                    <CommandItem
                                        key={client.id}
                                        value={client.name}
                                        onSelect={() => {
                                            onChange(client.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === client.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {client.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            {/* Always show create option at bottom */}
                            <div className="p-1 border-t border-gray-100 dark:border-white/5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-8"
                                    onClick={() => {
                                        setOpen(false);
                                        setIsCreateOpen(true);
                                    }}
                                >
                                    <UserPlus className="mr-2 h-3 w-3" />
                                    Novo Cliente
                                </Button>
                            </div>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Novo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nome
                            </Label>
                            <Input
                                id="name"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">
                                Telefone
                            </Label>
                            <Input
                                id="phone"
                                value={newClientPhone}
                                onChange={(e) => setNewClientPhone(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !newClientName}
                        >
                            {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
