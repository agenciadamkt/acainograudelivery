-- Suporte a campanhas de push nativo no módulo de Marketing, ao lado das
-- campanhas de WhatsApp já existentes em scheduled_campaigns/marketing_campaigns.
-- 'title' é exclusivo de push (WhatsApp não tem título separado, só a
-- mensagem) — fica NULL em campanhas de canal 'whatsapp'.

ALTER TABLE public.scheduled_campaigns
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'push')),
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'push')),
  ADD COLUMN IF NOT EXISTS title TEXT;
