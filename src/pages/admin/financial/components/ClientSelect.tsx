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
import { Check, ChevronsUpDown, UserPlus, Pencil, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useFranchiseeId } from '@/hooks/useFranchiseeId';

interface ClientSelectProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function ClientSelect({ value, onChange, disabled = false }: ClientSelectProps) {
    const [open, setOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [clientToDelete, setClientToDelete] = useState<any>(null);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const queryClient = useQueryClient();
    const { data: franchiseeId } = useFranchiseeId();

    // Fetch clients
    const { data: clients, isLoading } = useQuery({
        queryKey: ['financial_clients', franchiseeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('financial_clients' as any)
                .select('*')
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    // Create/Edit client mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            if (editingClient) {
                // Update
                const { data, error } = await supabase
                    .from('financial_clients' as any)
                    .update({
                        name: clientName,
                        phone: clientPhone
                    })
                    .eq('id', editingClient.id)
                    .select()
                    .single();
                if (error) throw error;
                return { data, action: 'updated' };
            } else {
                // Create
                const { data, error } = await supabase
                    .from('financial_clients' as any)
                    .insert({
                        name: clientName,
                        phone: clientPhone,
                        created_by: franchiseeId
                    })
                    .select()
                    .single();
                if (error) throw error;
                return { data, action: 'created' };
            }
        },
        onSuccess: ({ data, action }) => {
            const clientData = data as any;
            queryClient.invalidateQueries({ queryKey: ['financial_clients'] });
            if (action === 'created') {
                onChange(clientData.id);
            }
            setIsDialogOpen(false);
            setClientName('');
            setClientPhone('');
            setEditingClient(null);
            toast.success(action === 'created' ? 'Cliente cadastrado!' : 'Cliente atualizado!');
        },
        onError: (error) => toast.error('Erro ao salvar: ' + error.message)
    });

    // Delete client mutation
    const deleteMutation = useMutation({
        mutationFn: async (clientId: string) => {
            const { error } = await supabase
                .from('financial_clients' as any)
                .delete()
                .eq('id', clientId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_clients'] });
            if (value === clientToDelete?.id) {
                onChange(''); // Clear selection if deleted
            }
            setIsDeleteDialogOpen(false);
            setClientToDelete(null);
            toast.success('Cliente excluído com sucesso!');
        },
        onError: (error) => toast.error('Erro ao excluir: ' + error.message)
    });

    const handleEdit = (client: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingClient(client);
        setClientName(client.name);
        setClientPhone(client.phone || '');
        setIsDialogOpen(true);
        setOpen(false);
    };

    const handleDeleteClick = (client: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setClientToDelete(client);
        setIsDeleteDialogOpen(true);
        setOpen(false);
    }

    const handleNew = () => {
        setEditingClient(null);
        setClientName('');
        setClientPhone('');
        setIsDialogOpen(true);
        setOpen(false);
    };

    return (
        <>
            <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
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
                        <div className="p-1 border-b border-gray-100 dark:border-white/5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10"
                                onClick={handleNew}
                            >
                                <UserPlus className="mr-2 h-3.5 w-3.5" />
                                Cadastrar novo cliente
                            </Button>
                        </div>
                        <CommandList>
                            <CommandEmpty className="py-2 px-2 text-xs text-gray-400">
                                Nenhum cliente encontrado.
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
                                        className="flex items-center justify-between group"
                                    >
                                        <div className="flex items-center truncate max-w-[180px]">
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    value === client.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate">{client.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => handleEdit(client, e)}
                                                title="Editar"
                                            >
                                                <Pencil className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => handleDeleteClick(client, e)}
                                                title="Excluir"
                                            >
                                                <Trash className="h-3 w-3 text-gray-400 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nome
                            </Label>
                            <Input
                                id="name"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">
                                Telefone
                            </Label>
                            <Input
                                id="phone"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !clientName}
                        >
                            {saveMutation.isPending ? 'Salvando...' : (editingClient ? 'Atualizar' : 'Cadastrar')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Excluir Cliente</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir <strong>{clientToDelete?.name}</strong>?
                            Essa ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(clientToDelete.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
