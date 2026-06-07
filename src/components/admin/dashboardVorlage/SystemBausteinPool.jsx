/**
 * SystemBausteinPool.jsx
 *
 * Schlanke linke Spalte des Standard-Vorlagen-Editors (Verwaltung → Dashboards).
 * Zeigt NUR die globalen System-Bausteine/Platzhalter/Bündel als Drag-Quelle –
 * KEINE echten Einheiten-Aufgaben (die gibt es in der Verwaltung nicht).
 *
 * Wiederverwendet die Pool-Karte aus dem Cockpit (SystemBausteinPoolItem),
 * damit das Look&Feel identisch ist.
 */

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Loader2, Sparkles } from 'lucide-react';
import SystemBausteinPoolItem from '@/components/lernpfade/SystemBausteinPoolItem';

export default function SystemBausteinPool({ bausteine = [], isLoading = false }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Standard-Elemente
          </h3>
          <span className="text-[10px] text-muted-foreground">{bausteine.length} verfügbar</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Ziehe Bausteine, Platzhalter und Bündel in die Sektoren. Sie können beliebig oft genutzt werden.
        </p>
      </div>

      <Droppable droppableId="pool-system" type="VORLAGE_ITEM" isDropDisabled>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lade Bausteine…
              </div>
            ) : bausteine.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 px-2">
                <Sparkles className="w-7 h-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Keine System-Bausteine vorhanden. Lege sie im Tab „System-Bausteine" an.
                </p>
              </div>
            ) : (
              bausteine.map((b, idx) => (
                <SystemBausteinPoolItem key={b.id} baustein={b} index={idx} isSelected={false} onClick={() => {}} />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}