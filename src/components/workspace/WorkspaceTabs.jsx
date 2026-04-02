/**
 * WorkspaceTabs.jsx
 *
 * 8-Stufen Workflow für den Workspace einer Einheit.
 * Schritt 1: Einheit verwalten
 * Schritt 2: Struktur anlegen
 * Schritt 3: Aktivitäten zuordnen
 * Schritt 4: Basisaufgaben erstellen (Ebene 1)
 * Schritt 5: Allgemeine Aufgaben erstellen (Ebene 2)
 * Schritt 6: Anwendungs- & Projektaufgaben erstellen (Ebene 3)
 * Schritt 7: Freigabe-Cockpit (pädagogische Abnahme)
 * Schritt 8: Moodle-Export (technische Freigabe & Admin-Bestätigung)
 */
import React from 'react';
import { cn } from '@/lib/utils';
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