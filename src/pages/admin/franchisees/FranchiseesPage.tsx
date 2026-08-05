import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FranchiseeForm } from '@/components/admin/FranchiseeForm';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/admin/DataTable';
import {
  useFranchiseeRequests,
  useApproveFranchiseeRequest,
  useRejectFranchiseeRequest,
} from '@/hooks/useFranchiseeRequests';
import { useStores, useDeleteStore, useUpdateStore, type Store } from '@/hooks/useStores';
import { CheckCircle, XCircle, Clock, Store as StoreIcon, Users, Copy, ExternalLink, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { storefrontUrl } from '@/lib/storefront';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FranchiseesPage = () => {
  const { data: requests, isLoading: loadingRequests } = useFranchiseeRequests();
  const { data: stores, isLoading: loadingStores } = useStores();
  const approveRequest = useApproveFranchiseeRequest();
  const rejectRequest = useRejectFranchiseeRequest();
  const deleteStore = useDeleteStore();
  const updateStore = useUpdateStore();

  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    requestId: string | null;
    password: string;
  }>({ open: false, requestId: null, password: '' });

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    requestId: string | null;
    reason: string;
  }>({ open: false, requestId: null, reason: '' });

  const [newFranchiseeDialog, setNewFranchiseeDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const pendingRequests = requests?.filter((r) => r.status === 'pending') || [];
  const approvedRequests = requests?.filter((r) => r.status === 'approved') || [];
  const rejectedRequests = requests?.filter((r) => r.status === 'rejected') || [];

  // Categorizando lojas
  const activeStores = stores?.filter((s) => s.status === 'active' && s.active !== false) || [];
  const inactiveStores = stores?.filter((s) => s.status !== 'active' || s.active === false) || [];

  const handleApprove = async () => {
    if (approveDialog.requestId && approveDialog.password) {
      await approveRequest.mutateAsync({
        requestId: approveDialog.requestId,
        password: approveDialog.password,
      });
      setApproveDialog({ open: false, requestId: null, password: '' });
    }
  };

  const handleReject = async () => {
    if (rejectDialog.requestId && rejectDialog.reason) {
      await rejectRequest.mutateAsync({
        requestId: rejectDialog.requestId,
        reason: rejectDialog.reason,
      });
      setRejectDialog({ open: false, requestId: null, reason: '' });
    }
  };

  const handleDeleteStore = async (store: Store) => {
    if (window.confirm(`Tem certeza que deseja inativar a loja "${store.name}"? Isso impedirá o acesso e novos pedidos.`)) {
      await deleteStore.mutateAsync(store.id);
    }
  };

  const handleReactivateStore = async (store: Store) => {
    if (window.confirm(`Deseja reativar a loja "${store.name}"?`)) {
      await updateStore.mutateAsync({
        id: store.id,
        updates: { active: true, status: 'active' }
      });
    }
  };

  const requestColumns = [
    { key: 'full_name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'store_name', label: 'Loja' },
    {
      key: 'city',
      label: 'Localização',
      render: (item: any) => `${item.city}, ${item.state}`,
    },
    {
      key: 'created_at',
      label: 'Data',
      render: (item: any) =>
        format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: any) => (
        <div className="flex gap-2">
          {item.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  setApproveDialog({ open: true, requestId: item.id, password: '' })
                }
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setRejectDialog({ open: true, requestId: item.id, reason: '' })
                }
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const storeColumns = [
    { key: 'name', label: 'Nome' },
    {
      key: 'slug',
      label: 'URL',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <a
            href={storefrontUrl(item.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors inline-flex items-center gap-1"
          >
            /{item.slug}
            <ExternalLink className="w-3 h-3" />
          </a>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => {
              navigator.clipboard.writeText(storefrontUrl(item.slug));
              toast.success('URL copiada para área de transferência!');
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'distribution_center',
      label: 'CD',
      render: (item: any) => item.distribution_center?.name || '-',
    },
    {
      key: 'city',
      label: 'Localização',
      render: (item: any) =>
        item.city && item.state ? `${item.city}, ${item.state}` : '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => (
        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
          {item.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (item: any) =>
        format(new Date(item.created_at), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: Store) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingStore(item)}
            title="Editar Loja"
          >
            <Pencil className="w-4 h-4 text-blue-600" />
          </Button>

          {(item.status === 'active' && item.active !== false) ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteStore(item)}
              title="Inativar Loja"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleReactivateStore(item)}
              title="Reativar Loja"
            >
              <RotateCcw className="w-4 h-4 text-green-600" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestão de Franqueados</h1>
            <p className="text-muted-foreground">
              Gerencie solicitações de franquia e franqueados ativos
            </p>
          </div>
          <Button onClick={() => setNewFranchiseeDialog(true)}>
            Novo Franqueado
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold">{pendingRequests.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-3xl font-bold">{activeStores.length}</p>
              </div>
              <StoreIcon className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-3xl font-bold">{inactiveStores.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">{stores?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Lojas Ativas</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
            <TabsTrigger value="requests">Solicitações Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card className="p-6">
              <DataTable
                data={activeStores}
                columns={storeColumns}
                isLoading={loadingStores}
              />
            </Card>
          </TabsContent>

          <TabsContent value="inactive">
            <Card className="p-6">
              <DataTable
                data={inactiveStores}
                columns={storeColumns}
                isLoading={loadingStores}
              />
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="p-6">
              <DataTable
                data={pendingRequests}
                columns={requestColumns}
                isLoading={loadingRequests}
              />
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="p-6">
              <DataTable
                data={approvedRequests}
                columns={requestColumns}
                isLoading={loadingRequests}
              />
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card className="p-6">
              <DataTable
                data={rejectedRequests}
                columns={requestColumns}
                isLoading={loadingRequests}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) =>
        setApproveDialog({ ...approveDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Franqueado</DialogTitle>
            <DialogDescription>
              Digite uma senha temporária para o novo franqueado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha Temporária</Label>
              <Input
                id="password"
                type="password"
                value={approveDialog.password}
                onChange={(e) =>
                  setApproveDialog({ ...approveDialog, password: e.target.value })
                }
                placeholder="Digite uma senha forte"
              />
              <p className="text-xs text-muted-foreground">
                Esta senha será enviada ao franqueado para primeiro acesso
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ open: false, requestId: null, password: '' })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!approveDialog.password || approveRequest.isPending}
            >
              {approveRequest.isPending ? 'Aprovando...' : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) =>
        setRejectDialog({ ...rejectDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog({ ...rejectDialog, reason: e.target.value })
                }
                placeholder="Descreva o motivo da rejeição..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, requestId: null, reason: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectDialog.reason || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Rejeitando...' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Franchisee Dialog */}
      <Dialog open={newFranchiseeDialog} onOpenChange={setNewFranchiseeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Franqueado</DialogTitle>
            <DialogDescription>
              Preencha todos os dados do franqueado e da loja para criar um novo registro
            </DialogDescription>
          </DialogHeader>
          <FranchiseeForm onSuccess={() => setNewFranchiseeDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>
              Atualize os dados e configurações da loja
            </DialogDescription>
          </DialogHeader>
          {editingStore && (
            <FranchiseeForm
              initialData={editingStore}
              onSuccess={() => setEditingStore(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default FranchiseesPage;
