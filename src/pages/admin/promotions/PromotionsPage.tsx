import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Percent,
    DollarSign,
    Gift,
    Calendar,
    Tag,
    Edit,
    Trash2,
    Copy,
    Ticket,
    TrendingUp,
    Clock,
} from 'lucide-react';
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, useTogglePromotionStatus, Promotion, PromotionInput } from '@/hooks/usePromotions';
import { toast } from 'sonner';

const initialFormState: PromotionInput = {
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: null,
    max_discount: null,
    coupon_code: null,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    active: true,
    usage_limit: null,
    applies_to: 'all',
    target_ids: null,
};

export default function PromotionsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<PromotionInput>(initialFormState);

    const { data: promotions, isLoading } = usePromotions();
    const createPromotion = useCreatePromotion();
    const updatePromotion = useUpdatePromotion();
    const deletePromotion = useDeletePromotion();
    const toggleStatus = useTogglePromotionStatus();

    const handleOpenCreate = () => {
        setEditingPromotion(null);
        setFormData(initialFormState);
        setDialogOpen(true);
    };

    const handleOpenEdit = (promotion: Promotion) => {
        setEditingPromotion(promotion);
        setFormData({
            name: promotion.name,
            description: promotion.description,
            discount_type: promotion.discount_type,
            discount_value: promotion.discount_value,
            min_order_value: promotion.min_order_value,
            max_discount: promotion.max_discount,
            coupon_code: promotion.coupon_code,
            start_date: promotion.start_date.split('T')[0],
            end_date: promotion.end_date?.split('T')[0] || null,
            active: promotion.active,
            usage_limit: promotion.usage_limit,
            applies_to: promotion.applies_to,
            target_ids: promotion.target_ids,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.discount_value) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        try {
            if (editingPromotion) {
                await updatePromotion.mutateAsync({ id: editingPromotion.id, ...formData });
            } else {
                await createPromotion.mutateAsync(formData);
            }
            setDialogOpen(false);
            setFormData(initialFormState);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        await deletePromotion.mutateAsync(deletingId);
        setDeleteDialogOpen(false);
        setDeletingId(null);
    };

    const handleCopyCoupon = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success('Cupom copiado!');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const getDiscountDisplay = (promo: Promotion) => {
        switch (promo.discount_type) {
            case 'percentage':
                return `${promo.discount_value}%`;
            case 'fixed':
                return formatCurrency(promo.discount_value);
            case 'buy_x_get_y':
                return `Leve ${promo.discount_value}, Pague ${promo.discount_value - 1}`;
            default:
                return promo.discount_value;
        }
    };

    const getDiscountIcon = (type: string) => {
        switch (type) {
            case 'percentage':
                return <Percent className="h-4 w-4" />;
            case 'fixed':
                return <DollarSign className="h-4 w-4" />;
            case 'buy_x_get_y':
                return <Gift className="h-4 w-4" />;
            default:
                return <Tag className="h-4 w-4" />;
        }
    };

    const isExpired = (endDate: string | null) => {
        if (!endDate) return false;
        return new Date(endDate) < new Date();
    };

    const activePromotions = promotions?.filter(p => p.active && !isExpired(p.end_date)) || [];
    const totalUsage = promotions?.reduce((sum, p) => sum + p.usage_count, 0) || 0;

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Promoções</h1>
                <p className="text-muted-foreground">Gerencie cupons e descontos</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Promoções</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{promotions?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Cadastradas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ativas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activePromotions.length}</div>
                        <p className="text-xs text-muted-foreground">Em vigor agora</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usos Totais</CardTitle>
                        <Ticket className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{totalUsage}</div>
                        <p className="text-xs text-muted-foreground">Cupons utilizados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Com Cupom</CardTitle>
                        <Ticket className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {promotions?.filter(p => p.coupon_code).length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Promoções com código</p>
                    </CardContent>
                </Card>
            </div>

            {/* Header with Add Button */}
            <div className="flex justify-between items-center mb-6">
                <div />
                <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Promoção
                </Button>
            </div>

            {/* Promotions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Todas as Promoções</CardTitle>
                    <CardDescription>Lista de promoções e cupons cadastrados</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : promotions && promotions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Promoção</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Desconto</TableHead>
                                    <TableHead>Cupom</TableHead>
                                    <TableHead>Validade</TableHead>
                                    <TableHead>Usos</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promotions.map((promo) => (
                                    <TableRow key={promo.id} className={isExpired(promo.end_date) ? 'opacity-50' : ''}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{promo.name}</p>
                                                {promo.description && (
                                                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                        {promo.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getDiscountIcon(promo.discount_type)}
                                                <span className="text-sm capitalize">
                                                    {promo.discount_type === 'percentage' ? 'Porcentagem' :
                                                        promo.discount_type === 'fixed' ? 'Valor Fixo' : 'Leve X Pague Y'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono">
                                                {getDiscountDisplay(promo)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {promo.coupon_code ? (
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-muted px-2 py-1 rounded text-sm">
                                                        {promo.coupon_code}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleCopyCoupon(promo.coupon_code!)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Automático</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(promo.start_date)}
                                                {promo.end_date && (
                                                    <>
                                                        <span>→</span>
                                                        <span className={isExpired(promo.end_date) ? 'text-destructive' : ''}>
                                                            {formatDate(promo.end_date)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {promo.usage_count}
                                                {promo.usage_limit && (
                                                    <span className="text-muted-foreground">/{promo.usage_limit}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={promo.active && !isExpired(promo.end_date)}
                                                disabled={isExpired(promo.end_date)}
                                                onCheckedChange={(checked) =>
                                                    toggleStatus.mutate({ id: promo.id, active: checked })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEdit(promo)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setDeletingId(promo.id);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Tag className="h-12 w-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">Nenhuma promoção cadastrada</h3>
                            <p className="text-sm mb-4">Crie sua primeira promoção para atrair mais clientes</p>
                            <Button onClick={handleOpenCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Promoção
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPromotion ? 'Atualize os dados da promoção' : 'Crie uma nova promoção ou cupom'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Promoção *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Desconto de Verão"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição da promoção..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Desconto</Label>
                                <Select
                                    value={formData.discount_type}
                                    onValueChange={(v: any) => setFormData({ ...formData, discount_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                        <SelectItem value="buy_x_get_y">Leve X Pague Y</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discount_value">
                                    {formData.discount_type === 'percentage' ? 'Porcentagem (%)' :
                                        formData.discount_type === 'fixed' ? 'Valor (R$)' : 'Quantidade'}
                                </Label>
                                <Input
                                    id="discount_value"
                                    type="number"
                                    value={formData.discount_value}
                                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="coupon_code">Código do Cupom (opcional)</Label>
                            <Input
                                id="coupon_code"
                                value={formData.coupon_code || ''}
                                onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() || null })}
                                placeholder="Ex: VERAO2024"
                                className="uppercase"
                            />
                            <p className="text-xs text-muted-foreground">
                                Deixe vazio para aplicar automaticamente
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                                <Input
                                    id="min_order_value"
                                    type="number"
                                    value={formData.min_order_value || ''}
                                    onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value ? Number(e.target.value) : null })}
                                    placeholder="Opcional"
                                    min={0}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_discount">Desconto Máximo (R$)</Label>
                                <Input
                                    id="max_discount"
                                    type="number"
                                    value={formData.max_discount || ''}
                                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? Number(e.target.value) : null })}
                                    placeholder="Opcional"
                                    min={0}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Data Início *</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end_date">Data Fim</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={formData.end_date || ''}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="usage_limit">Limite de Usos</Label>
                            <Input
                                id="usage_limit"
                                type="number"
                                value={formData.usage_limit || ''}
                                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? Number(e.target.value) : null })}
                                placeholder="Ilimitado"
                                min={0}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="active"
                                checked={formData.active}
                                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                            />
                            <Label htmlFor="active">Promoção ativa</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createPromotion.isPending || updatePromotion.isPending}
                        >
                            {createPromotion.isPending || updatePromotion.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Promoção</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta promoção? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
