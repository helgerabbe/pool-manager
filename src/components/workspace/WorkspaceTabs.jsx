/**
 * WorkspaceTabs.jsx
 *
 * 3-Ebenen-Navigation für den Workspace einer Einheit.
 * Tab 1: Struktur anlegen  (Themenfelder + Lernpakete)
 * Tab 2: Aktivitäten zuordnen (Lernziele + Aktivitäten)
 * Tab 3: Aufgaben erstellen (Masteraufgaben + Replikate)
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, Zap, Wand2 } from 'lucide-react';

const TABS = [
  { value: 'struktur',    label: 'Struktur anlegen',       icon: LayoutGrid, step: 1 },
  { value: 'aktivitaeten', label: 'Aktivitäten zuordnen',  icon: Zap,         step: 2 },
  { value: 'aufgaben',    label: 'Aufgaben erstellen',      icon: Wand2,       step: 3 },
];

export default function WorkspaceTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-xl shrink-0">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
            )}>
              {tab.step}
            </span>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}