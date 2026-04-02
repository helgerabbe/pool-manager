/**
 * MoodleExportTab.jsx
 *
 * Inline-Version des MoodleExportManagers für den Workspace-Tab "Nach Moodle exportieren".
 * Gleiche Logik wie MoodleExportManager, aber ohne Dialog-Wrapper – direkt im Hauptbereich.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Download, RotateCw, Clock, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { formatExportDate } from '@/lib/statusLogic';
import { generateDeltaPayload } from '@/lib/deltaPayloadGenerator';
import SyncWarningBanner from '@/components/sync/SyncWarningBanner';

function filterExportableEinheiten(einheiten = []) {
  return einheiten.filter((e) => {
    const isFreigegeben = e.freigabe_status === 'Freigegeben für Moodle';
    const hasSync = e.last_synced_at !== null && e.last_synced_at !== undefined;
    const isOutdated = !hasSync || new Date(e.last_synced_at) < new Date(e.updated_date);
    return isFreigegeben && isOutdated;
  });
}

function filterExportableBasismodule(basismodule = []) {
  return basismodule.filter((b) => {
    const isFreigegeben = b.status === 'Bereit für Moodle';
    const hasSync = b.last_synced_at !== null && b.last_synced_at !== undefined;
    const isOutdated = !hasSync || new Date(b.last_synced_at) < new Date(b.updated_date);
    return isFreigegeben && isOutdated;
  });
}

function ExportStatusBadge({ item }) {
  const isNew = !item.last_synced_at;
  const isUpdatedAfterExport =
    item.last_exported_at && item.updated_date &&
    new Date(item.updated_date) > new Date(item.last_exported_at);

  if (isUpdatedAfterExport) return <Badge className="bg-red-100 text-red-700 gap-1"><AlertTriangle className="w-3 h-3" />Nach Export geändert</Badge>;
  if (item.last_exported_at && !item.last_synced_at) return <Badge className="bg-blue-100 text-blue-700 gap-1"><Clock className="w-3 h-3" />Exportiert</Badge>;
  if (isNew) return <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="w-3 h-3" />Neu</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 gap-1"><RotateCw className="w-3 h-3" />Update</Badge>;
}

function GroupHeader({ label, allSelected, onToggleAll, count }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
      <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
      <span className="text-sm font-semibold text-slate-700">{label} <span className="text-xs text-muted-foreground">({count})</span></span>
    </div>
  );
}

function ExportItemRow({ item, isSelected, onToggle, isBasismodul = false, onConfirmSync }) {
  const title = isBasismodul ? item.titel : item.titel_der_einheit;
  const subtitle = isBasismodul ? `Fach: ${item.fach}` : `${item.fach} · Jahrgang ${item.jahrgangsstufe}`;
  const isExportedWaitingSync = item.last_exported_at && !item.last_synced_at;
  const exportDate = item.last_exported_at ? formatExportDate(item.last_exported_at) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          {exportDate && <p className="text-xs text-slate-600 mt-1">💾 Zuletzt exportiert: {exportDate}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportStatusBadge item={item} isBasismodul={isBasismodul} />
          {isExportedWaitingSync && (
            <Button size="sm" variant="outline" onClick={() => onConfirmSync(item.id)} className="h-7 text-xs gap-1">
              <Check className="w-3 h-3" /> Sync OK
            </Button>
          )}
        </div>
      </div>
      <SyncWarningBanner item={item} isBasismodul={isBasismodul} />
    </div>
  );
}

export default function MoodleExportTab() {
  const [selectedEinheitIds, setSelectedEinheitIds] = useState(new Set());
  const [selectedBasismodulIds, setSelectedBasismodulIds] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [deltaMode, setDeltaMode] = useState(false);

  const { data: allEinheiten = [], refetch: refetchEinheiten } = useQuery({ queryKey: ['einheiten'], queryFn: () => base44.entities.Einheiten.list() });
  const { data: allBasismodule = [], refetch: refetchBasismodule } = useQuery({ queryKey: ['basismodule'], queryFn: () => base44.entities.Basismodule.list() });
  const { data: allLernpakete = [] } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: allLernziele = [] } = useQuery({ queryKey: ['lernziele'], queryFn: () => base44.entities.Lernziele.list() });
  const { data: allAufgaben = [] } = useQuery({ queryKey: ['aufgaben'], queryFn: () => base44.entities.Aufgabenbausteine.list() });
  const { data: allThemenfelder = [] } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: allActivities = [] } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: allMaster = [] } = useQuery({ queryKey: ['masterAufgaben'], queryFn: () => base44.entities.MasterAufgabe.list() });
  const { data: allKlone = [] } = useQuery({ queryKey: ['klone'], queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }) });

  const confirmEinheitSync = useMutation({
    mutationFn: (id) => base44.entities.Einheiten.update(id, { last_synced_at: new Date().toISOString() }),
    onSuccess: () => { refetchEinheiten(); toast.success('Moodle-Synchronisierung bestätigt.'); },
  });
  const confirmBasismodulSync = useMutation({
    mutationFn: (id) => base44.entities.Basismodule.update(id, { last_synced_at: new Date().toISOString() }),
    onSuccess: () => { refetchBasismodule(); toast.success('Moodle-Synchronisierung bestätigt.'); },
  });

  const exportableEinheiten = useMemo(() => filterExportableEinheiten(allEinheiten), [allEinheiten]);
  const exportableBasismodule = useMemo(() => filterExportableBasismodule(allBasismodule), [allBasismodule]);

  useEffect(() => {
    setSelectedEinheitIds(new Set(exportableEinheiten.map(e => e.id)));
    setSelectedBasismodulIds(new Set(exportableBasismodule.map(b => b.id)));
  }, [exportableEinheiten.length, exportableBasismodule.length]);

  const toggleEinheit = (id) => setSelectedEinheitIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleBasismodul = (id) => setSelectedBasismodulIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllEinheiten = () => setSelectedEinheitIds(selectedEinheitIds.size === exportableEinheiten.length ? new Set() : new Set(exportableEinheiten.map(e => e.id)));
  const toggleAllBasismodule = () => setSelectedBasismodulIds(selectedBasismodulIds.size === exportableBasismodule.length ? new Set() : new Set(exportableBasismodule.map(b => b.id)));

  const handleConfirmSync = (id) => {
    if (exportableEinheiten.find(e => e.id === id)) confirmEinheitSync.mutate(id);
    else if (exportableBasismodule.find(b => b.id === id)) confirmBasismodulSync.mutate(id);
  };

  const handleExport = async () => {
    if (selectedEinheitIds.size === 0 && selectedBasismodulIds.size === 0) {
      toast.error('Bitte wählen Sie mindestens ein Element aus.');
      return;
    }
    setIsExporting(true);
    try {
      const selectedEinheitenData = exportableEinheiten.filter(e => selectedEinheitIds.has(e.id));
      const selectedBasismoduleData = exportableBasismodule.filter(b => selectedBasismodulIds.has(b.id));
      const nowTimestamp = new Date().toISOString();
      let totalChangedCount = 0;
      const einheitPayloads = [];

      for (const einheit of selectedEinheitenData) {
        const deltaPayload = generateDeltaPayload(einheit, allLernpakete, allLernziele, allAufgaben, allThemenfelder, einheit.last_exported_at, deltaMode);
        einheitPayloads.push(deltaPayload);
        totalChangedCount += deltaPayload.statistics.total_changed_count;
        await base44.entities.Einheiten.update(einheit.id, { last_exported_at: nowTimestamp });
      }

      const basismodulePayload = {
        timestamp: nowTimestamp,
        export_type: 'basismodule',
        basismodule: selectedBasismoduleData.map(b => ({ ...b, last_exported_at: nowTimestamp })),
        statistics: { basismodule_count: selectedBasismoduleData.length },
      };

      await Promise.all(selectedBasismoduleData.map(b => base44.entities.Basismodule.update(b.id, { last_exported_at: nowTimestamp })));

      const combinedPayload = {
        timestamp: nowTimestamp,
        export_type: deltaMode ? 'moodle_delta_combined' : 'moodle_full_combined',
        is_delta_export: deltaMode,
        einheiten: einheitPayloads,
        basismodule: basismodulePayload,
        statistics: { einheiten_count: selectedEinheitenData.length, basismodule_count: selectedBasismoduleData.length, total_changed_count: totalChangedCount + selectedBasismoduleData.length },
      };

      const dataStr = JSON.stringify(combinedPayload, null, 2);
      const url = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `moodle-export-${deltaMode ? 'delta-' : ''}${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      refetchEinheiten();
      refetchBasismodule();
      toast.success(`Export erfolgreich: ${combinedPayload.statistics.total_changed_count} Element(e).`);
    } catch (error) {
      toast.error('Fehler beim Exportieren: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const totalExportable = exportableEinheiten.length + exportableBasismodule.length;
  const totalSelected = selectedEinheitIds.size + selectedBasismodulIds.size;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto w-full space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Nach Moodle exportieren</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Wählen Sie Einheiten und Basismodule mit Status „Freigegeben für Moodle" für den Export aus.
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || totalSelected === 0}
          className="gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Wird exportiert…' : `Datei generieren (${totalSelected})`}
        </Button>
      </div>

      {/* Delta-Mode Toggle */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
        <Zap className="w-4 h-4 text-slate-500 shrink-0" />
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input type="checkbox" checked={deltaMode} onChange={e => setDeltaMode(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm font-medium text-slate-700">Nur Delta-Änderungen exportieren</span>
        </label>
        <span className="text-xs text-muted-foreground">{deltaMode ? 'Nur neue/geänderte Inhalte' : 'Vollständige Daten'}</span>
      </div>

      {/* Hinweis auf freigegebene Aktivitäten/Klone */}
      {(() => {
        const approvedActivities = allActivities.filter(a => a.sync_status === 'approved').length;
        const approvedMaster = allMaster.filter(m => m.sync_status === 'approved').length;
        const approvedKlone = allKlone.filter(k => k.sync_status === 'approved').length;
        const totalApproved = approvedActivities + approvedMaster + approvedKlone;
        
        if (totalApproved > 0 && totalExportable === 0) {
          return (
            <div className="flex items-start gap-3 p-5 rounded-xl border border-blue-200 bg-blue-50">
              <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Hinweis: Freigegebene Aktivitäten ohne Einheit-Export</p>
                <p className="text-xs">Sie haben {totalApproved} Aktivität(en)/Aufgabe(n) freigegeben, aber keine Einheiten mit Status „Freigegeben für Moodle". Die freigegeben Aktivitäten müssen zuerst in eine Einheit exportiert werden.</p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Inhalt */}
      {totalExportable === 0 ? (
        <div className="flex items-start gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Keine exportierbaren Elemente</p>
            <p className="text-xs">Es gibt keine Einheiten oder Basismodule mit Status „Freigegeben für Moodle" und ausstehenden Änderungen.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Einheiten */}
          {exportableEinheiten.length > 0 && (
            <div className="space-y-3">
              <GroupHeader label="Einheiten" allSelected={selectedEinheitIds.size === exportableEinheiten.length} onToggleAll={toggleAllEinheiten} count={exportableEinheiten.length} />
              <div className="space-y-3">
                {exportableEinheiten.map(e => (
                  <ExportItemRow key={e.id} item={e} isSelected={selectedEinheitIds.has(e.id)} onToggle={() => toggleEinheit(e.id)} isBasismodul={false} onConfirmSync={handleConfirmSync} />
                ))}
              </div>
            </div>
          )}

          {/* Basismodule */}
          {exportableBasismodule.length > 0 && (
            <div className="space-y-3">
              <GroupHeader label="Basismodule" allSelected={selectedBasismodulIds.size === exportableBasismodule.length} onToggleAll={toggleAllBasismodule} count={exportableBasismodule.length} />
              <div className="space-y-3">
                {exportableBasismodule.map(b => (
                  <ExportItemRow key={b.id} item={b} isSelected={selectedBasismodulIds.has(b.id)} onToggle={() => toggleBasismodul(b.id)} isBasismodul={true} onConfirmSync={handleConfirmSync} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Footer-Info */}
      {totalExportable > 0 && (
        <p className="text-xs text-muted-foreground pt-2 border-t">
          {totalSelected} von {totalExportable} Element(en) ausgewählt
        </p>
      )}
    </div>
  );
}