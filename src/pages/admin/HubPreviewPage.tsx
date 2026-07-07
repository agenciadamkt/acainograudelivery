import { useState } from 'react';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';

const NAV_ITEMS = ['Estoque', 'Financeiro', 'Delivery', 'PDV', 'Universidade no Grau', 'Marketing'];

export default function HubPreviewPage() {
  const [activeNav, setActiveNav] = useState('Delivery');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        fontFamily:
          "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        /* Gradiente escuro roxo cobrindo 100% da tela */
        background:
          'linear-gradient(108deg, #020110 0%, #06041e 14%, #0d0b38 28%, #181462 44%, #241a7a 56%, #1a1068 72%, #07061c 100%)',
      }}
    >
      {/* ── Camadas de profundidade (full-screen) ── */}

      {/* BLOOM PRINCIPAL */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 63% 52%, rgba(152,62,255,0.90) 0%, rgba(118,44,230,0.62) 18%, rgba(90,32,190,0.32) 36%, rgba(60,20,140,0.10) 52%, transparent 66%)',
      }} />

      {/* HIGHLIGHT no pico */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 63% 52%, rgba(190,100,255,0.28) 0%, transparent 22%)',
      }} />

      {/* Glow azul superior */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 48% 12%, rgba(110,95,248,0.30) 0%, transparent 40%)',
      }} />

      {/* Acento quente inferior-direito */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at 88% 84%, rgba(170,80,255,0.25) 0%, transparent 36%)',
      }} />

      {/* Vinheta esquerda */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 18%, transparent 32%)',
      }} />

      {/* Vinheta radial nas arestas */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.38) 100%)',
      }} />

      {/* Textura fundo-01 sutil */}
      <img
        src="/hub-preview/fundo-01.png"
        draggable={false}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', opacity: 0.05,
          mixBlendMode: 'screen',
          pointerEvents: 'none', zIndex: 2,
        }}
      />

      {/* acai-1 — topo-esquerda, saindo para fora */}
      <img
        src="/hub-preview/acai-1.png"
        draggable={false}
        style={{
          position: 'absolute',
          width: 185,
          top: 52,
          left: -18,
          zIndex: 40,
          pointerEvents: 'none',
          userSelect: 'none',
          filter:
            'drop-shadow(0 30px 46px rgba(0,0,0,0.68)) drop-shadow(0 10px 18px rgba(0,0,0,0.46))',
        }}
      />

      {/* ── Navbar ── */}
      <div
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 36px 20px',
          gap: 20,
        }}
      >
        <span style={{
          color: 'rgba(255,255,255,0.44)',
          fontSize: 11, fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase' as const,
          whiteSpace: 'nowrap' as const, flexShrink: 0,
        }}>
          Sistema Operacional da Franquia
        </span>

        <nav style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(255,255,255,0.065)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 999,
          padding: '5px 7px',
          backdropFilter: 'blur(20px)',
        }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item;
            return (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                style={{
                  background: isActive ? '#7c3aed' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.44)',
                  borderRadius: 999,
                  padding: '7px 18px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  border: 'none', cursor: 'pointer',
                  letterSpacing: isActive ? '-0.01em' : '0',
                  boxShadow: isActive
                    ? '0 2px 16px rgba(124,58,237,0.60), 0 1px 4px rgba(0,0,0,0.3)'
                    : 'none',
                  transition: 'all 0.17s ease',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {item}
              </button>
            );
          })}
        </nav>

        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>
          <User style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.72)' }} />
        </div>
      </div>

      {/* ── Hero — flex:1 para ocupar o espaço restante entre navbar e bottom ── */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1 }}>

        {/* "GrauOS" centralizado */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <span style={{
            fontSize: 'clamp(102px, 22vw, 340px)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.044em',
            lineHeight: 1,
            opacity: 0.97,
            fontFamily: "'Outfit', system-ui, sans-serif",
            WebkitFontSmoothing: 'antialiased',
          }}>
            GrauOS
          </span>
        </div>

        {/* Logo watermark — direita */}
        <img
          src="/hub-preview/logo-nograu.png"
          draggable={false}
          style={{
            position: 'absolute',
            right: 28, top: '50%', transform: 'translateY(-50%)',
            width: 86, opacity: 0.062, zIndex: 4,
            pointerEvents: 'none', userSelect: 'none',
          }}
        />

        {/* Bloom atrás da caixa */}
        <div style={{
          position: 'absolute',
          width: 300, height: 300,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(ellipse, rgba(118,46,228,0.40) 0%, transparent 68%)',
          filter: 'blur(48px)',
          zIndex: 8, pointerEvents: 'none',
        }} />

        {/* Sombra de contato */}
        <div style={{
          position: 'absolute',
          bottom: 22, left: '50%', transform: 'translateX(-50%)',
          width: 196, height: 30,
          background: 'rgba(0,0,0,0.45)',
          borderRadius: '50%', filter: 'blur(22px)',
          zIndex: 9, pointerEvents: 'none',
        }} />

        {/* Caixa */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src="/hub-preview/caixa.png"
            draggable={false}
            style={{
              height: 'min(320px, 42vh)',
              transform: 'translateY(-14px)',
              filter: [
                'drop-shadow(0 54px 70px rgba(0,0,0,0.84))',
                'drop-shadow(0 22px 36px rgba(48,16,128,0.58))',
                'drop-shadow(0 8px 14px rgba(0,0,0,0.60))',
              ].join(' '),
              pointerEvents: 'none', userSelect: 'none',
            }}
          />
        </div>

        {/* acai-2 topo-direita */}
        <img src="/hub-preview/acai-2.png" draggable={false} style={{
          position: 'absolute',
          width: 88, top: '8%', right: '19%',
          zIndex: 20, pointerEvents: 'none', userSelect: 'none',
          filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.64)) drop-shadow(0 6px 10px rgba(0,0,0,0.42))',
        }} />

        {/* acai-2 direita-baixo */}
        <img src="/hub-preview/acai-2.png" draggable={false} style={{
          position: 'absolute',
          width: 54, top: '28%', right: '11%',
          zIndex: 20, pointerEvents: 'none', userSelect: 'none',
          opacity: 0.92,
          filter: 'drop-shadow(0 11px 18px rgba(0,0,0,0.60)) drop-shadow(0 4px 7px rgba(0,0,0,0.38))',
        }} />

        {/* Morango */}
        <img src="/hub-preview/morango.png" draggable={false} style={{
          position: 'absolute',
          width: 116, bottom: '8%', right: '15%',
          zIndex: 20, pointerEvents: 'none', userSelect: 'none',
          filter: 'drop-shadow(0 20px 32px rgba(0,0,0,0.64)) drop-shadow(0 8px 12px rgba(0,0,0,0.44))',
        }} />
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '12px 36px 28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              color: '#fff', fontWeight: 700, fontSize: 21,
              letterSpacing: '-0.03em', lineHeight: 1,
              fontFamily: "'Outfit', sans-serif",
            }}>
              GrauOS
            </span>
            <span style={{
              background: '#7c3aed', color: '#fff',
              fontSize: 10, fontWeight: 700,
              padding: '3px 10px', borderRadius: 999,
              letterSpacing: '0.06em', textTransform: 'uppercase' as const,
              boxShadow: '0 2px 10px rgba(124,58,237,0.62)',
            }}>
              Hub
            </span>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.33)', fontSize: 11,
            lineHeight: 1.55, maxWidth: 308,
          }}>
            GrauOS é a central de controle que une cada unidade Açaí no Grau
            em uma única operação inteligente
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {([ChevronLeft, ChevronRight] as const).map((Icon, i) => (
            <button
              key={i}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.70)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.18s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(255,255,255,0.13)';
                el.style.borderColor = 'rgba(255,255,255,0.36)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.borderColor = 'rgba(255,255,255,0.22)';
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
