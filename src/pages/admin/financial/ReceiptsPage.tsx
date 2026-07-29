/**
 * Financeiro › Recibos  (/admin/financeiro/recibos)
 *
 * Automatiza a geração de recibos de quitação a partir do relatório de Baixas
 * do ERP Cefas: upload do PDF → leitura/parse → conferência da forma de
 * pagamento → geração de um recibo (PDF) por título, com download individual,
 * gravando o histórico em `financial_receipts`.
 */

import { useMemo, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { FileText } from 'lucide-react';

import { ReceiptKpis } from '@/components/admin/financial/receipts/ReceiptKpis';
import { ReceiptUploadCard } from '@/components/admin/financial/receipts/ReceiptUploadCard';
import { ReceiptReviewTable } from '@/components/admin/financial/receipts/ReceiptReviewTable';
import { ReceiptResults } from '@/components/admin/financial/receipts/ReceiptResults';
import { ReceiptHistoryTable } from '@/components/admin/financial/receipts/ReceiptHistoryTable';

import { parseCefasBaixasPdf, brToNumber, type Baixa } from '@/lib/receipts/cefasParser';
import { UNIDENTIFIED } from '@/lib/receipts/paymentMethods';
import type { ReceiptMeta } from '@/lib/receipts/receiptPdf';
import {
  useSaveReceipts,
  useCurrentUserName,
  getBatchReceipts,
  type NewReceipt,
} from '@/hooks/useReceipts';

/** Converte "dd/mm/aaaa" em "aaaa-mm-dd" (ou null se inválido). */
function toIsoDate(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Converte "aaaa-mm-dd" (banco) em "dd/mm/aaaa". */
function fromIsoDate(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Converte número em string pt-BR sem símbolo (ex: 6347.75 → "6.347,75"). */
function numToBr(n: number): string {
  return Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Snapshot do lote gerado, para a tela de resultados. */
interface Generated {
  baixas: Baixa[];
  methods: Record<string, string>;
  sourceFile: string;
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const saveReceipts = useSaveReceipts();

  const [parsing, setParsing] = useState(false);
  const [baixas, setBaixas] = useState<Baixa[] | null>(null);
  const [sourceFile, setSourceFile] = useState('');
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<Generated | null>(null);

  // Nome real do usuário logado (profiles.full_name), com fallback no e-mail.
  const fallbackName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const { data: userName } = useCurrentUserName(user?.id, fallbackName);

  const meta: ReceiptMeta = useMemo(
    () => ({ usuario: userName ?? fallbackName }),
    [userName, fallbackName],
  );

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const { baixas: parsed } = await parseCefasBaixasPdf(file);
      const initialMethods: Record<string, string> = {};
      for (const b of parsed) initialMethods[b.id] = b.formaDetectada || UNIDENTIFIED;
      setBaixas(parsed);
      setMethods(initialMethods);
      setSourceFile(file.name);
      toast({
        title: 'PDF lido com sucesso',
        description: `${parsed.length} ${parsed.length === 1 ? 'baixa encontrada' : 'baixas encontradas'}.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao ler o PDF.';
      toast({ title: 'Não foi possível ler o PDF', description: msg, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const reset = () => {
    setBaixas(null);
    setMethods({});
    setSourceFile('');
    setGenerated(null);
  };

  // Reabre um lote do histórico no grid de resultados para reimprimir/baixar.
  const handleReprint = async (batchId: string) => {
    try {
      const rows = await getBatchReceipts(batchId);
      if (rows.length === 0) return;
      const list: Baixa[] = rows.map((r) => ({
        id: r.id,
        codigo: '',
        nomeFantasia: '',
        razaoSocial: r.client_name,
        documento: r.client_document ?? '',
        endereco: '',
        bairro: '',
        cidade: '',
        uf: '',
        telefone: '',
        titulo: r.title_number,
        emissao: '',
        vencimento: '',
        dataPagamento: fromIsoDate(r.payment_date),
        valor: numToBr(Number(r.amount)),
        juros: '',
        valorPago: numToBr(Number(r.amount)),
        formaDetectada: r.payment_method,
        formaBruta: '',
      }));
      const methodsSnapshot: Record<string, string> = {};
      for (const r of rows) methodsSnapshot[r.id] = r.payment_method;
      setBaixas(null);
      setGenerated({
        baixas: list,
        methods: methodsSnapshot,
        sourceFile: rows[0].source_file ?? 'Recibos do histórico',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir o lote.';
      toast({ title: 'Não foi possível reabrir o lote', description: msg, variant: 'destructive' });
    }
  };

  const handleGenerate = async () => {
    if (!baixas) return;
    const list = baixas;
    const methodsSnapshot = { ...methods };

    // Vai direto para a tela de resultados: cada título tem seu próprio botão
    // de download (um PDF por título — sem PDF consolidado).
    setGenerated({ baixas: list, methods: methodsSnapshot, sourceFile });
    setBaixas(null);

    // Grava o histórico (best-effort — não bloqueia os downloads individuais).
    const rows: NewReceipt[] = list.map((b) => ({
      client_name: b.razaoSocial || b.nomeFantasia,
      client_document: b.documento || null,
      title_number: b.titulo,
      payment_date: toIsoDate(b.dataPagamento),
      payment_method: methodsSnapshot[b.id] ?? UNIDENTIFIED,
      amount: brToNumber(b.valorPago),
    }));

    try {
      await saveReceipts.mutateAsync({
        receipts: rows,
        sourceFile,
        createdBy: user?.id ?? null,
        storeId: currentStore?.id ?? null,
      });
      toast({
        title: 'Recibos gerados',
        description: `${list.length} ${list.length === 1 ? 'recibo pronto' : 'recibos prontos'} — baixe o PDF de cada título.`,
      });
    } catch {
      // O hook já exibe o toast de erro; os downloads continuam disponíveis.
      toast({
        title: 'Recibos prontos (histórico não salvo)',
        description:
          'Você já pode baixar cada recibo, mas não foi possível gravar no histórico. Verifique se a tabela financial_receipts foi criada.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recibos</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">
            Gere recibos de quitação a partir do relatório de Baixas do Cefas.
          </p>
        </div>
      </div>

      <ReceiptKpis />

      {generated ? (
        <ReceiptResults
          baixas={generated.baixas}
          methods={generated.methods}
          meta={meta}
          sourceFile={generated.sourceFile}
          onNew={reset}
        />
      ) : baixas ? (
        <ReceiptReviewTable
          baixas={baixas}
          methods={methods}
          onMethodChange={(id, m) => setMethods((prev) => ({ ...prev, [id]: m }))}
          onGenerate={handleGenerate}
          onCancel={reset}
          saving={saveReceipts.isPending}
          sourceFile={sourceFile}
        />
      ) : (
        <ReceiptUploadCard onFile={handleFile} loading={parsing} />
      )}

      <ReceiptHistoryTable onReprint={handleReprint} />
    </div>
  );
}
