# Recibos de Baixas (ERP Cefas) — Design

**Data:** 2026-07-15
**Módulo:** Financeiro › Recibos
**Rota:** `/admin/financeiro/recibos`

## Objetivo

Automatizar a geração de recibos individuais a partir do relatório de **Baixas**
("Relatório de Contas a Receber por Cliente") exportado do ERP Cefas, usado pela
distribuidora do Açaí no Grau. O usuário envia o PDF, o sistema lê os títulos
quitados, detecta a forma de pagamento, o usuário confere/ajusta e gera um PDF
consolidado com **1 recibo por página** (1 baixa = 1 página).

## Decisões (2026-07-15)

1. **Nome no recibo** = razão social da observação (ex: `RB BORGES COMERCIO...`)
   + CPF/CNPJ do bloco do cliente Cefas (ex: `35.856.036/0001-56`).
2. **Sem conciliação** — o objetivo é apenas gerar os recibos. (Removido do escopo.)
3. **Só parser nativo** (pdfjs-dist) agora. O PDF do Cefas é digital/texto extraível.
   OCR fica como ponto de extensão futuro (não implementado nesta entrega).
4. **Confirmação em tabela única** (lote): forma auto-detectada pré-preenchida,
   editável por linha, um botão "Confirmar e gerar".
5. **Armazenamento: só download local.** O PDF consolidado é baixado na hora; no
   banco gravamos apenas os metadados (sem upload de arquivo, `pdf_path` não usado).

## Layout do PDF de origem (validado no arquivo real)

`erros/Baixas - Julho - 15.pdf` (2 páginas, 7 títulos, Total geral R$ 16.629,50).

Estrutura por bloco de cliente (texto extraído via pdfjs, uma linha por item):

- Linha do cliente:
  `422 ACAI NO GRAU RAISSA ALIMENTOS 35.856.036/0001-56Endereço:AV PIAUI- Bairro: CENTRO`
  → `codigo=422`, `nomeFantasia="ACAI NO GRAU RAISSA ALIMENTOS"`, `cnpj=35.856.036/0001-56`, endereço, bairro.
- Linha `Cidade: TIMONMA Ponto de refêrencia:... Telefone:8681056735 Limite de Crédito:...`
  → cidade + UF concatenados (`TIMON`+`MA`), telefone.
- Linha de título:
  `03/07/2026 10/07/2026 6.347,75 15/07/2026 0,00 6.347,75161650 0 Dias`
  → emissão, vencimento, valor, **data pagamento**, juros, **valor pago**+**nº título** (colados), atraso.
- Linha de observação:
  `Obs.:RB BORGES COMERCIO DE PRODUTOS ALIMENTICIOS LTDA [PIXPAG]`
  → razão social + forma de pagamento entre colchetes.
- Um mesmo cliente pode se repetir entre páginas → agrupar por código.

### Regex-chave (prototipadas e confirmadas contra o PDF real)

```
cliente: /^(\d+)\s+(.+?)\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})Endereço:(.*)$/
titulo:  /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})(\d+)\s+(\d+)\s+Dias/
obs:     /^Obs\.:\s*(.+?)\s*\[([^\]]+)\]\s*$/
```

### Mapa de formas de pagamento

`[PIXPAG]→PIX`, `[CARTAO DE CREDITO]→Cartão de Crédito`, `[CARTAO DE DEBITO]→Cartão de Débito`,
`[TED]→TED`, `[DEPOSITO]→Depósito`. Sem match → "Forma de pagamento não identificada"
(linha destacada, exige escolha do usuário).

Opções no Select: PIX, QR Code PIX, Cartão de Crédito, Cartão de Débito, TED,
Depósito, Dinheiro, Transferência Bancária, Outro.

## Arquitetura

```
src/pages/admin/financial/ReceiptsPage.tsx        página (KPIs + upload + histórico + review)
src/components/admin/financial/receipts/
    ReceiptUploadCard.tsx      upload .pdf
    ReceiptReviewTable.tsx     tabela de conferência (forma editável)
    ReceiptHistoryTable.tsx    histórico dos lotes
    ReceiptKpis.tsx            indicadores
src/lib/receipts/
    cefasParser.ts             pdfjs → texto → Baixa[]  (OCR = extensão futura)
    paymentMethods.ts          mapa + opções
    receiptPdf.ts              jsPDF: 1 baixa = 1 página, PDF consolidado
src/hooks/useReceipts.ts       Supabase financial_receipts (insert + list + KPIs)
```

- Nova dependência: `pdfjs-dist` (worker via `?url`, sem CDN — CSP-safe).
- Geração: `jspdf` (já instalado).
- Navegação: item "Recibos" em `FinancialLayout.tsx` (`navItems`), após "Contas a Receber".
- Rota filha em `App.tsx` sob `/admin/financeiro`.

## Modelo do recibo (por página)

```
RECIBO DE QUITAÇÃO

Cliente: [razão social]
CPF/CNPJ: [documento]
Título: [nº]
Data Pagamento: [dd/mm/aaaa]
Forma de Pagamento: [forma confirmada]
Valor: R$ [valor pago]

Recebemos de [CLIENTE] a importância de [VALOR],
referente ao título nº [TITULO], considerando o pagamento
efetuado em [DATA PAGAMENTO] através de [FORMA PAGAMENTO].
Nada mais havendo a reclamar, damos plena quitação deste título.

Açaí no Grau Distribuidora
Emitido em [data] — [usuário responsável]
```

## Banco de dados — `ADD_FINANCIAL_RECEIPTS.sql`

Tabela `financial_receipts`:
`id, client_name, client_document, title_number, payment_date, payment_method,
amount, pdf_path (nullable — não usado por ora), source_file, created_by, created_at`.
RLS para `authenticated` (mesmo padrão de `create_bucket.sql`).

## KPIs (topo da página, a partir de `financial_receipts`)

- Qtd de recibos: hoje / semana / mês.
- Recebimentos por forma: PIX, Cartão Crédito, Cartão Débito, TED, Depósito, Dinheiro.
- Valor recebido total.

## Identidade visual / responsividade

shadcn + Tailwind no padrão do módulo: cards `dark:bg-[#16161D]`, roxo `#7C3AED`,
headers e paddings iguais aos das outras páginas financeiras. Responsivo desktop/tablet.

## Fora de escopo (YAGNI)

- OCR (arquitetura preparada, não implementado).
- Conciliação com valores.
- Upload do PDF para nuvem.
- Compatibilidade com outros relatórios do Cefas (parser isolado em `cefasParser.ts`
  para facilitar extensão futura, mas só este layout é suportado agora).
