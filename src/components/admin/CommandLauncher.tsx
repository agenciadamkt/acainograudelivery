import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { SearchRegistry, SearchResult } from '@/utils/searchRegistry';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Search, Sparkles } from 'lucide-react';

export function CommandLauncher() {
  const { isCommandLauncherOpen, setCommandLauncherOpen, openTab } = useWorkspaceTabs();
  const { track } = useTelemetry();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Dispara a busca quando a query muda
  useEffect(() => {
    let active = true;
    const search = async () => {
      const queryResults = await SearchRegistry.search(query);
      if (active) {
        setResults(queryResults);
      }
    };
    
    search();
    return () => {
      active = false;
    };
  }, [query]);

  // Listener para o atalho global (Ctrl + K ou Cmd + K) para abrir o launcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora fora das páginas de admin
      if (!window.location.pathname.startsWith('/admin/')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const newState = !isCommandLauncherOpen;
        setCommandLauncherOpen(newState);
        if (newState) {
          track('CommandLauncherOpened');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandLauncherOpen, setCommandLauncherOpen, track]);

  const handleSelect = (item: SearchResult) => {
    track('CommandLauncherSelected', { url: item.url, title: item.title });
    openTab(item.url);
    setCommandLauncherOpen(false);
    setQuery('');
  };

  return (
    <Dialog open={isCommandLauncherOpen} onOpenChange={setCommandLauncherOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-xl border border-zinc-200 dark:border-zinc-800 bg-background shadow-2xl rounded-xl">
        <DialogTitle className="sr-only">Central de Navegação</DialogTitle>
        <Command className="flex flex-col h-full max-h-[350px] overflow-hidden" label="Central de Navegação">
          <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 gap-2">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Pesquise por módulos (ex: Pedidos, Financeiro)..."
              value={query}
              onValueChange={setQuery}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground text-foreground"
            />
          </div>
          
          <Command.List className="overflow-y-auto p-2 scrollbar-none max-h-[290px]">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
              Nenhum resultado encontrado.
            </Command.Empty>
            
            {results.map((item) => {
              const Icon = item.icon || Search;
              return (
                <Command.Item
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none text-foreground hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground aria-selected:bg-primary aria-selected:text-primary-foreground transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 flex flex-col">
                    <span className="font-medium text-left">{item.title}</span>
                    <span className="text-[11px] text-left opacity-70 truncate">{item.category}</span>
                  </div>
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
