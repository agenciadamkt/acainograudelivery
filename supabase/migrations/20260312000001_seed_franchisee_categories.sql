-- Seed categories for franchisee ordering system
INSERT INTO public.franchisee_product_categories (name, active, display_order)
VALUES 
    ('Açaís & Cremes', true, 1),
    ('Potes', true, 2),
    ('Sorvetes', true, 3),
    ('Paletas', true, 4),
    ('Toppings', true, 5),
    ('Descartáveis e Limpeza', true, 6),
    ('Utensílios', true, 7),
    ('Bombons', true, 8),
    ('Recheios', true, 9),
    ('Cereais & Castanhas', true, 10),
    ('Coberturas', true, 11),
    ('Brindes', true, 12)
ON CONFLICT (name) DO UPDATE SET active = true;
