-- ====================================================
-- GrauOS Copilot — Fase 0: seed de copilot_knowledge a partir do
-- manual operacional já escrito em src/pages/admin/GlobalHelpPage.tsx
-- (extração mecânica via scripts/generate-copilot-knowledge-seed.ts,
-- sem reescrever/inventar conteúdo — mesmo texto já usado na Central
-- de Ajuda do GrauOS).
-- ====================================================

INSERT INTO public.copilot_knowledge (category, title, content, module, route_pattern, tags)
VALUES
    ('ajuda_tela', 'PDV — Frente de Caixa — Nova Venda', 'Registro de vendas no balcão com ou sem mesa.

Passo a passo:
1. Acesse PDV → Nova Venda no menu lateral.
2. Selecione os produtos clicando nos cards do cardápio. Use as categorias no topo para filtrar.
3. Ajuste a quantidade de cada item usando os botões + e − no carrinho à direita.
4. Adicione complementos (toppings) quando solicitado pelo cliente — clique no produto e selecione os extras.
5. Aplique desconto ou cupom se necessário no campo de desconto do carrinho.
6. Selecione a forma de pagamento: Dinheiro, Cartão de Débito, Cartão de Crédito ou PIX.
7. Clique em "Finalizar Venda". O sistema registra a venda, baixa o estoque (via CMV) e imprime o comprovante. (Dica: O comprovante é enviado para a impressora configurada nas Configurações PDV.)
8. Para cancelar um item do carrinho, clique no ícone de lixeira ao lado do item. (Atenção: Após finalizar a venda, o cancelamento deve ser feito pelo histórico do caixa.)

Dicas gerais:
- Configure os atalhos de teclado nas Configurações PDV para agilizar o atendimento.
- Produtos com estoque zerado aparecem com indicação visual — cadastre o estoque mínimo para receber alertas antes da ruptura.', 'pdv', '/admin/pdv/nova-venda', ARRAY['pdv', 'nova-venda']::text[]),
    ('ajuda_tela', 'PDV — Frente de Caixa — Mesas', 'Gestão de pedidos por mesa com controle de tempo e status.

Passo a passo:
1. Acesse PDV → Mesas no menu lateral.
2. Visualize todas as mesas: verde = livre, amarelo = ocupada, vermelho = aguardando pagamento.
3. Clique em uma mesa livre para abrir um novo pedido vinculado a ela.
4. Adicione produtos normalmente como em Nova Venda. O pedido fica associado à mesa até o pagamento.
5. Para dividir a conta, use a opção "Dividir" antes de finalizar.
6. Ao fechar a mesa, selecione a forma de pagamento e confirme. A mesa volta ao status livre automaticamente.

Dicas gerais:
- O tempo de permanência de cada mesa é exibido para ajudar na gestão do giro de clientes.', 'pdv', '/admin/pdv/mesas', ARRAY['pdv', 'mesas']::text[]),
    ('ajuda_tela', 'PDV — Frente de Caixa — Caixa', 'Abertura, sangria, suprimento e fechamento do caixa do dia.

Passo a passo:
1. Acesse PDV → Caixa no menu lateral.
2. Informe o valor de abertura (troco inicial) e clique em "Abrir Caixa" no início do turno. (Atenção: O caixa precisa estar aberto para registrar vendas.)
3. Durante o turno, registre sangrias (retiradas) e suprimentos (depósitos) conforme necessário.
4. No fechamento, confira o saldo: o sistema mostra o esperado vs. o contado.
5. Informe o valor físico contado para cada forma de pagamento e confirme o fechamento.
6. O relatório de fechamento é gerado automaticamente e salvo no histórico financeiro.

Dicas gerais:
- Realize o fechamento de caixa diariamente para manter o fluxo financeiro preciso.', 'pdv', '/admin/pdv/caixa', ARRAY['pdv', 'caixa']::text[]),
    ('ajuda_tela', 'PDV — Frente de Caixa — Histórico PDV', 'Consulta e cancelamento de vendas realizadas.

Passo a passo:
1. Acesse PDV → Histórico no menu lateral.
2. Filtre por data, forma de pagamento ou operador para localizar vendas específicas.
3. Clique em uma venda para ver os detalhes: itens, valor, hora, operador e forma de pagamento.
4. Para cancelar uma venda, clique em "Cancelar" dentro dos detalhes — informe o motivo. (Atenção: Cancelamentos ficam registrados com o nome do operador para auditoria.)', 'pdv', '/admin/pdv/historico', ARRAY['pdv', 'historico-pdv']::text[]),
    ('ajuda_tela', 'Operação — Dashboard Operacional', 'Visão geral em tempo real da operação: pedidos, vendas e desempenho do dia.

Passo a passo:
1. Acesse Operação → Dashboard no menu lateral.
2. Acompanhe os pedidos em tempo real: novos, em preparo, prontos e entregues.
3. Monitore o faturamento do dia, ticket médio e número de pedidos.
4. Clique em qualquer card de pedido para ver os detalhes e atualizar o status.

Dicas gerais:
- Deixe o dashboard aberto em um monitor dedicado durante a operação para visibilidade em tempo real.', 'operacao', '/admin/dashboard', ARRAY['operacao', 'dashboard-op']::text[]),
    ('ajuda_tela', 'Operação — Pedidos Online', 'Gerenciamento dos pedidos recebidos pelo app e delivery.

Passo a passo:
1. Acesse Operação → Pedidos no menu lateral.
2. Os pedidos chegam automaticamente. Aceite clicando em "Confirmar" ou recuse com motivo.
3. Avance o status conforme a etapa: Recebido → Em Preparo → Pronto → Entregue.
4. Para pedidos de entrega, acione o entregador na etapa "Pronto para Retirada".
5. O cliente recebe notificações automáticas a cada mudança de status. (Dica: Configure o tempo estimado de entrega nas Configurações Gerais.)', 'operacao', '/admin/orders', ARRAY['operacao', 'pedidos']::text[]),
    ('ajuda_tela', 'Operação — KDS — Cozinha', 'Tela de produção da cozinha com fila de pedidos em tempo real.

Passo a passo:
1. Acesse Operação → KDS Cozinha no menu lateral (ou abra em um monitor da cozinha).
2. Cada card representa um pedido com os itens a preparar e o tempo decorrido.
3. Clique em "Pronto" para marcar o pedido como concluído — ele sai da fila do KDS.
4. Pedidos com mais de X minutos ficam destacados em vermelho (tempo configurável). (Dica: O KDS funciona melhor em tablet ou monitor dedicado na cozinha, sem o menu lateral.)', 'operacao', '/admin/kds', ARRAY['operacao', 'kds']::text[]),
    ('ajuda_tela', 'Operação — Entregas', 'Controle de pedidos em rota, rastreamento e gestão de entregadores.

Passo a passo:
1. Acesse Operação → Entregas no menu lateral.
2. Visualize todos os pedidos em rota com endereço e tempo estimado.
3. Atribua pedidos a entregadores disponíveis clicando em "Despachar".
4. Confirme a entrega quando o entregador retornar ou via confirmação do cliente.', 'operacao', '/admin/delivery', ARRAY['operacao', 'entregas']::text[]),
    ('ajuda_tela', 'Operação — Áreas de Entrega', 'Configuração de raio, bairros atendidos e taxas de entrega por zona.

Passo a passo:
1. Acesse Operação → Áreas de Entrega no menu lateral (requer perfil Gerente).
2. Desenhe no mapa as zonas de entrega ou adicione bairros manualmente.
3. Defina a taxa de entrega para cada zona e o tempo estimado.
4. Ative ou desative zonas conforme a disponibilidade de entregadores. (Atenção: Desativar uma zona afeta imediatamente os pedidos futuros daquela região.)', 'operacao', '/admin/delivery/areas', ARRAY['operacao', 'areas-entrega']::text[]),
    ('ajuda_tela', 'Operação — Frota & Rotas', 'Gestão de entregadores, criação de rotas diárias e relatório de rotas realizadas.

Passo a passo:
1. Acesse Operação → Frota no menu lateral.
2. Na aba "Rota do Dia": clique em "Nova Rota" para criar uma rota e adicione os pedidos que serão entregues nessa saída.
3. Atribua um motorista à rota e inicie o trajeto. O sistema exibe o mapa com os pontos de entrega.
4. Confirme cada entrega na sequência para registrar a conclusão do ponto.
5. Na aba "Relatório de Rotas": filtre por período, motorista ou status para analisar o histórico de entregas. (Dica: Agrupe pedidos por proximidade geográfica para reduzir o tempo de rota e o custo de combustível.)

Dicas gerais:
- Crie a rota do dia antes do horário de pico para que o entregador já saia organizado.', 'operacao', '/admin/frota', ARRAY['operacao', 'frota']::text[]),
    ('ajuda_tela', 'Cardápio — Categorias', 'Organização dos produtos em grupos visíveis no app e PDV.

Passo a passo:
1. Acesse Cardápio → Categorias no menu lateral.
2. Clique em "Nova Categoria" e informe o nome, ícone/imagem e ordem de exibição.
3. Ative ou desative categorias — categorias inativas não aparecem para o cliente.
4. Arraste as categorias para reordenar a exibição no app. (Dica: Coloque as categorias mais vendidas no topo para facilitar a navegação do cliente.)', 'cardapio', '/admin/menu/categories', ARRAY['cardapio', 'categorias']::text[]),
    ('ajuda_tela', 'Cardápio — Produtos', 'Cadastro, edição e gestão de disponibilidade de todos os produtos.

Passo a passo:
1. Acesse Cardápio → Produtos no menu lateral.
2. Clique em "Novo Produto" e preencha: nome, descrição, categoria, preço e foto.
3. Vincule os complementos disponíveis para este produto (toppings).
4. Defina se o produto aceita personalização e quais complementos são obrigatórios.
5. Ative ou desative a disponibilidade do produto com o toggle — útil para itens sazonais ou em falta. (Dica: Adicione fotos de alta qualidade — produtos com foto vendem até 3x mais.)
6. Use o campo "Destaque" para marcar produtos que aparecem em banners ou seções especiais.

Dicas gerais:
- Mantenha as descrições claras e com os ingredientes principais para ajudar na decisão de compra.', 'cardapio', '/admin/menu/products', ARRAY['cardapio', 'produtos']::text[]),
    ('ajuda_tela', 'Cardápio — Complementos (Toppings)', 'Configuração dos extras e personalizações oferecidas com os produtos.

Passo a passo:
1. Acesse Cardápio → Complementos no menu lateral.
2. Crie grupos de complementos: ex: "Frutas", "Caldas", "Acompanhamentos".
3. Para cada grupo, defina se é obrigatório, o mínimo e máximo de seleções.
4. Adicione os itens de cada grupo com nome, preço adicional e disponibilidade.
5. Vincule os grupos aos produtos no cadastro do produto. (Dica: Grupos sem preço adicional (R$ 0,00) incentivam o cliente a personalizar sem resistência.)', 'cardapio', '/admin/menu/toppings', ARRAY['cardapio', 'complementos']::text[]),
    ('ajuda_tela', 'Cardápio — Ingredientes', 'Cadastro de ingredientes para composição de receitas e controle alérgenos.

Passo a passo:
1. Acesse Cardápio → Ingredientes no menu lateral.
2. Cadastre cada ingrediente com nome, unidade e informações nutricionais/alérgenos.
3. Vincule ingredientes aos produtos para exibir no app e controlar receitas.', 'cardapio', '/admin/menu/ingredients', ARRAY['cardapio', 'ingredientes']::text[]),
    ('ajuda_tela', 'Cardápio — Promoções', 'Criação de cupons, descontos e ofertas por tempo limitado.

Passo a passo:
1. Acesse Cardápio → Promoções no menu lateral.
2. Clique em "Nova Promoção" e escolha o tipo: Desconto %, Valor fixo ou Frete grátis.
3. Defina a validade (data início e fim), o limite de usos e os produtos elegíveis.
4. Para cupons, gere um código único para divulgar nas redes sociais.
5. Ative ou desative promoções manualmente a qualquer momento. (Atenção: Promoções ativas afetam diretamente a margem — verifique o impacto no CMV antes de ativar.)', 'cardapio', '/admin/promotions', ARRAY['cardapio', 'promocoes']::text[]),
    ('ajuda_tela', 'Financeiro — Dashboard Financeiro', 'Visão consolidada das finanças: receitas, despesas, saldo e metas.

Passo a passo:
1. Acesse Financeiro → Dashboard no menu lateral.
2. Visualize o saldo atual, receitas e despesas do mês por categoria.
3. Acompanhe os gráficos de evolução e compare períodos anteriores.
4. Use os filtros de período e centro de custo para análises específicas.

Dicas gerais:
- Acesse o Dashboard Financeiro semanalmente para monitorar a saúde financeira do negócio.', 'financeiro', '/admin/financeiro', ARRAY['financeiro', 'fin-dashboard']::text[]),
    ('ajuda_tela', 'Financeiro — Lançamentos (Fluxo de Caixa)', 'Registro manual de receitas e despesas avulsas.

Passo a passo:
1. Acesse Financeiro → Lançamentos no menu lateral.
2. Clique em "Novo Lançamento" e selecione o tipo: Receita ou Despesa.
3. Informe: valor, data, categoria, conta bancária/caixa, descrição e anexo (nota fiscal).
4. Para lançamentos recorrentes (aluguel, mensalidades), marque "Recorrente" e defina a periodicidade.
5. Confirme o pagamento/recebimento clicando em "Pago" quando o valor transitar. (Dica: Registre todas as despesas na data de vencimento — não só quando pagar — para ter DRE por competência.)

Dicas gerais:
- Use o campo de Observações para registrar o número da nota fiscal para facilitar auditorias.', 'financeiro', '/admin/financeiro/lancamentos', ARRAY['financeiro', 'lancamentos']::text[]),
    ('ajuda_tela', 'Financeiro — Fluxo Semanal', 'Visualização do fluxo de caixa dia a dia da semana atual.

Passo a passo:
1. Acesse Financeiro → Fluxo Semanal no menu lateral.
2. Visualize receitas e despesas agrupadas por dia da semana.
3. Identifique os dias de maior e menor movimentação para planejar compras e pagamentos.', 'financeiro', '/admin/financeiro/fluxo-semanal', ARRAY['financeiro', 'fluxo-semanal']::text[]),
    ('ajuda_tela', 'Financeiro — Despesas', 'Listagem e gestão de todas as despesas com filtros e exportação.

Passo a passo:
1. Acesse Financeiro → Despesas no menu lateral.
2. Filtre por período, categoria, centro de custo ou fornecedor.
3. Marque despesas como pagas clicando no ícone de check — o saldo é atualizado automaticamente.
4. Exporte as despesas em PDF para reuniões de análise ou envio ao contador.', 'financeiro', '/admin/financeiro/despesas', ARRAY['financeiro', 'despesas']::text[]),
    ('ajuda_tela', 'Financeiro — Fechamentos de Caixa', 'Histórico dos fechamentos de caixa com conferência de valores por turno.

Passo a passo:
1. Acesse Financeiro → Fechamentos no menu lateral.
2. Visualize todos os fechamentos realizados com data, operador e diferença de caixa.
3. Clique em um fechamento para ver os detalhes por forma de pagamento.
4. Diferenças positivas (sobra) ou negativas (falta) são destacadas para ação corretiva. (Atenção: Diferenças recorrentes indicam necessidade de treinamento do operador ou revisão do processo.)', 'financeiro', '/admin/financeiro/fluxo', ARRAY['financeiro', 'fechamento-caixa']::text[]),
    ('ajuda_tela', 'Financeiro — DRE — Demonstrativo de Resultado', 'Relatório gerencial de resultado por período: receita, custos, despesas e lucro.

Passo a passo:
1. Acesse Financeiro → DRE no menu lateral.
2. Selecione o período (mês/trimestre) para gerar o demonstrativo.
3. O DRE mostra: Receita Bruta → Deduções → Receita Líquida → CMV → Lucro Bruto → Despesas → EBITDA.
4. Use para identificar onde estão os maiores custos e oportunidades de melhoria. (Dica: Compare o DRE mês a mês para identificar tendências de crescimento ou deterioração.)
5. Exporte em PDF para apresentar ao contador ou sócios.

Dicas gerais:
- O DRE é a principal ferramenta de saúde financeira — analise mensalmente com toda a equipe de gestão.', 'financeiro', '/admin/financeiro/dre', ARRAY['financeiro', 'dre']::text[]),
    ('ajuda_tela', 'Financeiro — Contas a Receber', 'Gestão de valores a receber: parcelamentos, pendências e baixas.

Passo a passo:
1. Acesse Financeiro → Contas a Receber no menu lateral.
2. Visualize todos os recebimentos pendentes com data de vencimento.
3. Dê baixa manual ao receber o valor clicando em "Recebido".
4. Valores vencidos ficam destacados em vermelho para ação imediata.', 'financeiro', '/admin/financeiro/receber', ARRAY['financeiro', 'receber']::text[]),
    ('ajuda_tela', 'Financeiro — Cadastros Financeiros', 'Cadastro de contas bancárias, plano de contas, centros de custo, fornecedores e clientes.

Passo a passo:
1. Acesse Financeiro → Cadastros no menu lateral.
2. Cadastre suas contas bancárias (conta corrente, poupança, caixa físico).
3. Configure o Plano de Contas com as categorias de receita e despesa da sua operação.
4. Crie Centros de Custo para segregar despesas por área (ex: Cozinha, Delivery, Administrativo).
5. Cadastre fornecedores e clientes para vincular nos lançamentos. (Dica: Um bom plano de contas é a base de uma análise financeira precisa — configure antes de começar a lançar.)', 'financeiro', '/admin/financeiro/cadastros', ARRAY['financeiro', 'cadastros-fin']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Estoque Central', 'Cadastro e gestão de todos os insumos e matérias-primas.

Passo a passo:
1. Acesse Estoque → Estoque Central no menu lateral.
2. Clique em "Novo Insumo" para cadastrar: nome, unidade, estoque mínimo, custo, categoria e fornecedor.
3. Filtre por Categoria ou Fornecedor para localizar itens rapidamente.
4. Itens abaixo do mínimo aparecem com alerta laranja — ação imediata necessária.
5. Use "Importar do Catálogo" para trazer insumos cadastrados pela distribuidora. (Dica: A importação não duplica itens já existentes.)

Dicas gerais:
- Padronize as unidades de medida (sempre "cx", sempre "kg") para que os cálculos de CMV fiquem corretos.', 'estoque', '/admin/stock/inventory', ARRAY['estoque', 'est-inventory']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Movimentações', 'Registro de entradas e saídas com suporte a múltiplos itens por nota.

Passo a passo:
1. Clique em "Novo Registro" e selecione Entrada ou Saída.
2. Informe a data, classificação (Compra/NF, Consumo, Desperdício…) e observações/nº da NF.
3. Busque os insumos pelo nome no campo de busca de cada linha.
4. Adicione quantos itens precisar com "+ Adicionar Item" — toda a nota em um único registro.
5. Confirme para atualizar saldos e preço médio automaticamente. (Atenção: Movimentações confirmadas não podem ser desfeitas.)', 'estoque', '/admin/stock/movements', ARRAY['estoque', 'est-movements']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Contagem Física', 'Inventário físico com lançamento automático de saída por diferença.

Passo a passo:
1. Imprima a Lista de Contagem e entregue para a funcionária preencher.
2. A funcionária informa o que há fisicamente em cada item no campo "Contagem Real".
3. O sistema calcula a diferença: Sistema (15 cx) − Contagem (5 cx) = SAÍDA de 10 cx.
4. Clique em "Finalizar Auditoria", revise as divergências e confirme.
5. O sistema lança automaticamente os movimentos de Saída (Venda - Baixa Técnica) e atualiza os saldos.

Dicas gerais:
- Realize a contagem semanalmente no mesmo horário para manter consistência.', 'estoque', '/admin/stock/counts', ARRAY['estoque', 'est-counts']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Gestão de CMV', 'Custo da Mercadoria Vendida — percentual de custo sobre a receita.

Passo a passo:
1. Acesse Estoque → Gestão de CMV no menu lateral.
2. Acompanhe o CMV % total e por categoria de insumo.
3. Verde = eficiente / Amarelo = atenção / Vermelho = acima do esperado.
4. Analise quais produtos ou categorias têm maior impacto no CMV para tomar ações.

Dicas gerais:
- CMV ideal para açaí e complementos: entre 25% e 35% da receita. Acima de 40% exige revisão de preços ou fornecedores.', 'estoque', '/admin/stock/cmv', ARRAY['estoque', 'est-cmv']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Lista de Compras', 'Lista automática de reposição baseada no estoque mínimo.

Passo a passo:
1. Acesse Estoque → Lista de Compras no menu lateral.
2. O sistema lista os insumos abaixo do mínimo com a quantidade sugerida de reposição.
3. Ajuste as quantidades e exporte em PDF para enviar ao fornecedor.', 'estoque', '/admin/stock/purchases', ARRAY['estoque', 'est-purchases']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Histórico de Compras', 'Análise de todas as entradas do tipo Compra/NF com filtros e totais.

Passo a passo:
1. Selecione o período e filtre por Fornecedor e/ou Categoria.
2. Veja os cards de Total Gasto, Qtd Total e Ticket Médio por entrada.
3. Exporte o relatório em PDF com todos os filtros aplicados.', 'estoque', '/admin/stock/purchase-history', ARRAY['estoque', 'est-purchase-history']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Rotinas Operacionais', 'Checklists de abertura, operação e fechamento da loja.

Passo a passo:
1. Acesse Estoque → Rotinas Operacionais no menu lateral.
2. Selecione o checklist do período (Abertura / Operação / Fechamento).
3. Marque cada item conforme executado. Itens pendentes geram alertas no painel.
4. Gerentes gerenciam os checklists em Estoque → Gestão de Rotinas.

Dicas gerais:
- Execute na sequência: Abertura → Operação → Fechamento. Nunca pule etapas.', 'estoque', '/admin/stock/checklists/execution', ARRAY['estoque', 'est-checklists']::text[]),
    ('ajuda_tela', 'Estoque & Operações — Bonificações', 'Registro de produtos bonificados (amostras, brindes e trocas) recebidos de fornecedores.

Passo a passo:
1. Acesse Estoque → Bonificações no menu lateral.
2. Clique em "Nova Bonificação" e selecione o fornecedor e o período de referência.
3. Adicione os itens bonificados com quantidade e valor unitário correspondente.
4. Informe a justificativa (ex.: atingimento de meta de compra, promoção de lançamento).
5. Confirme o registro — o sistema dá entrada no estoque e registra a bonificação para controle financeiro. (Dica: Registre bonificações sempre que receber amostras para manter o estoque e o CMV precisos.)

Dicas gerais:
- Bonificações recorrentes de fornecedores são um indicativo de bom volume de compra — use esse dado nas negociações.', 'estoque', '/admin/stock/bonificacoes', ARRAY['estoque', 'bonificacoes']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — Clientes (CRM)', 'Base de clientes com histórico de pedidos, frequência e valor gasto.

Passo a passo:
1. Acesse Gestão → Clientes no menu lateral.
2. Visualize a lista de clientes com total gasto, número de pedidos e última compra.
3. Clique em um cliente para ver o histórico completo de pedidos.
4. Use os filtros para segmentar por frequência, valor ou período de cadastro.

Dicas gerais:
- Clientes com alta frequência são candidatos a programas de fidelidade — use os dados do CRM para personalizar ofertas.', 'clientes', '/admin/customers', ARRAY['clientes', 'clientes-crm']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — Avaliações NPS', 'Net Promoter Score — satisfação dos clientes por pedido.

Passo a passo:
1. Acesse Gestão → Avaliações NPS no menu lateral.
2. Visualize a nota média, distribuição de promotores/neutros/detratores.
3. Leia os comentários dos clientes e responda quando necessário.
4. Filtre por período para acompanhar a evolução da satisfação ao longo do tempo.

Dicas gerais:
- NPS acima de 50 é considerado bom. Acima de 75 é excelente para o setor de food service.', 'clientes', '/admin/feedback', ARRAY['clientes', 'nps']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — Campanhas de Marketing', 'Criação e gestão de campanhas promocionais e push notifications.

Passo a passo:
1. Acesse Marketing → Campanhas no menu lateral.
2. Clique em "Nova Campanha" e defina o público-alvo (todos, inativos, VIPs…).
3. Crie a mensagem e defina o canal: push notification, banner no app ou e-mail.
4. Agende a campanha ou publique imediatamente.
5. Acompanhe os resultados: taxa de abertura, cliques e conversão em pedidos. (Dica: Campanhas para clientes inativos (+30 dias sem pedido) têm alto retorno com desconto de reativação.)', 'clientes', '/admin/marketing', ARRAY['clientes', 'marketing']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — Food Analytics', 'Análise avançada de vendas por produto, horário, categoria e período.

Passo a passo:
1. Acesse Gestão → Food Analytics no menu lateral.
2. Analise os produtos mais vendidos e os de menor saída.
3. Identifique os horários de pico para otimizar a escala da equipe.
4. Compare períodos para detectar crescimento ou queda em categorias específicas.

Dicas gerais:
- Use o Food Analytics mensalmente para decisões de cardápio — retire produtos com baixa saída e invista nos campeões.', 'clientes', '/admin/analytics', ARRAY['clientes', 'analytics']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — CRM — Dashboard de Leads', 'Visão geral de leads: volume por origem, funil de conversão e evolução no período.

Passo a passo:
1. Acesse Clientes → CRM no menu lateral.
2. Selecione o período (semana, mês ou trimestre) para atualizar os indicadores.
3. Analise o funil: Novos → Atendimento → Proposta → Fechados.
4. Veja os gráficos de leads por origem (WhatsApp, Instagram, Site, Indicação) para saber de onde vêm os melhores clientes.
5. Use o botão Pipeline para gerenciar os leads ativos no kanban.', 'clientes', '/admin/crm', ARRAY['clientes', 'crm-dashboard']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — CRM — Pipeline', 'Kanban de leads com arraste entre estágios, notas e histórico de interações.

Passo a passo:
1. Acesse Clientes → CRM → Pipeline no menu lateral.
2. Visualize os leads em colunas por estágio: Novo, Em Atendimento, Proposta, Fechado.
3. Clique em um card de lead para ver o histórico de interações e adicionar notas.
4. Arraste o card para a próxima coluna ao avançar o estágio do lead.
5. Use o botão "Novo Lead" para cadastrar um lead manualmente com nome, origem e contato. (Dica: Registre o máximo de informações no primeiro contato — quanto mais contexto, maior a taxa de conversão.)

Dicas gerais:
- Leads sem movimentação por mais de 7 dias ficam destacados — faça follow-up imediato.', 'clientes', '/admin/crm/pipeline', ARRAY['clientes', 'crm-pipeline']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — CRM — Scripts de Vendas', 'Biblioteca de scripts de atendimento por categoria: abertura, objeção, fechamento.

Passo a passo:
1. Acesse Clientes → CRM → Scripts no menu lateral.
2. Filtre por categoria (Abertura, Objeção, Proposta, Follow-up, Fechamento) para localizar o script ideal.
3. Clique em "Copiar" para copiar o texto do script para a área de transferência e colar no WhatsApp.
4. Para criar um novo script: clique em "Novo Script", selecione a categoria, dê um título e escreva o texto.
5. Ative ou desative scripts com o toggle — scripts inativos não aparecem na lista principal. (Dica: Personalize os scripts com o nome do lead usando o marcador {nome} — a equipe substitui na hora do envio.)', 'clientes', '/admin/crm/scripts', ARRAY['clientes', 'crm-scripts']::text[]),
    ('ajuda_tela', 'Clientes & Marketing — Comunidade', 'Feed de posts entre unidades, ranking de performance e conquistas da rede.

Passo a passo:
1. Acesse Clientes → Comunidade no menu lateral.
2. No feed, veja os posts de outras unidades: cases de sucesso, dicas operacionais e comunicados.
3. Clique em "Novo Post" para compartilhar uma conquista ou dica com a rede.
4. Curta e comente posts de outras unidades para engajar com a comunidade.
5. Acesse o Ranking para ver a posição da sua unidade com base em faturamento e aulas concluídas. (Dica: Unidades no topo do ranking recebem destaque e podem ganhar bonificações da franqueadora.)

Dicas gerais:
- Compartilhe resultados reais e boas práticas — a troca de experiências entre unidades acelera o crescimento de toda a rede.', 'clientes', '/admin/comunidade', ARRAY['clientes', 'comunidade']::text[]),
    ('ajuda_tela', 'CAF — Central de Atendimento — Dashboard CAF', 'KPIs da central de atendimento: total de tickets, tempo médio de resolução e taxa de resolução.

Passo a passo:
1. Acesse CAF → Dashboard no menu lateral.
2. Visualize os indicadores do período: total de atendimentos, resolvidos, pendentes e tempo médio.
3. Analise o gráfico de atendimentos por categoria para identificar as áreas com mais demanda.
4. Use o filtro de período para comparar meses e acompanhar a evolução da eficiência.

Dicas gerais:
- Tempo médio de resolução acima de 48h indica necessidade de reforço na equipe ou na base de conhecimento.', 'caf', '/admin/caf/dashboard', ARRAY['caf', 'caf-dashboard']::text[]),
    ('ajuda_tela', 'CAF — Central de Atendimento — Atendimentos', 'Gestão de tickets abertos pelos franqueados com status, categoria, histórico e transferência.

Passo a passo:
1. Acesse CAF → Atendimentos no menu lateral.
2. Visualize todos os tickets atribuídos à sua categoria de atendimento. MASTER vê todos.
3. Clique em um ticket para abrir o painel de detalhes com 4 abas: Informações, Status & Ações, Pesquisa NPS e Histórico.
4. Na aba "Status & Ações": atualize o status (Aberto → Em Andamento → Aguardando Franqueado → Resolvido/Encerrado).
5. Use "Transferir Categoria" para mover o ticket para outra área responsável — informe o motivo da transferência. (Dica: Toda transferência e mudança de status fica registrada no Histórico do ticket para rastreabilidade.)
6. Na aba "Pesquisa": avalie a qualidade do atendimento com o score de satisfação ao encerrar.

Dicas gerais:
- Atendentes veem apenas tickets da(s) categoria(s) autorizada(s) no cadastro de usuário.
- Para abrir um novo ticket manualmente, clique em "Novo Atendimento" no topo da página.', 'caf', '/admin/caf/atendimentos', ARRAY['caf', 'caf-atendimentos']::text[]),
    ('ajuda_tela', 'CAF — Central de Atendimento — Base de Conhecimento', 'Biblioteca de artigos e tutoriais para resolução de dúvidas frequentes dos franqueados.

Passo a passo:
1. Acesse CAF → Base de Conhecimento no menu lateral.
2. Pesquise pelo título do artigo na barra de busca ou navegue pelas categorias.
3. Clique em um artigo para ler o conteúdo completo com passos e dicas.
4. Para criar um artigo (equipe CAF): clique em "Novo Artigo", preencha título, categoria e conteúdo em Markdown.
5. Publique ou salve como rascunho — apenas artigos publicados são visíveis para os franqueados. (Dica: Crie artigos para as dúvidas mais frequentes recebidas nos atendimentos — isso reduz o volume de tickets.)', 'caf', '/admin/caf/base-conhecimento', ARRAY['caf', 'caf-base-conhecimento']::text[]),
    ('ajuda_tela', 'CAF — Central de Atendimento — Relatórios CAF', 'Análise de atendimentos por período, categoria, atendente e status.

Passo a passo:
1. Acesse CAF → Relatórios no menu lateral.
2. Selecione o período de análise (mês, trimestre ou personalizado).
3. Filtre por categoria, status ou atendente para análises segmentadas.
4. Visualize os gráficos de volume por dia, distribuição por categoria e tempo médio de resolução.
5. Exporte o relatório em PDF para apresentar em reuniões de gestão. (Dica: Analise mensalmente quais categorias têm mais tickets — esse é o insumo para criar artigos na Base de Conhecimento.)', 'caf', '/admin/caf/relatorios', ARRAY['caf', 'caf-relatorios']::text[]),
    ('ajuda_tela', 'CAF — Central de Atendimento — Portal do Franqueado', 'Página pública para abertura de chamados sem necessidade de login no sistema.

Passo a passo:
1. Acesse o link app.acainograu.com.br/suporte em qualquer navegador (sem login).
2. Digite a senha de acesso fornecida pela franqueadora: nograu
3. Selecione a sua unidade na lista de lojas.
4. Preencha seu nome, cargo, categoria do problema e descrição detalhada.
5. Clique em "Abrir Chamado" — um número de protocolo será gerado e o ticket aparecerá automaticamente no painel da equipe CAF. (Dica: Guarde o número de protocolo para acompanhar o andamento do seu chamado com a equipe CAF.)

Dicas gerais:
- O Portal do Franqueado é o canal oficial para abertura de tickets quando o acesso ao sistema não está disponível.', 'caf', '/suporte', ARRAY['caf', 'portal-franqueado']::text[]),
    ('ajuda_tela', 'Franquia & Distribuição — Pedido de Insumos (Franqueado)', 'Catálogo de insumos da distribuidora para pedidos de reposição.

Passo a passo:
1. Acesse Franquia → Pedido de Insumos no menu lateral.
2. Navegue pelo catálogo de insumos disponibilizados pela distribuidora.
3. Adicione os itens desejados ao carrinho com as quantidades necessárias.
4. Revise o pedido e confirme. A distribuidora recebe o pedido automaticamente.
5. Acompanhe o status do pedido em Franquia → Meus Pedidos. (Dica: Faça os pedidos com antecedência mínima de 48h para garantir entrega no prazo.)', 'franquia', '/admin/orders/catalog', ARRAY['franquia', 'pedido-insumos']::text[]),
    ('ajuda_tela', 'Franquia & Distribuição — Meus Pedidos (Franqueado)', 'Histórico e status dos pedidos de insumos feitos à distribuidora.

Passo a passo:
1. Acesse Franquia → Meus Pedidos no menu lateral.
2. Visualize todos os pedidos com status: Pendente, Confirmado, Em Rota, Entregue.
3. Clique em um pedido para ver os detalhes dos itens e valores.
4. Confirme o recebimento quando a carga chegar para dar baixa no pedido.', 'franquia', '/admin/orders/history', ARRAY['franquia', 'meus-pedidos']::text[]),
    ('ajuda_tela', 'Franquia & Distribuição — Gestão de Cargas (Master)', 'Visão e gestão de todos os pedidos recebidos das unidades franqueadas.

Passo a passo:
1. Acesse Distribuição → Gestão de Cargas no menu lateral (apenas Master).
2. Visualize todos os pedidos das unidades com status e itens.
3. Confirme, separe e expeda os pedidos atualizando o status para "Em Rota".
4. Gere o romaneio de entrega para o motorista.', 'franquia', '/admin/orders/management', ARRAY['franquia', 'gestao-cargas']::text[]),
    ('ajuda_tela', 'Franquia & Distribuição — Catálogo de Insumos (Master)', 'Gestão dos produtos disponíveis para pedido pelas unidades.

Passo a passo:
1. Acesse Distribuição → Catálogo de Insumos no menu lateral (apenas Master).
2. Cadastre os insumos que serão disponibilizados às unidades franqueadas.
3. Defina preço, unidade e disponibilidade de cada item.
4. Itens desativados não aparecem no catálogo das unidades.', 'franquia', '/admin/orders/products', ARRAY['franquia', 'catalogo-insumos']::text[]),
    ('ajuda_tela', 'Franquia & Distribuição — Lista de Franqueados (Master)', 'Cadastro e gestão de todas as unidades franqueadas.

Passo a passo:
1. Acesse Distribuição → Lista de Franqueados no menu lateral (apenas Master).
2. Visualize todas as unidades com status, responsável e data de cadastro.
3. Clique em uma unidade para editar dados, ativar/desativar e gerenciar acesso.
4. Cadastre novas unidades com os dados do responsável e configurações iniciais.', 'franquia', '/admin/franchisees', ARRAY['franquia', 'franqueados']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Configurações Gerais', 'Dados da loja, integrações, formas de pagamento e configurações da conta.

Passo a passo:
1. Acesse Sistema → Configurações Gerais no menu lateral.
2. Na aba Loja: atualize nome, endereço, horários de funcionamento e logo.
3. Na aba Pagamentos: ative as formas de pagamento aceitas e configure taxas.
4. Na aba Entrega: defina o raio de entrega, tempo estimado e taxa mínima.
5. Na aba Impressora: configure a impressora térmica para comprovantes. (Dica: Teste a impressora sempre que trocar de equipamento ou instalar em novo dispositivo.)', 'sistema', '/admin/settings', ARRAY['sistema', 'config-geral']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Configurações PDV', 'Personalização do ponto de venda: layout, atalhos e comportamento.

Passo a passo:
1. Acesse Sistema → Configurações PDV no menu lateral.
2. Configure os atalhos de teclado para as ações mais frequentes.
3. Defina o comportamento padrão: abrir gaveta automaticamente, perguntar cpf, etc.
4. Ajuste o layout do PDV: tamanho dos cards, colunas e tema.', 'sistema', '/admin/pdv/configuracoes', ARRAY['sistema', 'config-pdv']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Universidade Grau', 'Trilhas de aprendizado para capacitação da equipe.

Passo a passo:
1. Acesse Sistema → Universidade no menu lateral.
2. Explore as trilhas de aprendizado disponíveis por área (Operação, Atendimento, Gestão).
3. Clique em uma trilha para ver os módulos e iniciar o treinamento.
4. Acompanhe seu progresso na barra de conclusão de cada trilha.
5. Gerentes podem criar novas trilhas em Gestão → Universidade (Admin). (Dica: Compartilhe as trilhas com novos funcionários no primeiro dia de trabalho.)', 'sistema', '/admin/universidade', ARRAY['sistema', 'universidade']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Performance', 'Indicadores de desempenho da equipe e da operação.

Passo a passo:
1. Acesse Sistema → Performance no menu lateral.
2. Acompanhe os KPIs individuais e coletivos da equipe.
3. Identifique oportunidades de melhoria por operador ou turno.', 'sistema', '/admin/performance', ARRAY['sistema', 'performance']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Usuários & Permissões', 'Cadastro de usuários, controle de perfis, permissões de módulos e auditoria de acessos.

Passo a passo:
1. Acesse Sistema → Usuários no menu lateral (requer perfil MASTER ou FRANQUEADO).
2. Clique em "Novo Usuário" para cadastrar: nome, e-mail, perfil (MASTER / FRANQUEADO / COLABORADOR) e loja.
3. Na aba "Permissões" do cadastro: ative os módulos a que o usuário terá acesso.
4. Na seção "Permissões de Atendimento": ative "Participa da CAF" e selecione as categorias de tickets que o usuário pode atender.
5. Use o botão de chave (🔑) na lista de usuários para enviar o e-mail de redefinição de senha. (Dica: O e-mail de redefinição de senha sempre aponta para o ambiente de produção (app.acainograu.com.br).)
6. Na aba "Auditoria" (MASTER): veja o histórico completo de criações, edições e desativações de usuários.

Dicas gerais:
- Perfil COLABORADOR: acesso restrito ao PDV e módulos específicos permitidos.
- Perfil FRANQUEADO: acesso à sua unidade e todos os módulos exceto configurações MASTER.
- Perfil MASTER: acesso total ao sistema, todas as unidades e dados consolidados.', 'sistema', '/admin/settings/usuarios', ARRAY['sistema', 'usuarios-permissoes']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Integração WhatsApp (UazAPI)', 'Configuração da integração com WhatsApp via UazAPI para notificações automáticas de pedidos.

Passo a passo:
1. Acesse Configurações → aba "WhatsApp" (UazAPI) nas Configurações Gerais.
2. Informe a URL base da sua instância UazAPI e o token de autenticação.
3. Clique em "Testar Conexão" para verificar se as credenciais estão corretas.
4. Selecione os eventos que disparam notificações: pedido recebido, confirmado, em preparo, pronto, saiu para entrega, entregue, cancelado.
5. Clique em "Aplicar Webhook" para registrar o endpoint do GrauOS na sua instância UazAPI. (Atenção: O número de WhatsApp conectado à instância receberá as mensagens — certifique-se de que é o número correto da loja.)
6. Ative a integração com o toggle principal e salve.

Dicas gerais:
- Notificações automáticas de status de pedido reduzem chamadas de suporte do cliente em até 60%.', 'sistema', '/admin/settings', ARRAY['sistema', 'uazapi-whatsapp']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Assistente IA', 'Assistente virtual com respostas inteligentes sobre gestão, marketing e operação.

Passo a passo:
1. Acesse o ícone de chat do Assistente no menu lateral.
2. Use os atalhos de sugestão para perguntas rápidas: Como aumentar o faturamento? Dicas para reduzir CMV? Ideias de marketing local?
3. Digite sua pergunta no campo de chat e pressione Enter ou clique em Enviar.
4. O Assistente responde com estratégias práticas baseadas nos dados da sua unidade e benchmarks da rede. (Dica: Quanto mais específica a pergunta, mais útil a resposta — inclua contexto como "meu CMV está em 38%" para respostas personalizadas.)', 'sistema', '/admin/assistente', ARRAY['sistema', 'assistente-ia']::text[]),
    ('ajuda_tela', 'Configurações & Sistema — Grauzinho — Jogo da Rede', 'Jogo runner em perspectiva para os colaboradores — colete açaís, desvie de obstáculos e dispute o ranking.

Passo a passo:
1. Acesse o ícone do Grauzinho no menu lateral.
2. Clique em "Jogar" na tela inicial. Na tela de corrida: use as setas ou A/D para trocar de faixa.
3. Colete açaís para ganhar pontos e AçaíCoins. Desvie de cones e obstáculos para não perder a corrida.
4. Pegue power-ups: Ímã (atrai itens), Escudo (proteção) e Turbo (velocidade).
5. Ao terminar, veja sua pontuação e confira o Ranking global da rede. (Dica: Use as AçaíCoins conquistadas para desbloquear itens na Loja do jogo.)

Dicas gerais:
- O Grauzinho é uma forma de integração da equipe — realize campeonatos internos para motivar os colaboradores.', 'sistema', '/admin/game/grauzinho', ARRAY['sistema', 'grauzinho']::text[])
ON CONFLICT DO NOTHING;
