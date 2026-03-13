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

interface SupplierSelectProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SupplierSelect({ value, onChange, placeholder = "Selecione um fornecedor..." }: SupplierSelectProps) {
    const [open, setOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<any>(null);
    const [supplierName, setSupplierName] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const queryClient = useQueryClient();
    const { data: franchiseeId } = useFranchiseeId();

    // Fetch suppliers
    const { data: suppliers, isLoading } = useQuery({
        queryKey: ['financial_suppliers', franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];
            const { data, error } = await supabase
                .from('financial_suppliers' as any)
                .select('*')
                .eq('franchisee_user_id', franchiseeId)
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const payload = {
                name: supplierName,
                phone: supplierPhone,
                franchisee_user_id: franchiseeId,
                created_by: user.id
            };

            if (editingSupplier) {
                // Update
                const { data, error } = await supabase
                    .from('financial_suppliers' as any)
                    .update({
                        name: supplierName,
                        phone: supplierPhone
                    })
                    .eq('id', editingSupplier.id)
                    .select()
                    .single();
                if (error) throw error;
                return { data, action: 'updated' };
            } else {
                // Create
                const { data, error } = await supabase
                    .from('financial_suppliers' as any)
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                return { data, action: 'created' };
            }
        },
        onSuccess: ({ data, action }) => {
            const supplierData = data as any;
            queryClient.invalidateQueries({ queryKey: ['financial_suppliers'] });
            if (action === 'created') {
                onChange(supplierData.id);
            }
            setIsDialogOpen(false);
            setSupplierName('');
            setSupplierPhone('');
            setEditingSupplier(null);
            toast.success(action === 'created' ? 'Fornecedor cadastrado!' : 'Fornecedor atualizado!');
        },
        onError: (error: any) => toast.error('Erro ao salvar: ' + error.message)
    });

    // Delete supplier mutation
    const deleteMutation = useMutation({
        mutationFn: async (supplierId: string) => {
            const { error } = await supabase
                .from('financial_suppliers' as any)
                .delete()
                .eq('id', supplierId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_suppliers'] });
            if (value === supplierToDelete?.id) {
                onChange(''); // Clear selection if deleted
            }
            setIsDeleteDialogOpen(false);
            setSupplierToDelete(null);
            toast.success('Fornecedor excluído com sucesso!');
        },
        onError: (error) => toast.error('Erro ao excluir: ' + error.message)
    });

    const handleEdit = (supplier: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSupplier(supplier);
        setSupplierName(supplier.name);
        setSupplierPhone(supplier.phone || '');
        setIsDialogOpen(true);
        setOpen(false);
    };

    const handleDeleteClick = (supplier: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setSupplierToDelete(supplier);
        setIsDeleteDialogOpen(true);
        setOpen(false);
    }

    const handleNew = () => {
        setEditingSupplier(null);
        setSupplierName('');
        setSupplierPhone('');
        setIsDialogOpen(true);
        setOpen(false);
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm h-10"
                    >
                        {value
                            ? suppliers?.find((s: any) => s.id === value)?.name
                            : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-white/20 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90">
                    <Command>
                        <CommandInput placeholder="Buscar fornecedor..." />
                        <div className="p-1 border-b border-gray-100 dark:border-white/5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10"
                                onClick={handleNew}
                            >
                                <UserPlus className="mr-2 h-3.5 w-3.5" />
                                Cadastrar novo fornecedor
                            </Button>
                        </div>
                        <CommandList>
                            <CommandEmpty className="py-2 px-2 text-xs text-gray-400">
                                Nenhum fornecedor encontrado.
                            </CommandEmpty>
                            <CommandGroup>
                                {suppliers?.map((s: any) => (
                                    <CommandItem
                                        key={s.id}
                                        value={s.name}
                                        onSelect={() => {
                                            onChange(s.id);
                                            setOpen(false);
                                        }}
                                        className="flex items-center justify-between group"
                                    >
                                        <div className="flex items-center truncate max-w-[180px]">
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    value === s.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => handleEdit(s, e)}
                                                title="Editar"
                                            >
                                                <Pencil className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => handleDeleteClick(s, e)}
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
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-sm font-medium text-gray-700 dark:text-white/70">
                                Nome
                            </Label>
                            <Input
                                id="name"
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                className="col-span-3 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                placeholder="Nome do fornecedor"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right text-sm font-medium text-gray-700 dark:text-white/70">
                                Telefone
                            </Label>
                            <Input
                                id="phone"
                                value={supplierPhone}
                                onChange={(e) => setSupplierPhone(e.target.value)}
                                className="col-span-3 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                placeholder="Telefone (opcional)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !supplierName}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {saveMutation.isPending ? 'Salvando...' : (editingSupplier ? 'Atualizar' : 'Cadastrar')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <DialogHeader>
                        <DialogTitle>Excluir Fornecedor</DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-white/40">
                            Tem certeza que deseja excluir <strong>{supplierToDelete?.name}</strong>?
                            Essa ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(supplierToDelete.id)}
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

export default SupplierSelect;
