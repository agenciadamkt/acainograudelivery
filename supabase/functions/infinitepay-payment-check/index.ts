import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_API_URL = "https://api.infinitepay.io/invoices/public/checkout/payment_check";
const INFINITEPAY_HANDLE = "agenciada";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] infinitepay-payment-check started`);

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[${requestId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error(`[${requestId}] Auth error:`, userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { orderId, order_nsu, slug, transaction_nsu } = body;

    console.log(`[${requestId}] Checking payment for:`, { orderId, order_nsu, slug, transaction_nsu });

    // Find the checkout record
    let checkout: any = null;

    if (orderId) {
      const { data } = await supabase
        .from("infinitepay_checkouts")
        .select("*")
        .eq("order_id", orderId)
        .single();
      checkout = data;
    } else if (order_nsu) {
      const { data } = await supabase
        .from("infinitepay_checkouts")
        .select("*")
        .eq("order_nsu", order_nsu)
        .single();
      checkout = data;
    }

    if (!checkout) {
      console.error(`[${requestId}] Checkout not found`);
      return new Response(
        JSON.stringify({ error: "Checkout not found", requestId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already paid in our system, return immediately
    if (checkout.status === "PAID") {
      console.log(`[${requestId}] Checkout already marked as PAID`);
      return new Response(
        JSON.stringify({
          paid: true,
          status: "PAID",
          order_nsu: checkout.order_nsu,
          transaction_nsu: checkout.transaction_nsu,
          receipt_url: checkout.receipt_url,
          paid_amount: checkout.paid_amount,
          installments: checkout.installments,
          capture_method: checkout.capture_method,
          requestId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payment check payload
    const paymentCheckPayload = {
      handle: INFINITEPAY_HANDLE,
      order_nsu: checkout.order_nsu,
      transaction_nsu: transaction_nsu || checkout.transaction_nsu || "",
      slug: slug || checkout.invoice_slug || "",
    };

    console.log(`[${requestId}] Calling InfinitePay payment_check:`, paymentCheckPayload);

    // Call InfinitePay API
    const infinitePayResponse = await fetch(INFINITEPAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentCheckPayload),
    });

    const infinitePayData = await infinitePayResponse.text();
    console.log(`[${requestId}] InfinitePay response status: ${infinitePayResponse.status}`);
    console.log(`[${requestId}] InfinitePay response:`, infinitePayData);

    if (!infinitePayResponse.ok) {
      console.error(`[${requestId}] InfinitePay API error`);
      return new Response(
        JSON.stringify({
          error: "InfinitePay API error",
          upstreamStatus: infinitePayResponse.status,
          upstreamBody: infinitePayData,
          calledUrl: INFINITEPAY_API_URL,
          requestId,
        }),
        { status: infinitePayResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(infinitePayData);
    } catch {
      parsedResponse = { paid: false };
    }

    const isPaid = parsedResponse.paid === true;

    if (isPaid) {
      console.log(`[${requestId}] Payment confirmed, updating records`);

      // Update checkout record
      const { error: updateCheckoutError } = await supabase
        .from("infinitepay_checkouts")
        .update({
          status: "PAID",
          paid_amount: parsedResponse.paid_amount || parsedResponse.amount,
          installments: parsedResponse.installments,
          capture_method: parsedResponse.capture_method,
          transaction_nsu: transaction_nsu || checkout.transaction_nsu,
          invoice_slug: slug || checkout.invoice_slug,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkout.id);

      if (updateCheckoutError) {
        console.error(`[${requestId}] Error updating checkout:`, updateCheckoutError);
      }

      // Update order payment status
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkout.order_id);

      if (updateOrderError) {
        console.error(`[${requestId}] Error updating order:`, updateOrderError);
      }
    }

    return new Response(
      JSON.stringify({
        paid: isPaid,
        status: isPaid ? "PAID" : checkout.status,
        order_nsu: checkout.order_nsu,
        transaction_nsu: transaction_nsu || checkout.transaction_nsu,
        receipt_url: checkout.receipt_url,
        amount: parsedResponse.amount,
        paid_amount: parsedResponse.paid_amount,
        installments: parsedResponse.installments,
        capture_method: parsedResponse.capture_method,
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
