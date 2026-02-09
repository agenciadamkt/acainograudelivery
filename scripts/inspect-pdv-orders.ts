
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    console.log('Inspecting pdv_orders schema...');
    // Fetch a single row to see columns
    const { data, error } = await supabase
        .from('pdv_orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching pdv_orders:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table exists but is empty. Cannot infer columns from data.');
            // Fallback: try to insert a dummy row to get column error? No, too risky.
            // We will assume the user's provided spec matches the DB or we'll find out during dev.
        }
    }
}

inspectTable();
