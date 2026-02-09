
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Listing tables...');

    // Query to get all table names in the public schema
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.error('Error listing tables:', error);
        // Fallback: try to select from a few expected tables to see if they exist
        const expectedTables = ['pdv_orders', 'products', 'orders'];
        for (const table of expectedTables) {
            const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
            console.log(`Table '${table}' exists: ${!tableError}`);
        }
    } else {
        console.log('Tables found:', data?.map(t => t.table_name).sort());
    }
}

listTables();
