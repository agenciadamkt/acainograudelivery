import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Edit, Trash2 } from 'lucide-react';
import { useFinancialTransactions, useCreateFinancialTransaction, useUpdateFinancialTransaction, useDeleteFinancialTransaction } from '@/hooks/useFinancialTransactions';
import { useFinancialCategories } from '@/hooks/useFinancialCategories';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TransactionForm } from '@/components/admin/financial/TransactionForm';
import { GoalForm } from '@/components/admin/financial/GoalForm';
import { CategoryForm } from '@/components/admin/financial/CategoryForm';
import { FinancialCharts } from '@/components/admin/financial/FinancialCharts';
import { useCreateFinancialGoal, useDeleteFinancialGoal } from '@/hooks/useFinancialGoals';
import { useCreateFinancialCategory } from '@/hooks/useFinancialCategories';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function FinancialPage() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'receita' | 'despesa'>('receita');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<'transaction' | 'goal'>('transaction');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: transactions = [] } = useFinancialTransactions();
  const { data: categories } = useFinancialCategories();
  const { data: goals } = useFinancialGoals();
  const createTransaction = useCreateFinancialTransaction();
  const deleteTransaction = useDeleteFinancialTransaction();
  const createGoal = useCreateFinancialGoal();
  const deleteGoal = useDeleteFinancialGoal();
  const createCategory = useCreateFinancialCategory();

  const revenues = transactions?.filter(t => t.type === 'receita') || [];
  const expenses = transactions?.filter(t => t.type === 'despesa') || [];

  const totalRevenue = revenues.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalRevenue - totalExpense;

  const handleCreateTransaction = async (data: any) => {
    await createTransaction.mutateAsync(data);
    setTransactionDialogOpen(false);
  };

  const handleCreateGoal = async (data: any) => {
    await createGoal.mutateAsync({ ...data, active: true });
    setGoalDialogOpen(false);
  };

  const handleCreateCategory = async (data: any) => {
    await createCategory.mutateAsync({ ...data, active: true, icon: null });
    setCategoryDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;

    if (deletingType === 'transaction') {
      await deleteTransaction.mutateAsync(deletingId);
    } else if (deletingType === 'goal') {
      await deleteGoal.mutateAsync(deletingId);
    }

    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Módulo Financeiro</h1>
        <p className="text-muted-foreground">Fluxo de caixa e relatórios</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{revenues.length} transações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalExpense.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{expenses.length} transações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {balance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance >= 0 ? 'Positivo' : 'Negativo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Metas ativas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="revenues">Receitas</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
          </TabsList>
          <Button onClick={() => {
            setTransactionType('receita');
            setTransactionDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialCharts transactions={transactions} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Categorias de Receitas</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setCategoryDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories?.filter(c => c.type === 'receita').map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#8b5cf6' }} />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Categorias de Despesas</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setCategoryDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories?.filter(c => c.type === 'despesa').map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#ef4444' }} />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenues" className="space-y-4">
          {revenues.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Receitas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenues.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), 'PPP', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={transaction.status === 'confirmado' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                        <span className="font-bold text-green-600">
                          R$ {Number(transaction.amount).toFixed(2)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingId(transaction.id);
                            setDeletingType('transaction');
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma receita registrada</h3>
                <p className="text-sm text-muted-foreground">
                  As receitas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {expenses.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Despesas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenses.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), 'PPP', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={transaction.status === 'confirmado' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                        <span className="font-bold text-red-600">
                          R$ {Number(transaction.amount).toFixed(2)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingId(transaction.id);
                            setDeletingType('transaction');
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma despesa registrada</h3>
                <p className="text-sm text-muted-foreground">
                  As despesas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          {goals && goals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => (
                <Card key={goal.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>{goal.name}</CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setDeletingId(goal.id);
                        setDeletingType('goal');
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Meta</p>
                        <p className="text-2xl font-bold">R$ {Number(goal.target_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Período</p>
                        <p className="font-medium capitalize">{goal.period}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Início</p>
                          <p className="text-sm font-medium">
                            {format(new Date(goal.start_date), 'PP', { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fim</p>
                          <p className="text-sm font-medium">
                            {format(new Date(goal.end_date), 'PP', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma meta cadastrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina metas financeiras para acompanhar seu progresso
                </p>
                <Button onClick={() => setGoalDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Meta
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogos */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Transação Financeira</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleCreateTransaction}
            onCancel={() => setTransactionDialogOpen(false)}
            isSubmitting={createTransaction.isPending}
            defaultType={transactionType}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Meta Financeira</DialogTitle>
          </DialogHeader>
          <GoalForm
            onSubmit={handleCreateGoal}
            onCancel={() => setGoalDialogOpen(false)}
            isSubmitting={createGoal.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={handleCreateCategory}
            onCancel={() => setCategoryDialogOpen(false)}
            isSubmitting={createCategory.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingType === 'transaction'
                ? 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.'
                : 'Tem certeza que deseja excluir esta meta? O progresso será perdido.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
