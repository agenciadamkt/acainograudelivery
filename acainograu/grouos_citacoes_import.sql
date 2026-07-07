-- ============================================================
-- SCRIPT DE IMPORTAÇÃO: BANCO DE CITAÇÕES GROUOS
-- Data: 2026-04-21
-- ============================================================

-- 1. CRIAR TABELA DE AUTORES
CREATE TABLE IF NOT EXISTS authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  birth_year INT,
  death_year INT,
  nationality VARCHAR(50),
  main_work VARCHAR(200),
  specialty VARCHAR(200),
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CRIAR TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS quote_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CRIAR TABELA PRINCIPAL DE CITAÇÕES
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(50) PRIMARY KEY,
  author_id INT NOT NULL,
  category_id INT NOT NULL,
  text LONGTEXT NOT NULL,
  tags JSON,
  source VARCHAR(200),
  is_active BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES quote_categories(id) ON DELETE CASCADE,
  INDEX idx_author (author_id),
  INDEX idx_category (category_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CRIAR TABELA DE USO (ANALYTICS)
CREATE TABLE IF NOT EXISTS quote_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  franchisee_id VARCHAR(50),
  campaign_id VARCHAR(50),
  context VARCHAR(100),
  ip_address VARCHAR(45),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  INDEX idx_quote (quote_id),
  INDEX idx_franchisee (franchisee_id),
  INDEX idx_used_at (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CRIAR TABELA DE FAVORITOS
CREATE TABLE IF NOT EXISTS quote_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  franchisee_id VARCHAR(50) NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favorite (quote_id, franchisee_id),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  INDEX idx_franchisee (franchisee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INSERIR AUTORES
-- ============================================================

INSERT INTO authors (name, birth_year, death_year, nationality, main_work, specialty, color) VALUES
('Napoleon Hill', 1883, 1970, 'Americano', 'Pense e Enriqueça', 'Desenvolvimento pessoal, Sucesso', '#FAC775'),
('Seth Godin', 1960, NULL, 'Americano', 'Purple Cow', 'Marketing, Liderança, Negócios', '#9FE1CB'),
('Stephen King', 1947, NULL, 'Americano', 'On Writing', 'Criatividade, Escrita, Resiliência', '#F4C0D1'),
('John Maeda', 1966, NULL, 'Japonês-Americano', 'The Laws of Simplicity', 'Design, Tecnologia, Simplicidade', '#B5D4F4'),
('Steve Jobs', 1955, 2011, 'Americano', 'Biografia (Isaacson)', 'Inovação, Design, Liderança', '#D3D1C7'),
('Voltaire', 1694, 1778, 'Francês', 'Candide', 'Filosofia, Crítica Social, Ação', '#C0DD97'),
('John Locke', 1632, 1704, 'Inglês', 'Second Treatise of Government', 'Filosofia, Educação, Liberdade', '#CECBF6'),
('Katherine Mansfield', 1888, 1923, 'Neozelandesa', 'Diários e Contos', 'Literatura, Propósito, Autenticidade', '#F5C4B3');

-- ============================================================
-- INSERIR CATEGORIAS
-- ============================================================

INSERT INTO quote_categories (name, description) VALUES
('Mentalidade', 'Pensamento, crença e atitude pessoal'),
('Liderança', 'Inspiração, influência e direção de pessoas'),
('Design', 'Estética, funcionalidade e experiência'),
('Negócios', 'Empreendimento, vendas e estratégia'),
('Inovação', 'Criatividade, tecnologia e diferenciação'),
('Excelência', 'Qualidade, perfeição e refinamento'),
('Propósito', 'Significado, legado e plenitude'),
('Ação', 'Fazer, movimento e proatividade'),
('Resiliência', 'Força, recuperação e transformação'),
('Comunicação', 'Expressão, narrativa e conexão'),
('Conhecimento', 'Aprendizado, educação e sabedoria'),
('Trabalho', 'Dedicação, disciplina e esforço'),
('Empreendedorismo', 'Risco, coragem e audácia'),
('Marketing', 'Narrativa, marca e conexão com público'),
('Metas', 'Planejamento, objetivos e realização');

-- ============================================================
-- INSERIR CITAÇÕES (44 CITAÇÕES)
-- ============================================================

-- NAPOLEON HILL (6 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_001', 1, 1, 'Tudo que a mente do homem pode conceber e acreditar, ela pode alcançar.', '["sucesso", "mindset", "crença"]', 'Pense e Enriqueça'),
('quote_002', 1, 2, 'O segredo do sucesso, se é que existe um, é a capacidade de encarar o ponto de vista da outra pessoa e ver as coisas tanto por esse ângulo quanto pelo seu.', '["empatia", "liderança", "sucesso"]', 'Pense e Enriqueça'),
('quote_003', 1, 15, 'Uma meta é um sonho com prazo definido.', '["planejamento", "objetivos", "ação"]', 'Pense e Enriqueça'),
('quote_004', 1, 1, 'Você é o mestre do seu destino. Você é o capitão da sua alma.', '["responsabilidade", "liberdade", "poder"]', 'Pense e Enriqueça'),
('quote_005', 1, 9, 'O fracasso é o caminho de menor resistência.', '["aprendizado", "falha", "crescimento"]', 'Pense e Enriqueça'),
('quote_006', 1, 15, 'Defina seu propósito principal definido e não pare até tê-lo alcançado.', '["persistência", "objetivos", "foco"]', 'Pense e Enriqueça');

-- SETH GODIN (6 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_007', 2, 14, 'Marketing não é mais sobre as coisas que você faz, mas sobre as histórias que você conta.', '["comunicação", "narrativa", "conexão"]', 'Purple Cow'),
('quote_008', 2, 4, 'As pessoas não compram produtos e serviços. Elas compram relações, histórias e magia.', '["vendas", "relacionamento", "emoção"]', 'Tribes'),
('quote_009', 2, 4, 'Seja notável ou seja invisível.', '["diferenciação", "marca", "posicionamento"]', 'Purple Cow'),
('quote_010', 2, 8, 'A melhor maneira de reclamar é fazer as coisas.', '["proatividade", "mudança", "responsabilidade"]', 'Linchpin'),
('quote_011', 2, 2, 'Liderança é a arte de desistir de algum controle para obter mais.', '["delegação", "confiança", "equipe"]', 'Tribes'),
('quote_012', 2, 13, 'O maior risco é não correr nenhum risco.', '["coragem", "inovação", "oportunidade"]', 'The Dip');

-- STEPHEN KING (5 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_013', 3, 1, 'A vida não é um filme de apoio. É o principal evento.', '["propósito", "autenticidade", "vida"]', 'On Writing'),
('quote_014', 3, 11, 'Os livros são um modo único de portabilidade. Você pode carregar um milhar de histórias no bolso do seu casaco.', '["aprendizado", "leitura", "crescimento"]', 'On Writing'),
('quote_015', 3, 12, 'Talento é mais barato que sal de mesa. O que separa o indivíduo talentoso do bem-sucedido é muito trabalho árduo.', '["dedicação", "excelência", "sucesso"]', 'On Writing'),
('quote_016', 3, 9, 'O inferno é a impossibilidade da razão.', '["desafio", "lógica", "clareza"]', 'The Stand'),
('quote_017', 3, 8, 'Você pode, você deve, e se for corajoso o suficiente para começar, você vai.', '["coragem", "início", "possibilidade"]', 'On Writing');

-- JOHN MAEDA (5 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_018', 4, 3, 'Simplicidade é sobre subtrair o óbvio e adicionar o significativo.', '["estética", "funcionalidade", "beleza"]', 'The Laws of Simplicity'),
('quote_019', 4, 3, 'Design é uma solução para um problema. Arte é uma questão para um problema.', '["criatividade", "intencionalidade", "propósito"]', 'The Laws of Simplicity'),
('quote_020', 4, 5, 'A tecnologia sem a alma do design é apenas uma ferramenta.', '["humanidade", "tecnologia", "sensibilidade"]', 'The Laws of Simplicity'),
('quote_021', 4, 3, 'Simplicidade não significa ausência de complexidade — significa que a complexidade foi dominada.', '["profundidade", "mastery", "refinamento"]', 'The Laws of Simplicity'),
('quote_022', 4, 6, 'O design mais simples é frequentemente o mais difícil de alcançar.', '["dedicação", "refinamento", "perfeição"]', 'The Laws of Simplicity');

-- STEVE JOBS (6 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_023', 5, 5, 'Inovação é o que distingue um líder de um seguidor.', '["criatividade", "visão", "diferenciação"]', 'Palestra em Stanford'),
('quote_024', 5, 3, 'O design não é apenas como parece. Design é como funciona.', '["funcionalidade", "experiência", "intencionalidade"]', 'Biografia'),
('quote_025', 5, 1, 'Sua hora é limitada, então não a desperdice vivendo a vida de outra pessoa.', '["autenticidade", "liberdade", "propósito"]', 'Palestra em Stanford'),
('quote_026', 5, 6, 'Qualidade é mais importante que quantidade. Um home run é muito melhor que dois duplos.', '["padrões", "perfeição", "foco"]', 'Biografia'),
('quote_027', 5, 7, 'Ser o homem mais rico do cemitério não importa para mim. Ir dormir à noite sabendo que fizemos algo maravilhoso, isso importa.', '["legado", "valores", "significado"]', 'Palestra em Stanford'),
('quote_028', 5, 3, 'Simplicidade é a sofisticação máxima.', '["elegância", "refinamento", "beleza"]', 'Biografia');

-- VOLTAIRE (6 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_029', 6, 6, 'O melhor é o inimigo do bom.', '["pragmatismo", "satisfação", "ação"]', 'Candide'),
('quote_030', 6, 2, 'Cada homem é culpado pelo bem que não fez.', '["responsabilidade", "ação", "impacto"]', 'Ensaios Filosóficos'),
('quote_031', 6, 12, 'Trabalho afasta de nós três grandes males: o tédio, o vício e a necessidade.', '["propósito", "disciplina", "bem-estar"]', 'Candide'),
('quote_032', 6, 10, 'O segredo de ser chato é dizer tudo.', '["eloquência", "síntese", "impacto"]', 'Ensaios Filosóficos'),
('quote_033', 6, 11, 'A incerteza é desconfortável, mas a certeza é ridícula.', '["humildade", "aprendizado", "abertura"]', 'Ensaios Filosóficos'),
('quote_034', 6, 7, 'Apreciamos o que criamos.', '["criação", "valor", "significado"]', 'Ensaios Filosóficos');

-- JOHN LOCKE (5 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_035', 7, 11, 'Educação começa pelo bebê e nunca termina.', '["desenvolvimento", "aprendizado", "crescimento"]', 'Some Thoughts Concerning Education'),
('quote_036', 7, 2, 'Onde não há lei, não há liberdade.', '["estrutura", "responsabilidade", "ordem"]', 'Second Treatise of Government'),
('quote_037', 7, 7, 'O propósito da lei não é abolir ou restringir, mas preservar e ampliar a liberdade.', '["justiça", "direitos", "desenvolvimento"]', 'Second Treatise of Government'),
('quote_038', 7, 1, 'Nenhum homem pode ser obrigado a fazer o que não é para o seu bem.', '["autonomia", "bem-estar", "dignidade"]', 'Some Thoughts Concerning Education'),
('quote_039', 7, 8, 'As ações dos homens são os melhores intérpretes de seus pensamentos.', '["autenticidade", "coerência", "verdade"]', 'Essay Concerning Human Understanding');

-- KATHERINE MANSFIELD (5 citações)
INSERT INTO quotes (id, author_id, category_id, text, tags, source) VALUES
('quote_040', 8, 6, 'Fazer algo de um modo diferente, melhor — isso é o que quero.', '["inovação", "melhoria", "ambição"]', 'Diários e Cartas'),
('quote_041', 8, 7, 'Quanto tempo leva para saber que amamos algo? Um momento.', '["paixão", "intuição", "clareza"]', 'Diários e Cartas'),
('quote_042', 8, 9, 'É preciso coragem para crescer e se tornar quem você realmente é.', '["autenticidade", "transformação", "coragem"]', 'Diários e Cartas'),
('quote_043', 8, 13, 'Risco! Arrisque qualquer coisa! Cuidar não mais, tenha medo não mais, mas ria de todos os medos.', '["audácia", "liberdade", "ação"]', 'Diários e Cartas'),
('quote_044', 8, 7, 'O que queremos é descobrir o que vai fazer da vida uma coisa completa.', '["significado", "plenitude", "busca"]', 'Diários e Cartas');

-- ============================================================
-- CRIAR VIEWS ÚTEIS
-- ============================================================

-- View: Citações com nome do autor e categoria
CREATE OR REPLACE VIEW vw_quotes_full AS
SELECT 
  q.id,
  q.text,
  a.name AS author,
  qc.name AS category,
  q.source,
  q.view_count,
  q.favorite_count,
  q.created_at
FROM quotes q
JOIN authors a ON q.author_id = a.id
JOIN quote_categories qc ON q.category_id = qc.id
WHERE q.is_active = TRUE
ORDER BY q.created_at DESC;

-- View: Citações mais populares (por visualizações + favoritos)
CREATE OR REPLACE VIEW vw_top_quotes AS
SELECT 
  q.id,
  q.text,
  a.name AS author,
  qc.name AS category,
  (q.view_count + q.favorite_count) AS popularity_score
FROM quotes q
JOIN authors a ON q.author_id = a.id
JOIN quote_categories qc ON q.category_id = qc.id
WHERE q.is_active = TRUE
ORDER BY popularity_score DESC;

-- ============================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX idx_quotes_author_category ON quotes(author_id, category_id);
CREATE INDEX idx_quotes_is_active_created ON quotes(is_active, created_at);
CREATE FULLTEXT INDEX idx_quotes_text ON quotes(text);

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

SELECT 'Autores cadastrados:' AS status, COUNT(*) AS total FROM authors;
SELECT 'Categorias cadastradas:' AS status, COUNT(*) AS total FROM quote_categories;
SELECT 'Citações cadastradas:' AS status, COUNT(*) AS total FROM quotes;

-- Query para listar todas as citações (verificação)
SELECT * FROM vw_quotes_full LIMIT 10;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
