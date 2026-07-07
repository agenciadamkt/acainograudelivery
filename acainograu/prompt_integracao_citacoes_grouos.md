# Prompt de Integração — Banco de Citações GrouOs

## Contexto
Você está desenvolvendo um sistema para integrar um banco de dados de citações inspiracionais no painel GrouOs Franquias. O banco contém 44 citações de 8 autores clássicos e modernos.

## Objetivo
Criar um componente de integração que:
1. Exiba citações aleatórias ou filtradas no dashboard GrouOs
2. Permita seleção manual de citações para campanhas de franchiseados
3. Integre com a API/banco de dados existente do GrouOs
4. Forneça endpoint para consultas programáticas

## Dados Base

### Autores e Citações
```json
{
  "quotes": [
    {
      "id": "quote_001",
      "author": "Napoleon Hill",
      "text": "Tudo que a mente do homem pode conceber e acreditar, ela pode alcançar.",
      "category": "Mentalidade",
      "tags": ["sucesso", "mindset", "crença"],
      "source": "Pense e Enriqueça"
    },
    // ... (43 citações adicionais)
  ],
  "authors": [
    "Napoleon Hill", "Seth Godin", "Stephen King", "John Maeda",
    "Steve Jobs", "Voltaire", "John Locke", "Katherine Mansfield"
  ],
  "categories": [
    "Mentalidade", "Liderança", "Design", "Negócios", "Inovação",
    "Excelência", "Propósito", "Ação", "Resiliência", "Comunicação",
    "Conhecimento", "Trabalho", "Empreendedorismo", "Marketing", "Metas"
  ]
}
```

## Especificações Técnicas

### 1. Endpoint API (Backend)

```
GET /api/v1/quotes
- Retorna lista paginada de citações
- Query params: author, category, search, limit, offset, random

GET /api/v1/quotes/:id
- Retorna citação específica por ID

POST /api/v1/quotes/random
- Retorna 1-5 citações aleatórias
- Body: { "count": 3, "category": "Liderança" (opcional) }

GET /api/v1/quotes/authors
- Lista todos os autores com contagem de citações

GET /api/v1/quotes/categories
- Lista todas as categorias disponíveis
```

### 2. Componente Frontend (React/Vue)

#### Padrão de Props
```javascript
<QuoteWidget
  showRandom={true}          // Exibir citação aleatória ao carregar
  category="Liderança"        // Filtrar por categoria (opcional)
  author="Steve Jobs"         // Filtrar por autor (opcional)
  displayMode="card"          // 'card', 'banner', 'inline', 'modal'
  refreshInterval={3600000}   // Atualizar a cada 1h (ms)
  onSelect={(quote) => {}}    // Callback quando citação é selecionada
  editable={true}             // Permitir editar/adicionar citações
/>
```

#### Estados do Componente
- **idle**: Exibindo citação
- **loading**: Buscando nova citação
- **editing**: Modo edição ativado
- **saved**: Citação salva com sucesso

### 3. Integração com GrouOs

#### Local de Exibição (Sugestões)
1. **Dashboard Principal**: Widget de citação diária no topo
2. **Perfil do Franchiseado**: Citação motivacional personalizada
3. **Feed/Notícias**: Citação ao lado de atualizações
4. **Campanhas**: Seletor de citação para campanhas por email
5. **Mobile**: Push notification com citação semanal

#### Estrutura de Banco de Dados
```sql
CREATE TABLE quotes (
  id VARCHAR(50) PRIMARY KEY,
  author VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  category VARCHAR(50),
  tags JSON,
  source VARCHAR(200),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (author) REFERENCES authors(name)
);

CREATE TABLE quote_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(50),
  franchisee_id VARCHAR(50),
  campaign_id VARCHAR(50),
  used_at TIMESTAMP,
  context VARCHAR(100), -- 'email', 'dashboard', 'push', etc
  FOREIGN KEY (quote_id) REFERENCES quotes(id),
  FOREIGN KEY (franchisee_id) REFERENCES users(id)
);

CREATE TABLE quote_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  franchisee_id VARCHAR(50),
  quote_id VARCHAR(50),
  saved_at TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id)
);
```

## Fluxos de Implementação

### Fluxo 1: Exibição Automática (Simplificado)
```
1. Usuário acessa dashboard GrouOs
   ↓
2. Sistema faz GET /api/quotes/random?count=1&category=Liderança
   ↓
3. API retorna citação aleatória
   ↓
4. Frontend exibe em widget
   ↓
5. Usuário pode copiar, favoritar ou compartilhar
```

### Fluxo 2: Seleção em Campanhas (Avançado)
```
1. Admin clica "Criar Campanha"
   ↓
2. Abre modal "Selecionar Citação"
   ↓
3. Mostra citações filtradas por categoria
   ↓
4. Admin seleciona citação
   ↓
5. Sistema registra em quote_usage
   ↓
6. Citação é enviada em email/push da campanha
```

## Funcionalidades Opcionais

- **Agendamento**: Que hora exibir citações do dia
- **Personalizaçao**: Admin pode adicionar novas citações
- **Analytics**: Rastrear qual citação foi mais clicada/favorita
- **Rotação**: Mostrar citações diferentes por região/franchisee
- **Multidioma**: Traduzir citações para PT, EN, ES
- **Export**: Gerar PDF com citações do mês para impressão

## Exemplo de Requisição/Resposta

### Request
```bash
curl -X GET "https://grouos-api.com/api/v1/quotes?category=Inovação&limit=5" \
  -H "Authorization: Bearer TOKEN"
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "quote_022",
      "author": "Steve Jobs",
      "text": "Inovação é o que distingue um líder de um seguidor.",
      "category": "Inovação",
      "tags": ["liderança", "tecnologia", "visão"],
      "source": "Palestra Stanford 2005"
    },
    {
      "id": "quote_018",
      "author": "John Maeda",
      "text": "A tecnologia sem a alma do design é apenas uma ferramenta.",
      "category": "Inovação",
      "tags": ["design", "tecnologia", "propósito"]
    }
  ],
  "pagination": {
    "total": 7,
    "limit": 5,
    "offset": 0
  }
}
```

## Checklist de Implementação

- [ ] Criar tabelas no banco GrouOs
- [ ] Inserir 44 citações no banco (seed SQL)
- [ ] Desenvolver endpoints REST
- [ ] Criar componente QuoteWidget
- [ ] Integrar no dashboard principal
- [ ] Adicionar seletor em campanhas
- [ ] Implementar favoritos
- [ ] Setup de analytics
- [ ] Testes unitários
- [ ] Documentação da API
- [ ] Treinamento dos franchiseados

## Próximos Passos

1. **Validação**: Confirmar locais exatos onde exibir
2. **Design**: Aprovar estilos dos widgets
3. **Priorização**: Qual funcionalidade implementar primeiro
4. **Timeline**: Estimar esforço de desenvolvimento

---

**Criado para**: Sistema GrouOs Franquias  
**Data**: 2026-04-21  
**Autores do Banco**: Napoleon Hill, Seth Godin, Stephen King, John Maeda, Steve Jobs, Voltaire, John Locke, Katherine Mansfield
