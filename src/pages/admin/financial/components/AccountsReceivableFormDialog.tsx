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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import DistributionCenterSelect from './DistributionCenterSelect';
import CurrencyInput from './CurrencyInput';
import { Checkbox } from '@/components/ui/checkbox';
import { ClientSelect } from './ClientSelect';

const formSchema = z.object({
    distribution_center_id: z.string().optional().nullable(),
    client_id: z.string().min(1, 'Selecione ou cadastre um cliente'),
    description: z.string().min(1, 'Informe a descrição/finalidade'),
    amount: z.coerce.number().positive('Valor deve ser maior que 0'),
    due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
    paid: z.boolean().default(false),
    paid_date: z.string().optional().nullable(),
    notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AccountsReceivableFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record?: any;
    onSuccess: () => void;
}

export default function AccountsReceivableFormDialog({ open, onOpenChange, record, onSuccess }: AccountsReceivableFormDialogProps) {
    const queryClient = useQueryClient();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            distribution_center_id: '',
            client_id: '',
            description: '',
            amount: 0,
            due_date: new Date().toISOString().split('T')[0],
            paid: false,
            paid_date: '',
            notes: '',
        },
    });

    useEffect(() => {
        if (record) {
            form.reset({
                distribution_center_id: record.distribution_center_id || '',
                client_id: record.client_id || '',
                description: record.description || '',
                amount: Number(record.amount) || 0,
                due_date: record.due_date ? String(record.due_date).split('T')[0] : new Date().toISOString().split('T')[0],
                paid: record.paid || false,
                paid_date: record.paid_date ? String(record.paid_date).split('T')[0] : '',
                notes: record.notes || '',
            });
        } else {
            form.reset({
                distribution_center_id: '',
                client_id: '',
                description: '',
                amount: 0,
                due_date: new Date().toISOString().split('T')[0],
                paid: false,
                paid_date: '',
                notes: '',
            });
        }
    }, [record, form, open]);

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const payload: any = {
                franchisee_user_id: user.id,
                distribution_center_id: values.distribution_center_id || null,
                client_id: values.client_id,
                description: values.description,
                amount: values.amount,
                due_date: values.due_date,
                paid: values.paid,
                paid_date: values.paid ? (values.paid_date || new Date().toISOString().split('T')[0]) : null,
                notes: values.notes || null,
            };

            if (record) {
                const { error } = await supabase
                    .from('accounts_receivable' as any)
                    .update(payload)
                    .eq('id', record.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('accounts_receivable' as any)
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(record ? 'Conta atualizada!' : 'Conta lançada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['accounts_receivable'] });
            onSuccess();
        },
        onError: (error) => {
            toast.error('Erro ao salvar: ' + error.message);
        },
    });

    const onSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        {record ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="distribution_center_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Centro de Distribuição (Opcional)</FormLabel>
                                    <FormControl>
                                        <DistributionCenterSelect
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="client_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cliente</FormLabel>
                                    <FormControl>
                                        <ClientSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição / Finalidade</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Venda OME, Serviço Mensal..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                name="due_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Vencimento</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 space-y-4">
                            <FormField
                                control={form.control}
                                name="paid"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1">
                                            <FormLabel>
                                                Já foi recebido/pago?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {form.watch('paid') && (
                                <FormField
                                    control={form.control}
                                    name="paid_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data do Recebimento</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalhes adicionais sobre este recebimento..."
                                            className="resize-none"
                                            rows={2}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {record ? 'Atualizar Conta a Receber' : 'Salvar Conta'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
