/**
 * ExportCenterArbeitsbereich.jsx
 *
 * Rechte Spalte des Export-Centers. Zeigt pro ausgewählter Einheit:
 *   - Status-Header mit Lifecycle-Badge, Timestamps und "Export beendet"-Button
 *   - InterneInhalteCard (KI-Snapshots prüfen & generieren)
 *   - MBKPromptGeneratorPanel (Air-Gap-Tabs)
 *   - SupabaseExportCard (Export nach Supabase)
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send } from 'lucide-react';
import ExportCenterStatusHeader from '@/components/exportcenter/ExportCenterStatusHeader';
import InterneInhalteCard from '@/components/exportcenter/InterneInhalteCard';
import MBKPromptGeneratorPanel from '@/components/export/MBKPromptGeneratorPanel';
import SupabaseExportCard from '@/components/exportcenter/SupabaseExportCard';

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
          Delta-Analyse und die MBK-Payloads.
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
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <ExportCenterStatusHeader einheit={einheit} />
      <InterneInhalteCard einheitId={einheitId} />
      <MBKPromptGeneratorPanel einheitId={einheitId} />
      <SupabaseExportCard einheitId={einheitId} />
    </div>
  );
}