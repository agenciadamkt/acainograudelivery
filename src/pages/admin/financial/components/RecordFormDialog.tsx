'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UploadCloud, Camera, CheckCircle2, Sparkles, FileSearch } from 'lucide-react';
import { PaymentMethodSelect } from './PaymentMethodSelect';
import { ClientSelect } from './ClientSelect';
import { cn } from '@/lib/utils';
import DistributionCenterSelect from './DistributionCenterSelect';
import AccountSelect from './AccountSelect';
import CurrencyInput from './CurrencyInput';

const formSchema = z.object({
    distribution_center_id: z.string().min(1, 'Selecione o CD'),
    account_id: z.string().min(1, 'Selecione a conta'),
    client_id: z.string().min(1, 'Selecione um cliente'),
    transaction_date: z.string().min(1, 'Data é obrigatória'),
    transaction_type: z.enum(['sale', 'write_off', 'other']),
    amount: z.string().min(1, 'Valor é obrigatório'),
    payment_method_id: z.string().optional(),
    installments: z.coerce.number().min(1).optional(),
    order_number: z.string().optional(),
    description: z.string().optional(),
    evidence_url: z.string().optional(),
});

interface RecordFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record?: any; // If editing
    onSuccess: () => void;
    readOnly?: boolean;
}

export function RecordFormDialog({ open, onOpenChange, record, onSuccess, readOnly = false }: RecordFormDialogProps) {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCreditMethod, setIsCreditMethod] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            distribution_center_id: '',
            account_id: '',
            transaction_type: 'sale',
            transaction_date: new Date().toISOString().split('T')[0],
            amount: '',
            order_number: '',
            description: '',
        }
    });

    useEffect(() => {
        if (record) {
            form.reset({
                distribution_center_id: record.distribution_center_id || '',
                account_id: record.account_id || '',
                client_id: record.client_id,
                transaction_date: record.transaction_date,
                transaction_type: record.transaction_type,
                amount: record.amount.toString(),
                order_number: record.order_number || '',
                description: record.description || '',
                evidence_url: record.evidence_url || '',
                payment_method_id: record.payment_method_id || '',
                installments: record.installments || 1,
            });
            // Heuristic: If we have > 1 installments, it's credit. 
            // Or ideally we should fetch the method type.
            setIsCreditMethod((record.installments && record.installments > 1) || false);
        } else {
            form.reset({
                distribution_center_id: '',
                transaction_type: 'sale',
                transaction_date: new Date().toISOString().split('T')[0],
                amount: '',
                order_number: '',
                description: '',
            });
        }
    }, [record, form, open]);

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const payload: any = {
                ...values,
                user_id: user.id,
                created_by_email: user.email,
                status: 'pending' // Always start as pending
            };

            if (record) {
                // Update
                const { error } = await supabase
                    .from('financial_records' as any)
                    .update(payload)
                    .eq('id', record.id);
                if (error) throw error;

                // Log Audit
                await supabase.from('financial_audit_logs' as any).insert({
                    record_id: record.id,
                    user_id: user.id,
                    action: 'update',
                    justification: 'Edição de registro',
                    previous_status: record.status,
                    new_status: 'pending'
                });
            } else {
                // Create
                const { data, error } = await supabase
                    .from('financial_records' as any)
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;

                // Log Audit
                await supabase.from('financial_audit_logs' as any).insert({
                    record_id: (data as any).id,
                    user_id: user.id,
                    action: 'create',
                    new_status: 'pending'
                });
            }
        },
        onSuccess: () => {
            toast.success(record ? 'Registro atualizado!' : 'Lançamento realizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['financial_records'] });
            onSuccess();
        },
        onError: (error) => {
            toast.error('Erro ao salvar: ' + error.message);
        }
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        mutation.mutate(values);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to 'financial_evidence' bucket
            const { error: uploadError } = await supabase.storage
                .from('financial_evidence')
                .upload(filePath, file);

            if (uploadError) {
                // If bucket doesn't exist, try creating it (admin only usually) or handle error
                console.error("Upload error:", uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('financial_evidence')
                .getPublicUrl(filePath);

            if (data?.publicUrl) {
                form.setValue('evidence_url', data.publicUrl);
                toast.success("Comprovante anexado!");
                return { url: data.publicUrl, file };
            }
        } catch (error: any) {
            console.error("Erro detalhado upload:", error);
            toast.error('Erro no upload: ' + (error.message || "Verifique permissões do bucket"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Upload first (standard flow)
        const uploadResult = await handleUpload(e);
        if (!uploadResult) return;

        setIsAnalyzing(true);
        const toastId = toast.loading("Analisando comprovante com IA...");

        try {
            // 2. Convert to Base64 for OCR
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
            });
            reader.readAsDataURL(file);
            const fileBase64 = await base64Promise;

            // 3. Call Edge Function
            const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-receipt', {
                body: { fileBase64, contentType: file.type }
            });

            if (ocrError) throw ocrError;

            // 4. Fill form fields
            if (ocrData.amount) form.setValue('amount', ocrData.amount.toString());
            if (ocrData.date) form.setValue('transaction_date', ocrData.date);

            let observation = "";
            if (ocrData.payer_name) observation += `Pagador: ${ocrData.payer_name}\n`;
            if (ocrData.bank) observation += `Banco: ${ocrData.bank}\n`;
            if (ocrData.tid) observation += `ID Transação: ${ocrData.tid}`;
            form.setValue('description', observation);

            // 5. Try identifying PIX method
            const { data: methodsData } = await supabase
                .from('financial_payment_methods' as any)
                .select('id, name')
                .ilike('name', '%pix%');

            const methods = methodsData as any[];

            if (methods && methods.length > 0) {
                form.setValue('payment_method_id', methods[0].id);
            }

            // 6. Try identifying Client (Fuzzy Search)
            if (ocrData.payer_name) {
                const { data: clientsData } = await supabase
                    .from('financial_clients' as any)
                    .select('id, name')
                    .ilike('name', `%${ocrData.payer_name.split(' ')[0]}%`);

                const clients = clientsData as any[];

                if (clients && clients.length > 0) {
                    form.setValue('client_id', clients[0].id);
                    toast.success(`Cliente identificado: ${clients[0].name}`, { id: toastId });
                } else {
                    toast.info("Comprovante lido! Selecione o cliente manualmente.", { id: toastId });
                }
            } else {
                toast.success("Comprovante lido com sucesso!", { id: toastId });
            }

        } catch (error: any) {
            console.error("OCR Error:", error);
            toast.error("Não foi possível ler o comprovante automaticamente.", { id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        {readOnly ? (
                            <>
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </span>
                                Visualizar Lançamento
                            </>
                        ) : record ? 'Editar Lançamento' : 'Novo Lançamento'}
                    </DialogTitle>
                </DialogHeader>

                {readOnly && (
                    <div className="mx-0 mb-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Modo visualização — nenhum campo pode ser alterado.
                    </div>
                )}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="transaction_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} disabled={readOnly} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="transaction_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="sale">Venda</SelectItem>
                                                <SelectItem value="write_off">Baixa de Título</SelectItem>
                                                <SelectItem value="other">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Centro de Distribuição */}
                        <FormField
                            control={form.control}
                            name="distribution_center_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Centro de Distribuição</FormLabel>
                                    <FormControl>
                                        <DistributionCenterSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            disabled={readOnly}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Conta Financeira */}
                        <FormField
                            control={form.control}
                            name="account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conta Financeira</FormLabel>
                                    <FormControl>
                                        <AccountSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            disabled={readOnly}
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
                                    <FormLabel>Cliente / Pagador</FormLabel>
                                    <FormControl>
                                        <ClientSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            disabled={readOnly}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className={isCreditMethod ? "grid grid-cols-2 gap-4" : ""}>
                            <FormField
                                control={form.control}
                                name="payment_method_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Forma de Pagamento</FormLabel>
                                        <FormControl>
                                            <PaymentMethodSelect
                                                value={field.value || ''}
                                                onChange={(val, isCredit) => {
                                                    if (readOnly) return;
                                                    field.onChange(val);
                                                    if (!isCredit) {
                                                        form.setValue('installments', 1);
                                                    }
                                                    setIsCreditMethod(isCredit);
                                                }}
                                                disabled={readOnly}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {isCreditMethod && (
                                <FormField
                                    control={form.control}
                                    name="installments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Parcelas</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value?.toString()}
                                                defaultValue="1"
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="1x" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {[...Array(12)].map((_, i) => (
                                                        <SelectItem key={i} value={(i + 1).toString()}>
                                                            {i + 1}x {i === 0 ? '(À vista)' : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

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
                                                onChange={(num) => field.onChange(String(num))}
                                                disabled={readOnly}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="order_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº Pedido (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 12345" {...field} disabled={readOnly} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observação</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Detalhes da transação..." {...field} disabled={readOnly} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!readOnly && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="border-2 border-dashed border-purple-200 dark:border-purple-500/20 rounded-lg p-3 text-center cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-colors relative group">
                                <Input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={handleOCR}
                                    disabled={isAnalyzing || isUploading}
                                />
                                <div className="flex flex-col items-center gap-1 text-purple-600 dark:text-purple-400">
                                    {isAnalyzing ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">Escanear IA</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative">
                                <Input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleUpload}
                                    disabled={isUploading || isAnalyzing}
                                />
                                <div className="flex flex-col items-center gap-1 text-gray-500">
                                    {isUploading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <UploadCloud className="h-5 w-5" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">Anexo Manual</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}
                        {form.watch('evidence_url') && (
                            <div className="flex items-center justify-between text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100 dark:border-emerald-900/20">
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Comprovante anexado
                                </div>
                                <a
                                    href={form.watch('evidence_url')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-emerald-700"
                                >
                                    Visualizar
                                </a>
                            </div>
                        )}

                        {!readOnly && (
                        <DialogFooter>
                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Lançamento'}
                            </Button>
                        </DialogFooter>
                        )}
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
