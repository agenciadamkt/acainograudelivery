/**
 * tailwind.config.js
 * Configuração completa para QuotePremium com animações
 * 
 * Adicione ao seu projeto:
 * 1. Copie este arquivo para a raiz do projeto
 * 2. Atualize seu tailwind.config.js com as extensões
 * 3. Importe as animações customizadas
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ============================================================
      // FONTE CUSTOMIZADA
      // ============================================================
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },

      // ============================================================
      // CORES CUSTOMIZADAS
      // ============================================================
      colors: {
        // Paleta GrouOs
        grouos: {
          primary: '#667EEA',
          secondary: '#764BA2',
          accent: '#4CAF50',
          dark: '#2C3E50',
          light: '#F8F9FF',
          border: '#E8EEFF',
        },
      },

      // ============================================================
      // ANIMAÇÕES CUSTOMIZADAS
      // ============================================================
      animation: {
        // Fade In
        fadeIn: 'fadeIn 0.5s ease-in-out',
        fadeInUp: 'fadeInUp 0.6s ease-out',
        fadeInDown: 'fadeInDown 0.6s ease-out',
        fadeInLeft: 'fadeInLeft 0.6s ease-out',
        fadeInRight: 'fadeInRight 0.6s ease-out',

        // Scale
        scaleIn: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        scaleInUp: 'scaleInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Slide
        slideInLeft: 'slideInLeft 0.5s ease-out',
        slideInRight: 'slideInRight 0.5s ease-out',
        slideInUp: 'slideInUp 0.5s ease-out',
        slideInDown: 'slideInDown 0.5s ease-out',

        // Pulse customizado
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // Glow
        glow: 'glow 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',

        // Bounce
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'bounce-smooth': 'bounceSmooth 1.5s ease-in-out infinite',

        // Shimmer
        shimmer: 'shimmer 2s infinite',
        'shimmer-slow': 'shimmer 3s infinite',

        // Float
        float: 'float 3s ease-in-out infinite',
        'float-slow': 'float 5s ease-in-out infinite',

        // Rotate
        'rotate-slow': 'rotate 8s linear infinite',

        // Blink
        blink: 'blink 1s steps(2, start) infinite',

        // Wave
        wave: 'wave 1.5s ease-in-out infinite',
      },

      // ============================================================
      // KEYFRAMES CUSTOMIZADAS
      // ============================================================
      keyframes: {
        // Fade animations
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInDown: {
          'from': {
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInLeft: {
          'from': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        fadeInRight: {
          'from': {
            opacity: '0',
            transform: 'translateX(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },

        // Scale animations
        scaleIn: {
          'from': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        scaleInUp: {
          'from': {
            opacity: '0',
            transform: 'scale(0.9) translateY(10px)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },

        // Slide animations
        slideInLeft: {
          'from': {
            transform: 'translateX(-100%)',
          },
          'to': {
            transform: 'translateX(0)',
          },
        },
        slideInRight: {
          'from': {
            transform: 'translateX(100%)',
          },
          'to': {
            transform: 'translateX(0)',
          },
        },
        slideInUp: {
          'from': {
            transform: 'translateY(100%)',
          },
          'to': {
            transform: 'translateY(0)',
          },
        },
        slideInDown: {
          'from': {
            transform: 'translateY(-100%)',
          },
          'to': {
            transform: 'translateY(0)',
          },
        },

        // Glow animations
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(102, 126, 234, 0.5), 0 0 10px rgba(102, 126, 234, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(102, 126, 234, 0.8), 0 0 30px rgba(102, 126, 234, 0.5)',
          },
        },
        glowPulse: {
          '0%, 100%': {
            opacity: '0.5',
          },
          '50%': {
            opacity: '1',
          },
        },

        // Bounce animations
        bounceSubtle: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-5px)',
          },
        },
        bounceSmooth: {
          '0%, 100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
          '50%': {
            transform: 'translateY(-10px)',
            opacity: '0.8',
          },
        },

        // Shimmer animation
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: 'calc(200% + 0px) 0',
          },
        },

        // Float animation
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },

        // Rotate animation
        rotate: {
          'from': {
            transform: 'rotate(0deg)',
          },
          'to': {
            transform: 'rotate(360deg)',
          },
        },

        // Blink animation
        blink: {
          '0%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
          },
        },

        // Wave animation
        wave: {
          '0%, 100%': {
            transform: 'rotate(0deg)',
          },
          '10%': {
            transform: 'rotate(14deg)',
          },
          '20%': {
            transform: 'rotate(-8deg)',
          },
          '30%': {
            transform: 'rotate(14deg)',
          },
          '40%': {
            transform: 'rotate(-4deg)',
          },
          '50%': {
            transform: 'rotate(10deg)',
          },
          '60%': {
            transform: 'rotate(0deg)',
          },
        },
      },

      // ============================================================
      // BACKDROP BLUR
      // ============================================================
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '20px',
      },

      // ============================================================
      // BOX SHADOW CUSTOMIZADO
      // ============================================================
      boxShadow: {
        'glow-sm': '0 0 10px rgba(102, 126, 234, 0.3)',
        'glow-md': '0 0 20px rgba(102, 126, 234, 0.4)',
        'glow-lg': '0 0 30px rgba(102, 126, 234, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(102, 126, 234, 0.1)',
      },

      // ============================================================
      // TRANSIÇÕES CUSTOMIZADAS
      // ============================================================
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
        '800': '800ms',
        '900': '900ms',
        '1000': '1000ms',
      },

      // ============================================================
      // GRADIENTES CUSTOMIZADOS
      // ============================================================
      backgroundImage: {
        'gradient-quote': 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        'gradient-subtle': 'linear-gradient(to bottom right, #F8F9FF, #E8EEFF)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
      },

      // ============================================================
      // Z-INDEX
      // ============================================================
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // ============================================================
      // ESPAÇAMENTO CUSTOMIZADO
      // ============================================================
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
      },

      // ============================================================
      // BORDER RADIUS CUSTOMIZADO
      // ============================================================
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },

  plugins: [
    // Plugin para suavizar scroll
    require('tailwindcss/plugin')(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          'scroll-snap': (value) => ({
            scrollSnapType: value,
          }),
          'scroll-snap-align': (value) => ({
            scrollSnapAlign: value,
          }),
        },
        {
          values: {
            'x mandatory': 'x mandatory',
            'y mandatory': 'y mandatory',
            'both mandatory': 'both mandatory',
          },
        }
      );
    }),
  ],
};

// ============================================================
// GLOBALS.CSS — ADICIONE ESTAS ANIMAÇÕES
// ============================================================

/*
@layer components {
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .prose-quote {
    @apply text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100;
  }

  .quote-decoration {
    @apply absolute left-0 top-0 bottom-0 w-1 opacity-50 hover:opacity-100 transition-opacity;
  }

  .quote-corner {
    @apply absolute w-4 h-4 border-2 rounded-full;
  }

  .group:hover .quote-corner {
    @apply opacity-100;
  }

  /* Animação de carregamento */
  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .skeleton {
    animation: skeleton-loading 1.5s infinite;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.1) 0%,
      rgba(0, 0, 0, 0.02) 50%,
      rgba(0, 0, 0, 0.1) 100%
    );
    background-size: 200% 100%;
  }
}
*/
