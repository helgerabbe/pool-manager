/**
 * ExportCockpitView.jsx
 * 
 * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * 
 * Features:
 * - 2-Signal-System: content_status (pädagogisch) + sync_status (technisch)
 * - Hierarchische Status-Vererbung (Worst-Case-Prinzip)
 * - Smart Expand/Collapse (grüne Container eingeklappt, rote ausgeklappt)
 * - Checkboxen nur für 'approved' Elemente
 * - Deep Links zu Ebene 4 (Task-Editor)
 * - "Jetzt exportieren"-Button mit sync_status='pending' Update
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { enrichDataWithEffectiveStatus, getEffectiveContentStatus } from './StatusCalculations';
import { LernpaketContainer } from './CockpitRows';

export default function ExportCockpitView({ einheitId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);

  // Daten laden
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  const { data: klone = [] } = useQuery({
    queryKey: ['aufgabenbausteine', 'klone'],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
  });

  const { data: masters = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
  });

  // Filtre zu_delete aus
  const visibleActivities = activities.filter(a => a.sync_status !== 'to_delete');
  const visibleKlone = klone.filter(k => k.sync_status !== 'to_delete');
  const visibleMasters = masters.filter(m => m.sync_status !== 'to_delete');

  // Reichere Daten an
  const enrichedActivities = useMemo(
    () => enrichDataWithEffectiveStatus(visibleActivities, visibleKlone, visibleMasters),
    [visibleActivities, visibleKlone, visibleMasters]
  );

  // Export-Mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      // Setze alle selektierten IDs auf sync_status='pending'
      const updates = selectedIds.map((id) => {
        // Finde den Typ raus (activity, master, klon)
        if (visibleActivities.find(a => a.id === id)) {
          return { id, type: 'activity' };
        } else if (visibleMasters.find(m => m.id === id)) {
          return { id, type: 'master' };
        } else {
          return { id, type: 'klon' };
        }
      });

      // Batch-Update
      for (const { id, type } of updates) {
        if (type === 'activity') {
          await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
        } else if (type === 'master') {
          await base44.entities.MasterAufgabe.update(id, { sync_status: 'pending' });
        } else if (type === 'klon') {
          await base44.entities.Aufgabenbausteine.update(id, { sync_status: 'pending' });
        }
      }

      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      setSelectedIds([]);
      toast.success(`🚀 ${count} Element(e) zum Export markiert (pending).`);
    },
    onError: (err) => toast.error('Fehler beim Export: ' + err.message),
  });

  const canSelectForExport = enrichedActivities.some(a => a.effective_content_status === 'approved');
  const hasSelectedItems = selectedIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Freigabe-Cockpit</h2>
        <p className="text-sm text-muted-foreground">
          Überblick über alle Lernpakete und deren pädagogischen Status. Nur fertige Aufgaben können exportiert werden.
        </p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Pädagogischer Status</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span>🔴</span>
              <span>unfertig – Inhalt fehlt</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>🟢</span>
              <span>freigegeben – Export möglich</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Moodle-Status</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span>🆕</span>
              <span>neu / ✅ synced / ⚠️ verändert</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>🔒</span>
              <span>gesperrt (Export lädt) / 🗑️ wird entfernt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lernpakete */}
      <div className="space-y-3">
        {lernpakete.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Keine Lernpakete vorhanden</p>
        ) : (
          lernpakete
            .filter(lp => lp.sync_status !== 'to_delete')
            .map((paket) => (
              <LernpaketContainer
                key={paket.id}
                paket={paket}
                activities={enrichedActivities}
                selectedIds={selectedIds}
                onToggleSelect={(id, type) => {
                  setSelectedIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  );
                }}
                navigate={navigate}
              />
            ))
        )}
      </div>

      {/* Export-Section */}
      {canSelectForExport && (
        <div className="sticky bottom-0 bg-background border-t border-border p-4 rounded-t-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {hasSelectedItems
                ? `${selectedIds.length} Element${selectedIds.length !== 1 ? 'e' : ''} zum Export ausgewählt`
                : 'Wähle fertige Aufgaben aus zum Exportieren'}
            </p>
          </div>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={!hasSelectedItems || exportMutation.isPending}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {exportMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exportiere…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                🚀 Änderungen jetzt nach Moodle übertragen
              </>
            )}
          </Button>
          {!canSelectForExport && (
            <p className="text-xs text-amber-600 text-center">
              Alle Aufgaben müssen auf 'freigegeben' (🟢) stehen, um zu exportieren.
            </p>
          )}
        </div>
      )}
    </div>
  );
}