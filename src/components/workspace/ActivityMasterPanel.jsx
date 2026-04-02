/**
 * ActivityMasterPanel.jsx
 *
 * Hauptbereich für eine ausgewählte Aktivität in Tab 4.
 * Zeigt:
 *   1. Basisangaben der Aktivität (ActivityDetailView)
 *   2. Sektor "Masteraufgaben-Vorlagen" mit n Karten + "Neue Masteraufgabe"-Button
 *      (nur wenn supports_master === true)
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Crown, Plus, Loader2, ChevronRight } from 'lucide-react';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import MasterAufgabeCard from '@/components/workspace/MasterAufgabeCard';
import { toast } from 'sonner';

export default function ActivityMasterPanel({
  activityRecord,
  catalogEntry,
  supportsMaster,
  kannBearbeiten,
  userEmail,
  einheitId,
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  // null = Aktivitätsansicht, 'new' = soeben erstellt → direkt zur Karte springen
  const [focusedMasterId, setFocusedMasterId] = useState(null);

  // Alle MasterAufgaben für diese Aktivität
  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', activityRecord.id],
    queryFn: () => base44.entities.MasterAufgabe.filter({ activity_id: activityRecord.id }),
    select: (data) => data.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
  });

  // Alle Klone für diese Aktivität (gruppiert nach master_aufgabe_id)
  const { data: alleKlone = [] } = useQuery({
    queryKey: ['klone', activityRecord.id],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
  });

  const kloneByMasterId = alleKlone
    .filter(k => masterAufgaben.some(m => m.id === k.master_aufgabe_id))
    .reduce((acc, k) => {
      if (!acc[k.master_aufgabe_id]) acc[k.master_aufgabe_id] = [];
      acc[k.master_aufgabe_id].push(k);
      return acc;
    }, {});

  const handleAddMaster = async () => {
    setCreating(true);
    const neu = await base44.entities.MasterAufgabe.create({
      activity_id: activityRecord.id,
      lernpaket_id: activityRecord.lernpaket_id,
      reihenfolge: masterAufgaben.length + 1,
    });
    await queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] });
    setCreating(false);
    setFocusedMasterId(neu.id);   // direkt zur neuen Karte scrollen/fokussieren
    toast.success('Neue Masteraufgabe erstellt.');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-0">
      {/* ── Basisangaben der Aktivität ───────────────────────────────────────── */}
      <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-0">
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold">{catalogEntry?.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Phase: {activityRecord.phase}
          </span>
        </div>
        <div className="flex-1 overflow-hidden p-1">
          <ActivityDetailView
            activityRecord={activityRecord}
            kannBearbeiten={kannBearbeiten}
            queryClient={queryClient}
          />
        </div>
      </div>

      {/* ── Masteraufgaben-Bereich (nur wenn supports_master) ───────────────── */}
      {supportsMaster && (
        <div className="shrink-0 space-y-4 overflow-y-auto p-4">

          {/* Sektion-Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-primary" />
                Masteraufgaben-Vorlagen
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jede Vorlage dient als Basis für KI-generierte Klone.
              </p>
            </div>
            {masterAufgaben.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                {masterAufgaben.length} Vorlage{masterAufgaben.length !== 1 ? 'n' : ''}
              </span>
            )}
          </div>

          {/* Vorhandene Master-Karten */}
          {masterAufgaben.map((master, idx) => (
            <MasterAufgabeCard
              key={master.id}
              master={master}
              index={idx + 1}
              catalogName={catalogEntry?.name || ''}
              klone={kloneByMasterId[master.id] || []}
              kannBearbeiten={kannBearbeiten}
              userEmail={userEmail}
              autoExpand={master.id === focusedMasterId}
              onDeleted={() => {
                setFocusedMasterId(null);
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] });
              }}
              onKlonesCreated={() => queryClient.invalidateQueries({ queryKey: ['klone', activityRecord.id] })}
            />
          ))}

          {/* Leerzustand: prominenter CTA */}
          {masterAufgaben.length === 0 && kannBearbeiten && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/3 px-6 py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Noch keine Masteraufgaben</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Erstelle eine Vorlage und lass die KI daraus automatisch mehrere Aufgabenvarianten generieren.
                </p>
              </div>
              <Button
                onClick={handleAddMaster}
                disabled={creating}
                className="gap-2"
              >
                {creating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle…</>
                  : <><Plus className="w-4 h-4" /> Erste Masteraufgabe erstellen</>}
              </Button>
            </div>
          )}

          {/* Weitere Masteraufgabe hinzufügen (wenn schon welche vorhanden) */}
          {masterAufgaben.length > 0 && kannBearbeiten && (
            <Button
              variant="outline"
              onClick={handleAddMaster}
              disabled={creating}
              className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle…</>
                : <><Plus className="w-4 h-4" /> Weitere Masteraufgabe hinzufügen</>}
            </Button>
          )}

          {masterAufgaben.length === 0 && !kannBearbeiten && (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              Noch keine Masteraufgaben vorhanden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}