'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import DistributionCenterSelect from './DistributionCenterSelect';
import CostCenterSelect from './CostCenterSelect';
import ChartOfAccountsSelect from './ChartOfAccountsSelect';
import CurrencyInput from './CurrencyInput';
import { Checkbox } from '@/components/ui/checkbox';
import SupplierSelect from './SupplierSelect';

const formSchema = z.object({
    distribution_center_id: z.string().min(1, 'Selecione o CD'),
    expense_type: z.enum(['fixed', 'variable', 'investment']),
    expense_date: z.string().min(1, 'Data do lançamento é obrigatória'),
    due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
    amount: z.coerce.number().positive('Valor deve ser maior que 0'),
    purpose: z.string().min(1, 'Informe a finalidade'),
    cost_center_id: z.string().min(1, 'Selecione o centro de custos'),
    chart_of_accounts_id: z.string().min(1, 'Selecione o plano de contas'),
    supplier_id: z.string().optional().nullable(),
    notes: z.string().optional(),
    paid_with_cash_balance: z.boolean().default(false),
    paid: z.boolean().default(false),
    receipt_url: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record?: any;
    onSuccess: () => void;
}

export default function ExpenseFormDialog({ open, onOpenChange, record, onSuccess }: ExpenseFormDialogProps) {
    const queryClient = useQueryClient();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            distribution_center_id: '',
            expense_type: 'fixed',
            expense_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            amount: 0,
            purpose: '',
            cost_center_id: '',
            chart_of_accounts_id: '',
            supplier_id: '',
            notes: '',
            paid_with_cash_balance: false,
            paid: false,
            receipt_url: '',
        },
    });

    const [isUploading, setIsUploading] = useState(false);

    // Watch for cascading resets
    const watchCD = form.watch('distribution_center_id');
    const watchCC = form.watch('cost_center_id');

    useEffect(() => {
        if (record) {
            form.reset({
                distribution_center_id: record.distribution_center_id || '',
                expense_type: record.expense_type || 'fixed',
                expense_date: record.expense_date || new Date().toISOString().split('T')[0],
                due_date: record.due_date || record.expense_date || new Date().toISOString().split('T')[0],
                amount: Number(record.amount) || 0,
                purpose: record.purpose || '',
                cost_center_id: record.cost_center_id || '',
                chart_of_accounts_id: record.chart_of_accounts_id || '',
                supplier_id: record.supplier_id || '',
                notes: record.notes || '',
                paid_with_cash_balance: record.paid_with_cash_balance || false,
                paid: record.paid || false,
                receipt_url: record.receipt_url || '',
            });
        } else {
            form.reset({
                distribution_center_id: '',
                expense_type: 'fixed',
                expense_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                amount: 0,
                purpose: '',
                cost_center_id: '',
                chart_of_accounts_id: '',
                supplier_id: '',
                notes: '',
                paid_with_cash_balance: false,
                paid: false,
                receipt_url: '',
            });
        }
    }, [record, form, open]);

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const payload = {
                ...values,
                created_by: user.id,
            };

            if (record) {
                const { error } = await supabase
                    .from('expenses' as any)
                    .update(payload)
                    .eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('expenses' as any)
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(record ? 'Despesa atualizada!' : 'Despesa lançada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            onSuccess();
        },
        onError: (error) => {
            toast.error('Erro ao salvar: ' + error.message);
        },
    });

    const onSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        const maxMB = 10;
        if (file.size > maxMB * 1024 * 1024) {
            toast.error(`Arquivo muito grande. Máximo ${maxMB}MB.`);
            return;
        }

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { data, error } = await supabase.storage
                .from('financial_receipts')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('financial_receipts')
                .getPublicUrl(filePath);

            form.setValue('receipt_url', publicUrl);
            toast.success('Comprovante anexado com sucesso!');
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Erro no upload: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const typeLabels: Record<string, string> = {
        fixed: 'Fixa',
        variable: 'Variável',
        investment: 'Investimento',
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        {record ? 'Editar Despesa' : 'Nova Despesa'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* CD */}
                        <FormField
                            control={form.control}
                            name="distribution_center_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Centro de Distribuição</FormLabel>
                                    <FormControl>
                                        <DistributionCenterSelect
                                            value={field.value}
                                            onChange={(val) => {
                                                field.onChange(val);
                                                // Reset cost center and chart when CD changes
                                                form.setValue('cost_center_id', '');
                                                form.setValue('chart_of_accounts_id', '');
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Type + Date */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="expense_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="fixed">Fixa</SelectItem>
                                                <SelectItem value="variable">Variável</SelectItem>
                                                <SelectItem value="investment">Investimento</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="expense_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data Lanç.</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="due_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vencimento</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Paid with Cash Balance & Paid Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="paid"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-gray-50 dark:bg-white/5">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={(checked) => {
                                                    field.onChange(checked);
                                                    if (checked) {
                                                        // If marked as paid, default to paying with cash balance?
                                                        // Actually, let's keep them independent unless user wants auto-link.
                                                        // For now, just set the status.
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leadin-none">
                                            <FormLabel>
                                                Já está pago?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="paid_with_cash_balance"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leadin-none">
                                            <FormLabel>
                                                Pago com Saldo em Dinheiro
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Amount + Purpose */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (R$)</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                value={Number(field.value) || 0}
                                                onChange={(num) => field.onChange(num)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="purpose"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Finalidade</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Pagamento de fornecedor" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Supplier Selection */}
                        <FormField
                            control={form.control}
                            name="supplier_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fornecedor (Obrigatório para registro)</FormLabel>
                                    <FormControl>
                                        <SupplierSelect
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            placeholder="Selecione ou cadastre o fornecedor..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Cost Center */}
                        <FormField
                            control={form.control}
                            name="cost_center_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Centro de Custos</FormLabel>
                                    <FormControl>
                                        <CostCenterSelect
                                            value={field.value}
                                            onChange={(val) => {
                                                field.onChange(val);
                                                // Reset chart when cost center changes
                                                form.setValue('chart_of_accounts_id', '');
                                            }}
                                            distributionCenterId={watchCD}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Chart of Accounts */}
                        <FormField
                            control={form.control}
                            name="chart_of_accounts_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plano de Contas</FormLabel>
                                    <FormControl>
                                        <ChartOfAccountsSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            costCenterId={watchCC}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalhes adicionais..."
                                            className="resize-none"
                                            rows={2}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Receipt Upload */}
                        <FormField
                            control={form.control}
                            name="receipt_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Comprovante (Opcional)</FormLabel>
                                    <div className="space-y-2">
                                        {!field.value ? (
                                            <div className="relative">
                                                <Input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    disabled={isUploading}
                                                    className="hidden"
                                                    id="receipt-upload"
                                                    accept="image/*,application/pdf"
                                                />
                                                <label
                                                    htmlFor="receipt-upload"
                                                    className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-all text-sm text-gray-500 dark:text-white/40"
                                                >
                                                    {isUploading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Paperclip className="h-4 w-4" />
                                                    )}
                                                    {isUploading ? 'Enviando...' : 'Anexar comprovante'}
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center">
                                                        {field.value.includes('.pdf') ? (
                                                            <FileText className="h-4 w-4 text-violet-600" />
                                                        ) : (
                                                            <ImageIcon className="h-4 w-4 text-violet-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-violet-700 dark:text-violet-300">Comprovante anexado</p>
                                                        <a href={field.value} target="_blank" rel="noreferrer" className="text-[10px] text-violet-500 hover:underline">
                                                            Visualizar anexo
                                                        </a>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => form.setValue('receipt_url', '')}
                                                    className="h-8 w-8 p-0 text-violet-400 hover:text-red-500"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {record ? 'Atualizar Despesa' : 'Salvar Despesa'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
