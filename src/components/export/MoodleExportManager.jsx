/**
 * MoodleExportManager.jsx
 *
 * Selective Export Manager für Moodle-Daten mit Delta-Unterstützung
 * - Filtert Einheiten & Basismodule nach Freigabe-Status + Delta-Status
 * - Checkbox-basierte Selektion (alle standardmäßig checked)
 * - Gruppiert Anzeige nach Entity-Typ
 * - Generiert Export-Payload mit optionaler Delta-Logik
 * - Zeigt Warn-Banner bei nachträglichen Änderungen
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCw,
  Clock,
  Check,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatExportDate } from '@/lib/statusLogic';
import { generateDeltaPayload } from '@/lib/deltaPayloadGenerator';
import SyncWarningBanner from '@/components/sync/SyncWarningBanner';

// ── Filter-Helper: Exportierbare Einheiten ────────────────────────────────────

function filterExportableEinheiten(einheiten = []) {
  return einheiten.filter((e) => {
    const isFreigegeben = e.freigabe_status === 'Freigegeben für Moodle';
    const hasSync = e.last_synced_at !== null && e.last_synced_at !== undefined;
    const isOutdated =
      !hasSync ||
      new Date(e.last_synced_at) < new Date(e.updated_date);

    return isFreigegeben && isOutdated;
  });
}

function filterExportableBasismodule(basismodule = []) {
  return basismodule.filter((b) => {
    const isFreigegeben = b.status === 'Bereit für Moodle';
    const hasSync = b.last_synced_at !== null && b.last_synced_at !== undefined;
    const isOutdated =
      !hasSync ||
      new Date(b.last_synced_at) < new Date(b.updated_date);

    return isFreigegeben && isOutdated;
  });
}

// ── Status-Badge ──────────────────────────────────────────────────────

function ExportStatusBadge({ item, isBasismodul = false }) {
  const isNew = !item.last_synced_at;
  const isExported = item.last_exported_at && !item.last_synced_at;
  const isUpdatedAfterExport =
    item.last_exported_at &&
    item.updated_date &&
    new Date(item.updated_date) > new Date(item.last_exported_at);

  if (isUpdatedAfterExport) {
    return (
      <Badge className="bg-red-100 text-red-700 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Nach Export geändert
      </Badge>
    );
  }

  if (isExported) {
    return (
      <Badge className="bg-blue-100 text-blue-700 gap-1">
        <Clock className="w-3 h-3" />
        Exportiert
      </Badge>
    );
  }

  if (isNew) {
    return (
      <Badge className="bg-green-100 text-green-700 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Neues Element
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-100 text-amber-700 gap-1">
      <RotateCw className="w-3 h-3" />
      Update
    </Badge>
  );
}

// ── Selektions-Group Header ───────────────────────────────────────────────────

function GroupHeader({ label, allSelected, onToggleAll, count }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2">
        <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
        <span className="text-sm font-semibold text-slate-700">
          {label}
          <span className="ml-2 text-xs text-muted-foreground">({count})</span>
        </span>
      </div>
    </div>
  );
}

// ── Item Row mit Checkbox ─────────────────────────────────────────────────────

function ExportItemRow({ item, isSelected, onToggle, isBasismodul = false, onConfirmSync }) {
  const title = isBasismodul ? item.titel : item.titel_der_einheit;
  const subtitle = isBasismodul
    ? `Fach: ${item.fach}`
    : `${item.fach} · Jahrgang ${item.jahrgangsstufe}`;

  const isExportedWaitingSync = item.last_exported_at && !item.last_synced_at;
  const exportDate = item.last_exported_at ? formatExportDate(item.last_exported_at) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          {exportDate && (
            <p className="text-xs text-slate-600 mt-2">
              💾 Zuletzt exportiert: {exportDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportStatusBadge item={item} isBasismodul={isBasismodul} />
          {isExportedWaitingSync && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onConfirmSync(item.id)}
              className="h-7 text-xs gap-1"
            >
              <Check className="w-3 h-3" />
              Sync OK
            </Button>
          )}
        </div>
      </div>

      {/* Warn-Banner: Nach Export erneut geändert */}
      <SyncWarningBanner item={item} isBasismodul={isBasismodul} />
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function MoodleExportManager({ open, onOpenChange }) {
  // State: Selektierte IDs
  const [selectedEinheitIds, setSelectedEinheitIds] = useState(new Set());
  const [selectedBasismodulIds, setSelectedBasismodulIds] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [deltaMode, setDeltaMode] = useState(false); // Toggle für Delta vs. Full

  // Fetch Daten
  const { data: allEinheiten = [], refetch: refetchEinheiten } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });

  const { data: allBasismodule = [], refetch: refetchBasismodule } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => base44.entities.Basismodule.list(),
  });

  const { data: allLernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const { data: allLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });

  const { data: allAufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
  });

  const { data: allThemenfelder = [] } = useQuery({
    queryKey: ['themenfelder'],
    queryFn: () => base44.entities.Themenfeld.list(),
  });

  // Sprint G: AllgemeineAufgabe wird in das Brian-/Moodle-Export-Payload
  // aufgenommen, damit die typ-spezifischen Felder (lernpaket_logik,
  // erforderliche_anzahl, interne_reihenfolge, hinweise_zum_material) für
  // die KI-Pipeline verfügbar sind.
  const { data: allAllgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben'],
    queryFn: () => base44.entities.AllgemeineAufgabe.list(),
  });

  // Mutations für Sync-Bestätigung
  const confirmEinheitSync = useMutation({
    mutationFn: (einheitId) =>
      base44.entities.Einheiten.update(einheitId, {
        last_synced_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      refetchEinheiten();
      toast.success('Moodle-Synchronisierung bestätigt.');
    },
  });

  const confirmBasismodulSync = useMutation({
    mutationFn: (basismodulId) =>
      base44.entities.Basismodule.update(basismodulId, {
        last_synced_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      refetchBasismodule();
      toast.success('Moodle-Synchronisierung bestätigt.');
    },
  });

  // Filter exportierbare Elemente
  const exportableEinheiten = useMemo(
    () => filterExportableEinheiten(allEinheiten),
    [allEinheiten]
  );

  const exportableBasismodule = useMemo(
    () => filterExportableBasismodule(allBasismodule),
    [allBasismodule]
  );

  // Initialisiere Selektion beim Öffnen (alle checked)
  useEffect(() => {
    if (open) {
      setSelectedEinheitIds(
        new Set(exportableEinheiten.map((e) => e.id))
      );
      setSelectedBasismodulIds(
        new Set(exportableBasismodule.map((b) => b.id))
      );
    }
  }, [open, exportableEinheiten, exportableBasismodule]);

  // Toggle einzelnes Element
  const toggleEinheit = (id) => {
    setSelectedEinheitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleBasismodul = (id) => {
    setSelectedBasismodulIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle alle einer Gruppe
  const toggleAllEinheiten = () => {
    if (selectedEinheitIds.size === exportableEinheiten.length) {
      setSelectedEinheitIds(new Set());
    } else {
      setSelectedEinheitIds(new Set(exportableEinheiten.map((e) => e.id)));
    }
  };

  const toggleAllBasismodule = () => {
    if (selectedBasismodulIds.size === exportableBasismodule.length) {
      setSelectedBasismodulIds(new Set());
    } else {
      setSelectedBasismodulIds(
        new Set(exportableBasismodule.map((b) => b.id))
      );
    }
  };

  // Export-Logik mit Delta-Unterstützung
  const handleGenerateExport = async () => {
    if (selectedEinheitIds.size === 0 && selectedBasismodulIds.size === 0) {
      toast.error('Bitte wählen Sie mindestens ein Element zum Exportieren aus.');
      return;
    }

    setIsExporting(true);

    try {
      const selectedEinheitenData = exportableEinheiten.filter((e) =>
        selectedEinheitIds.has(e.id)
      );
      const selectedBasismoduleData = exportableBasismodule.filter((b) =>
        selectedBasismodulIds.has(b.id)
      );

      const nowTimestamp = new Date().toISOString();
      let totalChangedCount = 0;
      const einheitPayloads = [];

      // ── EINHEITEN: Mit Delta-Logik ──
      for (const einheit of selectedEinheitenData) {
        try {
          const deltaPayload = generateDeltaPayload(
            einheit,
            allLernpakete,
            allLernziele,
            allAufgaben,
            allThemenfelder,
            einheit.last_exported_at,
            deltaMode, // true = nur Delta, false = alles
            allAllgemeineAufgaben // Sprint G: Brian-Anschluss
          );

          einheitPayloads.push(deltaPayload);
          totalChangedCount += deltaPayload.statistics.total_changed_count;

          // ✅ Setze last_exported_at
          await base44.entities.Einheiten.update(einheit.id, {
            last_exported_at: nowTimestamp,
          });
        } catch (validationError) {
          console.warn(`Validierungsfehler für Einheit ${einheit.id}:`, validationError);
          toast.error(
            `Validierungsfehler für "${einheit.titel_der_einheit}": ${validationError.message}`
          );
          throw validationError;
        }
      }

      // ── BASISMODULE: Full-Export ──
      const basismodulePayload = {
        timestamp: nowTimestamp,
        export_type: 'basismodule',
        basismodule: selectedBasismoduleData.map((b) => ({
          id: b.id,
          fach: b.fach,
          titel: b.titel,
          beschreibung_thema: b.beschreibung_thema,
          status: b.status,
          updated_date: b.updated_date,
          last_synced_at: b.last_synced_at,
          last_exported_at: nowTimestamp,
        })),
        statistics: {
          basismodule_count: selectedBasismoduleData.length,
        },
      };

      // ✅ Setze last_exported_at für Basismodule
      await Promise.all(
        selectedBasismoduleData.map((b) =>
          base44.entities.Basismodule.update(b.id, {
            last_exported_at: nowTimestamp,
          })
        )
      );

      // ── Kombiniere Payloads ──
      const combinedPayload = {
        timestamp: nowTimestamp,
        export_type: deltaMode ? 'moodle_delta_combined' : 'moodle_full_combined',
        is_delta_export: deltaMode,
        einheiten: einheitPayloads,
        basismodule: basismodulePayload,
        statistics: {
          einheiten_count: selectedEinheitenData.length,
          basismodule_count: selectedBasismoduleData.length,
          total_changed_count:
            totalChangedCount + selectedBasismoduleData.length,
        },
      };

      // ── Download JSON-Datei ──
      const dataStr = JSON.stringify(combinedPayload, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moodle-export-${deltaMode ? 'delta-' : ''}${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // ── Refresh Daten ──
      refetchEinheiten();
      refetchBasismodule();

      toast.success(
        `${deltaMode ? 'Delta-' : ''}Export erfolgreich: ${combinedPayload.statistics.total_changed_count} Element(e).`
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync-Bestätigung Handler
  const handleConfirmSync = (id) => {
    const einheit = exportableEinheiten.find((e) => e.id === id);
    const basismodul = exportableBasismodule.find((b) => b.id === id);

    if (einheit) {
      confirmEinheitSync.mutate(id);
    } else if (basismodul) {
      confirmBasismodulSync.mutate(id);
    }
  };

  // Render
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Moodle Export Manager</DialogTitle>
          <DialogDescription>
            Wählen Sie die Einheiten und Basismodule aus, die exportiert werden sollen.
          </DialogDescription>
        </DialogHeader>

        {/* Delta-Mode Toggle */}
        <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-slate-50 border border-slate-200">
          <Zap className="w-4 h-4 text-slate-500" />
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={deltaMode}
              onChange={(e) => setDeltaMode(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-slate-700">
              Nur Delta-Änderungen exportieren
            </span>
          </label>
          <span className="text-xs text-muted-foreground">
            {deltaMode ? 'Nur neue/geänderte Inhalte' : 'Vollständige Daten'}
          </span>
        </div>

        {/* Info-Banner */}
        {exportableEinheiten.length === 0 && exportableBasismodule.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Keine exportierbaren Elemente</p>
              <p className="text-xs">
                Es gibt keine Einheiten oder Basismodule mit Status
                "Freigegeben für Moodle" und ausstehenden Änderungen.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 px-1">
            {/* Einheiten Gruppe */}
            {exportableEinheiten.length > 0 && (
              <div className="space-y-3">
                <GroupHeader
                  label="Einheiten"
                  allSelected={
                    selectedEinheitIds.size === exportableEinheiten.length
                  }
                  onToggleAll={toggleAllEinheiten}
                  count={exportableEinheiten.length}
                />
                <div className="space-y-3 pl-2">
                  {exportableEinheiten.map((einheit) => (
                    <ExportItemRow
                      key={einheit.id}
                      item={einheit}
                      isSelected={selectedEinheitIds.has(einheit.id)}
                      onToggle={() => toggleEinheit(einheit.id)}
                      isBasismodul={false}
                      onConfirmSync={handleConfirmSync}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Basismodule Gruppe */}
            {exportableBasismodule.length > 0 && (
              <div className="space-y-3">
                <GroupHeader
                  label="Basismodule"
                  allSelected={
                    selectedBasismodulIds.size ===
                    exportableBasismodule.length
                  }
                  onToggleAll={toggleAllBasismodule}
                  count={exportableBasismodule.length}
                />
                <div className="space-y-3 pl-2">
                  {exportableBasismodule.map((basismodul) => (
                    <ExportItemRow
                      key={basismodul.id}
                      item={basismodul}
                      isSelected={selectedBasismodulIds.has(basismodul.id)}
                      onToggle={() => toggleBasismodul(basismodul.id)}
                      isBasismodul={true}
                      onConfirmSync={handleConfirmSync}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {selectedEinheitIds.size + selectedBasismodulIds.size} von{' '}
              {exportableEinheiten.length + exportableBasismodule.length}{' '}
              Element(e) ausgewählt
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleGenerateExport}
                disabled={
                  isExporting ||
                  (selectedEinheitIds.size === 0 &&
                    selectedBasismodulIds.size === 0)
                }
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Wird exportiert…' : 'Datei generieren'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}