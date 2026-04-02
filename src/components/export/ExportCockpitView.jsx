/**
 * ExportCockpitView.jsx
 * 
 * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * 
 * Implementiert das 2-Signal-System mit:
 * - Pädagogischer Status (content_status: draft | approved)
 * - Technischer Moodle-Status (sync_status: new | pending | synced | modified | to_delete)
 * - Rekursive Status-Vererbung (Worst-Case-Prinzip)
 * - Smart Expand/Collapse (grüne Container eingeklappt, rote ausgeklappt)
 * - Selektive Checkboxen (nur für 'approved' Items)
 * - Deep Links zu Task-Editor (Ebene 4)
 * - Export-Integration (setze sync_status='pending' für selektierte Items)
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten laden
  // ──────────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten filtern & anreichern
  // ──────────────────────────────────────────────────────────────────────────────

  // Tombstones ausfiltern
  const visibleActivities = activities.filter(a => a.sync_status !== 'to_delete');
  const visibleKlone = klone.filter(k => k.sync_status !== 'to_delete');
  const visibleMasters = masters.filter(m => m.sync_status !== 'to_delete');

  // Status-Vererbung anwenden (Worst-Case-Prinzip)
  const enrichedActivities = useMemo(
    () => enrichDataWithEffectiveStatus(visibleActivities, visibleKlone, visibleMasters),
    [visibleActivities, visibleKlone, visibleMasters]
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Export-Mutation
  // ──────────────────────────────────────────────────────────────────────────────

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) {
        throw new Error('Keine Elemente ausgewählt');
      }

      // Bestimme Typ für jede selektierte ID
      const updates = selectedIds.map((id) => {
        if (visibleActivities.find(a => a.id === id)) {
          return { id, type: 'activity' };
        } else if (visibleMasters.find(m => m.id === id)) {
          return { id, type: 'master' };
        } else {
          return { id, type: 'klon' };
        }
      });

      // Batch-Update: Setze sync_status='pending' für alle selektierten Items
      for (const { id, type } of updates) {
        if (type === 'activity') {
          await base44.entities.LernpaketPhaseAktivitaet.update(id, {
            sync_status: 'pending',
          });
        } else if (type === 'master') {
          await base44.entities.MasterAufgabe.update(id, {
            sync_status: 'pending',
          });
        } else if (type === 'klon') {
          await base44.entities.Aufgabenbausteine.update(id, {
            sync_status: 'pending',
          });
        }
      }

      return updates.length;
    },
    onSuccess: (count) => {
      // Query invalidieren → UI aktualisiert automatisch
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      
      setSelectedIds([]);
      toast.success(`🚀 ${count} Element${count !== 1 ? 'e' : ''} zum Export markiert.`);
    },
    onError: (err) => {
      toast.error('Fehler beim Export: ' + err.message);
    },
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // UI-Logik
  // ──────────────────────────────────────────────────────────────────────────────

  const canSelectForExport = enrichedActivities.some(
    a => a.effective_content_status === 'approved'
  );
  const hasSelectedItems = selectedIds.length > 0;

  const handleToggleSelect = (id, type) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Freigabe-Cockpit</h2>
        <p className="text-sm text-muted-foreground">
          Überblick über alle Lernpakete und deren pädagogischen Status. 
          Nur freigegeben (🟢) Aufgaben können exportiert werden.
        </p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pädagogischer Status
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold">🔴</span>
              <span>unfertig – Inhalt fehlt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">🟢</span>
              <span>freigegeben – Export möglich</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Moodle-Sync-Status
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span>🆕 neu</span>
              <span>✅ synced</span>
              <span>⚠️ verändert</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔒 gesperrt</span>
              <span>🗑️ wird entfernt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status-Vererbung Erklärung */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <p className="font-semibold mb-1">⚙️ Worst-Case-Prinzip:</p>
        <p>
          Wenn EIN Kind-Element (Klon/Master) 🔴 unferttig ist, 
          zeigt der gesamte Pfad nach oben 🔴 unferttig. 
          Ein Lernpaket ist nur 🟢 freigegeben, wenn ALLE enthaltenen Aufgaben 🟢 sind.
        </p>
      </div>

      {/* Lernpakete Listen */}
      <div className="space-y-3">
        {lernpakete.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            Keine Lernpakete vorhanden
          </p>
        ) : (
          lernpakete
            .filter(lp => lp.sync_status !== 'to_delete')
            .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
            .map((paket) => (
              <LernpaketContainer
                key={paket.id}
                paket={paket}
                activities={enrichedActivities}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                navigate={navigate}
              />
            ))
        )}
      </div>

      {/* Export-Section (Sticky Footer) */}
      {canSelectForExport && (
        <div className="sticky bottom-0 bg-background border-t border-border p-4 rounded-t-lg space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {hasSelectedItems
                ? `✓ ${selectedIds.length} Element${selectedIds.length !== 1 ? 'e' : ''} ausgewählt`
                : '→ Wähle fertige (🟢) Aufgaben aus'}
            </p>
            <span className="text-xs text-muted-foreground">
              {enrichedActivities.filter(a => a.effective_content_status === 'approved').length} 
              {' '}exportierbar
            </span>
          </div>

          <Button
            onClick={() => exportMutation.mutate()}
            disabled={!hasSelectedItems || exportMutation.isPending}
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-base py-6"
            size="lg"
          >
            {exportMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exportiere…
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                🚀 Änderungen jetzt nach Moodle übertragen
              </>
            )}
          </Button>

          {!canSelectForExport && (
            <p className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded">
              ⚠️ Alle Aufgaben müssen 🟢 freigegeben sein, um zu exportieren.
            </p>
          )}
        </div>
      )}

      {/* Fallback: Keine exportierbaren Items */}
      {!canSelectForExport && lernpakete.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            ⚠️ Keine exportierbaren Lernpakete vorhanden. 
            Bitte stelle sicher, dass alle Aufgaben den Status 🟢 freigegeben haben.
          </p>
        </div>
      )}
    </div>
  );
}