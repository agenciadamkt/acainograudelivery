'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    UploadCloud,
    Sparkles,
    Trash2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Search
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ClientSelect } from './ClientSelect';
import { PaymentMethodSelect } from './PaymentMethodSelect';
import AccountSelect from './AccountSelect';
import DistributionCenterSelect from './DistributionCenterSelect';
import { format } from 'date-fns';

interface BatchItem {
    id: string;
    file: File;
    status: 'uploading' | 'analyzing' | 'ready' | 'error';
    progress: number;
    error?: string;
    data?: {
        amount: string;
        date: string;
        payer_name: string;
        tid: string;
        bank: string;
        type: string;
        client_id?: string;
        payment_method_id?: string;
        evidence_url?: string;
    };
}

interface BatchOCRDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BatchOCRDialog({ open, onOpenChange, onSuccess }: BatchOCRDialogProps) {
    const [items, setItems] = useState<BatchItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [globalAccountId, setGlobalAccountId] = useState('');
    const [globalDCId, setGlobalDCId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const handleFiles = (files: FileList | null) => {
        if (!files) return;

        const newItems: BatchItem[] = Array.from(files).map(file => ({
            id: Math.random().toString(36).substring(2) + Date.now(),
            file,
            status: 'uploading',
            progress: 0
        }));

        setItems(prev => [...prev, ...newItems]);
    };

    // Robust Sequential Queue Handler
    useEffect(() => {
        const processNext = async () => {
            if (isProcessing) return;

            const nextItem = items.find(item => item.status === 'uploading');
            if (!nextItem) return;

            setIsProcessing(true);
            try {
                await processItemWithRetry(nextItem);
                // Safe 3s delay between files
                await new Promise(resolve => setTimeout(resolve, 3000));
                setIsProcessing(false);
            } catch (error) {
                console.error('Queue error:', error);
            } finally {
                setIsProcessing(false);
            }
        };

        processNext();
    }, [items, isProcessing]);

    const testConnection = async () => {
        try {
            // Bypass supabase-js invoke due to 404 routing issues in some environments
            const url = `https://sixzfcpdjtnftacuwvph.functions.supabase.co/ocr-receipt`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabase.auth.getSession ? (await supabase.auth.getSession()).data.session?.access_token : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                },
                body: JSON.stringify({ ping: true })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro na conexão');

            alert('Conexão com IA: OK! ' + (data.message || 'Pronta para uso.'));
        } catch (error: any) {
            console.error('Ping error:', error);
            alert('Falha crítica na conexão: ' + (error.message || String(error)));
        }
    };

    const processItemWithRetry = async (item: BatchItem, attempt = 1) => {
        try {
            await processItem(item);
        } catch (error: any) {
            console.error(`Attempt ${attempt} for ${item.file.name}:`, error);

            // Detailed error extraction for better UX
            const status = error.status || 500;
            let detailedMsg = error.message;

            // Handle Supabase Invoke Error context
            if (error.context?.error) {
                try {
                    const ctx = typeof error.context.error === 'string' ? JSON.parse(error.context.error) : error.context.error;
                    detailedMsg = ctx.error || ctx.message || detailedMsg;
                } catch (e) {
                    detailedMsg = String(error.context.error);
                }
            }

            if (status === 429 && attempt < 3) {
                const retryDelay = 15000;
                setItems(prev => prev.map(i =>
                    i.id === item.id ? { ...i, status: 'error', error: `Limite do Google atingido. Aguardando 15s para tentar novamente... (Tentativa ${attempt}/3)` } : i
                ));
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return processItemWithRetry(item, attempt + 1);
            }

            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, status: 'error', error: `Erro ${status}: ${detailedMsg}` } : i
            ));
            throw error;
        }
    };

    const processItem = async (item: BatchItem) => {
        // 1. Upload to Storage
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('financial_evidence')
            .upload(filePath, item.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('financial_evidence')
            .getPublicUrl(filePath);

        setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, status: 'analyzing', progress: 50 } : i
        ));

        // 2. Compress and Convert to Base64 (Essential for stability)
        const fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (item.file.type.includes('pdf')) {
                    resolve((e.target?.result as string).split(',')[1]);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX = 1200;
                    if (width > MAX || height > MAX) {
                        if (width > height) { height *= MAX / width; width = MAX; }
                        else { width *= MAX / height; height = MAX; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(item.file);
        });

        // 3. OCR Analysis (Direct Fetch Bypass)
        const url = `https://sixzfcpdjtnftacuwvph.functions.supabase.co/ocr-receipt`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabase.auth.getSession ? (await supabase.auth.getSession()).data.session?.access_token : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
            },
            body: JSON.stringify({
                fileBase64,
                contentType: item.file.type.includes('pdf') ? 'application/pdf' : 'image/jpeg'
            })
        });

        const ocrData = await response.json();
        if (!response.ok) {
            // Provide full detail from server for diagnostic clarity
            const errorMessage = ocrData.details || ocrData.error || ocrData.message || `Erro ${response.status}`;
            const err = new Error(errorMessage) as any;
            err.status = response.status;
            err.details = ocrData.details;
            throw err;
        }

        const data = ocrData.data; // Standardized contract

        // 4. Fuzzy Match Client & Payment Method
        let matchedClientId = undefined;
        let matchedAccountId = undefined;

        if (data.payer_name) {
            const { data: clients } = await supabase
                .from('financial_clients' as any)
                .select('id, name')
                .ilike('name', `%${data.payer_name.split(' ')[0]}%`)
                .limit(1);

            if (clients && clients.length > 0) {
                matchedClientId = (clients as any[])[0].id;
            }
        }

        let pixMethodId = undefined;
        const { data: methods } = await supabase
            .from('financial_payment_methods' as any)
            .select('id')
            .ilike('name', '%pix%')
            .limit(1);

        if (methods && methods.length > 0) {
            pixMethodId = (methods as any[])[0].id;
        }

        setItems(prev => prev.map(i =>
            i.id === item.id ? {
                ...i,
                status: 'ready',
                progress: 100,
                data: {
                    amount: data.amount?.toString() || '',
                    date: data.date || format(new Date(), 'yyyy-MM-dd'),
                    payer_name: data.payer_name || '',
                    tid: data.tid || '',
                    bank: data.bank || '',
                    type: data.type || 'PIX',
                    client_id: matchedClientId,
                    payment_method_id: pixMethodId,
                    evidence_url: urlData.publicUrl
                }
            } : i
        ));
    };

    const handleSaveAll = async () => {
        const readyItems = items.filter(i => i.status === 'ready' && i.data);
        if (readyItems.length === 0) return;

        if (!globalAccountId || !globalDCId) {
            toast.error("Selecione a Conta e o CD antes de salvar.");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(`Salvando ${readyItems.length} lançamentos...`);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const inserts = readyItems.map(item => {
                const d = item.data!;
                return {
                    amount: Number(d.amount),
                    transaction_date: d.date,
                    client_id: d.client_id,
                    payment_method_id: d.payment_method_id,
                    distribution_center_id: globalDCId,
                    account_id: globalAccountId,
                    user_id: user.id,
                    created_by_email: user.email,
                    description: `PAGADOR: ${d.payer_name}\nBANCO: ${d.bank}\nTID: ${d.tid}`.trim(),
                    evidence_url: d.evidence_url,
                    transaction_type: 'write_off', // Default for receipts
                    status: 'pending'
                };
            });

            const { data: insertedData, error } = await supabase
                .from('financial_records' as any)
                .insert(inserts)
                .select('id');

            if (error) throw error;

            // Log Audit for each record
            if (insertedData) {
                const auditLogs = (insertedData as any[]).map(record => ({
                    record_id: record.id,
                    user_id: user.id,
                    action: 'create',
                    new_status: 'pending'
                }));
                await supabase.from('financial_audit_logs' as any).insert(auditLogs);
            }

            toast.success(`${readyItems.length} lançamentos criados com sucesso!`, { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['financial_records'] });
            onOpenChange(false);
            setItems([]);
            if (onSuccess) onSuccess();

        } catch (error: any) {
            toast.error("Erro ao salvar lote: " + error.message, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const retryFailedItems = () => {
        setItems(prev => prev.map(item =>
            item.status === 'error' ? { ...item, status: 'uploading', error: undefined, progress: 0 } : item
        ));
    };

    const updateItemData = (id: string, field: string, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id && item.data) {
                return { ...item, data: { ...item.data, [field]: value } };
            }
            return item;
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10 p-0">
                <DialogHeader className="p-6 border-b border-gray-100 dark:border-white/5">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Lançamento em Lote via IA
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                            handleFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    {items.length === 0 ? (
                        <div
                            className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center transition-colors hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UploadCloud className="h-10 w-10 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">Selecione os comprovantes</p>
                                    <p className="text-sm text-gray-500 dark:text-white/40">Arraste vários arquivos ou clique para buscar</p>
                                </div>
                                <Button
                                    className="bg-purple-600 hover:bg-purple-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    Selecionar Arquivos
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {items.length} {items.length === 1 ? 'Arquivo' : 'Arquivos'} selecionados
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={testConnection}
                                        className="text-xs border-violet-500/30 text-violet-600 hover:bg-violet-50"
                                    >
                                        Testar Conexão IA
                                    </Button>
                                    {items.some(i => i.status === 'error') && (
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setItems(prev => prev.map(i => i.status === 'error' ? { ...i, status: 'uploading' } : i));
                                        }}>
                                            Reprocessar Falhas
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                        Adicionar mais
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/50 dark:bg-purple-900/5 p-4 rounded-xl border border-purple-100 dark:border-purple-500/10 mb-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Conta Financeira (Para todos)</label>
                                    <AccountSelect value={globalAccountId} onChange={setGlobalAccountId} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Centro de Distribuição (Para todos)</label>
                                    <DistributionCenterSelect value={globalDCId} onChange={setGlobalDCId} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all",
                                            item.status === 'ready' ? "bg-white dark:bg-white/5 border-emerald-500/20 shadow-sm" :
                                                item.status === 'error' ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/20" :
                                                    "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 animate-pulse"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden flex-shrink-0">
                                                {item.file.type.includes('image') ? (
                                                    <img src={URL.createObjectURL(item.file)} className="h-full w-full object-cover" alt="" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">PDF</div>
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={item.file.name}>
                                                            {item.file.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {item.status === 'uploading' && <Badge variant="secondary" className="text-[10px] h-4">Enviando...</Badge>}
                                                            {item.status === 'analyzing' && <Badge className="bg-purple-100 text-purple-600 border-0 text-[10px] h-4">Analisando com IA...</Badge>}
                                                            {item.status === 'ready' && <Badge className="bg-emerald-100 text-emerald-600 border-0 text-[10px] h-4 flex gap-1"><CheckCircle2 className="h-3 w-3" /> Pronto</Badge>}
                                                            {item.status === 'error' && <Badge variant="destructive" className="text-[10px] h-4 flex gap-1"><AlertCircle className="h-3 w-3" /> Falha</Badge>}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                {item.status === 'ready' && item.data && (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Valor</label>
                                                            <Input
                                                                value={item.data.amount}
                                                                onChange={(e) => updateItemData(item.id, 'amount', e.target.value)}
                                                                className="h-8 text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2 space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cliente / Pagador</label>
                                                            <ClientSelect
                                                                value={item.data.client_id || ''}
                                                                onChange={(cid) => updateItemData(item.id, 'client_id', cid)}
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3 space-y-1 bg-gray-100 dark:bg-white/5 p-2 rounded-lg">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Dados Extraídos</span>
                                                                <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">{item.data.type}</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 truncate italic">
                                                                {item.data.payer_name} • {item.data.bank} • {item.data.tid}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {item.status === 'error' && (
                                                    <p className="text-xs text-red-500 font-medium">Erro: {item.error || 'Não foi possível processar este arquivo.'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex w-full items-center justify-between">
                        <p className="text-xs text-gray-500">
                            {items.filter(i => i.status === 'ready').length} de {items.length} prontos
                        </p>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveAll}
                                disabled={items.filter(i => i.status === 'ready').length === 0 || isSaving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Salvar {items.filter(i => i.status === 'ready').length} Itens
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
