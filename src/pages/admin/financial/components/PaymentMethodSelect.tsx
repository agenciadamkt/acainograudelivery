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
import { Check, ChevronsUpDown, PlusCircle, CreditCard } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface PaymentMethodSelectProps {
    value: string;
    onChange: (value: string, isCredit: boolean) => void;
}

export function PaymentMethodSelect({ value, onChange }: PaymentMethodSelectProps) {
    const [open, setOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // New Method State
    const [newMethodName, setNewMethodName] = useState('');
    const [newMethodIsCredit, setNewMethodIsCredit] = useState(false);

    const queryClient = useQueryClient();

    // Fetch methods
    const { data: methods, isLoading } = useQuery({
        queryKey: ['financial_payment_methods'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('financial_payment_methods' as any)
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    // Create method mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            const slug = newMethodName.toLowerCase().replace(/[^a-z0-9]/g, '_');

            const { data, error } = await supabase
                .from('financial_payment_methods' as any)
                .insert({
                    name: newMethodName,
                    slug: slug,
                    is_credit: newMethodIsCredit,
                    active: true
                })
                .select()
                .single();
            if (error) throw error;
            return data as any;
        },
        onSuccess: (newMethod) => {
            queryClient.invalidateQueries({ queryKey: ['financial_payment_methods'] });
            onChange(newMethod.id, newMethod.is_credit);
            setIsCreateOpen(false);
            setNewMethodName('');
            setNewMethodIsCredit(false);
            toast.success('Forma de pagamento adicionada!');
        },
        onError: (error) => toast.error('Erro ao criar: ' + error.message)
    });

    const selectedMethod = methods?.find(m => m.id === value);

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
                        {selectedMethod ? (
                            <span className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                {selectedMethod.name}
                            </span>
                        ) : "Selecione a forma de pagamento..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar forma de pagamento..." />
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
                                    <PlusCircle className="mr-2 h-3 w-3" />
                                    Cadastrar nova forma
                                </Button>
                            </CommandEmpty>
                            <CommandGroup>
                                {methods?.map((method) => (
                                    <CommandItem
                                        key={method.id}
                                        value={method.name}
                                        onSelect={() => {
                                            onChange(method.id, method.is_credit);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === method.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {method.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
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
                                    <PlusCircle className="mr-2 h-3 w-3" />
                                    Nova Forma de Pagamento
                                </Button>
                            </div>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Nova Forma de Pagamento</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="method-name" className="text-right">
                                Nome
                            </Label>
                            <Input
                                id="method-name"
                                value={newMethodName}
                                onChange={(e) => setNewMethodName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: Vale Refeição"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is-credit" className="text-right">
                                É Crédito?
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Switch
                                    id="is-credit"
                                    checked={newMethodIsCredit}
                                    onCheckedChange={setNewMethodIsCredit}
                                />
                                <span className="text-sm text-muted-foreground">
                                    Habilitar parcelamento (1x-12x)
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !newMethodName}
                        >
                            {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
