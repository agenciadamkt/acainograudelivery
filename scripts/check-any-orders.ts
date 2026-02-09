
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnyOrders() {
    console.log(`Checking orders for ANY store...`);

    const { data: latestOrders, error } = await supabase
        .from('orders')
        .select('id, store_id, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        console.log(`Found ${latestOrders?.length} latest orders globally.`);
        latestOrders?.forEach(o => console.log(`- Store: ${o.store_id} | ${o.created_at}: R$ ${o.total_amount}`));
    }
}

checkAnyOrders();
