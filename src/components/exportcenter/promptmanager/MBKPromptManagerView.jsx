/**
 * MBKPromptManagerView.jsx
 *
 * Tab 2 im Export-Center: globaler Prompt-Manager. Klassisches Sidebar-
 * Editor-Layout. RBAC: Sichtbar nur für Administrator + Moodle-Designer
 * (siehe ExportCenter.jsx).
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useMBKGlobalPrompts } from '@/hooks/useMBKGlobalPrompts';
import MBKPromptManagerSidebar from './MBKPromptManagerSidebar';
import MBKPromptManagerEditor from './MBKPromptManagerEditor';

export default function MBKPromptManagerView() {
  const { prompts, isLoading, update, isUpdating, seed, isSeeding } = useMBKGlobalPrompts();
  const [selectedId, setSelectedId] = useState(null);

  // Beim ersten Laden den ersten Eintrag auswählen.
  useEffect(() => {
    if (!selectedId && prompts.length > 0) {
      const sorted = [...prompts].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setSelectedId(sorted[0].id);
    }
  }, [prompts, selectedId]);

  const selectedPrompt = prompts.find((p) => p.id === selectedId) || null;
  const isEmpty = !isLoading && prompts.length === 0;

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[320px] shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
        <div className="p-3 border-b border-border bg-card flex items-center justify-between">
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
            prompts={prompts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </aside>

      <main className="flex-1 overflow-hidden">
        <MBKPromptManagerEditor
          prompt={selectedPrompt}
          onSave={update}
          isSaving={isUpdating}
        />
      </main>
    </div>
  );
}