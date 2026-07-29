/**
 * Tabela de conferência (lote). Lista todas as baixas lidas do PDF com a forma
 * de pagamento auto-detectada e editável por linha. Linhas sem forma
 * reconhecida ficam destacadas e exigem escolha antes de gerar os recibos.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, FileDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Baixa } from '@/lib/receipts/cefasParser';
import { brToNumber } from '@/lib/receipts/cefasParser';
import { formatBRL } from '@/lib/receipts/receiptPdf';
import {
  PAYMENT_METHOD_OPTIONS,
  UNIDENTIFIED,
  isUnidentified,
} from '@/lib/receipts/paymentMethods';

interface Props {
  baixas: Baixa[];
  /** Mapa baixaId → forma escolhida. */
  methods: Record<string, string>;
  onMethodChange: (baixaId: string, method: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
  saving?: boolean;
  sourceFile: string;
}

export function ReceiptReviewTable({
  baixas,
  methods,
  onMethodChange,
  onGenerate,
  onCancel,
  saving,
  sourceFile,
}: Props) {
  const total = baixas.reduce((s, b) => s + brToNumber(b.valorPago), 0);
  const pending = baixas.filter((b) => isUnidentified(methods[b.id] ?? UNIDENTIFIED)).length;

  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Conferência — {baixas.length} {baixas.length === 1 ? 'baixa' : 'baixas'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-white/40">
              {sourceFile} • Total {formatBRL(total)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2" disabled={saving}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={saving || pending > 0}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <FileDown className="h-4 w-4" />
              {saving ? 'Gerando…' : 'Confirmar e gerar'}
            </Button>
          </div>
        </div>

        {pending > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pending} {pending === 1 ? 'baixa está' : 'baixas estão'} sem forma de pagamento
            identificada. Selecione a forma para liberar a geração.
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente (razão social)</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="min-w-[200px]">Forma de pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baixas.map((b) => {
                const method = methods[b.id] ?? UNIDENTIFIED;
                const unidentified = isUnidentified(method);
                return (
                  <TableRow
                    key={b.id}
                    className={cn(unidentified && 'bg-amber-50/60 dark:bg-amber-500/[0.06]')}
                  >
                    <TableCell className="max-w-[240px]">
                      <div className="truncate font-medium text-gray-900 dark:text-white">
                        {b.razaoSocial || b.nomeFantasia || '—'}
                      </div>
                      {b.razaoSocial && b.nomeFantasia && (
                        <div className="truncate text-[11px] text-gray-400 dark:text-white/30">
                          {b.nomeFantasia}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-gray-500 dark:text-white/50">
                      {b.documento || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{b.titulo}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-gray-500 dark:text-white/50">
                      {b.dataPagamento}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">
                      {formatBRL(brToNumber(b.valorPago))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={unidentified ? undefined : method}
                          onValueChange={(v) => onMethodChange(b.id, v)}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[170px]">
                            <SelectValue placeholder="Selecione…" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!unidentified && b.formaBruta && (
                          <Badge
                            variant="secondary"
                            className="hidden shrink-0 text-[10px] lg:inline-flex"
                          >
                            auto
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
