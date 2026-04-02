/**
 * WorkspaceTabs.jsx
 *
 * 8-Stufen Workflow für den Workspace einer Einheit.
 * Nur Icons mit sofortigem Tooltip bei Mouse-Over.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, LayoutGrid, Zap, Wand2, ClipboardList, Target, CheckSquare, Rocket } from 'lucide-react';

const TABS = [
  { value: 'einheit',      label: 'Einheit verwalten',                icon: BookOpen,       step: 1 },
  { value: 'struktur',     label: 'Struktur anlegen',                 icon: LayoutGrid,     step: 2 },
  { value: 'aktivitaeten', label: 'Aktivitäten zuordnen',             icon: Zap,            step: 3 },
  { value: 'aufgaben',     label: 'Basisaufgaben erstellen',          icon: Wand2,          step: 4 },
  { value: 'ebene2',       label: 'Allgemeine Aufgaben erstellen',    icon: ClipboardList,  step: 5 },
  { value: 'ebene3',       label: 'Anwendungs- & Projektaufgaben',    icon: Target,         step: 6 },
  { value: 'cockpit',      label: 'Freigabe-Cockpit',                 icon: CheckSquare,    step: 7 },
  { value: 'export',       label: 'Moodle-Export',                    icon: Rocket,         step: 8 },
];

export default function WorkspaceTabs({ activeTab, onTabChange }) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-0.5 bg-muted p-1 rounded-xl shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <Tooltip key={tab.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(tab.value)}
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold opacity-75">Schritt {tab.step}</span>
                  <span>•</span>
                  <span>{tab.label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}