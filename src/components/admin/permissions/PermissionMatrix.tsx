import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { modulosPorCategoria, NIVEL_INFO, type Perfil } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionMatrixProps {
  value: Record<string, number>;
  perfil: Perfil;
  onChange: (value: Record<string, number>) => void;
  readonly?: boolean;
}

export function PermissionMatrix({ value, perfil, onChange, readonly = false }: PermissionMatrixProps) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(
    ['PDV', 'OPERACAO', 'CARDAPIO', 'FINANCEIRO', 'ESTOQUE', 'CLIENTES', 'CAF', 'FRANQUIA', 'SISTEMA']
  ));

  // Carrega padrões do perfil para mostrar comparação
  const { data: defaults = {} } = useQuery({
    queryKey: ['perfil_defaults', perfil],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('rbac_perfil_permissoes')
        .select('modulo_codigo, nivel')
        .eq('perfil', perfil);
      const map: Record<string, number> = {};
      (data || []).forEach((d: any) => { map[d.modulo_codigo] = d.nivel; });
      return map;
    },
    enabled: !!perfil,
  });

  const toggleCat = (id: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setModuloNivel = (codigo: string, nivel: number) => {
    if (readonly) return;
    onChange({ ...value, [codigo]: nivel });
  };

  const restoreDefaults = () => {
    if (readonly) return;
    onChange({ ...defaults });
  };

  const customCount = Object.entries(value).filter(
    ([k, v]) => defaults[k] !== undefined && defaults[k] !== v
  ).length;

  const grupos = modulosPorCategoria();

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-muted-foreground">
              Permissões por módulo
            </p>
            {customCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-300">
                {customCount} personalizada{customCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {!readonly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
              onClick={restoreDefaults}
            >
              <RotateCcw size={12} /> Restaurar padrão do perfil
            </Button>
          )}
        </div>

        {/* Level legend */}
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/30">
          {[0, 1, 2, 3, 4].map(n => (
            <span
              key={n}
              className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', NIVEL_INFO[n].bg, NIVEL_INFO[n].color)}
            >
              {n} — {NIVEL_INFO[n].label}
            </span>
          ))}
        </div>

        {/* Categories */}
        {grupos.map(cat => {
          const isOpen = openCats.has(cat.id);
          const catModulosCount = cat.modulos.length;
          const catComAcesso = cat.modulos.filter(m => (value[m.codigo] ?? 0) > 0).length;

          return (
            <div key={cat.id} className="border rounded-xl overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                onClick={() => toggleCat(cat.id)}
              >
                <span className="text-base">{cat.emoji}</span>
                <span className="font-bold text-sm flex-1">{cat.label}</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {catComAcesso}/{catModulosCount} com acesso
                </span>
                {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>

              {/* Module rows */}
              {isOpen && (
                <div className="divide-y">
                  {cat.modulos.map(mod => {
                    const currentNivel = value[mod.codigo] ?? 0;
                    const defaultNivel = defaults[mod.codigo] ?? 0;
                    const isCustom = currentNivel !== defaultNivel;
                    const info = NIVEL_INFO[currentNivel];

                    return (
                      <div key={mod.codigo} className={cn(
                        'flex items-center gap-3 px-4 py-2.5 transition-colors',
                        isCustom && 'bg-amber-50/50 dark:bg-amber-900/10'
                      )}>
                        {/* Module name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{mod.nome}</span>
                            {isCustom && (
                              <Badge variant="outline" className="text-[9px] font-bold text-amber-600 border-amber-300 h-4 px-1">
                                custom
                              </Badge>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info size={11} className="text-muted-foreground/40 shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px] text-xs">
                                {mod.descricao}
                                {isCustom && (
                                  <p className="mt-1 text-amber-600 font-medium">
                                    Padrão: {NIVEL_INFO[defaultNivel].label}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Level selector */}
                        <div className="flex gap-1 shrink-0">
                          {[0, 1, 2, 3, 4].map(n => {
                            const ni = NIVEL_INFO[n];
                            const isActive = currentNivel === n;
                            return (
                              <Tooltip key={n}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    disabled={readonly}
                                    onClick={() => setModuloNivel(mod.codigo, n)}
                                    className={cn(
                                      'w-8 h-7 rounded-lg text-[11px] font-black transition-all',
                                      isActive
                                        ? cn(ni.bg, ni.color, 'ring-2 ring-offset-1', ni.border, 'scale-110 shadow-sm')
                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted',
                                      readonly && 'cursor-default opacity-60'
                                    )}
                                  >
                                    {n}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {ni.label}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>

                        {/* Current level label */}
                        <span className={cn('text-[10px] font-bold w-[60px] text-right shrink-0', info.color)}>
                          {info.short}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
