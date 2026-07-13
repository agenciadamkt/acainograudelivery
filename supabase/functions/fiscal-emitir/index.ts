// ============================================================================
// Edge Function: fiscal-emitir  (motor de emissão — Fase 8)
// Monta o JSON da NFC-e/NF-e a partir de pdv_orders/orders + product_fiscal_data,
// aloca número na fiscal_series, cria fiscal_documents (PROCESSANDO) e envia ao
// PlugNotas. Nunca assume autorização imediata — resolução vem por webhook/consulta.
// Body: { storeId, tipo: 'NFCE'|'NFE', orderId?, pdvOrderId? }
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireStaffOrService, jsonError } from '../_shared/auth.ts';
import { adminClient, getCompanyByStore, logCall, addEvent } from '../_shared/fiscal.ts';
import { getProvider } from '../_shared/fiscal-provider.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Mapa forma de pagamento → código PlugNotas (meio de pagamento)
const MEIO_PAGAMENTO: Record<string, string> = {
  money: '01', dinheiro: '01', cash: '01',
  credit: '03', credito: '03', credit_card: '03',
  debit: '04', debito: '04', debit_card: '04',
  pix: '17', online: '17',
};

interface SaleData {
  total: number;
  discount: number;
  paymentMethod: string;
  destinatarioNome: string | null;
  destinatarioDoc: string | null;
  items: { product_id: string; nome: string; quantidade: number; valorUnitario: number }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authError = await requireStaffOrService(req);
  if (authError) return authError;

  try {
    const { storeId, tipo, orderId, pdvOrderId } = await req.json();
    if (!storeId) return jsonError('storeId é obrigatório', 400);
    if (!['NFCE', 'NFE'].includes(tipo)) return jsonError('tipo deve ser NFCE ou NFE', 400);
    if (!orderId && !pdvOrderId) return jsonError('Informe orderId ou pdvOrderId', 400);

    const db = adminClient();
    const company = await getCompanyByStore(db, storeId);
    if (!company) return jsonError('Empresa fiscal não configurada.', 400);
    if (!company.plugnotas_company_id) return jsonError('Empresa ainda não sincronizada com o PlugNotas.', 400);

    const { data: store } = await db.from('stores').select('cnpj').eq('id', storeId).single();

    // ── Carrega a venda ──────────────────────────────────────────────────────
    let sale: SaleData;
    if (pdvOrderId) {
      const { data: o } = await db.from('pdv_orders').select('total, subtotal, discount, payment_method, customer_name, customer_cpf').eq('id', pdvOrderId).single();
      if (!o) return jsonError('Venda PDV não encontrada', 404);
      const { data: items } = await db.from('pdv_order_items').select('product_id, quantity, unit_price, product_name').eq('order_id', pdvOrderId);
      sale = {
        total: Number(o.total || 0), discount: Number(o.discount || 0), paymentMethod: o.payment_method || 'money',
        destinatarioNome: o.customer_name, destinatarioDoc: o.customer_cpf,
        items: (items || []).map((i: any) => ({ product_id: i.product_id, nome: i.product_name || 'Item', quantidade: Number(i.quantity || 1), valorUnitario: Number(i.unit_price || 0) })),
      };
    } else {
      const { data: o } = await db.from('orders').select('total_amount, discount_amount, payment_method, customer:customers(name)').eq('id', orderId).single();
      if (!o) return jsonError('Pedido não encontrado', 404);
      const { data: items } = await db.from('order_items').select('product_id, quantity, unit_price, subtotal, product:products(name)').eq('order_id', orderId);
      sale = {
        total: Number(o.total_amount || 0), discount: Number(o.discount_amount || 0), paymentMethod: o.payment_method || 'dinheiro',
        destinatarioNome: (o.customer as any)?.name ?? null, destinatarioDoc: null,
        items: (items || []).map((i: any) => ({ product_id: i.product_id, nome: i.product?.name || 'Item', quantidade: Number(i.quantity || 1), valorUnitario: Number(i.unit_price || 0) })),
      };
    }

    if (sale.items.length === 0) return jsonError('Venda sem itens.', 400);

    // ── Dados fiscais dos produtos ─────────────────────────────────────────────
    const productIds = [...new Set(sale.items.map((i) => i.product_id).filter(Boolean))];
    const { data: fiscalRows } = await db.from('product_fiscal_data').select('*').in('product_id', productIds);
    const fiscalByProduct = new Map((fiscalRows || []).map((r: any) => [r.product_id, r]));

    // ── Aloca número na série ──────────────────────────────────────────────────
    let { data: serie } = await db.from('fiscal_series')
      .select('*').eq('fiscal_company_id', company.id).eq('tipo_documento', tipo).eq('ambiente', company.ambiente).eq('ativo', true).maybeSingle();
    if (!serie) {
      const { data: created } = await db.from('fiscal_series')
        .insert({ store_id: storeId, fiscal_company_id: company.id, tipo_documento: tipo, serie: 1, proximo_numero: 1, ambiente: company.ambiente })
        .select('*').single();
      serie = created;
    }
    const numero = serie.proximo_numero;
    await db.from('fiscal_series').update({ proximo_numero: numero + 1 }).eq('id', serie.id);

    // ── Cria o documento (RASCUNHO) ────────────────────────────────────────────
    const { data: doc, error: docErr } = await db.from('fiscal_documents').insert({
      store_id: storeId, fiscal_company_id: company.id,
      order_id: orderId ?? null, pdv_order_id: pdvOrderId ?? null,
      tipo_documento: tipo, status: 'RASCUNHO', ambiente: company.ambiente,
      numero, serie: serie.serie, valor_total: sale.total,
      destinatario_nome: sale.destinatarioNome, destinatario_documento: sale.destinatarioDoc,
    }).select('id').single();
    if (docErr) return jsonError('Falha ao criar documento: ' + docErr.message, 500);

    // ── Envia via provider (PlugNotas ou Focus NFe) ────────────────────────────
    const provider = await getProvider(db, company);
    const result = await provider.emitir({
      tipo, ref: doc.id, ambiente: company.ambiente, storeCnpj: store?.cnpj || '',
      serie: serie.serie, numero, presencial: !!pdvOrderId,
      total: sale.total, paymentMethod: sale.paymentMethod,
      destinatarioNome: sale.destinatarioNome, destinatarioDoc: sale.destinatarioDoc,
      items: sale.items.map((it) => ({ ...it, fiscal: fiscalByProduct.get(it.product_id) || {} })),
    });

    await logCall(db, {
      store_id: storeId, fiscal_document_id: doc.id, endpoint: result.endpoint, metodo: result.method,
      request: result.sent, response: result.raw, status_code: result.status, erro: result.error, duracao_ms: result.durationMs,
    });

    if (!result.ok) {
      await db.from('fiscal_documents').update({ status: 'ERRO', motivo_rejeicao: result.motivo ?? null, payload_enviado: result.sent, payload_recebido: result.raw, updated_at: new Date().toISOString() }).eq('id', doc.id);
      await addEvent(db, doc.id, 'ERRO', `Falha no envio (${provider.name})`, result.raw);
      return json({ ok: false, documentId: doc.id, status: 'ERRO', motivo: result.motivo });
    }

    await db.from('fiscal_documents').update({
      status: 'PROCESSANDO', plugnotas_id: result.providerRef, payload_enviado: result.sent, payload_recebido: result.raw,
      emitido_em: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', doc.id);
    await addEvent(db, doc.id, 'EMITIDO', `Enviado ao ${provider.name} (nº ${numero}/${serie.serie})`, { providerRef: result.providerRef });

    return json({ ok: true, documentId: doc.id, status: 'PROCESSANDO', plugnotas_id: result.providerRef });
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
});
