import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] infinitepay-webhook received`);

  // Validar segredo compartilhado para impedir chamadas não autorizadas.
  // Configurar INFINITEPAY_WEBHOOK_SECRET nos secrets do Supabase e incluir
  // ?secret=<valor> na webhook_url ao criar o checkout.
  const webhookSecret = Deno.env.get("INFINITEPAY_WEBHOOK_SECRET");
  if (webhookSecret) {
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("secret")
      ?? req.headers.get("x-webhook-secret");
    if (providedSecret !== webhookSecret) {
      console.warn(`[${requestId}] Webhook secret inválido — rejeitando`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log(`[${requestId}] Webhook payload:`, JSON.stringify(payload));

    // Extract required fields
    const {
      invoice_slug,
      transaction_nsu,
      order_nsu,
      receipt_url,
      amount,
      paid_amount,
      installments,
      capture_method,
      items,
    } = payload;

    // Validate required fields
    if (!order_nsu) {
      console.error(`[${requestId}] Missing order_nsu in webhook payload`);
      return new Response(
        JSON.stringify({ error: "Missing order_nsu", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Processing webhook for order_nsu: ${order_nsu}`);

    // Find checkout by order_nsu (idempotency check)
    const { data: checkout, error: findError } = await supabase
      .from("infinitepay_checkouts")
      .select("*")
      .eq("order_nsu", order_nsu)
      .single();

    if (findError || !checkout) {
      console.warn(`[${requestId}] Checkout not found for order_nsu: ${order_nsu}`);
      
      // Try to find by invoice_slug as fallback
      if (invoice_slug) {
        const { data: checkoutBySlug } = await supabase
          .from("infinitepay_checkouts")
          .select("*")
          .eq("invoice_slug", invoice_slug)
          .single();

        if (checkoutBySlug) {
          console.log(`[${requestId}] Found checkout by invoice_slug`);
          // Continue with this checkout
        } else {
          // Log for audit but don't fail - webhook might arrive before our record
          console.error(`[${requestId}] No checkout found, logging for audit`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Webhook received but no matching checkout found",
              requestId 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Webhook received but no matching checkout found",
            requestId 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Idempotency: if already PAID, just acknowledge
    if (checkout && checkout.status === "PAID") {
      console.log(`[${requestId}] Checkout already PAID, idempotent response`);
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update checkout record
    const { error: updateCheckoutError } = await supabase
      .from("infinitepay_checkouts")
      .update({
        status: "PAID",
        invoice_slug: invoice_slug || checkout?.invoice_slug,
        transaction_nsu: transaction_nsu || checkout?.transaction_nsu,
        receipt_url: receipt_url || checkout?.receipt_url,
        paid_amount: paid_amount || amount,
        installments: installments,
        capture_method: capture_method,
        raw_webhook: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("order_nsu", order_nsu);

    if (updateCheckoutError) {
      console.error(`[${requestId}] Error updating checkout:`, updateCheckoutError);
      // Continue to update order anyway
    }

    // Update order payment status
    if (checkout?.order_id) {
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkout.order_id);

      if (updateOrderError) {
        console.error(`[${requestId}] Error updating order:`, updateOrderError);
      } else {
        console.log(`[${requestId}] Order ${checkout.order_id} marked as paid`);
      }
    }

    console.log(`[${requestId}] Webhook processed successfully`);

    // Respond quickly with 200 OK
    return new Response(
      JSON.stringify({ success: true, requestId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    // Return 200 to prevent InfinitePay from retrying for parsing errors
    // Only return 400 for truly invalid payloads
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
