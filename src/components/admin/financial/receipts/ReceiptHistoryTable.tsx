/**
 * Histórico dos lotes de recibos gerados (a partir de `financial_receipts`).
 * Colunas: Data, Arquivo, Qtd Recibos, Valor Total, Ações.
 *
 * - Clicar numa linha reabre o lote no grid para reimprimir/baixar novamente.
 * - O botão de lixeira exclui o lote (com confirmação).
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { History, Trash2, Printer } from 'lucide-react';
import { useReceipts, useDeleteReceiptBatch, type ReceiptBatch } from '@/hooks/useReceipts';
import { formatBRL } from '@/lib/receipts/receiptPdf';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  onReprint: (batchId: string) => void;
}

export function ReceiptHistoryTable({ onReprint }: Props) {
  const { data, isLoading } = useReceipts();
  const deleteBatch = useDeleteReceiptBatch();

  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <History className="h-4 w-4 text-purple-600" />
          Histórico de recibos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-white/30">
            Nenhum recibo gerado ainda. Envie um relatório de Baixas para começar.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-gray-400 dark:text-white/30">
              Clique num lote para reabri-lo e reimprimir os recibos.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-center">Qtd Recibos</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((batch: ReceiptBatch) => (
                    <TableRow
                      key={batch.batch_id}
                      className="cursor-pointer transition-colors hover:bg-purple-50/60 dark:hover:bg-white/[0.03]"
                      onClick={() => onReprint(batch.batch_id)}
                    >
                      <TableCell className="whitespace-nowrap text-xs text-gray-500 dark:text-white/50">
                        {formatDateTime(batch.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm text-gray-900 dark:text-white">
                        {batch.source_file || '—'}
                      </TableCell>
                      <TableCell className="text-center text-sm">{batch.count}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">
                        {formatBRL(batch.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-purple-600 hover:text-purple-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReprint(batch.batch_id);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                            <span className="hidden sm:inline">Reimprimir</span>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir este lote de recibos?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Serão removidos do histórico os {batch.count}{' '}
                                  {batch.count === 1 ? 'recibo' : 'recibos'} de{' '}
                                  <strong>{batch.source_file || 'este lote'}</strong> (
                                  {formatBRL(batch.total)}). Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteBatch.mutate(batch.batch_id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
