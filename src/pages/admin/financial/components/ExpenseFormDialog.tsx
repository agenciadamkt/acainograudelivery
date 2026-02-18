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
import { Loader2 } from 'lucide-react';
import DistributionCenterSelect from './DistributionCenterSelect';
import CostCenterSelect from './CostCenterSelect';
import ChartOfAccountsSelect from './ChartOfAccountsSelect';
import CurrencyInput from './CurrencyInput';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
    distribution_center_id: z.string().min(1, 'Selecione o CD'),
    expense_type: z.enum(['fixed', 'variable', 'investment']),
    expense_date: z.string().min(1, 'Data é obrigatória'),
    amount: z.coerce.number().positive('Valor deve ser maior que 0'),
    purpose: z.string().min(1, 'Informe a finalidade'),
    cost_center_id: z.string().min(1, 'Selecione o centro de custos'),
    chart_of_accounts_id: z.string().min(1, 'Selecione o plano de contas'),
    notes: z.string().optional(),
    paid_with_cash_balance: z.boolean().default(false),
    paid: z.boolean().default(false),
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
            amount: 0,
            purpose: '',
            cost_center_id: '',
            chart_of_accounts_id: '',
            notes: '',
            paid_with_cash_balance: false,
            paid: false,
        },
    });

    // Watch for cascading resets
    const watchCD = form.watch('distribution_center_id');
    const watchCC = form.watch('cost_center_id');

    useEffect(() => {
        if (record) {
            form.reset({
                distribution_center_id: record.distribution_center_id || '',
                expense_type: record.expense_type || 'fixed',
                expense_date: record.expense_date || new Date().toISOString().split('T')[0],
                amount: Number(record.amount) || 0,
                purpose: record.purpose || '',
                cost_center_id: record.cost_center_id || '',
                chart_of_accounts_id: record.chart_of_accounts_id || '',
                notes: record.notes || '',
                paid_with_cash_balance: record.paid_with_cash_balance || false,
                paid: record.paid || false,
            });
        } else {
            form.reset({
                distribution_center_id: '',
                expense_type: 'fixed',
                expense_date: new Date().toISOString().split('T')[0],
                amount: 0,
                purpose: '',
                cost_center_id: '',
                chart_of_accounts_id: '',
                notes: '',
                paid_with_cash_balance: false,
                paid: false,
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

    const typeLabels: Record<string, string> = {
        fixed: 'Fixa',
        variable: 'Variável',
        investment: 'Investimento',
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10">
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
                        <div className="grid grid-cols-2 gap-4">
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
                                        <FormLabel>Data</FormLabel>
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
