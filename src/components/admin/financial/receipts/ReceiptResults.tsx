/**
 * Resultado da geração: lista cada título com um botão para baixar o PDF do
 * recibo **individualmente** (um arquivo por título) e para pré-visualizar.
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileDown, Eye, CheckCircle2, Plus, Download } from 'lucide-react';
import type { Baixa } from '@/lib/receipts/cefasParser';
import { brToNumber } from '@/lib/receipts/cefasParser';
import {
  formatBRL,
  downloadSingleReceipt,
  singleReceiptObjectUrl,
  type ReceiptData,
  type ReceiptMeta,
} from '@/lib/receipts/receiptPdf';

interface Props {
  baixas: Baixa[];
  methods: Record<string, string>;
  meta: ReceiptMeta;
  sourceFile: string;
  onNew: () => void;
}

export function ReceiptResults({ baixas, methods, meta, sourceFile, onNew }: Props) {
  const [preview, setPreview] = useState<{ url: string; titulo: string } | null>(null);

  const toData = (b: Baixa): ReceiptData => ({
    razaoSocial: b.razaoSocial || b.nomeFantasia,
    documento: b.documento,
    titulo: b.titulo,
    dataPagamento: b.dataPagamento,
    formaPagamento: methods[b.id] ?? '',
    valorPago: b.valorPago,
  });

  const total = baixas.reduce((s, b) => s + brToNumber(b.valorPago), 0);

  const openPreview = async (b: Baixa) => {
    if (preview) URL.revokeObjectURL(preview.url);
    const url = await singleReceiptObjectUrl(toData(b), meta);
    setPreview({ url, titulo: b.titulo });
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  // Baixa todos os recibos, um arquivo por título (com pequeno intervalo para
  // o navegador não bloquear downloads em sequência).
  const downloadAll = () => {
    baixas.forEach((b, i) => {
      window.setTimeout(() => {
        void downloadSingleReceipt(toData(b), meta);
      }, i * 500);
    });
  };

  return (
    <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Recibos gerados — {baixas.length} {baixas.length === 1 ? 'título' : 'títulos'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-white/40">
                {sourceFile} • Total {formatBRL(total)} • Baixe o PDF de cada título
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadAll} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar todos
            </Button>
            <Button
              size="sm"
              onClick={onNew}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Novo lote
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente (razão social)</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baixas.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="max-w-[240px]">
                    <div className="truncate font-medium text-gray-900 dark:text-white">
                      {b.razaoSocial || b.nomeFantasia || '—'}
                    </div>
                    <div className="truncate text-[11px] text-gray-400 dark:text-white/30">
                      {b.documento}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.titulo}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-gray-500 dark:text-white/50">
                    {methods[b.id]}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">
                    {formatBRL(brToNumber(b.valorPago))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-2"
                        onClick={() => void openPreview(b)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Ver</span>
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-purple-600 px-2.5 hover:bg-purple-700"
                        onClick={() => void downloadSingleReceipt(toData(b), meta)}
                      >
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Baixar PDF</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pré-visualização do recibo de um título */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recibo — título {preview?.titulo}</DialogTitle>
          </DialogHeader>
          {preview && (
            <iframe
              title={`Recibo ${preview.titulo}`}
              src={preview.url}
              className="h-[70vh] w-full rounded-lg border border-gray-200 dark:border-white/10"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
