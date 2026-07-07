# 📚 Guia de Integração — QuotePremium no GrouOs

## 🎯 Visão Geral

O componente **QuotePremium** é uma versão sofisticada do widget de citações com:
- ✅ Dot pattern customizável
- ✅ Corner decorators elegantes
- ✅ Múltiplas variantes (default, compact, showcase)
- ✅ Animações suaves
- ✅ Tailwind CSS + shadcn/ui
- ✅ TypeScript

---

## 📦 Requisitos do Projeto

Seu projeto GrouOs já deve ter:
- ✅ React 18+
- ✅ Tailwind CSS
- ✅ TypeScript
- ✅ shadcn/ui (ou @radix-ui)
- ✅ lucide-react (ícones)

Se não tiver algum, instale:

```bash
# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# shadcn/ui
npx shadcn-ui@latest init

# lucide-react
npm install lucide-react

# Typescript (se não tiver)
npm install --save-dev typescript @types/react @types/node
```

---

## 🚀 Passo a Passo de Integração

### Passo 1: Copiar o Componente

```bash
# Copie o arquivo para a pasta correta
cp QuotePremium.tsx src/components/ui/QuotePremium.tsx
```

Ou crie manualmente em: `src/components/ui/QuotePremium.tsx`

### Passo 2: Atualizar Tailwind Config

Adicione as extensões ao seu `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  // ... suas configurações existentes
  theme: {
    extend: {
      // Copie a seção 'extend' do arquivo tailwind-config-quote.js
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        fadeInUp: 'fadeInUp 0.6s ease-out',
        // ... (copie todas as animações)
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        // ... (copie todos os keyframes)
      },
      // ... resto das extensões
    },
  },
};
```

### Passo 3: Usar no Dashboard

```typescript
// src/pages/dashboard.tsx
'use client';

import { QuotePremium } from '@/components/ui/QuotePremium';

export default function Dashboard() {
  const todayQuote = {
    id: 'quote_028',
    text: 'Simplicidade é a sofisticação máxima.',
    author: 'Steve Jobs',
    category: 'Design',
    source: 'Biografia'
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Visão Geral</h1>
      
      {/* Citação em destaque */}
      <QuotePremium
        quote={todayQuote}
        variant="showcase"  // ou 'default' ou 'compact'
        accentColor="#667EEA"
        patternDensity="normal"
        showPattern={true}
        animated={true}
      />
    </div>
  );
}
```

---

## 🎨 Variantes de Uso

### 1. Showcase (Grande, em destaque)

```tsx
<QuotePremium
  quote={quote}
  variant="showcase"
  accentColor="#667EEA"
  patternDensity="normal"
/>
```

**Uso ideal:**
- Topo do dashboard
- Campanhas
- Página dedicada

### 2. Default (Padrão, médio)

```tsx
<QuotePremium
  quote={quote}
  variant="default"
  accentColor="#667EEA"
/>
```

**Uso ideal:**
- Grid de citações
- Cards no dashboard
- Sidebar com múltiplas citações

### 3. Compact (Compacto, pequeno)

```tsx
<QuotePremium
  quote={quote}
  variant="compact"
  accentColor="#667EEA"
/>
```

**Uso ideal:**
- Widgets pequenos
- Lista de citações favoritas
- Sidebars

---

## 🎨 Customização de Cores

Você pode customizar a cor de acentuação:

```tsx
// Usando a cor primária do GrouOs
<QuotePremium
  quote={quote}
  accentColor="#667EEA"  // roxo
/>

// Usando cor do franchiseado
<QuotePremium
  quote={quote}
  accentColor={franchisee.brandColor}
/>

// Cores por categoria
const categoryColors = {
  'Liderança': '#667EEA',
  'Inovação': '#764BA2',
  'Design': '#4CAF50',
  'Negócios': '#F59E0B',
};

<QuotePremium
  quote={quote}
  accentColor={categoryColors[quote.category]}
/>
```

---

## 🌈 Densidade do Padrão

Escolha a densidade de pontos:

```tsx
// Esparso (menos pontos)
<QuotePremium
  quote={quote}
  patternDensity="sparse"
/>

// Normal (padrão recomendado)
<QuotePremium
  quote={quote}
  patternDensity="normal"
/>

// Denso (muitos pontos)
<QuotePremium
  quote={quote}
  patternDensity="dense"
/>
```

---

## 🔄 Carrossel de Citações

Para exibir múltiplas citações:

```typescript
'use client';

import { QuotePremiumCarousel } from '@/components/ui/QuotePremium';

export default function QuoteGallery() {
  const quotes = [
    {
      id: 'quote_001',
      text: 'Citação 1',
      author: 'Autor 1',
      category: 'Liderança',
    },
    {
      id: 'quote_002',
      text: 'Citação 2',
      author: 'Autor 2',
      category: 'Inovação',
    },
    // ... mais citações
  ];

  return (
    <QuotePremiumCarousel
      quotes={quotes}
      accentColor="#667EEA"
      patternDensity="normal"
      autoplay={true}
      autoplayInterval={6000}  // 6 segundos
    />
  );
}
```

---

## 🎬 Callback Handlers

Você pode responder a ações do usuário:

```tsx
<QuotePremium
  quote={quote}
  onCopy={(text) => {
    console.log('Copiado:', text);
    // Enviar analytics
    trackEvent('quote_copied', { quoteId: quote.id });
  }}
  onFavorite={(quote) => {
    console.log('Favoritado:', quote);
    // Salvar no servidor
    saveToFavorites(quote.id);
  }}
/>
```

---

## 📱 Responsividade

O componente é totalmente responsivo. As variações por breakpoint:

```
Mobile (< 768px):    Compact com textos reduzidos
Tablet (768px):      Default com texto médio
Desktop (1024px+):   Showcase com texto grande
```

Você pode forçar uma variante em mobile:

```tsx
<QuotePremium
  quote={quote}
  variant="compact"  // Sempre compacto
  className="md:variant-default"  // Mude em tablets
/>
```

---

## 🌙 Dark Mode

O componente suporta dark mode automaticamente via Tailwind:

```tsx
<div className="dark">
  <QuotePremium quote={quote} />
</div>
```

---

## ⚙️ Configurações Avançadas

### Desabilitar Padrão

```tsx
<QuotePremium
  quote={quote}
  showPattern={false}  // Remove dot pattern
/>
```

### Desabilitar Animações

```tsx
<QuotePremium
  quote={quote}
  animated={false}
/>
```

### Classes Customizadas

```tsx
<QuotePremium
  quote={quote}
  className="shadow-2xl border-2 border-purple-500"
/>
```

---

## 🔌 Integração com API

Se você quer buscar citações da API:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { QuotePremium } from '@/components/ui/QuotePremium';

export function DailyQuoteWidget() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch('/api/v1/quotes/random?count=1');
        const data = await res.json();
        setQuote(data.data[0]);
      } catch (error) {
        console.error('Erro ao buscar citação:', error);
      }
      setLoading(false);
    }

    fetchQuote();
  }, []);

  if (loading) return <div className="animate-pulse">Carregando...</div>;
  if (!quote) return null;

  return (
    <QuotePremium
      quote={quote}
      variant="showcase"
      accentColor="#667EEA"
    />
  );
}
```

---

## 📊 Exemplos de Uso por Contexto

### Exemplo 1: Dashboard Principal

```tsx
export function DashboardPage() {
  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Visão Geral</h1>

      {/* Citação de destaque */}
      <div className="mb-12">
        <QuotePremium
          quote={todayQuote}
          variant="showcase"
          accentColor="#667EEA"
          patternDensity="sparse"
        />
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seus outros componentes */}
      </div>
    </main>
  );
}
```

### Exemplo 2: Page de Citações

```tsx
export function QuotesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quotes, setQuotes] = useState([]);

  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Banco de Inspiração</h1>

      {/* Filtros */}
      <div className="mb-8 flex gap-2">
        {['Liderança', 'Inovação', 'Design'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg ${
              selectedCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de citações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quotes.map(quote => (
          <QuotePremium
            key={quote.id}
            quote={quote}
            variant="default"
            accentColor={getCategoryColor(quote.category)}
          />
        ))}
      </div>
    </main>
  );
}
```

### Exemplo 3: Email Campaign Builder

```tsx
export function CampaignBuilder() {
  const [selectedQuote, setSelectedQuote] = useState(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Seletor de citações */}
      <div>
        <h2 className="text-xl font-bold mb-4">Escolha uma citação</h2>
        <div className="space-y-4">
          {availableQuotes.map(quote => (
            <button
              key={quote.id}
              onClick={() => setSelectedQuote(quote)}
              className={`w-full rounded-lg transition-all ${
                selectedQuote?.id === quote.id
                  ? 'ring-2 ring-blue-500'
                  : ''
              }`}
            >
              <QuotePremium
                quote={quote}
                variant="compact"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Preview do email */}
      <div>
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        {selectedQuote && (
          <QuotePremium
            quote={selectedQuote}
            variant="showcase"
            className="shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Classes Tailwind não aplicadas

**Problema:** Cores e animações não aparecem
**Solução:** Certifique-se de que:
1. Seu `tailwind.config.js` inclui o caminho correto para os componentes
2. As animações e cores estão no `theme.extend`
3. Rode `npm run build` após mudanças no config

### Padrão de pontos não aparece

**Problema:** SVG não renderiza
**Solução:** 
1. Verifique se `showPattern={true}`
2. Certifique-se de que o container tem `overflow: hidden`
3. Use DevTools para verificar o SVG

### Cores não mudam

**Problema:** `accentColor` não funciona
**Solução:**
```tsx
// Certifique-se de passar como string hex
accentColor="#667EEA"  // ✓ Correto
accentColor="blue"     // ✗ Errado
```

---

## 📚 Arquivos Relacionados

- `QuotePremium.tsx` — Componente principal
- `tailwind-config-quote.js` — Configuração Tailwind
- `prompt_refinamento_visual_citacoes.md` — Especificações de design

---

## ✨ Próximos Passos

1. **Analytics**: Adicionar rastreamento de cliques
2. **Persistência**: Salvar favoritos no banco
3. **Personalização**: Cores por franchiseado
4. **Notificações**: Push com citação diária
5. **Social**: Compartilhar citações em redes sociais

---

**Versão:** 1.0  
**Atualizado:** 2026-04-22  
**Autor:** Claude + GrouOs Team
