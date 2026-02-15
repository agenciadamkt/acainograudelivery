'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record?: any;
    type: 'approve' | 'reject' | 'cancel' | null;
    onSuccess: () => void;
}

export function ActionDialog({ open, onOpenChange, record, type, onSuccess }: ActionDialogProps) {
    const [justification, setJustification] = useState('');
    const queryClient = useQueryClient();

    const isApprove = type === 'approve';
    const isReject = type === 'reject';
    const isCancel = type === 'cancel';

    const mutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            let newStatus = '';
            let actionName = '';

            if (isApprove) { newStatus = 'approved'; actionName = 'approve'; }
            else if (isReject) { newStatus = 'rejected'; actionName = 'reject'; }
            else if (isCancel) { newStatus = 'cancelled'; actionName = 'cancel'; } // 'cancelled' to match Status type in DB check

            // Update record
            const { error } = await supabase
                .from('financial_records' as any)
                .update({ status: newStatus })
                .eq('id', record.id);
            if (error) throw error;

            // Log Audit
            await supabase.from('financial_audit_logs' as any).insert({
                record_id: record.id,
                user_id: user.id,
                action: actionName,
                justification: justification || (isApprove ? 'Aprovação manual' : 'Sem justificativa'),
                previous_status: record.status,
                new_status: newStatus
            });
        },
        onSuccess: () => {
            toast.success(`Registro ${isApprove ? 'aprovado' : isReject ? 'rejeitado' : 'cancelado'} com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['financial_records'] });
            onSuccess();
            setJustification('');
        },
        onError: (error) => toast.error('Erro na ação: ' + error.message)
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {isApprove && 'Confirmar Aprovação'}
                        {isReject && 'Rejeitar Lançamento'}
                        {isCancel && 'Cancelar Lançamento'}
                    </DialogTitle>
                    <DialogDescription>
                        {isApprove && 'Confirma o recebimento deste valor? Esta ação não pode ser desfeita facilmente.'}
                        {isReject && 'Tem certeza que deseja rejeitar este lançamento?'}
                        {isCancel && 'Deseja realmente cancelar este registro?'}
                    </DialogDescription>
                </DialogHeader>

                {!isApprove && (
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="justification">Justificativa (Obrigatório)</Label>
                        <Textarea
                            id="justification"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Ex: Valor incorreto..."
                        />
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                        Voltar
                    </Button>
                    <Button
                        variant={isApprove ? 'default' : 'destructive'}
                        className={isApprove ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || (!isApprove && !justification)}
                    >
                        {mutation.isPending ? 'Processando...' : 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
