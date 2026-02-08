
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

async function checkRemarketingStatus() {
    console.log('Checking Remarketing Logs...');

    // 1. Check recent logs in marketing_logs
    // Look for automated remarketing entries
    const { data: logs, error } = await supabase
        .from('marketing_logs' as any)
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching logs:', error);
    } else {
        console.log(`Found ${logs?.length || 0} recent log entries.`);
        if (logs && logs.length > 0) {
            logs.forEach((log: any) => {
                console.log(`- [${new Date(log.sent_at).toLocaleString()}] Campaign: ${log.campaign_name || 'N/A'} - Status: ${log.status}`);
            });
        } else {
            console.log('No recent logs found. The automation might not be triggering or no eligible customers found.');
        }
    }

    // 2. Check scheduled_campaigns for any pending/processing items
    const { data: scheduled, error: schedError } = await supabase
        .from('scheduled_campaigns' as any)
        .select('*')
        .in('status', ['pending', 'processing'])
        .limit(5);

    if (schedError) {
        console.error('Error fetching scheduled campaigns:', schedError);
    } else {
        console.log(`Found ${scheduled?.length || 0} pending/processing scheduled campaigns.`);
        if (scheduled && scheduled.length > 0) {
            scheduled.forEach((s: any) => {
                console.log(`- [${s.id}] ${s.name} - Status: ${s.status} (Scheduled for: ${s.scheduled_for})`);
            });
        }
    }

    // 3. Check for recent delivered orders (last 72h) to see potential candidates
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data: recentOrders, error: orderError } = await supabase
        .from('orders')
        .select('id, created_at, updated_at, status, customer:customers(name)')
        .eq('status', 'delivered')
        .gte('updated_at', threeDaysAgo)
        .order('updated_at', { ascending: false });

    if (orderError) {
        console.error('Error fetching recent orders:', orderError);
    } else {
        console.log(`Found ${recentOrders?.length || 0} orders delivered in the last 72h.`);
        if (recentOrders && recentOrders.length > 0) {
            recentOrders.forEach((o: any) => {
                const deliveryTime = new Date(o.updated_at);
                const hoursSinceDelivery = Math.round((Date.now() - deliveryTime.getTime()) / (1000 * 60 * 60));
                console.log(`- Order #${o.id.substring(0, 8)} (${o.customer?.name}) - Delivered ${hoursSinceDelivery}h ago (${deliveryTime.toLocaleString()})`);
            });
        }
    }
}

checkRemarketingStatus();
