
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

async function checkSchema() {
    console.log('Checking Schema...');

    const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (customer && customer.length > 0) {
        console.log('Customer columns:', Object.keys(customer[0]));
    } else {
        console.log('Customers table empty');
    }

    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (order && order.length > 0) {
        console.log('Order columns:', Object.keys(order[0]));
    }

    const { data: segment, error: segError } = await supabase
        .from('customer_segments')
        .select('*')
        .limit(1);

    if (segError) {
        console.log('Segments table error:', segError.message);
    } else if (segment && segment.length > 0) {
        console.log('Segment columns:', Object.keys(segment[0]));
    } else {
        console.log('Segments table empty');
    }

    const { data: coupon, error: coupError } = await supabase
        .from('coupons')
        .select('*')
        .limit(1);

    if (coupError) {
        console.log('Coupons table error:', coupError.message);
    } else if (coupon && coupon.length > 0) {
        console.log('Coupon columns:', Object.keys(coupon[0]));
    } else {
        console.log('Coupons table empty');
    }
}

checkSchema();
