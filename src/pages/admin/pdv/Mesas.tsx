import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Users, X, Check, RotateCcw, ShoppingCart } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
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
    usePdvTables,
    useCreatePdvTable,
    useUpdatePdvTable,
    useDeletePdvTable,
    useCloseTable,
    PdvTable
} from '@/hooks/pdv/usePdvTables';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function Mesas() {
    const navigate = useNavigate();
    const { data: tables, isLoading } = usePdvTables();
    const createTable = useCreatePdvTable();
    const updateTable = useUpdatePdvTable();
    const deleteTable = useDeletePdvTable();
    const closeTable = useCloseTable();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<PdvTable | null>(null);

    // Form state
    const [tableNumber, setTableNumber] = useState<number>(1);
    const [tableCapacity, setTableCapacity] = useState<number>(4);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'free': return 'bg-emerald-50 border-emerald-300 hover:border-emerald-400';
            case 'occupied': return 'bg-rose-50 border-rose-300 hover:border-rose-400';
            case 'reserved': return 'bg-amber-50 border-amber-300 hover:border-amber-400';
            default: return 'bg-white';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'free': return 'bg-emerald-500 text-white';
            case 'occupied': return 'bg-rose-500 text-white';
            case 'reserved': return 'bg-amber-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'free': return 'Livre';
            case 'occupied': return 'Ocupada';
            case 'reserved': return 'Reservada';
            default: return status;
        }
    };

    const handleCreateTable = () => {
        createTable.mutate(
            { number: tableNumber, capacity: tableCapacity },
            {
                onSuccess: () => {
                    setIsCreateDialogOpen(false);
                    setTableNumber(1);
                    setTableCapacity(4);
                }
            }
        );
    };

    const handleEditTable = () => {
        if (!selectedTable) return;
        updateTable.mutate(
            { id: selectedTable.id, number: tableNumber, capacity: tableCapacity },
            {
                onSuccess: () => {
                    setIsEditDialogOpen(false);
                    setSelectedTable(null);
                }
            }
        );
    };

    const handleDeleteTable = () => {
        if (!selectedTable) return;
        deleteTable.mutate(selectedTable.id, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                setSelectedTable(null);
            }
        });
    };

    const handleCloseTable = (table: PdvTable) => {
        closeTable.mutate(table.id);
    };

    const handleTableClick = (table: PdvTable) => {
        if (table.status === 'free') {
            // Navigate to new sale with table context
            navigate(`/admin/pdv/nova-venda?mesa=${table.id}&mesa_numero=${table.number}`);
        } else if (table.status === 'occupied') {
            // Navigate to the current order for this table
            if (table.current_order_id) {
                navigate(`/admin/pdv/nova-venda?mesa=${table.id}&mesa_numero=${table.number}&pedido=${table.current_order_id}`);
            } else {
                navigate(`/admin/pdv/nova-venda?mesa=${table.id}&mesa_numero=${table.number}`);
            }
        }
    };

    const openEditDialog = (table: PdvTable, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTable(table);
        setTableNumber(table.number);
        setTableCapacity(table.capacity);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (table: PdvTable, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTable(table);
        setIsDeleteDialogOpen(true);
    };

    const openCreateDialog = () => {
        // Find the next available table number
        const existingNumbers = tables?.map(t => t.number) || [];
        let nextNumber = 1;
        while (existingNumbers.includes(nextNumber)) {
            nextNumber++;
        }
        setTableNumber(nextNumber);
        setTableCapacity(4);
        setIsCreateDialogOpen(true);
    };

    const freeCount = tables?.filter(t => t.status === 'free').length || 0;
    const occupiedCount = tables?.filter(t => t.status === 'occupied').length || 0;
    const reservedCount = tables?.filter(t => t.status === 'reserved').length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Gerenciamento de Mesas</h2>
                    <p className="text-muted-foreground text-sm">
                        Clique em uma mesa livre para iniciar um pedido
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Mesa
                </Button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm text-emerald-600">Livres</p>
                            <p className="text-2xl font-bold text-emerald-700">{freeCount}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm text-rose-600">Ocupadas</p>
                            <p className="text-2xl font-bold text-rose-700">{occupiedCount}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-rose-500 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-white" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm text-amber-600">Reservadas</p>
                            <p className="text-2xl font-bold text-amber-700">{reservedCount}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tables Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-36 rounded-xl" />
                    ))}
                </div>
            ) : tables && tables.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {tables.map(table => (
                        <Card
                            key={table.id}
                            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 relative group ${getStatusColor(table.status)}`}
                            onClick={() => handleTableClick(table)}
                        >
                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {table.status === 'occupied' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 bg-white/80 hover:bg-white shadow-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCloseTable(table);
                                        }}
                                        title="Liberar mesa"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 bg-white/80 hover:bg-white shadow-sm"
                                    onClick={(e) => openEditDialog(table, e)}
                                    title="Editar mesa"
                                >
                                    <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                                {table.status === 'free' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 bg-white/80 hover:bg-red-50 shadow-sm"
                                        onClick={(e) => openDeleteDialog(table, e)}
                                        title="Excluir mesa"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                    </Button>
                                )}
                            </div>

                            <CardContent className="flex flex-col items-center justify-center h-36 p-4">
                                <span className="text-4xl font-bold mb-2">{table.number}</span>
                                <span className={`text-xs uppercase font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(table.status)}`}>
                                    {getStatusLabel(table.status)}
                                </span>
                                <span className="text-xs mt-2 text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" /> {table.capacity} Lugares
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Nenhuma mesa cadastrada</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Comece adicionando mesas para gerenciar pedidos por mesa.
                        </p>
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" /> Criar Primeira Mesa
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Mesa</DialogTitle>
                        <DialogDescription>
                            Adicione uma nova mesa ao seu estabelecimento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="number">Número da Mesa</Label>
                            <Input
                                id="number"
                                type="number"
                                min={1}
                                value={tableNumber}
                                onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="capacity">Capacidade (Lugares)</Label>
                            <Input
                                id="capacity"
                                type="number"
                                min={1}
                                max={20}
                                value={tableCapacity}
                                onChange={(e) => setTableCapacity(parseInt(e.target.value) || 4)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateTable} disabled={createTable.isPending}>
                            {createTable.isPending ? 'Criando...' : 'Criar Mesa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Mesa</DialogTitle>
                        <DialogDescription>
                            Altere as informações da mesa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-number">Número da Mesa</Label>
                            <Input
                                id="edit-number"
                                type="number"
                                min={1}
                                value={tableNumber}
                                onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-capacity">Capacidade (Lugares)</Label>
                            <Input
                                id="edit-capacity"
                                type="number"
                                min={1}
                                max={20}
                                value={tableCapacity}
                                onChange={(e) => setTableCapacity(parseInt(e.target.value) || 4)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleEditTable} disabled={updateTable.isPending}>
                            {updateTable.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Mesa {selectedTable?.number}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A mesa será removida permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTable}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteTable.isPending ? 'Excluindo...' : 'Excluir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
