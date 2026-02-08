
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCustomer() {
    const name = 'Eder';
    console.log(`Searching for customer with name like %${name}%...`);

    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, phone, store_id, created_at')
        .ilike('name', `%${name}%`);

    if (error) {
        console.error('Error fetching customers:', error);
        return;
    }

    if (customers && customers.length > 0) {
        console.log(`Found ${customers.length} customers:`);
        customers.forEach(c => {
            console.log(`- ${c.name} (ID: ${c.id}) - Store ID: ${c.store_id || 'NULL'} - Phone: ${c.phone}`);
        });
    } else {
        console.log('No customers found.');
    }
}

findCustomer();
