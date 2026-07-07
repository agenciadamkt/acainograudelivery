'use client';

import { useEffect, useState, useCallback } from 'react';
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
    DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import {
    Calendar as CalendarIcon,
    Upload,
    X,
    FileText,
    ImageIcon,
    Loader2,
    Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import OperatorSelect from './OperatorSelect';
import DistributionCenterSelect from './DistributionCenterSelect';
import CurrencyInput from './CurrencyInput';

/* ─── Schema ─── */
const formSchema = z.object({
    distribution_center_id: z.string().min(1, 'Selecione o CD'),
    closing_date: z.string().min(1, 'Informe a data'),
    total_sales: z.coerce.number().min(0, 'Valor inválido'),
    operator_id: z.string().min(1, 'Selecione o operador'),
    total_cash: z.coerce.number().min(0, 'Valor inválido'),
    total_expenses: z.coerce.number().min(0, 'Valor inválido'),
    title_settlement: z.coerce.number().min(0, 'Valor inválido'),
    cash_settlement: z.coerce.number().min(0, 'Valor inválido'),
    credit_card_value: z.coerce.number().min(0, 'Valor inválido'),
    debit_card_value: z.coerce.number().min(0, 'Valor inválido'),
    pix_value: z.coerce.number().min(0, 'Valor inválido'),
    credit_moderninha: z.coerce.number().min(0, 'Valor inválido'),
    debit_moderninha: z.coerce.number().min(0, 'Valor inválido'),
    pix_moderninha: z.coerce.number().min(0, 'Valor inválido'),
    credit_cielo: z.coerce.number().min(0, 'Valor inválido'),
    debit_cielo: z.coerce.number().min(0, 'Valor inválido'),
    pix_cielo: z.coerce.number().min(0, 'Valor inválido'),
    online_payment: z.coerce.number().min(0, 'Valor inválido'),
    checked_by_id: z.string().min(1, 'Selecione quem conferiu'),
    account_id: z.string().optional(),
    notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const normalizeOptionalUuid = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

interface CashClosingFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editData?: any;
    readOnly?: boolean;
}

export default function CashClosingFormDialog({ open, onOpenChange, editData, readOnly = false }: CashClosingFormDialogProps) {
    const queryClient = useQueryClient();
    const [files, setFiles] = useState<File[]>([]);
    const [existingDocs, setExistingDocs] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const getDefaultAccountId = useCallback(async () => {
        const { data } = await supabase
            .from('financial_accounts' as any)
            .select('id')
            .eq('name', 'Caixa Geral')
            .eq('active', true)
            .limit(1)
            .maybeSingle();

        return data?.id || null;
    }, []);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            distribution_center_id: '',
            closing_date: format(new Date(), 'yyyy-MM-dd'),
            total_sales: 0,
            operator_id: '',
            total_cash: 0,
            total_expenses: 0,
            title_settlement: 0,
            cash_settlement: 0,
            credit_card_value: 0,
            debit_card_value: 0,
            pix_value: 0,
            credit_moderninha: 0,
            debit_moderninha: 0,
            pix_moderninha: 0,
            credit_cielo: 0,
            debit_cielo: 0,
            pix_cielo: 0,
            online_payment: 0,
            checked_by_id: '',
            account_id: '',
            notes: '',
        },
    });

    // Watch for auto-balance calculation
    const totalCash = form.watch('total_cash');
    const cashSettlement = form.watch('cash_settlement');
    const totalExpenses = form.watch('total_expenses');
    // Balance is total_cash + cash_settlement based on new requirement
    const balance = (Number(totalCash) || 0) + (Number(cashSettlement) || 0);

    useEffect(() => {
        if (editData) {
            form.reset({
                distribution_center_id: editData.distribution_center_id || '',
                closing_date: editData.closing_date || format(new Date(), 'yyyy-MM-dd'),
                total_sales: editData.total_sales || 0,
                operator_id: editData.operator_id || '',
                total_cash: editData.total_cash || 0,
                total_expenses: editData.total_expenses || 0,
                title_settlement: editData.title_settlement || 0,
                cash_settlement: editData.cash_settlement || 0,
                credit_card_value: editData.credit_card_value || 0,
                debit_card_value: editData.debit_card_value || 0,
                pix_value: editData.pix_value || 0,
                credit_moderninha: editData.credit_moderninha || 0,
                debit_moderninha: editData.debit_moderninha || 0,
                pix_moderninha: editData.pix_moderninha || 0,
                credit_cielo: editData.credit_cielo || 0,
                debit_cielo: editData.debit_cielo || 0,
                pix_cielo: editData.pix_cielo || 0,
                online_payment: editData.online_payment || 0,
                checked_by_id: editData.checked_by_id || '',
                account_id: editData.account_id || '',
                notes: editData.notes || '',
            });
            // Load existing documents
            if (editData.id) {
                supabase
                    .from('cash_closing_documents' as any)
                    .select('*')
                    .eq('closing_id', editData.id)
                    .then(({ data }) => setExistingDocs(data || []));
            }
        } else {
            // Fetch Caixa Geral ID for new closings
            form.reset({
                distribution_center_id: '',
                closing_date: format(new Date(), 'yyyy-MM-dd'),
                total_sales: 0,
                operator_id: '',
                total_cash: 0,
                total_expenses: 0,
                title_settlement: 0,
                cash_settlement: 0,
                credit_card_value: 0,
                debit_card_value: 0,
                pix_value: 0,
                credit_moderninha: 0,
                debit_moderninha: 0,
                pix_moderninha: 0,
                credit_cielo: 0,
                debit_cielo: 0,
                pix_cielo: 0,
                online_payment: 0,
                checked_by_id: '',
                account_id: '',
                notes: '',
            });
            getDefaultAccountId().then((accountId) => {
                if (accountId) form.setValue('account_id', accountId);
            });
            setFiles([]);
            setExistingDocs([]);
        }
    }, [editData, open, getDefaultAccountId]);

    /* ── Upload files ── */
    const uploadFiles = async (closingId: string) => {
        const docs: { closing_id: string; file_url: string; file_name: string; file_type: string }[] = [];

        for (const file of files) {
            const ext = file.name.split('.').pop();
            const filePath = `closings/${closingId}/${crypto.randomUUID()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('cash-closing-docs')
                .upload(filePath, file);

            if (uploadError) {
                toast.error(`Erro ao enviar ${file.name}`);
                continue;
            }

            const { data: urlData } = supabase.storage
                .from('cash-closing-docs')
                .getPublicUrl(filePath);

            docs.push({
                closing_id: closingId,
                file_url: urlData.publicUrl,
                file_name: file.name,
                file_type: file.type.startsWith('image') ? 'image' : 'pdf',
            });
        }

        if (docs.length > 0) {
            await supabase.from('cash_closing_documents' as any).insert(docs);
        }
    };

    /* ── Submit ── */
    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            setIsUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const accountId = normalizeOptionalUuid(values.account_id) || await getDefaultAccountId();

            const payload = {
                ...values,
                distribution_center_id: normalizeOptionalUuid(values.distribution_center_id)!,
                operator_id: normalizeOptionalUuid(values.operator_id),
                checked_by_id: normalizeOptionalUuid(values.checked_by_id),
                account_id: accountId,
                created_by: normalizeOptionalUuid(user?.id),
            };

            let closingId: string;

            if (editData?.id) {
                const { error } = await supabase
                    .from('cash_closings' as any)
                    .update(payload)
                    .eq('id', editData.id);
                if (error) throw error;
                closingId = editData.id;
            } else {
                const { data, error } = await supabase
                    .from('cash_closings' as any)
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                closingId = (data as any).id;
            }

            // Upload new files
            if (files.length > 0) {
                await uploadFiles(closingId);
            }

            return closingId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_closings'] });
            queryClient.invalidateQueries({ queryKey: ['financial_dashboard'] });
            toast.success(editData ? 'Fechamento atualizado!' : 'Fechamento registrado!');
            onOpenChange(false);
            setIsUploading(false);
        },
        onError: (error: any) => {
            toast.error('Erro: ' + error.message);
            setIsUploading(false);
        },
    });

    const onSubmit = (values: FormValues) => mutation.mutate(values);

    /* ── File handling ── */
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;
        const newFiles = Array.from(selected).filter(
            (f) => f.type.startsWith('image') || f.type === 'application/pdf'
        );
        setFiles((prev) => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingDoc = async (doc: any) => {
        await supabase.from('cash_closing_documents' as any).delete().eq('id', doc.id);
        setExistingDocs((prev) => prev.filter((d) => d.id !== doc.id));
        toast.success('Documento removido');
    };

    /* ── Currency Input Helper ── */
    const BRLInput = ({ field, placeholder }: { field: any; placeholder?: string }) => (
        <CurrencyInput
            value={Number(field.value) || 0}
            onChange={(num) => field.onChange(num)}
            placeholder={placeholder || '0,00'}
            disabled={readOnly}
            className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 h-9"
        />
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {readOnly && <Eye className="h-5 w-5 text-blue-500" />}
                        {readOnly ? 'Visualizar Fechamento de Caixa' : editData ? 'Editar Fechamento' : 'Novo Fechamento de Caixa'}
                    </DialogTitle>
                </DialogHeader>

                {readOnly && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-lg flex items-center gap-2 text-xs">
                        <Eye className="h-4 w-4 shrink-0" />
                        <span>Modo visualização — nenhuma informação pode ser alterada.</span>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Row 1: CD + Data */}
                        <div className="grid grid-cols-2 gap-4">
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

                            <FormField
                                control={form.control}
                                name="closing_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data</FormLabel>
                                        <Popover open={calendarOpen && !readOnly} onOpenChange={(o) => !readOnly && setCalendarOpen(o)}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        disabled={readOnly}
                                                        className="w-full justify-start text-left font-normal bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 h-9"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                                        {field.value
                                                            ? format(new Date(field.value + 'T12:00:00'), 'dd/MM/yyyy')
                                                            : 'Selecionar data'}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            field.onChange(format(date, 'yyyy-MM-dd'));
                                                            setCalendarOpen(false);
                                                        }
                                                    }}
                                                    locale={ptBR}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 2: Valor Total Vendas */}
                        <FormField
                            control={form.control}
                            name="total_sales"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor total das vendas</FormLabel>
                                    <FormControl>
                                        <BRLInput field={field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Row 3: Operador de Caixa */}
                        <FormField
                            control={form.control}
                            name="operator_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operador de Caixa</FormLabel>
                                    <FormControl>
                                        <OperatorSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Selecionar operador..."
                                            disabled={readOnly}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Row 4: Total Dinheiro + Total Saídas + Saldo */}
                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="total_cash"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Dinheiro</FormLabel>
                                        <FormControl>
                                            <BRLInput field={field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="total_expenses"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Saídas</FormLabel>
                                        <FormControl>
                                            <BRLInput field={field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormItem>
                                <FormLabel>Saldo</FormLabel>
                                <CurrencyInput
                                    value={balance}
                                    onChange={() => { }}
                                    readOnly
                                    disabled={readOnly}
                                    className={`h-9 font-semibold ${balance >= 0
                                        ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30'
                                        : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/30'
                                        }`}
                                />
                            </FormItem>
                        </div>

                        {/* Row 5: Baixa em Título + Baixa em Dinheiro */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="title_settlement"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Baixa em Título</FormLabel>
                                        <p className="text-[10px] text-gray-400 -mt-0.5">Pix, QR Code, Cartão, Transferência</p>
                                        <FormControl>
                                            <BRLInput field={field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cash_settlement"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Baixa em Dinheiro</FormLabel>
                                        <p className="text-[10px] text-gray-400 -mt-0.5">Recebido exclusivamente em dinheiro</p>
                                        <FormControl>
                                            <BRLInput field={field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 6: Formas de Recebimento por Operadora */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/30">Formas de Recebimento</p>

                            {/* Moderninha */}
                            <div className="rounded-lg border border-blue-100 dark:border-blue-900/30 p-3 space-y-2">
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Moderninha</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { name: 'credit_moderninha', label: 'Crédito' },
                                        { name: 'debit_moderninha',  label: 'Débito'  },
                                        { name: 'pix_moderninha',    label: 'Pix QR Code' },
                                    ] as const).map(({ name, label }) => (
                                        <FormField key={name} control={form.control} name={name}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">{label}</FormLabel>
                                                    <FormControl><BRLInput field={field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Cielo */}
                            <div className="rounded-lg border border-orange-100 dark:border-orange-900/30 p-3 space-y-2">
                                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Cielo</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { name: 'credit_cielo', label: 'Crédito' },
                                        { name: 'debit_cielo',  label: 'Débito'  },
                                        { name: 'pix_cielo',    label: 'Pix QR Code' },
                                    ] as const).map(({ name, label }) => (
                                        <FormField key={name} control={form.control} name={name}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">{label}</FormLabel>
                                                    <FormControl><BRLInput field={field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Online */}
                            <FormField control={form.control} name="online_payment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-purple-600 dark:text-purple-400">Pagamento Online</FormLabel>
                                        <FormControl><BRLInput field={field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 7: Upload de Documentos */}
                        <div className="space-y-2">
                            <FormLabel>Envio de documentos</FormLabel>
                            {!readOnly && (
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-lg p-4 text-center hover:border-purple-400 dark:hover:border-purple-500/40 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="doc-upload"
                                    />
                                    <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        <Upload className="h-8 w-8 text-gray-300 dark:text-white/20" />
                                        <span className="text-sm text-gray-500 dark:text-white/40">
                                            Clique para selecionar <strong>PDFs</strong> ou <strong>Imagens</strong>
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Existing docs */}
                            {existingDocs.length > 0 && (
                                <div className="space-y-1">
                                    {existingDocs.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                {doc.file_type === 'pdf' ? (
                                                    <FileText className="h-4 w-4 text-red-400 shrink-0" />
                                                ) : (
                                                    <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                                )}
                                                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline truncate">
                                                    {doc.file_name}
                                                </a>
                                            </div>
                                            {!readOnly && (
                                                <button type="button" onClick={() => removeExistingDoc(doc)} className="text-gray-400 hover:text-red-500">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New files */}
                            {files.length > 0 && (
                                <div className="space-y-1">
                                    {files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                {file.type === 'application/pdf' ? (
                                                    <FileText className="h-4 w-4 text-red-400 shrink-0" />
                                                ) : (
                                                    <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                                )}
                                                <span className="truncate text-gray-700 dark:text-white/70">{file.name}</span>
                                            </div>
                                            <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Row 7: Conferido por */}
                        <FormField
                            control={form.control}
                            name="checked_by_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conferido por</FormLabel>
                                    <FormControl>
                                        <OperatorSelect
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Selecionar conferente..."
                                            disabled={readOnly}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Row 8: Observações */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Observações opcionais..."
                                            disabled={readOnly}
                                            className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 min-h-[60px]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="border-gray-200 dark:border-white/10"
                            >
                                {readOnly ? 'Fechar' : 'Cancelar'}
                            </Button>
                            {!readOnly && (
                                <Button
                                    type="submit"
                                    disabled={mutation.isPending || isUploading}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {(mutation.isPending || isUploading) && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {editData ? 'Salvar' : 'Registrar Fechamento'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
