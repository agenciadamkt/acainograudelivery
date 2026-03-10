-- Migration: Add Payment Methods to Cash Closings
-- Request: Add credit_card, debit_card, and pix to cash_closings table

ALTER TABLE public.cash_closings 
ADD COLUMN credit_card_value DECIMAL(12,2) DEFAULT 0,
ADD COLUMN debit_card_value DECIMAL(12,2) DEFAULT 0,
ADD COLUMN pix_value DECIMAL(12,2) DEFAULT 0;
