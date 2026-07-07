# Guia Prático: Integração do Banco de Citações GrouOs

## 📋 Sumário
1. Preparação do Banco de Dados
2. Integração com Backend (API)
3. Integração Frontend
4. Testes e Validação
5. Deployment

---

## 1️⃣ PREPARAÇÃO DO BANCO DE DADOS

### Passo 1.1: Executar Script SQL
```bash
# Via terminal MySQL
mysql -u seu_usuario -p seu_banco < grouos_citacoes_import.sql

# Ou via cPanel/Adminer
# 1. Faça login no painel de administração
# 2. Abra phpMyAdmin ou similar
# 3. Selecione o banco 'seu_banco'
# 4. Clique em "Importar"
# 5. Selecione o arquivo: grouos_citacoes_import.sql
# 6. Clique "Ir"
```

### Passo 1.2: Verificar Importação
```sql
-- Execute esta query para confirmar:
SELECT 
  (SELECT COUNT(*) FROM authors) as autores,
  (SELECT COUNT(*) FROM quote_categories) as categorias,
  (SELECT COUNT(*) FROM quotes) as citacoes;

-- Resultado esperado:
-- autores: 8
-- categorias: 15
-- citacoes: 44
```

---

## 2️⃣ INTEGRAÇÃO COM BACKEND (API)

### Passo 2.1: Criar Endpoints REST (Node.js/Express)

```javascript
// routes/quotes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: Listar todas as citações (com filtros)
router.get('/api/v1/quotes', async (req, res) => {
  try {
    const { author, category, search, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM vw_quotes_full WHERE 1=1';
    const params = [];
    
    if (author) {
      query += ' AND author = ?';
      params.push(author);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (text LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Contar total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total').replace('LIMIT', 'LIMIT 999999');
    const [countResult] = await db.query(countQuery, params);
    
    // Paginar
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [quotes] = await db.query(query, params);
    
    res.json({
      success: true,
      data: quotes,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + quotes.length < countResult[0].total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Citação aleatória
router.get('/api/v1/quotes/random', async (req, res) => {
  try {
    const { count = 1, category } = req.query;
    
    let query = 'SELECT * FROM vw_quotes_full';
    const params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY RAND() LIMIT ?';
    params.push(parseInt(count));
    
    const [quotes] = await db.query(query, params);
    
    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Lista de autores
router.get('/api/v1/quotes/authors', async (req, res) => {
  try {
    const query = `
      SELECT a.name, a.color, COUNT(q.id) as count
      FROM authors a
      LEFT JOIN quotes q ON a.id = q.author_id
      GROUP BY a.id
      ORDER BY a.name
    `;
    
    const [authors] = await db.query(query);
    
    res.json({
      success: true,
      data: authors
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Lista de categorias
router.get('/api/v1/quotes/categories', async (req, res) => {
  try {
    const query = `
      SELECT name, description, 
        (SELECT COUNT(*) FROM quotes WHERE category_id = qc.id) as count
      FROM quote_categories qc
      ORDER BY name
    `;
    
    const [categories] = await db.query(query);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Registrar uso (Analytics)
router.post('/api/v1/quotes/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { franchisee_id, campaign_id, context } = req.body;
    const ip_address = req.ip;
    
    const query = `
      INSERT INTO quote_usage (quote_id, franchisee_id, campaign_id, context, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await db.query(query, [id, franchisee_id, campaign_id, context, ip_address]);
    
    // Incrementar view_count
    await db.query('UPDATE quotes SET view_count = view_count + 1 WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Adicionar aos favoritos
router.post('/api/v1/quotes/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { franchisee_id } = req.body;
    
    const query = `
      INSERT INTO quote_favorites (quote_id, franchisee_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE saved_at = NOW()
    `;
    
    await db.query(query, [id, franchisee_id]);
    
    // Incrementar favorite_count
    await db.query('UPDATE quotes SET favorite_count = favorite_count + 1 WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### Passo 2.2: Configurar no servidor principal
```javascript
// app.js ou main.js
const quotesRoutes = require('./routes/quotes');
app.use('/', quotesRoutes);
```

---

## 3️⃣ INTEGRAÇÃO FRONTEND

### Passo 3.1: Componente React (QuoteWidget.jsx)

```jsx
import React, { useState, useEffect } from 'react';
import './QuoteWidget.css';

export default function QuoteWidget({ 
  category, 
  displayMode = 'card',
  franchiseeId,
  refreshInterval = null 
}) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchQuote();
    
    if (refreshInterval) {
      const interval = setInterval(fetchQuote, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [category]);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const url = category 
        ? `/api/v1/quotes/random?count=1&category=${category}`
        : '/api/v1/quotes/random?count=1';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setQuote(data.data[0]);
        
        // Registrar uso
        await fetch(`/api/v1/quotes/${data.data[0].id}/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            franchisee_id: franchiseeId,
            context: displayMode
          })
        });
      }
    } catch (error) {
      console.error('Erro ao buscar citação:', error);
    }
    setLoading(false);
  };

  const handleFavorite = async () => {
    if (!quote || !franchiseeId) return;
    
    try {
      await fetch(`/api/v1/quotes/${quote.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchisee_id: franchiseeId })
      });
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const handleCopy = () => {
    const text = `"${quote.text}" — ${quote.author}`;
    navigator.clipboard.writeText(text);
    alert('Citação copiada!');
  };

  if (loading) return <div className="quote-loading">Carregando citação...</div>;
  
  if (!quote) return null;

  return (
    <div className={`quote-widget quote-${displayMode}`}>
      <div className="quote-icon">"</div>
      
      <p className="quote-text">{quote.text}</p>
      
      <div className="quote-footer">
        <span className="quote-author">— {quote.author}</span>
        <span className="quote-category">{quote.category}</span>
      </div>
      
      <div className="quote-actions">
        <button 
          className="btn-action btn-copy" 
          onClick={handleCopy}
          title="Copiar citação"
        >
          📋 Copiar
        </button>
        
        <button 
          className={`btn-action btn-favorite ${isFavorite ? 'active' : ''}`}
          onClick={handleFavorite}
          title="Adicionar aos favoritos"
        >
          ⭐ Favoritar
        </button>
        
        <button 
          className="btn-action btn-refresh"
          onClick={fetchQuote}
          title="Nova citação"
        >
          🔄 Próxima
        </button>
      </div>
    </div>
  );
}
```

### Passo 3.2: Estilos CSS (QuoteWidget.css)

```css
.quote-widget {
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  padding: 24px;
  margin: 16px 0;
  max-width: 600px;
}

.quote-widget.quote-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.quote-icon {
  font-size: 48px;
  color: #667eea;
  opacity: 0.2;
  margin-bottom: 12px;
}

.quote-text {
  font-size: 18px;
  font-style: italic;
  line-height: 1.6;
  margin: 0 0 16px 0;
  color: inherit;
}

.quote-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
}

.quote-author {
  font-weight: 600;
  color: #333;
}

.quote-category {
  background: #f0f0f0;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  color: #666;
}

.quote-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 8px 14px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f5f5f5;
  border-color: #667eea;
  color: #667eea;
}

.btn-action.btn-favorite.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.quote-loading {
  text-align: center;
  padding: 24px;
  color: #999;
}
```

### Passo 3.3: Usar o componente

```jsx
// No dashboard principal
import QuoteWidget from './components/QuoteWidget';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard GrouOs</h1>
      
      {/* Citação do dia em destaque */}
      <QuoteWidget 
        displayMode="banner"
        franchiseeId={user.id}
        refreshInterval={86400000} // 24h
      />
      
      {/* Citações de liderança */}
      <QuoteWidget 
        category="Liderança"
        displayMode="card"
        franchiseeId={user.id}
      />
    </div>
  );
}
```

---

## 4️⃣ TESTES E VALIDAÇÃO

### Teste 1: API
```bash
# Listar todas as citações
curl http://localhost:3000/api/v1/quotes

# Filtrar por categoria
curl "http://localhost:3000/api/v1/quotes?category=Liderança"

# Obter citação aleatória
curl http://localhost:3000/api/v1/quotes/random

# Listar autores
curl http://localhost:3000/api/v1/quotes/authors
```

### Teste 2: Frontend
```javascript
// No console do navegador
fetch('/api/v1/quotes/random?count=1')
  .then(r => r.json())
  .then(data => console.log(data));

// Esperado:
// {
//   "success": true,
//   "data": [{ id, text, author, category, ... }]
// }
```

### Teste 3: Banco de Dados
```sql
-- Verificar integridade
SELECT COUNT(*) FROM quotes;  -- Deve ser 44
SELECT DISTINCT author FROM quotes;  -- Deve ser 8
SELECT COUNT(DISTINCT category_id) FROM quotes;  -- Deve ser 15

-- Verificar citação aleatória
SELECT * FROM quotes ORDER BY RAND() LIMIT 1;
```

---

## 5️⃣ DEPLOYMENT

### Checklist Final
- [ ] Banco de dados importado e testado
- [ ] Endpoints REST criados e testados
- [ ] Componente frontend integrado
- [ ] Estilos CSS aplicados
- [ ] Analytics/Tracking funcionando
- [ ] Testes de performance realizados
- [ ] Documentação atualizada

### Performance (Otimizações)
```javascript
// Cache de citações em Redis (opcional)
const redis = require('redis');
const client = redis.createClient();

router.get('/api/v1/quotes/random', async (req, res) => {
  const cacheKey = `quote:${req.query.category || 'all'}`;
  
  // Tentar do cache
  const cached = await client.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  
  // Buscar do BD
  const result = await fetchQuoteFromDB();
  
  // Armazenar em cache por 1 hora
  client.setEx(cacheKey, 3600, JSON.stringify(result));
  
  res.json(result);
});
```

---

## 🎯 Próximos Passos

1. **Dashboard**: Exibir citação do dia em destaque
2. **Campaigns**: Adicionar seletor de citações em campanhas por email
3. **Mobile**: Implementar push notification semanal
4. **Analytics**: Criar dashboard com citações mais populares
5. **Admin**: Painel para gerenciar citações (CRUD)

---

## 📞 Suporte

Para dúvidas sobre a integração, consulte:
- `prompt_integracao_citacoes_grouos.md` — Especificações técnicas
- `citacoes_grouos_banco_dados.json` — Dados em formato JSON
- `grouos_citacoes_import.sql` — Script de importação

---

**Criado em**: 2026-04-21  
**Versão**: 1.0
