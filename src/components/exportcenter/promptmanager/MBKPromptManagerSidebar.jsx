/**
 * MBKPromptManagerSidebar.jsx
 *
 * Linke Spalte des MBK-Prompt-Managers. Zeigt zwei aufklappbare Akkordeons
 * (Globale Definitionen + Systembausteine) mit der Liste der aktuell
 * gepflegten Prompts.
 */

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Globe, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

// airgap-1.5.0: UI-Bausteine bekommen eine eigene visuelle Sektion in der
// Sidebar, damit eine Grafikabteilung sie auf einen Blick findet.
// Bleiben technisch in der Kategorie 'global' — wir filtern nur per Schlüssel.
const UI_PROMPT_KEYS = new Set(['ui_css_variables', 'ui_tab_bar_html', 'ui_default_header_html']);

const KATEGORIE_META = {
  global: {
    label: 'Globale Definitionen',
    icon: Globe,
    hint: 'Mission Statement & strukturelle Begriffe — fließen in den System-Prompt jeder Einheit.',
  },
  ui_bausteine: {
    label: '🎨 UI-Bausteine',
    icon: Globe,
    hint: 'CSS, Tab-Bar und Header-Template für die generierten HTML-Dateien (Payload 0). Pflege durch die Grafikabteilung — Edits invalidieren NICHT die didaktischen Inhalte.',
  },
  systembaustein: {
    label: 'Systembausteine',
    icon: Boxes,
    hint: 'Standard-Bauteile (Einführung, Diagnose, Lernlandkarte …) — werden bei passendem Sektor-Item injiziert.',
  },
};

function PromptListItem({ prompt, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(prompt.id)}
      className={cn(
        'w-full text-left px-3 py-2 rounded-md text-sm transition border',
        isActive
          ? 'bg-primary/10 border-primary/40 text-foreground'
          : 'bg-transparent border-transparent hover:bg-muted/60 text-muted-foreground'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-medium">{prompt.anzeigename || prompt.schluessel}</span>
        {prompt.ist_aktiv === false && (
          <Badge variant="outline" className="text-[10px]">inaktiv</Badge>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5 font-mono">
        {prompt.schluessel}
      </div>
    </button>
  );
}

export default function MBKPromptManagerSidebar({ prompts, selectedId, onSelect }) {
  const grouped = { global: [], ui_bausteine: [], systembaustein: [] };
  for (const p of prompts) {
    // UI-Bausteine eigener visueller Bucket — ändert nichts am DB-Datensatz.
    if (UI_PROMPT_KEYS.has(p.schluessel)) {
      grouped.ui_bausteine.push(p);
      continue;
    }
    if (grouped[p.kategorie]) grouped[p.kategorie].push(p);
  }
  for (const arr of Object.values(grouped)) {
    arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={['global', 'ui_bausteine', 'systembaustein']}
      className="space-y-2 p-3"
    >
      {Object.entries(KATEGORIE_META).map(([key, meta]) => {
        const Icon = meta.icon;
        const items = grouped[key] || [];
        return (
          <AccordionItem key={key} value={key} className="border rounded-lg bg-card">
            <AccordionTrigger className="px-3 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-primary" />
                <span className="font-semibold">{meta.label}</span>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2 space-y-1">
              <p className="text-[11px] text-muted-foreground px-2 pb-2">{meta.hint}</p>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-3 py-2">
                  Noch keine Einträge — bitte Seed ausführen.
                </p>
              ) : (
                items.map((p) => (
                  <PromptListItem
                    key={p.id}
                    prompt={p}
                    isActive={p.id === selectedId}
                    onSelect={onSelect}
                  />
                ))
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}