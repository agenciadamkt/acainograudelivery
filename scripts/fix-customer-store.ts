
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

async function fixCustomerStore() {
    const customerId = '55b8bff5-d1ef-457a-9adc-d1bf153187c0'; // Eder Rodrigues
    const storeId = '2f46c413-56e9-4dc4-b849-ce1eb5f797b5'; // Açaí no Grau Picos

    console.log(`Assigning customer ${customerId} to store ${storeId}...`);

    const { error } = await supabase
        .from('customers')
        .update({ store_id: storeId })
        .eq('id', customerId);

    if (error) {
        console.error('Error updating customer:', error);
    } else {
        console.log('✅ Customer store updated successfully.');
    }

    // Double check
    const { data: customer } = await supabase
        .from('customers')
        .select('id, name, store_id')
        .eq('id', customerId)
        .single();

    console.log('Updated customer:', customer);
}

fixCustomerStore();
