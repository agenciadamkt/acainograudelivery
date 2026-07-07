-- =============================================================
-- CRM & Atendimento — GrauOS
-- Execute no Supabase SQL Editor
-- =============================================================

-- 1. Leads
CREATE TABLE IF NOT EXISTS crm_leads (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          UUID REFERENCES stores(id) ON DELETE CASCADE,
  nome              TEXT,
  telefone          TEXT NOT NULL,
  cidade            TEXT,
  estado            VARCHAR(2),
  origem            TEXT DEFAULT 'whatsapp',       -- whatsapp | site | instagram | indicacao | facebook_ads
  tipo_cliente      TEXT,                           -- iniciante | experiente | consumo | negocio
  interesse         TEXT,                           -- revenda | quiosque | consumo
  status            TEXT DEFAULT 'novo',            -- novo | em_atendimento | proposta | fechado | perdido
  score             INTEGER DEFAULT 0,
  motivo_perda      TEXT,
  valor_estimado    NUMERIC(10,2),
  observacoes       TEXT,
  atendente_id      UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atendimentos (histórico de interações)
CREATE TABLE IF NOT EXISTS crm_atendimentos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id           UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  etapa             TEXT,   -- abertura | qualificacao | posicionamento | tabela | proposta | objecao | fechamento
  tipo_mensagem     TEXT DEFAULT 'texto',           -- texto | audio | pdf | imagem
  mensagem_enviada  TEXT,
  resposta_cliente  TEXT,
  script_id         UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Follow-ups agendados
CREATE TABLE IF NOT EXISTS crm_followups (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id           UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  tipo              TEXT,   -- 15min | 2h | 24h | 2d | 7d | 15d
  mensagem          TEXT,
  status            TEXT DEFAULT 'pendente',        -- pendente | enviado | cancelado
  data_agendada     TIMESTAMPTZ NOT NULL,
  data_enviado      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Scripts / Playbook
CREATE TABLE IF NOT EXISTS crm_scripts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          UUID REFERENCES stores(id) ON DELETE CASCADE,
  categoria         TEXT,   -- abertura | qualificacao | iniciante | experiente | tabela | proposta | objecao | fechamento | followup | audio | conhecer_acai
  nome              TEXT NOT NULL,
  conteudo          TEXT NOT NULL,
  atalho            TEXT,
  ativo             BOOLEAN DEFAULT TRUE,
  ordem             INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS simples (autenticados têm acesso)
ALTER TABLE crm_leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_followups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_scripts      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_crm_leads"        ON crm_leads        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_crm_atendimentos" ON crm_atendimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_crm_followups"    ON crm_followups    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_crm_scripts"      ON crm_scripts      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_store    ON crm_leads(store_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status   ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_followups_lead ON crm_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_followups_due  ON crm_followups(data_agendada) WHERE status = 'pendente';

-- =============================================================
-- SEED: Scripts do Playbook AmazFrut (~40 scripts)
-- =============================================================
-- Substitua 'SUA_STORE_ID' pelo UUID real da sua loja
-- OU rode sem store_id (NULL = global)

INSERT INTO crm_scripts (categoria, nome, conteudo, atalho, ordem) VALUES

-- ABERTURA
('abertura','Abertura padrão',
'Fala, tudo certo? Aqui é o Fábio da AmazFrut 👊

Vi que você veio pelo site — me diz rápido:

1️⃣ Revender açaí
2️⃣ Montar um negócio
3️⃣ Só consumo

Qual opção?',
'/abertura', 1),

-- QUALIFICAÇÃO
('qualificacao','Qualificação revenda',
'Top 👊

Me diz:
você já trabalha com açaí ou está começando agora?

1️⃣ Já trabalho
2️⃣ Estou começando',
'/revenda', 1),

('qualificacao','Qualificação negócio',
'Boa, excelente decisão 👊

Montar um ponto de açaí hoje dá muito resultado quando começa do jeito certo.

Mas vou te falar direto: o erro da maioria é querer montar tudo grande e travar.

O certo é começar enxuto e crescer.

Me diz:
você já tem um ponto ou tá começando do zero?',
'/negocio', 2),

('qualificacao','Aprofundar qualificação',
'E você pretende vender em delivery, loja física ou os dois?

Qual cidade você está?',
'/qualificar2', 3),

-- INICIANTE
('iniciante','Script iniciante - abertura',
'Perfeito 👊

Vou te ajudar a começar sem erro.

Mas me diz:
você quer renda extra ou pensa em algo maior?',
'/iniciante', 1),

('iniciante','Script iniciante - contexto',
'Perfeito.

Vou te falar direto: o erro de quem começa é tentar fazer tudo ao mesmo tempo e travar.

O certo é começar simples, validar e crescer.',
'/ini-contexto', 2),

('iniciante','Script iniciante - educação',
'Hoje o que mais funciona é: delivery, ponto pequeno e baixo investimento inicial. Com produto certo, já começa a girar.',
'/ini-educacao', 3),

('iniciante','Script iniciante - proposta',
'Pra você começar sem erro, eu indicaria:

- Produto X
- Quantidade Y
- Investimento: R$ Z

👉 Isso aqui já dá pra testar e começar a vender',
'/proposta-ini', 4),

('iniciante','Script iniciante - quebra medo',
'Normal ficar na dúvida no começo. Mas quem começa com orientação certa evita prejuízo e aprende rápido.',
'/ini-medo', 5),

-- EXPERIENTE
('experiente','Script experiente - abertura',
'Top, então você já trabalha com açaí 👊

Hoje você compra de qual fornecedor?',
'/experiente', 1),

('experiente','Script experiente - investigação',
'E o que você acha que poderia melhorar no produto atual?
(sabor, rendimento, preço, aceitação...)',
'/exp-investigar', 2),

('experiente','Script experiente - posicionamento',
'Perfeito. A gente entra justamente aí: nosso açaí tem mais rendimento e melhor textura. A ideia não é só trocar, é melhorar sua margem e giro.',
'/exp-posicionar', 3),

('experiente','Script experiente - proposta',
'Pelo seu volume, dá pra trabalhar assim:

- Produto X
- Quantidade Y

👉 Isso aqui já melhora sua margem e giro',
'/proposta-exp', 4),

('experiente','Script experiente - prova',
'O que a maioria faz quando troca: testa um volume menor primeiro pra validar aceitação. Se fizer sentido, você escala depois.',
'/exp-prova', 5),

-- TABELA
('tabela','Envio de tabela',
'Vou te mandar a tabela aqui 👇

Mas me diz:
qual sua cidade e quanto pretende começar?',
'/tabela', 1),

-- POSICIONAMENTO
('posicionamento','Posicionamento antes da tabela',
'Perfeito. Vou ser direto: a gente atende quem quer trabalhar com produto de qualidade e margem — principalmente delivery e açaíteria.

Nosso açaí tem cremosidade e rendimento acima da média.

Mas antes da tabela, deixa eu te evitar um erro comum: a maioria começa comprando errado e trava venda.',
'/posicionar', 1),

-- OBJEÇÃO
('objecao','Objeção: tá caro',
'Entendo! Mas olha: nosso açaí é direto da fábrica, sem intermediário. O copo de 400g sai por R$ 18,10 de custo e você vende a R$ 24,80 — são R$ 6,70 de lucro por copo. Com 30 copos por dia, são R$ 6.000/mês de lucro líquido. Quer que eu faça uma simulação pro seu caso?',
'/obj-caro', 1),

('objecao','Objeção: vou pensar',
'Claro! Enquanto isso, posso te adiantar: a gente tem rota de entrega pra sua região [dia X]. Se fechar antes, consigo incluir na carga sem custo extra de frete. Posso te ligar pra explicar melhor?',
'/obj-pensar', 2),

('objecao','Objeção: já tenho fornecedor',
'Massa! Nosso açaí é o mesmo do Açaí no Grau — fábrica própria com 3.000m² em Teresina. Muitos clientes migraram pela qualidade e suporte. Que tal testar com pedido mínimo de 10 caixas pra comparar?',
'/obj-fornecedor', 3),

('objecao','Objeção: será que vende?',
'Te falo real: quem trabalha com produto certo e faz o básico, vende. O que trava normalmente é começar errado. A maioria dos nossos parceiros começa com um pedido teste e escala depois.',
'/obj-vende', 4),

('objecao','Objeção: não sei por onde começar',
'Normal! A maioria que começa tem essa dúvida. O que eu faço é te montar um kit inicial certeiro: produto que gira, quantidade que não trava e investimento controlado. Quer que eu monte pra você?',
'/obj-comecar', 5),

-- FECHAMENTO
('fechamento','Fechamento lojista',
'Se fizer sentido, já consigo incluir seu pedido na próxima rota.

Quer que eu já deixe separado pra você?',
'/fechar', 1),

('fechamento','Fechamento quiosque',
'O quiosque completo sai a partir de R$ 20.990 — inclui freezer, cubas, comunicação visual, primeiro pedido e suporte. Parcelo até 10x. Entrega 30-40 dias úteis. Reservo uma unidade?',
'/fechar-quiosque', 2),

('fechamento','Fechamento primeiro pedido',
'Pra começar, que tal um pedido teste? 10 caixas com frete incluso na próxima rota. Assim conhece a qualidade antes de fechar volume maior. Pix ou cartão?',
'/fechar-teste', 3),

('fechamento','Pós-venda',
'O produto chegou bem? Como foi a recepção dos clientes? Se precisar de suporte, tô aqui. Quando quiser repor, me avisa que já separo pra próxima carga.',
'/pos-venda', 4),

-- FOLLOW-UP
('followup','Follow-up 15 min',
'Conseguiu dar uma olhada? Se quiser, te indico exatamente o que pegar pra começar sem erro.',
'/follow1', 1),

('followup','Follow-up 2h',
'Te falo real: quem começa com orientação certa, sai na frente. Se quiser, te ajudo a montar isso.',
'/follow2', 2),

('followup','Follow-up 24h',
'Você ainda tem interesse em trabalhar com açaí ou deixou pra depois? Se quiser, ainda dá tempo de entrar na próxima rota.',
'/follow3', 3),

('followup','Follow-up 2 dias',
'Vou fechar a rota dessa semana — se você quiser entrar, ainda dá tempo.',
'/follow4', 4),

('followup','Follow-up 7 dias',
'Oi! Lembrei de você porque estamos montando rota de entrega pro [estado] esse mês. Se ainda tiver interesse, é boa hora pra fechar com frete compartilhado.',
'/follow5', 5),

('followup','Follow-up 15 dias',
'Tudo certo? Vou organizar minha lista e queria saber se ainda tem interesse. Sem pressão — se não for o momento, sem problema! Mas se quiser retomar, é só chamar.',
'/follow6', 6),

('followup','Follow-up iniciante',
'Ficou com dúvida de como começar? Se quiser, te ajudo a montar algo simples pra você testar sem risco.',
'/follow-ini', 7),

('followup','Follow-up experiente',
'Se quiser, te ajudo a comparar com o que você usa hoje pra ver se faz sentido trocar.',
'/follow-exp', 8),

-- CONHECER AÇAÍ
('conhecer_acai','Resposta imediata',
'Boa! Isso é o melhor caminho mesmo 👊

Nada substitui provar antes de decidir.

Me diz: você está em qual cidade?',
'/conhecer', 1),

('conhecer_acai','Com produto disponível',
'Top. Consigo te enviar uma amostra pra você avaliar o sabor e a textura. Assim você já testa na prática antes de comprar maior.',
'/conhecer-tem', 2),

('conhecer_acai','Sem produto disponível',
'No momento estou sem carga aí na sua região, mas posso fazer o seguinte: já deixo você priorizado na próxima entrega e te aviso antes de abrir pro restante.

Se gostar, você pretende revender ou só conhecer por enquanto?',
'/conhecer-nao', 3),

('conhecer_acai','Micro-compromisso',
'Posso já deixar seu contato como prioridade aqui pra próxima carga?',
'/conhecer-fechar', 4),

-- ÁUDIO
('audio','Áudio - quero conhecer',
'[ROTEIRO PARA GRAVAR - 30-45 seg]
Fala meu amigo, tudo certo? Cara, você fez o certo em querer conhecer antes, porque a diferença de um açaí pro outro é grande — principalmente em textura e rendimento. Me diz uma coisa rápida: você pretende só experimentar ou já tá pensando em trabalhar com revenda também? Se for pra negócio, já te direciono certinho pra você não começar errado.',
'/audio1', 1),

('audio','Áudio - sem produto',
'[ROTEIRO PARA GRAVAR - 30-45 seg]
Fala irmão, seguinte: no momento eu tô sem carga aí na sua região, mas já vou te colocar como prioridade na próxima entrega. Porque geralmente quando o pessoal prova, já quer fechar pra revenda, então eu já te aviso antes de liberar pro restante, beleza? Me confirma só sua cidade pra eu organizar aqui.',
'/audio2', 2),

('audio','Áudio - puxar venda',
'[ROTEIRO PARA GRAVAR - 30-45 seg]
Boa, então você já tá no caminho certo. O que eu sempre falo pra quem começa é: não é só provar, é já provar pensando em vender. Porque dependendo do produto que você escolhe, muda totalmente sua margem e aceitação. Quando chegar, eu já te mostro exatamente o que pegar pra começar sem erro, fechado?',
'/audio3', 3),

('audio','Áudio - follow-up',
'[ROTEIRO PARA GRAVAR - 30-45 seg]
Fala meu amigo, passando rápido aqui. Fiquei te devendo aquela parte do açaí — quando o pessoal prova, geralmente já entende o diferencial na hora. Se ainda tiver interesse, me fala que eu já deixo tudo alinhado pra você não perder tempo quando chegar a carga.',
'/audio4', 4);
