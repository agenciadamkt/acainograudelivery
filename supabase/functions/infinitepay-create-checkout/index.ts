import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_API_URL = "https://api.infinitepay.io/invoices/public/checkout/links";
const INFINITEPAY_HANDLE = "agenciada";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] infinitepay-create-checkout started`);

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
    const { orderId } = await req.json();
    if (!orderId) {
      console.error(`[${requestId}] Missing orderId`);
      return new Response(
        JSON.stringify({ error: "Missing orderId", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Processing order: ${orderId}`);

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        delivery_address:customer_addresses(*),
        items:order_items(
          *,
          product:products(*),
          product_size:product_sizes(*),
          toppings:order_item_toppings(
            *,
            topping:toppings(*)
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`[${requestId}] Order not found:`, orderError);
      return new Response(
        JSON.stringify({ error: "Order not found", requestId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if checkout already exists for this order
    const { data: existingCheckout } = await supabase
      .from("infinitepay_checkouts")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .single();

    if (existingCheckout && existingCheckout.status === "LINK_GENERATED" && existingCheckout.checkout_url) {
      console.log(`[${requestId}] Returning existing checkout URL`);
      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: existingCheckout.checkout_url,
          order_nsu: existingCheckout.order_nsu,
          invoice_slug: existingCheckout.invoice_slug,
          requestId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build items array for InfinitePay (prices in centavos)
    const items = order.items.map((item: any) => {
      const productName = item.product?.name || "Produto";
      const sizeName = item.product_size?.name || "";
      const toppingsNames = item.toppings?.map((t: any) => t.topping?.name).filter(Boolean).join(", ");
      
      let description = productName;
      if (sizeName) description += ` - ${sizeName}`;
      if (toppingsNames) description += ` + ${toppingsNames}`;
      if (item.notes) description += ` (${item.notes})`;

      return {
        quantity: item.quantity,
        price: Math.round(item.subtotal * 100), // Convert to centavos
        description: description.substring(0, 100), // Limit description length
      };
    });

    // Add delivery fee as item if applicable
    if (order.delivery_fee > 0) {
      items.push({
        quantity: 1,
        price: Math.round(order.delivery_fee * 100),
        description: "Taxa de entrega",
      });
    }

    // Calculate total amount in centavos
    const amount = Math.round(order.total_amount * 100);
    const order_nsu = orderId; // Use order_id as stable NSU

    // Build customer data
    const customer = order.customer ? {
      name: order.customer.name,
      email: order.customer.email || undefined,
      phone: order.customer.phone || undefined,
    } : undefined;

    // Build address data
    const address = order.delivery_address ? {
      street: order.delivery_address.street,
      number: order.delivery_address.number,
      complement: order.delivery_address.complement || undefined,
      neighborhood: order.delivery_address.neighborhood,
      city: order.delivery_address.city,
      state: order.delivery_address.state,
      zipcode: order.delivery_address.zipcode,
    } : undefined;

    // Get app URL for redirect
    const appUrl = Deno.env.get("APP_URL") || "https://xjibukpltjwijyecklio.lovableproject.com";
    const redirect_url = `${appUrl}/checkout/infinitepay/success`;
    const webhook_url = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    // Build InfinitePay payload
    const infinitePayPayload = {
      handle: INFINITEPAY_HANDLE,
      items,
      order_nsu,
      redirect_url,
      webhook_url,
      ...(customer && { customer }),
      ...(address && { address }),
    };

    console.log(`[${requestId}] Calling InfinitePay API with order_nsu: ${order_nsu}`);
    console.log(`[${requestId}] Payload:`, JSON.stringify(infinitePayPayload));

    // Call InfinitePay API
    const infinitePayResponse = await fetch(INFINITEPAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(infinitePayPayload),
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
      parsedResponse = { checkout_url: infinitePayData };
    }

    const checkoutUrl = parsedResponse.checkout_url || parsedResponse.url || parsedResponse;
    const invoice_slug = parsedResponse.invoice_slug || parsedResponse.slug || null;

    // Upsert checkout record
    const checkoutData = {
      user_id: user.id,
      order_id: orderId,
      order_nsu,
      invoice_slug,
      amount,
      status: "LINK_GENERATED",
      items: items,
      customer: customer || null,
      address: address || null,
      checkout_url: typeof checkoutUrl === 'string' ? checkoutUrl : JSON.stringify(checkoutUrl),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("infinitepay_checkouts")
      .upsert(checkoutData, { onConflict: "user_id,order_id" });

    if (upsertError) {
      console.error(`[${requestId}] Error saving checkout:`, upsertError);
      // Continue anyway - we still have the checkout URL
    }

    console.log(`[${requestId}] Checkout created successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: typeof checkoutUrl === 'string' ? checkoutUrl : JSON.stringify(checkoutUrl),
        order_nsu,
        invoice_slug,
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
