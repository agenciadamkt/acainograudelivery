DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the first user (likely admin) to be the author
    SELECT id INTO admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    -- ANNOUNCEMENTS (Anúncio Oficial / announcement)
    INSERT INTO public.community_posts (user_id, content, type, created_at) VALUES
    (admin_id, '🚀 Nova Campanha de Sazonalidade: O "Festival de Toppings" começa na próxima segunda-feira! Preparem seus estoques de frutas vermelhas e granola especial.', 'announcement', NOW() - INTERVAL '2 days'),
    (admin_id, '📢 Atenção Franqueados: Atualização no sistema de PDV programada para domingo às 03:00h da manhã. O sistema ficará indisponível por cerca de 30 minutos.', 'announcement', NOW() - INTERVAL '5 days'),
    (admin_id, '🏆 Convenção Anual 2026 confirmada! Será realizada em Fortaleza-CE nos dias 15 e 16 de Outubro. Garanta sua presença!', 'announcement', NOW() - INTERVAL '1 week');

    -- SUCCESS CASES (Case de Sucesso / case)
    INSERT INTO public.community_posts (user_id, content, type, created_at) VALUES
    (admin_id, '📊 A unidade de Teresina-Shopping aumentou o ticket médio em 18% apenas reorganizando a disposição dos adicionais no balcão. Uma mudança simples com grande impacto!', 'case', NOW() - INTERVAL '1 day'),
    (admin_id, '🌟 Parabéns à equipe da Loja Centro-Sul pela nota 4.9 no iFood pelo terceiro mês consecutivo! O segredo? Bilhetinhos personalizados em cada entrega.', 'case', NOW() - INTERVAL '3 days'),
    (admin_id, '💡 A franquia de Imperatriz reduziu o desperdício de frutas em 30% implementando o controle rigoroso de validade (PVPS) que ensinamos na Universidade. Exemplo a ser seguido!', 'case', NOW() - INTERVAL '6 days');

    -- OPERATIONAL TIPS (Dica Operacional / tip)
    INSERT INTO public.community_posts (user_id, content, type, created_at) VALUES
    (admin_id, '💡 Dica do Dia: Mantenha o freezer de açaí sempre entre -18ºC e -20ºC para garantir a textura perfeita. Temperaturas mais altas podem cristalizar o produto.', 'tip', NOW() - INTERVAL '4 hours'),
    (admin_id, '🌧️ Dias de chuva costumam derrubar o movimento em loja física. Que tal criar uma promoção relâmpago de "Entrega Grátis" no raio de 2km para manter os pedidos saindo?', 'tip', NOW() - INTERVAL '2 days'),
    (admin_id, '🧼 Lembre-se: A limpeza do bico da máquina de açaí expresso deve ser feita a cada 4 horas para evitar contaminação e manter o sabor puro.', 'tip', NOW() - INTERVAL '1 week');

END $$;
