import React from 'react';
import { Reorder } from 'framer-motion';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import { WorkspaceTab } from './WorkspaceTab';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandLauncher } from './CommandLauncher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function WorkspaceTabs() {
  const { tabs, setTabs, setCommandLauncherOpen } = useWorkspaceTabs();

  return (
    <TooltipProvider>
      <div className="flex items-end px-4 bg-zinc-50 dark:bg-zinc-950/20 border-b border-zinc-200 dark:border-zinc-800 h-11 w-full shrink-0 select-none">
        
        {/* Reorderable tabs group */}
        <Reorder.Group
          axis="x"
          values={tabs}
          onReorder={setTabs}
          className="flex items-end gap-1 overflow-x-auto scrollbar-none max-w-full pt-1"
        >
          {tabs.map((tabPath) => (
            <Reorder.Item
              key={tabPath}
              value={tabPath}
              className="shrink-0 focus:outline-none"
            >
              <WorkspaceTab path={tabPath} />
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Plus Button to open Spotlight Command Palette */}
        <div className="flex items-center h-9 ml-2 pb-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCommandLauncherOpen(true)}
                className="h-7 w-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="text-[10px] bg-zinc-900 text-white border border-zinc-800">
              <span>Abrir Central de Busca (⌘K)</span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Spotlight command modal instance */}
        <CommandLauncher />
      </div>
    </TooltipProvider>
  );
}
export default WorkspaceTabs;
