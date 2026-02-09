
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPdvProducts() {
    console.log('Seeding PDV Products from Catalog...');

    // 1. Fetch existing products and sizes
    const { data: products, error: pError } = await supabase
        .from('products')
        .select(`
            id,
            name,
            category:categories(name),
            sizes:product_sizes(id, name, price)
        `)
        .eq('active', true);

    if (pError) {
        console.error('Error fetching products:', pError);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found to seed.');
        return;
    }

    console.log(`Found ${products.length} products. Processing...`);

    let count = 0;

    for (const product of products) {
        if (product.sizes && product.sizes.length > 0) {
            // Create a PDV product for each size
            for (const size of product.sizes) {
                const pdvName = `${product.name} ${size.name}`;
                // Check if exists
                const { data: existing } = await supabase
                    .from('pdv_products')
                    .select('id')
                    .eq('linked_product_id', product.id)
                    .ilike('name', pdvName)
                    .maybeSingle();

                if (!existing) {
                    const { error: insertError } = await supabase.from('pdv_products').insert({
                        linked_product_id: product.id,
                        name: pdvName,
                        category: product.category?.name || 'Geral',
                        price: size.price,
                        is_active: true,
                        // basic SKU generation
                        code: `PROD-${product.id.substring(0, 4).toUpperCase()}-${size.id.substring(0, 4).toUpperCase()}`
                    });

                    if (insertError) console.error(`Error inserting ${pdvName}:`, insertError.message);
                    else count++;
                }
            }
        } else {
            // Product without explicit sizes (maybe sold as unit if logic allows, but here schema says sizes mandatory? 
            // In migration, product_sizes is separate. 
            // If product has no sizes, maybe it's not sellable or price is on product? 
            // Check schema again: products table WITHOUT price. So MUST have size.
            // If no sizes, skip.
        }
    }

    console.log(`Seeding complete. Added ${count} new PDV products.`);
}

seedPdvProducts();
