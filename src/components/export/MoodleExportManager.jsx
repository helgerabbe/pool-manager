/**
 * MoodleExportManager.jsx
 *
 * Selective Export Manager für Moodle-Daten
 * - Filtert Einheiten & Basismodule nach Freigabe-Status + Delta-Status
 * - Checkbox-basierte Selektion (alle standardmäßig checked)
 * - Gruppiert Anzeige nach Entity-Typ
 * - Generiert Export-Payload nur für ausgewählte Elemente
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { AlertTriangle, CheckCircle2, Download, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

// ── Filter-Helper: Exportierbare Einheiten ────────────────────────────────────

function filterExportableEinheiten(einheiten = []) {
  return einheiten.filter((e) => {
    // Bedingung 1: Status ist "Freigegeben für Moodle"
    const isFreigegeben = e.freigabe_status === 'Freigegeben für Moodle';

    // Bedingung 2: Entweder noch nie exportiert (last_synced_at null)
    //             oder älter als updated_at (Delta vorhanden)
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

// ── Status-Badge: Neu vs. Update ──────────────────────────────────────────────

function ExportStatusBadge({ item, isBasismodul = false }) {
  const lastSyncField = isBasismodul ? 'last_synced_at' : 'last_synced_at';
  const isNew = !item[lastSyncField];

  if (isNew) {
    return (
      <Badge className="bg-green-100 text-green-700 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Neues Element
      </Badge>
    );
  }

  return (
    <Badge className="bg-blue-100 text-blue-700 gap-1">
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

function ExportItemRow({ item, isSelected, onToggle, isBasismodul = false }) {
  const title = isBasismodul ? item.titel : item.titel_der_einheit;
  const subtitle = isBasismodul
    ? `Fach: ${item.fach}`
    : `${item.fach} · Jahrgang ${item.jahrgangsstufe}`;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-1 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ExportStatusBadge item={item} isBasismodul={isBasismodul} />
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function MoodleExportManager({ open, onOpenChange }) {
  // State: Selektierte IDs
  const [selectedEinheitIds, setSelectedEinheitIds] = useState(new Set());
  const [selectedBasismodulIds, setSelectedBasismodulIds] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Daten
  const { data: allEinheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });

  const { data: allBasismodule = [] } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => base44.entities.Basismodule.list(),
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

  // Export-Logik: Payload generieren
  const handleGenerateExport = async () => {
    if (selectedEinheitIds.size === 0 && selectedBasismodulIds.size === 0) {
      toast.error('Bitte wählen Sie mindestens ein Element zum Exportieren aus.');
      return;
    }

    setIsExporting(true);

    try {
      // Sammle ausgewählte Daten
      const selectedEinheitenData = exportableEinheiten.filter((e) =>
        selectedEinheitIds.has(e.id)
      );
      const selectedBasismoduleData = exportableBasismodule.filter((b) =>
        selectedBasismodulIds.has(b.id)
      );

      // Erstelle Export-Payload
      const exportPayload = {
        timestamp: new Date().toISOString(),
        export_type: 'moodle_selective_delta',
        einheiten: selectedEinheitenData.map((e) => ({
          id: e.id,
          titel_der_einheit: e.titel_der_einheit,
          fach: e.fach,
          jahrgangsstufe: e.jahrgangsstufe,
          gesamtziel: e.gesamtziel,
          freigabe_status: e.freigabe_status,
          updated_date: e.updated_date,
          last_synced_at: e.last_synced_at,
        })),
        basismodule: selectedBasismoduleData.map((b) => ({
          id: b.id,
          fach: b.fach,
          titel: b.titel,
          beschreibung_thema: b.beschreibung_thema,
          status: b.status,
          updated_date: b.updated_date,
          last_synced_at: b.last_synced_at,
        })),
        statistics: {
          einheiten_count: selectedEinheitenData.length,
          basismodule_count: selectedBasismoduleData.length,
          total_count:
            selectedEinheitenData.length + selectedBasismoduleData.length,
        },
      };

      // Download als JSON-Datei
      const dataStr = JSON.stringify(exportPayload, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moodle-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `${exportPayload.statistics.total_count} Element(e) exportiert.`
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Render
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Moodle Export Manager</DialogTitle>
          <DialogDescription>
            Wählen Sie die Einheiten und Basismodule aus, die exportiert werden
            sollen.
          </DialogDescription>
        </DialogHeader>

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
                <div className="space-y-2 pl-2">
                  {exportableEinheiten.map((einheit) => (
                    <ExportItemRow
                      key={einheit.id}
                      item={einheit}
                      isSelected={selectedEinheitIds.has(einheit.id)}
                      onToggle={() => toggleEinheit(einheit.id)}
                      isBasismodul={false}
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
                <div className="space-y-2 pl-2">
                  {exportableBasismodule.map((basismodul) => (
                    <ExportItemRow
                      key={basismodul.id}
                      item={basismodul}
                      isSelected={selectedBasismodulIds.has(basismodul.id)}
                      onToggle={() => toggleBasismodul(basismodul.id)}
                      isBasismodul={true}
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