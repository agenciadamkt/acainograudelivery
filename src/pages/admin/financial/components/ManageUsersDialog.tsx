'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, Trash2, Users, ShieldCheck, ShieldAlert, Crown } from 'lucide-react';

interface ManageUsersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ManageUsersDialog({ open, onOpenChange }: ManageUsersDialogProps) {
    const queryClient = useQueryClient();
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'operator'>('operator');

    // Fetch authorized users
    const { data: users, isLoading } = useQuery({
        queryKey: ['financial_users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('financial_users' as any)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as any[];
        },
        enabled: open,
    });

    // Add user mutation
    const addMutation = useMutation({
        mutationFn: async () => {
            if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) throw new Error('Preencha nome, email e senha');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            // 1. Cria a conta no sistema de Autenticação com a senha providenciada
            const { error: authError } = await supabase.auth.signUp({
                email: newEmail.trim().toLowerCase(),
                password: newPassword,
                options: {
                    data: { full_name: newName.trim() }
                }
            });

            if (authError && !authError.message.includes('already registered')) {
                throw new Error(authError.message);
            }

            // 2. Confirma o e-mail secretamente no banco para o usuário logar imediatamente 
            await supabase.rpc('confirm_user_email', { user_email: newEmail.trim().toLowerCase() });

            // 3. Cadastra na lista de permissões financeiras
            const { error } = await supabase
                .from('financial_users' as any)
                .insert({
                    email: newEmail.trim().toLowerCase(),
                    name: newName.trim(),
                    role: newRole,
                    active: true,
                    created_by: user.id,
                });

            if (error) {
                if (error.code === '23505') throw new Error('Este email já está cadastrado');
                throw error;
            }
        },
        onSuccess: () => {
            toast.success(`${newRole === 'admin' ? 'Administrador' : 'Funcionário'} cadastrado(a) com acesso liberado!`);
            queryClient.invalidateQueries({ queryKey: ['financial_users'] });
            queryClient.invalidateQueries({ queryKey: ['financial_access'] });
            setNewEmail('');
            setNewName('');
            setNewPassword('');
            setNewRole('operator');
        },
        onError: (error) => toast.error(error.message),
    });

    // Toggle active mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase
                .from('financial_users' as any)
                .update({ active: !active })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Status atualizado');
            queryClient.invalidateQueries({ queryKey: ['financial_users'] });
            queryClient.invalidateQueries({ queryKey: ['financial_access'] });
        },
        onError: (error: any) => toast.error('Erro: ' + error.message),
    });

    // Change role mutation
    const changeRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: string; role: string }) => {
            const { error } = await supabase
                .from('financial_users' as any)
                .update({ role })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Permissão atualizada');
            queryClient.invalidateQueries({ queryKey: ['financial_users'] });
            queryClient.invalidateQueries({ queryKey: ['financial_access'] });
        },
        onError: (error: any) => toast.error('Erro: ' + error.message),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('financial_users' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Usuário removido');
            queryClient.invalidateQueries({ queryKey: ['financial_users'] });
            queryClient.invalidateQueries({ queryKey: ['financial_access'] });
        },
        onError: (error: any) => toast.error('Erro: ' + error.message),
    });

    const getRoleBadge = (role: string) => {
        if (role === 'admin') {
            return (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 text-[10px] gap-1">
                    <Crown className="h-3 w-3" /> Admin
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400 gap-1">
                <ShieldCheck className="h-3 w-3" /> Operador
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                        <Users className="h-5 w-5 text-indigo-500" />
                        Gerenciar Equipe Financeira
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-white/40">
                        Cadastre admins e operadores para o módulo financeiro.
                    </DialogDescription>
                </DialogHeader>

                {/* Add new user form */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-100 dark:border-white/10 space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-white/70 flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Adicionar Membro
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="emp-name" className="text-xs text-gray-500">Nome</Label>
                            <Input
                                id="emp-name"
                                placeholder="Maria Silva"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        <div>
                            <Label htmlFor="emp-email" className="text-xs text-gray-500">Email (login)</Label>
                            <Input
                                id="emp-email"
                                type="email"
                                placeholder="maria@email.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        <div>
                            <Label htmlFor="emp-password" className="text-xs text-gray-500">Criar Senha</Label>
                            <Input
                                id="emp-password"
                                type="text"
                                placeholder="Senha provisória"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500">Permissão</Label>
                            <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'operator')}>
                                <SelectTrigger className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">
                                        <span className="flex items-center gap-1.5">
                                            <Crown className="h-3.5 w-3.5 text-amber-500" /> Admin
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="operator">
                                        <span className="flex items-center gap-1.5">
                                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Operador
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        onClick={() => addMutation.mutate()}
                        disabled={addMutation.isPending || !newEmail.trim() || !newName.trim() || !newPassword.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        size="sm"
                    >
                        {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Adicionar
                    </Button>
                </div>

                {/* List of authorized users */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-6 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                            Carregando...
                        </div>
                    ) : users?.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            Nenhum membro cadastrado ainda.
                        </div>
                    ) : (
                        users?.map((u: any) => (
                            <div
                                key={u.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${u.active
                                    ? 'bg-white dark:bg-white/[0.03] border-gray-100 dark:border-white/10'
                                    : 'bg-gray-50 dark:bg-white/[0.01] border-gray-100 dark:border-white/5 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : u.active
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                            : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/30'
                                        }`}>
                                        {u.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                                        <p className="text-xs text-gray-400">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Role badge - clickable to toggle */}
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => changeRoleMutation.mutate({
                                            id: u.id,
                                            role: u.role === 'admin' ? 'operator' : 'admin'
                                        })}
                                        title={`Clique para alternar para ${u.role === 'admin' ? 'Operador' : 'Admin'}`}
                                    >
                                        {getRoleBadge(u.role)}
                                    </div>

                                    {/* Active/Inactive badge */}
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] cursor-pointer ${u.active
                                            ? 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400'
                                            : 'border-gray-200 text-gray-400 dark:border-white/10 dark:text-white/30'
                                            }`}
                                        onClick={() => toggleMutation.mutate({ id: u.id, active: u.active })}
                                        title={u.active ? 'Clique para desativar' : 'Clique para ativar'}
                                    >
                                        {u.active ? 'Ativo' : 'Inativo'}
                                    </Badge>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                        onClick={() => {
                                            if (confirm(`Remover ${u.name} do módulo financeiro?`)) {
                                                deleteMutation.mutate(u.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Info footer */}
                <div className="text-xs text-gray-400 dark:text-white/30 bg-gray-50 dark:bg-white/[0.03] p-3 rounded-lg border border-gray-100 dark:border-white/[0.06] space-y-2">
                    <div className="flex items-start gap-2">
                        <Crown className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <span><strong className="text-amber-600 dark:text-amber-400">Admin</strong> — Acesso total: cria, edita, aprova, rejeita, cancela e gerencia equipe</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <span><strong className="text-blue-600 dark:text-blue-400">Operador</strong> — Cria, edita e visualiza lançamentos. <em>Não pode</em> aprovar, rejeitar ou cancelar</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
