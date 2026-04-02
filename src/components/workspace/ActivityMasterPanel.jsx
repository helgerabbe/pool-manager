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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
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
    await base44.entities.MasterAufgabe.create({
      activity_id: activityRecord.id,
      lernpaket_id: activityRecord.lernpaket_id,
      reihenfolge: masterAufgaben.length + 1,
    });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] });
    setCreating(false);
    toast.success('Neue Masteraufgabe erstellt.');
  };

  return (
    <div className="space-y-6">
      {/* ── Basisangaben ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold">{catalogEntry?.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Phase: {activityRecord.phase}
          </span>
        </div>
        <div className="p-1">
          <ActivityDetailView
            activityRecord={activityRecord}
            kannBearbeiten={kannBearbeiten}
            queryClient={queryClient}
          />
        </div>
      </div>

      {/* ── Masteraufgaben-Vorlagen ──────────────────────────────────────────── */}
      {supportsMaster && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Masteraufgaben-Vorlagen</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Erstelle Vorlagen und generiere KI-Klone daraus.
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {masterAufgaben.length} Vorlagen
            </span>
          </div>

          {/* Karten-Liste */}
          {masterAufgaben.map((master, idx) => (
            <MasterAufgabeCard
              key={master.id}
              master={master}
              index={idx + 1}
              catalogName={catalogEntry?.name || ''}
              klone={kloneByMasterId[master.id] || []}
              kannBearbeiten={kannBearbeiten}
              userEmail={userEmail}
              onDeleted={() => queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] })}
              onKlonesCreated={() => queryClient.invalidateQueries({ queryKey: ['klone', activityRecord.id] })}
            />
          ))}

          {/* Neue Masteraufgabe hinzufügen */}
          {kannBearbeiten && (
            <Button
              variant="outline"
              onClick={handleAddMaster}
              disabled={creating}
              className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle…</>
                : <><Plus className="w-4 h-4" /> Neue Masteraufgabe hinzufügen</>}
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