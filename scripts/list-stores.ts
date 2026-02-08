
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

async function listStores() {
    console.log('Listing Stores...');

    const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name, slug');

    if (error) {
        console.error('Error fetching stores:', error);
        return;
    }

    if (stores && stores.length > 0) {
        console.log(`Found ${stores.length} stores:`);
        stores.forEach(s => {
            console.log(`- ${s.name} (ID: ${s.id}) - Slug: ${s.slug}`);
        });
    } else {
        console.log('No stores found.');
    }
}

listStores();
