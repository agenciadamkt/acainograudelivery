
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    const storeId = '2f46c413-56e9-4dc4-b849-ce1eb5f797b5'; // Picos

    console.log(`Checking ALL orders for store ${storeId}...`);

    const { data: latestOrders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        console.log(`Found ${latestOrders?.length} latest orders.`);
        latestOrders?.forEach(o => console.log(`- ${o.created_at}: R$ ${o.total_amount} (${o.status})`));
    }

    const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

    console.log(`Total orders all time: ${count}`);
}

checkOrders();
