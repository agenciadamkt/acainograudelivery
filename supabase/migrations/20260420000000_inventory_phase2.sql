-- Migration: Inventory Phase 2 (Checklists & Scheduled Counts)
-- Date: 2026-04-20

-- 1. DAILY CHECKLISTS
CREATE TABLE IF NOT EXISTS public.inventory_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.inventory_checklists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'boolean' CHECK (type IN ('boolean', 'number', 'text', 'photo')),
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.inventory_checklists(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'completed',
  completed_at TIMESTAMPTZ DEFAULT now(),
  date_reference DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS public.inventory_checklist_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.inventory_checklist_responses(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_checklist_items(id) ON DELETE CASCADE,
  value_text TEXT,
  value_boolean BOOLEAN,
  value_number NUMERIC,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SCHEDULED COUNTS
CREATE TABLE IF NOT EXISTS public.inventory_count_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8D42DD',
  frequency_days INT NOT NULL DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_count_group_items (
  group_id UUID NOT NULL REFERENCES public.inventory_count_groups(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_count_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.inventory_count_groups(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STORAGE BUCKET FOR CHECKLIST PHOTOS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-photos', 'checklist-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Checklist photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'checklist-photos');

CREATE POLICY "Authenticated users can upload checklist photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'checklist-photos' AND auth.role() = 'authenticated');

-- 4. ENABLE RLS
ALTER TABLE public.inventory_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_checklist_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_schedule ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
CREATE POLICY "Manage checkists" ON public.inventory_checklists FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage items" ON public.inventory_checklist_items FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage responses" ON public.inventory_checklist_responses FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage values" ON public.inventory_checklist_values FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage count groups" ON public.inventory_count_groups FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage count group items" ON public.inventory_count_group_items FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage count schedule" ON public.inventory_count_schedule FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- 5. FUNCTION TO CALCULATE NEXT MONDAY
CREATE OR REPLACE FUNCTION get_next_monday(from_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
  RETURN from_date + ((8 - extract(dow from from_date)::int) % 7);
END;
$$ LANGUAGE plpgsql;

-- 5. UPDATED_AT TRIGGERS
CREATE TRIGGER update_inventory_checklists_updated_at BEFORE UPDATE ON public.inventory_checklists FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inventory_count_groups_updated_at BEFORE UPDATE ON public.inventory_count_groups FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
