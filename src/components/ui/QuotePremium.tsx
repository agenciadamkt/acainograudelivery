'use client';

import React, { useState, useEffect, useId } from 'react';
import { Copy, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// COMPONENTE: DotPattern
// ============================================================

interface DotPatternProps {
  width?: any;
  height?: any;
  x?: any;
  y?: any;
  cx?: any;
  cy?: any;
  cr?: any;
  className?: string;
  color?: string;
  opacity?: number;
  [key: string]: any;
}

export function DotPattern({
  width = 24,
  height = 24,
  x = 0,
  y = 0,
  cx = 1,
  cy = 0.5,
  cr = 0.5,
  className,
  color = 'rgb(209, 213, 219)',
  opacity = 0.3,
  ...props
}: DotPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <circle 
            id="pattern-circle" 
            cx={cx} 
            cy={cy} 
            r={cr}
            fill={color}
            opacity={opacity}
          />
        </pattern>
      </defs>
      <rect 
        width="100%" 
        height="100%" 
        strokeWidth={0} 
        fill={`url(#${id})`} 
      />
    </svg>
  );
}

// ============================================================
// COMPONENTE: QuotePremium
// ============================================================

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  source?: string;
}

interface QuotePremiumProps {
  quote?: Quote;
  onCopy?: (text: string) => void;
  onFavorite?: (quote: Quote) => void;
  isFavorited?: boolean;
  variant?: 'default' | 'compact' | 'showcase';
  showPattern?: boolean;
  patternDensity?: 'sparse' | 'normal' | 'dense';
  accentColor?: string;
  className?: string;
  animated?: boolean;
}

export function QuotePremium({
  quote = {
    id: 'quote_028',
    text: 'Simplicidade é a sofisticação máxima.',
    author: 'Steve Jobs',
    category: 'Design',
    source: 'Biografia'
  },
  onCopy,
  onFavorite,
  isFavorited = false,
  variant = 'default',
  showPattern = true,
  patternDensity = 'normal',
  accentColor = '#667EEA',
  className,
  animated = true
}: QuotePremiumProps) {
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(isFavorited);
  const [isHovering, setIsHovering] = useState(false);

  // Sync state with prop if it changes
  useEffect(() => {
    setFavorite(isFavorited);
  }, [isFavorited]);

  const patternConfig = {
    sparse: { width: 40, height: 40, cr: 0.4 },
    normal: { width: 24, height: 24, cr: 0.5 },
    dense: { width: 12, height: 12, cr: 0.6 }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `"${quote.text}" — ${quote.author}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(text);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !favorite;
    setFavorite(newState);
    onFavorite?.(quote);
  };

  const cornerSize = variant === 'showcase' ? 'w-6 h-6' : 'w-4 h-4';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
        'border border-slate-200/60 dark:border-slate-700',
        'shadow-lg hover:shadow-xl transition-all duration-300',
        variant === 'showcase' && 'border-2 border-slate-300 dark:border-slate-600',
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        '--accent-color': accentColor,
      } as React.CSSProperties}
    >
      {/* Dot Pattern Background */}
      {showPattern && (
        <DotPattern
          {...patternConfig[patternDensity]}
          color={accentColor}
          opacity={variant === 'showcase' ? 0.15 : 0.08}
          className={animated ? 'animate-pulse duration-4000' : ''}
        />
      )}

      {/* Corner Decorators */}
      <div className={cn('absolute -left-0.5 -top-0.5 z-10', cornerSize)}>
        <div
          className="w-full h-full rounded-full border-2"
          style={{ borderColor: accentColor }}
        />
      </div>
      <div className={cn('absolute -bottom-0.5 -left-0.5 z-10', cornerSize)}>
        <div
          className="w-full h-full rounded-full border-2"
          style={{ borderColor: accentColor }}
        />
      </div>
      <div className={cn('absolute -right-0.5 -top-0.5 z-10', cornerSize)}>
        <div
          className="w-full h-full rounded-full border-2"
          style={{ borderColor: accentColor }}
        />
      </div>
      <div className={cn('absolute -bottom-0.5 -right-0.5 z-10', cornerSize)}>
        <div
          className="w-full h-full rounded-full border-2"
          style={{ borderColor: accentColor }}
        />
      </div>

      {/* Left Accent Line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 z-5"
        style={{
          background: `linear-gradient(180deg, ${accentColor} 0%, transparent 50%, transparent 100%)`,
          opacity: isHovering ? 1 : 0.5,
          transition: 'opacity 0.3s ease'
        }}
      />

      {/* Content Container */}
      <div
        className={cn(
          'relative z-20 flex flex-col',
          variant === 'showcase' && 'py-8 px-6 md:py-12 md:px-10 lg:py-16 lg:px-14',
          variant === 'compact' && 'py-4 px-5',
          variant === 'default' && 'py-6 px-6 md:py-8 md:px-8'
        )}
      >
        {/* Category Badge */}
        <div className="mb-4 md:mb-6 flex items-center gap-2">
          <span
            className="text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border"
            style={{
              color: accentColor,
              borderColor: accentColor,
              backgroundColor: `${accentColor}08`,
            }}
          >
            {quote.category}
          </span>
        </div>

        {/* Quote Text */}
        <blockquote
          className={cn(
            'font-display text-slate-900 dark:text-slate-100 leading-tight',
            variant === 'showcase' && 'text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8',
            variant === 'default' && 'text-2xl md:text-3xl font-semibold mb-6',
            variant === 'compact' && 'text-lg font-medium mb-4'
          )}
        >
          <span className="inline-block mr-2" style={{ color: accentColor }}>
            "
          </span>
          <span className="inline">
            {variant === 'showcase' ? (
              quote.text.split(' ').reduce((lines: string[][], word, idx) => {
                if (!lines[lines.length - 1]) lines.push([]);
                lines[lines.length - 1].push(word);
                if ((idx + 1) % 5 === 0) lines.push([]);
                return lines;
              }, []).map((line, idx) => (
                <React.Fragment key={idx}>
                  {line.map((word, widx) => (
                    <span
                      key={widx}
                      className={cn(
                        'inline',
                        widx % 3 === 0 && 'font-bold',
                        widx % 2 === 0 && variant === 'showcase' && 'opacity-80'
                      )}
                    >
                      {word}{' '}
                    </span>
                  ))}
                  <br />
                </React.Fragment>
              ))
            ) : (
              quote.text
            )}
          </span>
          <span className="inline-block ml-1" style={{ color: accentColor }}>
            "
          </span>
        </blockquote>

        {/* Author Info */}
        <div
          className={cn(
            'flex items-center justify-between',
            variant === 'showcase' && 'mt-10 pt-8 border-t',
            (variant === 'default' || variant === 'compact') && 'mt-2'
          )}
          style={{
            borderColor: variant === 'showcase' ? `${accentColor}20` : 'transparent'
          }}
        >
          <div className="flex flex-col">
            <span
              className={cn(
                'font-semibold text-slate-900 dark:text-slate-100',
                variant === 'showcase' && 'text-xl',
                variant === 'default' && 'text-base',
                variant === 'compact' && 'text-sm'
              )}
              style={{ color: accentColor }}
            >
              {quote.author}
            </span>
            {quote.source && variant !== 'compact' && (
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {quote.source}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 items-center">
            <button
              onClick={handleCopy}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                'hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
                copied && 'text-green-600'
              )}
              title="Copiar citação"
              aria-label="Copiar citação"
            >
              {copied ? (
                <span className="text-xs font-semibold">✓</span>
              ) : (
                <Copy size={16} style={{ color: accentColor }} />
              )}
            </button>

            <button
              onClick={handleFavorite}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                'hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
                favorite && 'text-red-500'
              )}
              title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-label="Adicionar aos favoritos"
            >
              <Heart
                size={16}
                fill={favorite ? accentColor : 'none'}
                style={{
                  color: favorite ? accentColor : 'currentColor',
                  transition: 'all 0.2s ease'
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Hover Effect Border */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl pointer-events-none',
          'border border-transparent transition-colors duration-300',
          isHovering && 'border-slate-300/50'
        )}
      />
    </div>
  );
}
