-- Ensure public access to topping categories and toppings tables
-- This is critical for the store menu to display toppings for unauthenticated users

-- Topping Categories
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for topping_categories" ON public.topping_categories;
CREATE POLICY "Public read access for topping_categories" 
ON public.topping_categories FOR SELECT USING (true);


-- Toppings
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for toppings" ON public.toppings;
CREATE POLICY "Public read access for toppings" 
ON public.toppings FOR SELECT USING (true);

-- Ensure products are also readable (just in case)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for products" ON public.products;
CREATE POLICY "Public read access for products" 
ON public.products FOR SELECT USING (true);
