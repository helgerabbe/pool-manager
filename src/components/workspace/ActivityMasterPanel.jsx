/**
 * ActivityMasterPanel.jsx
 *
 * Hauptbereich für eine ausgewählte Aktivität in Tab 4.
 * Zeigt:
 *   1. Basisangaben der Aktivität (ActivityDetailView)
 *   2. Sektor "Masteraufgaben-Vorlagen" mit n Karten + "Neue Masteraufgabe"-Button
 *      (nur wenn supports_master === true)
 */

import React, { useState, useEffect } from 'react';
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
  userRole,
  einheitId,
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [focusedMasterId, setFocusedMasterId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUserEmail(u?.email || null));
  }, []);

  // Lock-Status direkt aus DB auslesen (Single Source of Truth)
  const { data: lernpaket } = useQuery({
    queryKey: ['lernpakete', activityRecord?.lernpaket_id],
    queryFn: () => base44.entities.Lernpakete.filter({ id: activityRecord.lernpaket_id }),
    select: (data) => data[0],
    enabled: !!activityRecord?.lernpaket_id,
    refetchInterval: 5000,
  });

  const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
  const lernpaketLockActive =
    lernpaket?.is_locked &&
    lernpaket?.locked_by_email === currentUserEmail &&
    lernpaket?.locked_at &&
    Date.now() - new Date(lernpaket.locked_at).getTime() < LOCK_TIMEOUT_MS;

  const isInEditMode = kannBearbeiten && lernpaketLockActive;

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
    <div className="space-y-6 overflow-visible h-auto">
      {/* ── Aktivitäts-Header ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <ActivityDetailView
          activityRecord={activityRecord}
          kannBearbeiten={kannBearbeiten}
          queryClient={queryClient}
        />
      </div>

      {/* ── Masteraufgaben-Bereich (immer sichtbar wenn supports_master) ───────── */}
      {supportsMaster && (
        <div className="space-y-4">

          {/* Sektion-Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-primary" />
                Aufgaben
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isInEditMode
                  ? 'Erstelle Vorlagen – die KI generiert daraus automatisch Aufgabenvarianten.'
                  : 'Aktiviere den Bearbeitungsmodus um Aufgaben anzulegen.'}
              </p>
            </div>
            {masterAufgaben.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                {masterAufgaben.length} Masteraufgabe{masterAufgaben.length !== 1 ? 'n' : ''}
              </span>
            )}
          </div>

          {/* Vorhandene Master-Karten (immer sichtbar) */}
          {masterAufgaben.map((master, idx) => (
            <MasterAufgabeCard
              key={master.id}
              master={master}
              index={idx + 1}
              catalogName={catalogEntry?.name || ''}
              klone={kloneByMasterId[master.id] || []}
              kannBearbeiten={isInEditMode}
              userEmail={userEmail}
              userRole={userRole}
              autoExpand={master.id === focusedMasterId}
              onDeleted={() => {
                setFocusedMasterId(null);
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben', activityRecord.id] });
              }}
              onKlonesCreated={() => queryClient.invalidateQueries({ queryKey: ['klone', activityRecord.id] })}
            />
          ))}

          {/* Leerzustand */}
          {masterAufgaben.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-sm">Noch keine Aufgaben</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  {isInEditMode
                    ? 'Erstelle jetzt die erste Masteraufgabe als Vorlage für KI-generierte Varianten.'
                    : 'Aktiviere den Bearbeitungsmodus um die erste Aufgabe anzulegen.'}
                </p>
              </div>
              {isInEditMode && (
                <Button onClick={handleAddMaster} disabled={creating} className="gap-2">
                  {creating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle…</>
                    : <><Plus className="w-4 h-4" /> Erste Aufgabe erstellen</>}
                </Button>
              )}
            </div>
          )}

          {/* Weitere Masteraufgabe hinzufügen */}
          {masterAufgaben.length > 0 && isInEditMode && (
            <Button
              variant="outline"
              onClick={handleAddMaster}
              disabled={creating}
              className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle…</>
                : <><Plus className="w-4 h-4" /> Weitere Aufgabe hinzufügen</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}