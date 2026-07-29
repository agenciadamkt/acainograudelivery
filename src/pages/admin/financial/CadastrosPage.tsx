'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Building2,
    UserCheck,
    Layers,
    BookOpen,
    Plus,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Loader2,
    Users,
    Wallet,
    Landmark,
    PiggyBank,
    Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DistributionCenterSelect from './components/DistributionCenterSelect';
import CostCenterSelect from './components/CostCenterSelect';
import { ManageUsersDialog } from './components/ManageUsersDialog';
import MetasPage from './MetasPage';
import { useFranchiseeId } from '@/hooks/useFranchiseeId';

/* ─── Generic CRUD Section (for simple name-only entities) ─── */
function CrudSection({
    title,
    icon: Icon,
    tableName,
    queryKey,
}: {
    title: string;
    icon: any;
    tableName: string;
    queryKey: string;
}) {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const hasAddress = tableName === 'distribution_centers';

    const { data: franchiseeId } = useFranchiseeId();

    const { data: items = [], isLoading } = useQuery({
        queryKey: [queryKey, franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];
            const { data, error } = await supabase
                .from(tableName as any)
                .select('*')
                .order('name');
            if (error) throw error;
            return data as any[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: any = { name, franchisee_user_id: franchiseeId };
            if (hasAddress) payload.address = address;

            if (editItem) {
                const { error } = await supabase
                    .from(tableName as any)
                    .update(payload)
                    .eq('id', editItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from(tableName as any)
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success(editItem ? 'Atualizado!' : 'Cadastrado!');
            setDialogOpen(false);
            setEditItem(null);
            setName('');
            setAddress('');
        },
        onError: (e: any) => toast.error('Erro: ' + e.message),
    });

    const toggleMutation = useMutation({
        mutationFn: async (item: any) => {
            const { error } = await supabase
                .from(tableName as any)
                .update({ active: !item.active })
                .eq('id', item.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success('Status atualizado!');
        },
    });

    const openNew = () => {
        setEditItem(null);
        setName('');
        setAddress('');
        setDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setName(item.name);
        setAddress(item.address || '');
        setDialogOpen(true);
    };

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                        <Icon className="h-5 w-5 text-purple-500" />
                        {title}
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openNew}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8"
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {isLoading && (
                        <div className="px-4 py-6 text-center text-gray-400">Carregando...</div>
                    )}
                    {!isLoading && items.length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-400 dark:text-white/30">
                            Nenhum cadastro encontrado
                        </div>
                    )}
                    {items.map((item: any) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.active
                                    ? 'bg-purple-100 dark:bg-purple-900/20'
                                    : 'bg-gray-100 dark:bg-white/5'
                                    }`}>
                                    <Icon className={`h-4 w-4 ${item.active ? 'text-purple-600' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${item.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'
                                        }`}>
                                        {item.name}
                                    </p>
                                    {hasAddress && item.address && (
                                        <p className="text-xs text-gray-400 dark:text-white/30">{item.address}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${item.active
                                        ? 'border-emerald-200 text-emerald-600 dark:border-emerald-800/30 dark:text-emerald-400'
                                        : 'border-gray-200 text-gray-400 dark:border-white/10'
                                        }`}
                                >
                                    {item.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleMutation.mutate(item)}
                                >
                                    {item.active ? (
                                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle>{editItem ? `Editar ${title}` : `Novo ${title}`}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Nome</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={`Nome do ${title.toLowerCase()}`}
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        {hasAddress && (
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Endereço</label>
                                <Input
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Endereço (opcional)"
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!name.trim() || saveMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editItem ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

/* ─── FK-based CRUD Section (for entities with a parent FK) ─── */
function FkCrudSection({
    title,
    icon: Icon,
    tableName,
    queryKey,
    parentFkColumn,
    parentLabel,
    ParentSelect,
}: {
    title: string;
    icon: any;
    tableName: string;
    queryKey: string;
    parentFkColumn: string;
    parentLabel: string;
    ParentSelect: React.ComponentType<{ value: string; onChange: (v: string) => void; placeholder?: string; distributionCenterId?: string }>;
}) {
    const queryClient = useQueryClient();
    const [filterParent, setFilterParent] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');

    // For chart_of_accounts, we also need a distribution_center_id filter on the CostCenterSelect
    const needsCDFilter = tableName === 'chart_of_accounts';
    const [filterCD, setFilterCD] = useState('');

    const { data: franchiseeId } = useFranchiseeId();

    const { data: items = [], isLoading } = useQuery({
        queryKey: [queryKey, filterParent, franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];

            let query = supabase
                .from(tableName as any)
                .select('*, parent_rel:' + parentFkColumn + '(name)')
                .order('name');

            if (filterParent) {
                query = query.eq(parentFkColumn, filterParent);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: any = {
                name,
                [parentFkColumn]: parentId,
                franchisee_user_id: franchiseeId
            };
            if (editItem) {
                const { error } = await supabase
                    .from(tableName as any)
                    .update(payload)
                    .eq('id', editItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from(tableName as any)
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success(editItem ? 'Atualizado!' : 'Cadastrado!');
            setDialogOpen(false);
            setEditItem(null);
            setName('');
            setParentId('');
        },
        onError: (e: any) => toast.error('Erro: ' + e.message),
    });

    const toggleMutation = useMutation({
        mutationFn: async (item: any) => {
            const { error } = await supabase
                .from(tableName as any)
                .update({ active: !item.active })
                .eq('id', item.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success('Status atualizado!');
        },
    });

    const openNew = () => {
        setEditItem(null);
        setName('');
        setParentId(filterParent);
        setDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setName(item.name);
        setParentId(item[parentFkColumn] || '');
        setDialogOpen(true);
    };

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                        <Icon className="h-5 w-5 text-purple-500" />
                        {title}
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openNew}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8"
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>
                {/* Filter by parent */}
                <div className="pt-2">
                    {needsCDFilter && (
                        <div className="mb-2">
                            <label className="text-[11px] text-gray-400 dark:text-white/30 mb-1 block">Filtrar por CD</label>
                            <DistributionCenterSelect
                                followStore
                                value={filterCD}
                                onChange={(v) => { setFilterCD(v); setFilterParent(''); }}
                                placeholder="Todos os CDs"
                            />
                        </div>
                    )}
                    <label className="text-[11px] text-gray-400 dark:text-white/30 mb-1 block">
                        {needsCDFilter ? 'Filtrar por Centro de Custos' : `Filtrar por ${parentLabel}`}
                    </label>
                    <ParentSelect
                        value={filterParent}
                        onChange={setFilterParent}
                        placeholder={`Todos`}
                        distributionCenterId={needsCDFilter ? filterCD : undefined}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {isLoading && (
                        <div className="px-4 py-6 text-center text-gray-400">Carregando...</div>
                    )}
                    {!isLoading && items.length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-400 dark:text-white/30">
                            Nenhum cadastro encontrado
                        </div>
                    )}
                    {items.map((item: any) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.active
                                    ? 'bg-purple-100 dark:bg-purple-900/20'
                                    : 'bg-gray-100 dark:bg-white/5'
                                    }`}>
                                    <Icon className={`h-4 w-4 ${item.active ? 'text-purple-600' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${item.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'
                                        }`}>
                                        {item.name}
                                    </p>
                                    {item.parent_rel && (
                                        <p className="text-xs text-gray-400 dark:text-white/30">
                                            {parentLabel}: {(item.parent_rel as any)?.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${item.active
                                        ? 'border-emerald-200 text-emerald-600 dark:border-emerald-800/30 dark:text-emerald-400'
                                        : 'border-gray-200 text-gray-400 dark:border-white/10'
                                        }`}
                                >
                                    {item.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleMutation.mutate(item)}
                                >
                                    {item.active ? (
                                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[420px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle>{editItem ? `Editar ${title}` : `Novo ${title}`}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">{parentLabel}</label>
                            {needsCDFilter && (
                                <div className="mb-3">
                                    <label className="text-[11px] text-gray-400 dark:text-white/30 mb-1 block">CD</label>
                                    <DistributionCenterSelect
                                        value={filterCD}
                                        onChange={(v) => { setFilterCD(v); setParentId(''); }}
                                        placeholder="Selecione o CD"
                                    />
                                </div>
                            )}
                            <ParentSelect
                                value={parentId}
                                onChange={setParentId}
                                placeholder={`Selecionar ${parentLabel.toLowerCase()}`}
                                distributionCenterId={needsCDFilter ? filterCD : undefined}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Nome</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={`Nome do ${title.toLowerCase()}`}
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!name.trim() || !parentId || saveMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editItem ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

/* ─── Page ─── */
export default function CadastrosPage() {
    const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);

    return (
        <div className="p-4 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cadastros</h1>
                <p className="text-sm text-gray-500 dark:text-white/40">Gerencie CDs, equipe, metas e configurações financeiras</p>
            </div>

            <Tabs defaultValue="geral" className="space-y-6">
                <TabsList className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-1">
                    <TabsTrigger value="geral" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-500/20 dark:data-[state=active]:text-violet-300">
                        Geral
                    </TabsTrigger>
                    <TabsTrigger value="metas" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-500/20 dark:data-[state=active]:text-violet-300">
                        Metas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-6 animate-in slide-in-from-left-2 duration-300 fade-in">
                    {/* Equipe Section */}
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Equipe Financeira</CardTitle>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setIsManageUsersOpen(true)} className="gap-2">
                                    <Users className="h-4 w-4" /> Gerenciar Equipe
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-white/40 mt-1">Cadastre admins e operadores para o módulo financeiro</p>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CrudSection
                            title="Centro de Distribuição"
                            icon={Building2}
                            tableName="distribution_centers"
                            queryKey="distribution_centers"
                        />
                        <CrudSection
                            title="Operador"
                            icon={UserCheck}
                            tableName="cash_operators"
                            queryKey="cash_operators"
                        />
                        <FkCrudSection
                            title="Centro de Custos"
                            icon={Layers}
                            tableName="cost_centers"
                            queryKey="cost_centers"
                            parentFkColumn="distribution_center_id"
                            parentLabel="CD"
                            ParentSelect={DistributionCenterSelect as any}
                        />
                        <FkCrudSection
                            title="Plano de Contas"
                            icon={BookOpen}
                            tableName="chart_of_accounts"
                            queryKey="chart_of_accounts"
                            parentFkColumn="cost_center_id"
                            parentLabel="Centro de Custos"
                            ParentSelect={CostCenterSelect as any}
                        />
                        <AccountsSection />
                        <ClientsSection />
                        <SuppliersSection />
                    </div>
                </TabsContent>

                <TabsContent value="metas" className="animate-in slide-in-from-right-2 duration-300 fade-in">
                    <MetasPage />
                </TabsContent>
            </Tabs>

            {/* Manage Users Dialog */}
            <ManageUsersDialog
                open={isManageUsersOpen}
                onOpenChange={setIsManageUsersOpen}
            />
        </div>
    );
}

function ClientsSection() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const { data: franchiseeId } = useFranchiseeId();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['financial_clients', franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];

            const { data, error } = await supabase
                .from('financial_clients' as any)
                .select(`
                    *,
                    accounts_receivable(amount, paid)
                `)
                .order('name');

            if (error) throw error;
            return data as any[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const payload: any = { name, phone };
            if (!user) throw new Error('User not found');

            if (editItem) {
                const { error } = await supabase
                    .from('financial_clients' as any)
                    .update(payload)
                    .eq('id', editItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('financial_clients' as any)
                    .insert({ ...payload, created_by: franchiseeId });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_clients'] });
            toast.success(editItem ? 'Atualizado!' : 'Cadastrado!');
            setDialogOpen(false);
            setEditItem(null);
            setName('');
            setPhone('');
        },
        onError: (e: any) => toast.error('Erro: ' + e.message),
    });

    const openNew = () => {
        setEditItem(null);
        setName('');
        setPhone('');
        setDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setName(item.name);
        setPhone(item.phone || '');
        setDialogOpen(true);
    };

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                        <Users className="h-5 w-5 text-purple-500" />
                        Clientes / Pagadores
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openNew}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8"
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {isLoading && <div className="px-4 py-6 text-center text-gray-400 font-medium">Carregando...</div>}
                    {!isLoading && items.length === 0 && <div className="px-4 py-6 text-center text-gray-400">Nenhum cliente encontrado</div>}
                    {items.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                    <p className="text-[11px] text-gray-400 dark:text-white/30">{item.phone || 'Sem telefone'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {item.accounts_receivable && item.accounts_receivable.some((r: any) => !r.paid) && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">
                                        R$ {item.accounts_receivable.filter((r: any) => !r.paid).reduce((acc: number, r: any) => acc + Number(r.amount), 0).toFixed(2)} a receber
                                    </span>
                                )}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {items.length > 10 && (
                        <div className="px-4 py-2 text-center">
                            <p className="text-[10px] text-gray-400 italic">E mais {items.length - 10} clientes...</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Nome</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nome do cliente"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Telefone</label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Telefone (opcional)"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!name.trim() || saveMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editItem ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function AccountsSection() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState('cash');

    const { data: franchiseeId } = useFranchiseeId();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['financial_accounts', franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];

            const { data, error } = await supabase
                .from('financial_accounts' as any)
                .select('*')
                .order('name');

            if (error) throw error;
            return data as any[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: any = { name, type, franchisee_user_id: franchiseeId };

            if (editItem) {
                const { error } = await supabase
                    .from('financial_accounts' as any)
                    .update(payload)
                    .eq('id', editItem.id);
                if (error) throw error;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                const { error } = await supabase
                    .from('financial_accounts' as any)
                    .insert({ ...payload, franchisee_user_id: user?.id });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_accounts'] });
            toast.success(editItem ? 'Atualizado!' : 'Cadastrado!');
            setDialogOpen(false);
            setEditItem(null);
            setName('');
            setType('cash');
        },
        onError: (e: any) => toast.error('Erro: ' + e.message),
    });

    const toggleMutation = useMutation({
        mutationFn: async (item: any) => {
            const { error } = await supabase
                .from('financial_accounts' as any)
                .update({ active: !item.active })
                .eq('id', item.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_accounts'] });
            toast.success('Status atualizado!');
        },
    });

    const openNew = () => {
        setEditItem(null);
        setName('');
        setType('cash');
        setDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setName(item.name);
        setType(item.type);
        setDialogOpen(true);
    };

    const getIcon = (t: string) => {
        switch (t) {
            case 'bank': return <Landmark className="h-4 w-4" />;
            case 'reserve': return <PiggyBank className="h-4 w-4" />;
            default: return <Wallet className="h-4 w-4" />;
        }
    };

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                        <Wallet className="h-5 w-5 text-purple-500" />
                        Contas Financeiras
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openNew}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8"
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {isLoading && <div className="px-4 py-6 text-center text-gray-400 font-medium">Carregando...</div>}
                    {!isLoading && items.length === 0 && <div className="px-4 py-6 text-center text-gray-400">Nenhuma conta encontrada</div>}
                    {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors" >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.active ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                                    <div className={item.active ? 'text-purple-600' : 'text-gray-400'}>
                                        {getIcon(item.type)}
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <p className={`text-sm font-medium ${item.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>{item.name}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase font-bold tracking-tighter">{item.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleMutation.mutate(item)}
                                >
                                    {item.active ? (
                                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Nome da Conta</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Banco do Brasil, Reserva Mensal"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Tipo</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['cash', 'bank', 'reserve'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${type === t
                                            ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-500/50 dark:text-purple-300'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-white/40'
                                            }`}
                                    >
                                        {getIcon(t)}
                                        <span className="text-[10px] font-bold uppercase">{t === 'cash' ? 'Caixa' : t === 'bank' ? 'Banco' : 'Reserva'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!name.trim() || saveMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editItem ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function SuppliersSection() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['financial_suppliers'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('financial_suppliers' as any)
                .select(`
                    *,
                    expenses(amount, paid)
                `)
                .order('name');

            if (error) throw error;
            return data as any[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const payload: any = { name, phone };
            if (!user) throw new Error('User not found');

            if (editItem) {
                const { error } = await supabase
                    .from('financial_suppliers' as any)
                    .update(payload)
                    .eq('id', editItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('financial_suppliers' as any)
                    .insert({ ...payload, created_by: user.id, franchisee_user_id: user.id });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial_suppliers'] });
            toast.success(editItem ? 'Atualizado!' : 'Cadastrado!');
            setDialogOpen(false);
            setEditItem(null);
            setName('');
            setPhone('');
        },
        onError: (e: any) => toast.error('Erro: ' + e.message),
    });

    const openNew = () => {
        setEditItem(null);
        setName('');
        setPhone('');
        setDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setName(item.name);
        setPhone(item.phone || '');
        setDialogOpen(true);
    };

    return (
        <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                        <Truck className="h-5 w-5 text-purple-500" />
                        Fornecedores
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openNew}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8"
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {isLoading && <div className="px-4 py-6 text-center text-gray-400 font-medium">Carregando...</div>}
                    {!isLoading && items.length === 0 && <div className="px-4 py-6 text-center text-gray-400">Nenhum fornecedor encontrado</div>}
                    {items.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                                    <Truck className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                    <p className="text-[11px] text-gray-400 dark:text-white/30">{item.phone || 'Sem telefone'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {item.expenses && item.expenses.some((e: any) => !e.paid) && (
                                    <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md">
                                        R$ {item.expenses.filter((e: any) => !e.paid).reduce((acc: number, e: any) => acc + Number(e.amount), 0).toFixed(2)} a pagar
                                    </span>
                                )}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {items.length > 10 && (
                        <div className="px-4 py-2 text-center">
                            <p className="text-[10px] text-gray-400 italic">E mais {items.length - 10} fornecedores...</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/10">
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Nome</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nome do fornecedor"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5 block">Telefone</label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Telefone (opcional)"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!name.trim() || saveMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editItem ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
