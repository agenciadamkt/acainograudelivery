
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPdvTables() {
    const tables = [
        'pdv_orders',
        'pdv_order_items',
        'pdv_products',
        'pdv_tables',
        'pdv_settings',
        'pdv_cash_registers',
        'pdv_cash_movements',
        'delivery_platforms',
        'product_delivery_prices'
    ];

    console.log('Checking PDV tables...');

    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        console.log(`Table '${table}' exists: ${!error}`);
        if (error) console.log(`  Error for ${table}: ${error.code} - ${error.message}`);
    }
}

checkPdvTables();
