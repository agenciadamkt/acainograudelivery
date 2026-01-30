-- Execute este comando no Editor SQL do Supabase para ter a coluna dedicada de ID de pagamento
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id text;
