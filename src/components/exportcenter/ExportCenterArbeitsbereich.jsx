/**
 * ExportCenterArbeitsbereich.jsx
 *
 * Rechte Spalte des Export-Centers (Phase G).
 *
 * Drei Zonen:
 *   A) Status-Header  →  ExportCenterStatusHeader
 *   B) Delta-Analyse   →  ExportCenterDeltaPanel
 *   C) MBK-Prompts     →  bestehendes MBKPromptGeneratorPanel
 *
 * Diese Komponente lädt die ausgewählte Einheit und reicht sie an die
 * Sub-Panels weiter. Geschäftslogik (Mutationen) bleibt in den jeweiligen
 * Sub-Komponenten und Backend-Funktionen.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send } from 'lucide-react';
import MBKPromptGeneratorPanel from '@/components/export/MBKPromptGeneratorPanel';
import ExportCenterStatusHeader from '@/components/exportcenter/ExportCenterStatusHeader';
import ExportCenterDeltaPanel from '@/components/exportcenter/ExportCenterDeltaPanel';

export default function ExportCenterArbeitsbereich({ einheitId }) {
  const { data: einheit, isLoading } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });

  if (!einheitId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <Send className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-base font-semibold text-muted-foreground">
          Wähle links eine Einheit aus.
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
          Sobald du eine Einheit anklickst, erscheinen hier Status,
          Delta-Analyse und die MBK-Prompts.
        </p>
      </div>
    );
  }

  if (isLoading || !einheit) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Zone A: Status & Abschluss */}
      <ExportCenterStatusHeader einheit={einheit} />

      {/* Zone B: Delta-Analyse */}
      <ExportCenterDeltaPanel einheit={einheit} />

      {/* Zone C: MBK-Prompts (bestehendes Panel wiederverwenden) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <MBKPromptGeneratorPanel einheitId={einheitId} />
      </div>
    </div>
  );
}