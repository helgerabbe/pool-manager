/**
 * MBKPromptManagerView.jsx
 *
 * Tab 2 im Export-Center: globaler Prompt-Manager. Klassisches Sidebar-
 * Editor-Layout. RBAC: Sichtbar nur für Administrator + Moodle-Designer
 * (siehe ExportCenter.jsx).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMBKGlobalPrompts } from '@/hooks/useMBKGlobalPrompts';
import MBKPromptManagerSidebar from './MBKPromptManagerSidebar';
import MBKPromptManagerEditor from './MBKPromptManagerEditor';

export default function MBKPromptManagerView() {
  const { prompts, isLoading, update, isUpdating, seed, isSeeding } = useMBKGlobalPrompts();
  const [selectedId, setSelectedId] = useState(null);

  // Erlaubte Systembausteine: nur die in der Verwaltung gepflegten
  // statischen Bausteine (keine Platzhalter / Bündel) und nur, wenn sie
  // dort als aktiv markiert sind.
  const { data: systemBausteine = [] } = useQuery({
    queryKey: ['systemBausteine'],
    queryFn: () => base44.entities.SystemBausteine.list(),
    staleTime: 60_000,
  });
  const allowedSystemBausteinIds = useMemo(() => {
    const set = new Set();
    for (const sb of systemBausteine) {
      if (sb?.ist_aktiv !== false && sb?.baustein_modus === 'static' && sb?.baustein_id) {
        set.add(sb.baustein_id);
      }
    }
    return set;
  }, [systemBausteine]);

  // Sichtbare Prompts: globale Definitionen unverändert; Systembausteine
  // nur, wenn ihr Schlüssel in `allowedSystemBausteinIds` enthalten ist.
  const visiblePrompts = useMemo(
    () => prompts.filter((p) =>
      p.kategorie !== 'systembaustein' || allowedSystemBausteinIds.has(p.schluessel)
    ),
    [prompts, allowedSystemBausteinIds]
  );

  // Beim ersten Laden den ersten sichtbaren Eintrag auswählen.
  useEffect(() => {
    if (!selectedId && visiblePrompts.length > 0) {
      const sorted = [...visiblePrompts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setSelectedId(sorted[0].id);
    }
  }, [visiblePrompts, selectedId]);

  const selectedPrompt = visiblePrompts.find((p) => p.id === selectedId) || null;
  const isEmpty = !isLoading && visiblePrompts.length === 0;

  return (
    <div className="flex h-full overflow-hidden min-h-0">
      <aside className="w-[320px] shrink-0 border-r border-border bg-muted/20 overflow-y-auto min-h-0 h-full">
        <div className="p-3 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
          <div className="text-sm font-semibold">Bibliothek</div>
          {isEmpty && (
            <Button size="sm" onClick={() => seed()} disabled={isSeeding} className="gap-1.5">
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Seed
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Prompts werden geladen …
          </div>
        ) : isEmpty ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Noch keine Prompts in der Datenbank. Klicke „Seed", um den initialen
            Bestand (Mission, Lerntypen, Systembausteine) anzulegen.
          </div>
        ) : (
          <MBKPromptManagerSidebar
            prompts={visiblePrompts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </aside>

      <main className="flex-1 overflow-y-auto min-h-0 h-full">
        <MBKPromptManagerEditor
          prompt={selectedPrompt}
          onSave={update}
          isSaving={isUpdating}
        />
      </main>
    </div>
  );
}