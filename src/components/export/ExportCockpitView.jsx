/**
 * ExportCockpitView.jsx
 *
 * Freigabe-Cockpit für Moodle-Export (Tab 8 im Workspace).
 *
 * Phase F.1 — Redesign:
 *   - KEIN Einheiten-Selector mehr: das Cockpit bezieht sich immer auf die
 *     aktuell geöffnete Einheit (Prop `einheitId`, vom Workspace gesetzt).
 *   - Neue Header-Karte (`ExportLifecycleHeaderCard`) mit prominentem
 *     Lifecycle-Status und „Freigabe aufheben"-Button für Admin/Fachschaft.
 *   - Workflow-Hilfe wandert in einen aufklappbaren <details>-Block am Ende
 *     der Seite — sie bleibt auffindbar, blockiert aber nicht mehr den Blick
 *     auf die Inhalte.
 *   - Die vier Lerntyp-Karten + aggregierte Drift-Anzeige folgen in F.2;
 *     vorerst bleibt die bestehende Themenfeld-Hierarchie unten erhalten,
 *     damit das Selektieren & Übergeben weiter funktioniert.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, AlertCircle, CheckCircle2, Clock, ShieldCheck, Info, Pencil, Upload, RefreshCw, ChevronDown } from 'lucide-react';
import HelpBadge from '@/components/ui/HelpBadge';
import MissionBadge from '@/components/missionen/MissionBadge';
import ExportErrorBadge from '@/components/exportcenter/ExportErrorBadge.jsx';
import { isMissionApplicable } from '@/lib/missionen';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ExportLifecycleHeaderCard from '@/components/export/ExportLifecycleHeaderCard';
import LerntypDashboardCard from '@/components/export/LerntypDashboardCard';

const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

// ── Status-Badge für eine Aktivität (alle 6 Zustände) ───────────────────────

function AktivitaetStatusBadge({ activity }) {
  const { sync_status, content_status } = activity;

  if (sync_status === 'error') {
    return <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs whitespace-nowrap shrink-0"><AlertCircle className="w-3 h-3 mr-1" />Export-Fehler</Badge>;
  }
  if (sync_status === 'pending') {
    return <Badge className="bg-orange-100 text-orange-800 border border-orange-300 text-xs whitespace-nowrap shrink-0"><Clock className="w-3 h-3 mr-1" />Wird exportiert 🔒</Badge>;
  }
  if (sync_status === 'synced') {
    return <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs whitespace-nowrap shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />In Moodle</Badge>;
  }
  if (sync_status === 'modified') {
    return <Badge className="bg-purple-100 text-purple-800 border border-purple-300 text-xs whitespace-nowrap shrink-0"><RefreshCw className="w-3 h-3 mr-1" />Geändert</Badge>;
  }
  if (content_status === 'approved') {
    return <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs whitespace-nowrap shrink-0"><Upload className="w-3 h-3 mr-1" />Freigegeben</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-xs whitespace-nowrap shrink-0"><Pencil className="w-3 h-3 mr-1" />Entwurf</Badge>;
}

// ── Undo-Button für "pending"-Status ────────────────────────────────────────

function UndoButton({ activityId, entityType = 'activity' }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleUndo = async () => {
    setLoading(true);
    if (entityType === 'allgemein') {
      await base44.entities.AllgemeineAufgabe.update(activityId, { sync_status: 'modified' });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
    } else {
      await base44.entities.LernpaketPhaseAktivitaet.update(activityId, { sync_status: 'modified' });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    }
    toast.success('Übergabe zurückgesetzt.');
    setLoading(false);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleUndo} disabled={loading}
      className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" title="Übergabe zurücksetzen">
      <RotateCcw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
    </Button>
  );
}

// ── Haupt-Hierarchie-Renderer ────────────────────────────────────────────────

function EinheitHierarchy({ unitId, selectedIds, setSelectedIds, lernpakete, themenfelder, aktivitaeten, aktivitaetenKatalog, allgemeineAufgaben, masterAufgaben = [], onNavigateToActivity, onNavigateToTask }) {

  const toggleActivities = useCallback((itemArray) => {
    const exportable = itemArray.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending' && a.sync_status !== 'synced');
    if (exportable.length === 0) return;
    const ids = exportable.map(a => a.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  }, [selectedIds, setSelectedIds]);

  const rows = themenfelder
    .filter(tf => tf.einheit_id === unitId)
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
    .map(tf => {
      const tfPakete = lernpakete
        .filter(lp => lp.themenfeld_id === tf.id)
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

      const tfAufgaben = allgemeineAufgaben.filter(
        a => a.themenfeld_id === tf.id && a.anforderungsebene !== '3 - Projekt' && a.sync_status !== 'to_delete'
      );

      return (
        <div key={tf.id} className="space-y-2">
          <div className="px-2 py-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tf.titel}</span>
          </div>
          <div className="pl-3 space-y-2 border-l-2 border-muted">
            {tfPakete.map(paket => {
              const paketAktivitaeten = aktivitaeten.filter(a => a.lernpaket_id === paket.id);
              const exportable = paketAktivitaeten.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending' && a.sync_status !== 'synced');
              const selectedCount = exportable.filter(a => selectedIds.includes(a.id)).length;
              const allSelected = exportable.length > 0 && selectedCount === exportable.length;

              const phaseOrder = { 'Input': 0, 'Übung': 1, 'Abschluss': 2 };
              const sortedByPhase = paketAktivitaeten
                .sort((a, b) => {
                  const phaseA = phaseOrder[a.phase] ?? 999;
                  const phaseB = phaseOrder[b.phase] ?? 999;
                  if (phaseA !== phaseB) return phaseA - phaseB;
                  return (a.reihenfolge || 0) - (b.reihenfolge || 0);
                });

              const groupedByPhase = { Input: [], Übung: [], Abschluss: [] };
              sortedByPhase.forEach(a => {
                if (groupedByPhase[a.phase]) groupedByPhase[a.phase].push(a);
              });

              return (
                <div key={paket.id} className="space-y-1">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                    <Checkbox checked={allSelected} onCheckedChange={() => toggleActivities(paketAktivitaeten)} disabled={exportable.length === 0} className="h-4 w-4" />
                    <span className="text-sm font-semibold flex-1 truncate">{paket.titel_des_pakets}</span>
                    {exportable.length > 0 && <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>}
                  </div>
                  <div className="pl-5 space-y-1.5 border-l border-muted/50">
                    {paketAktivitaeten.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Keine Aktivitäten</p>
                    ) : (
                      Object.entries(groupedByPhase).map(([phase, activities]) => 
                        activities.length > 0 && (
                          <div key={phase} className="space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">{phase}</p>
                            <div className="space-y-1">
                              {activities.map(act => {
                                const actName = aktivitaetenKatalog.find(k => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                                const isPending = act.sync_status === 'pending';
                                const isSynced = act.sync_status === 'synced';
                                const isApproved = act.content_status === 'approved';

                                const actMasters = masterAufgaben.filter(m => m.lernpaket_phase_aktivitaet_id === act.id);
                                const hasMasterChildren = actMasters.length > 0;
                                const masterExportable = actMasters.filter(m => m.content_status === 'approved' && m.sync_status !== 'pending' && m.sync_status !== 'synced');
                                const masterSelectedCount = masterExportable.filter(m => selectedIds.includes(m.id)).length;
                                const allMastersSelected = masterExportable.length > 0 && masterSelectedCount === masterExportable.length;

                                const isSelectable = !hasMasterChildren && isApproved && !isPending && !isSynced;
                                const isSelected = selectedIds.includes(act.id);

                                return (
                                  <div key={act.id} className="space-y-0.5">
                                    <div className={cn('flex items-center gap-2 p-1.5 rounded transition', isSelectable ? 'hover:bg-muted/20' : 'opacity-70')}>
                                      {isSelectable && <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([act])} className="h-4 w-4 shrink-0" />}
                                      {!isSelectable && <div className="h-4 w-4 shrink-0" />}
                                      <button
                                        onClick={() => onNavigateToActivity?.(act.id, paket.id)}
                                        className={cn('text-xs flex-1 truncate text-left transition', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}
                                      >
                                        {act.phase === 'Input' ? '📚' : act.phase === 'Übung' ? '✏️' : '🎯'} {actName}
                                      </button>
                                      <ExportErrorBadge show={!!act.export_error} size="xs" />
                                      {isPending && <UndoButton activityId={act.id} />}
                                      <AktivitaetStatusBadge activity={act} />
                                    </div>

                                    {actMasters.length > 0 && (
                                      <div className="pl-5 space-y-0.5 border-l border-muted/30 ml-1">
                                        {masterExportable.length > 0 && (
                                          <div className="flex items-center gap-2 p-1 rounded transition hover:bg-muted/10">
                                            <Checkbox checked={allMastersSelected} onCheckedChange={() => toggleActivities(masterExportable)} className="h-3.5 w-3.5 shrink-0" />
                                            <span className="text-[11px] font-medium text-muted-foreground flex-1 truncate">
                                              Master ({masterSelectedCount}/{masterExportable.length})
                                            </span>
                                          </div>
                                        )}
                                        {actMasters.map(master => {
                                          const masterSelected = selectedIds.includes(master.id);
                                          const masterPending = master.sync_status === 'pending';
                                          const masterApproved = master.content_status === 'approved';
                                          const masterSelectable = masterApproved && !masterPending;
                                          return (
                                            <div key={master.id} className={cn('flex items-center gap-2 p-1 rounded transition text-[11px]', masterSelectable ? 'hover:bg-muted/10' : 'opacity-60')}>
                                              <Checkbox checked={masterSelected} onCheckedChange={() => toggleActivities([master])} disabled={!masterSelectable} className="h-3.5 w-3.5 shrink-0" />
                                              <span className="text-muted-foreground flex-1 truncate">
                                                👤 {master.titel || 'Master ohne Titel'}
                                              </span>
                                              <ExportErrorBadge show={!!master.export_error} size="xs" />
                                              {masterPending && <UndoButton activityId={master.id} />}
                                              <AktivitaetStatusBadge activity={master} />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              );
            })}

            {tfAufgaben.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                  <Checkbox 
                    checked={tfAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending').length > 0 && tfAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending').every(a => selectedIds.includes(a.id))} 
                    onCheckedChange={() => toggleActivities(tfAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending'))} 
                    disabled={tfAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending').length === 0} 
                    className="h-4 w-4" 
                  />
                  <span className="text-sm font-semibold flex-1">Allgemeine Aufgaben (Ebene 1/2)</span>
                </div>
                <div className="pl-5 space-y-1 border-l border-muted/50">
                  {tfAufgaben.map(aufgabe => {
                    const isSelected = selectedIds.includes(aufgabe.id);
                    const isPending = aufgabe.sync_status === 'pending';
                    const isApproved = aufgabe.content_status === 'approved';
                    const isSelectable = isApproved && !isPending;
                    // Mission-Indikator: nur für Aufgaben im Mission-Scope
                    // (inhalt/handlung). Zeigt Emoji+Label oder dezenten
                    // "Mission fehlt"-Hinweis als Pflege-Nudge (Frage H).
                    const showMission = isMissionApplicable(aufgabe);
                    return (
                      <div key={aufgabe.id} className={cn('flex items-center gap-2 p-1.5 rounded transition', isSelectable ? 'hover:bg-muted/20' : 'opacity-70')}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([aufgabe])} disabled={!isSelectable} className="h-4 w-4 shrink-0" />
                        <button onClick={() => onNavigateToTask?.('ebene12', aufgabe.id)} className={cn('text-xs flex-1 truncate text-left', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}>
                          📝 {aufgabe.titel || 'Aufgabe ohne Titel'}
                          {aufgabe.anforderungsebene && <span className="ml-1 text-muted-foreground">({aufgabe.anforderungsebene})</span>}
                        </button>
                        {showMission && (
                          <MissionBadge missionId={aufgabe.mission_type} size="sm" showFallback />
                        )}
                        <ExportErrorBadge show={!!aufgabe.export_error} size="xs" />
                        {isPending && <UndoButton activityId={aufgabe.id} entityType="allgemein" />}
                        <AktivitaetStatusBadge activity={aufgabe} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tfPakete.length === 0 && tfAufgaben.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Keine Inhalte</p>
            )}
          </div>
          <Separator className="my-2" />
        </div>
      );
    });

  // Projektaufgaben (Ebene 3)
  const projektaufgaben = allgemeineAufgaben.filter(
    a => a.einheit_id === unitId && a.anforderungsebene === '3 - Projekt' && a.sync_status !== 'to_delete'
  );
  if (projektaufgaben.length > 0) {
    const exportable = projektaufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
    const selectedCount = exportable.filter(a => selectedIds.includes(a.id)).length;
    const allSelected = exportable.length > 0 && selectedCount === exportable.length;
    rows.push(
      <div key="_projektaufgaben" className="space-y-2">
        <div className="px-2 py-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Projekt- & Anwendungsaufgaben (Ebene 3)</span>
        </div>
        <div className="pl-3 space-y-1 border-l-2 border-muted">
          <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
            <Checkbox checked={allSelected} onCheckedChange={() => toggleActivities(projektaufgaben)} disabled={exportable.length === 0} className="h-4 w-4" />
            <span className="text-sm font-semibold flex-1">Alle Projektaufgaben</span>
            {exportable.length > 0 && <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>}
          </div>
          <div className="pl-5 space-y-1 border-l border-muted/50">
            {projektaufgaben.map(aufgabe => {
              const isSelected = selectedIds.includes(aufgabe.id);
              const isPending = aufgabe.sync_status === 'pending';
              const isApproved = aufgabe.content_status === 'approved';
              return (
                <div key={aufgabe.id} className={cn('flex items-center gap-2 p-1.5 rounded transition', isApproved ? 'hover:bg-muted/20' : 'opacity-70')}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([aufgabe])} disabled={!isApproved || isPending} className="h-4 w-4 shrink-0" />
                  <button onClick={() => onNavigateToTask?.('ebene3', aufgabe.id)} className={cn('text-xs flex-1 truncate text-left', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}>
                    🎯 {aufgabe.titel || 'Projektaufgabe ohne Titel'}
                    {aufgabe.aufgabentyp_projekt && <span className="ml-1 text-muted-foreground">({aufgabe.aufgabentyp_projekt})</span>}
                  </button>
                  <ExportErrorBadge show={!!aufgabe.export_error} size="xs" />
                  {isPending && <UndoButton activityId={aufgabe.id} entityType="allgemein" />}
                  <AktivitaetStatusBadge activity={aufgabe} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return <div className="space-y-2">{rows}</div>;
}

// ── Main Component ──────────────────────────────────────────────────

export default function ExportCockpitView({
  // Phase F.1: Tab 8 ist immer im Kontext einer Einheit. Der Workspace
  // reicht `einheitId` durch — kein interner Selector mehr. `initialEinheitId`
  // bleibt als Alias akzeptiert, falls Alt-Aufrufer (z. B. Standalone-Routen)
  // es noch setzen.
  einheitId = null,
  initialEinheitId = null,
  onNavigateToActivity: onNavCallback = null,
  onNavigateToTask = null,
  // Phase F.2: Tab-8 → Tab-7-Deep-Link. Wird vom Workspace bereitgestellt
  // (setzt URL-Params + ruft handleTabChange('dashboards') auf).
  onOpenDashboardArchitekt = null,
}) {
  const queryClient = useQueryClient();
  const { permissions, rolle, faecher } = useRBAC();
  const navigate = useNavigate();
  const selectedUnitId = einheitId || initialEinheitId || null;
  const [selectedIds, setSelectedIds] = useState([]);

  const onNavigateToActivity = (activityId, paketId) => {
    if (onNavCallback) {
      onNavCallback(activityId, paketId);
    } else {
      navigate(`/workspace?einheit=${selectedUnitId}&aufgaben=true&activity=${activityId}`);
    }
  };

  // Aktuell geöffnete Einheit (für Titel im Header und Fach-Check beim
  // Aufheben-Recht). Nur eine Einheit, kein Listen-Fetch mehr nötig.
  const { data: einheit, isLoading: einheitLoading } = useQuery({
    queryKey: ['einheit', selectedUnitId],
    queryFn: () => base44.entities.Einheiten.get(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const { data: lernpakete = [], isLoading: lernpaketeLoading } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [], isLoading: themenfelderLoading } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: aktivitaeten = [], isLoading: aktivitaetenLoading } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [], isLoading: katalogLoading } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });
  const { data: allgemeineAufgaben = [], isLoading: allgemeineLoading } = useQuery({ queryKey: ['allgemeineAufgaben'], queryFn: () => base44.entities.AllgemeineAufgabe.list() });
  const { data: masterAufgaben = [], isLoading: masterLoading } = useQuery({ queryKey: ['masterAufgaben'], queryFn: () => base44.entities.MasterAufgabe.list() });

  const isInitialLoading = einheitLoading || lernpaketeLoading || themenfelderLoading || aktivitaetenLoading || katalogLoading || allgemeineLoading || masterLoading;

  // RBAC-Ableitung für die „Freigabe aufheben"-Aktion. Server prüft das
  // ohnehin nochmal hart — hier nur fürs UI.
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaftFuerFach =
    rolle === ROLLEN.FACHSCHAFT &&
    Array.isArray(faecher) &&
    einheit?.fach &&
    faecher.includes(einheit.fach);
  const darfFreigeben = istAdmin || istFachschaftFuerFach;

  useEffect(() => {
    if (!selectedUnitId) return;
    setSelectedIds([]);
    const allItems = [
      ...aktivitaeten.filter(a => {
        const paket = lernpakete.find(lp => lp.id === a.lernpaket_id);
        return paket && (paket.themenfeld_id
          ? themenfelder.find(tf => tf.id === paket.themenfeld_id)?.einheit_id === selectedUnitId
          : paket.einheit_id === selectedUnitId);
      }),
      ...allgemeineAufgaben.filter(a => a.einheit_id === selectedUnitId),
    ];
    const autoSelect = allItems
      .filter(a => a.content_status === 'approved' && a.sync_status !== 'pending' && a.sync_status !== 'synced')
      .map(a => a.id);
    setSelectedIds(autoSelect);
  }, [selectedUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportMutation = useMutation({
    mutationFn: async () => {
      const allgemeineIds = new Set(allgemeineAufgaben.map(a => a.id));
      for (const id of selectedIds) {
        if (allgemeineIds.has(id)) {
          await base44.entities.AllgemeineAufgabe.update(id, { sync_status: 'pending' });
        } else {
          await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
        }
      }
      return { count: selectedIds.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setSelectedIds([]);
      toast.success(`${count} Element${count !== 1 ? 'e' : ''} übergeben – jetzt im Moodle-Export sichtbar.`);
    },
    onError: () => toast.error('Fehler bei der Übergabe.'),
  });

  if (!permissions.kannExportBedienen) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Kein Zugriff. Nur Moodle-Designer dürfen den Export bedienen.</p>
        </div>
      </div>
    );
  }

  // Tab 8 wird ausschließlich im Workspace-Kontext geöffnet — ohne Einheit
  // ist die Seite sinnlos. Statt eines Selectors zeigen wir einen klaren
  // Hinweis, falls die ID einmal fehlt.
  if (!selectedUnitId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <Info className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Keine Einheit ausgewählt. Bitte öffne das Cockpit aus dem Workspace einer Einheit.
          </p>
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Cockpit-Daten werden geladen, bitte einen Moment Geduld...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Seitentitel — kompakter als zuvor, weil der eigentliche Status
          jetzt prominent in der Header-Karte sitzt. */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Freigabe-Cockpit
          <HelpBadge
            text="Übersicht und Steuerung des Export-Lebenszyklus dieser Einheit. Selektiere freigegebene Inhalte und übergib sie an das Moodle-Export-Team."
            docsSlug="export-workflow"
          />
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Status der Einheit, Dashboard-Übersicht und Übergabe an den Moodle-Export.
        </p>
      </div>

      {/* Phase F.1: Neue Header-Karte mit Lifecycle-Status & Aufheben-Button. */}
      <ExportLifecycleHeaderCard
        einheitId={selectedUnitId}
        einheitTitel={einheit?.titel_der_einheit}
        darfFreigeben={darfFreigeben}
      />

      {/* Phase F.2: Vier Lerntyp-Karten mit aggregierter Drift-Anzeige.
          Jede Karte zeigt Pfad-Status, Drift-Counter und ein klickbares
          Sektoren-Grid. Klick → Tab 7 + Sprung zum jeweiligen Sektor. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LERNTYP_KEYS.map((lt) => (
          <LerntypDashboardCard
            key={lt}
            lerntyp={lt}
            einheitId={selectedUnitId}
            konfiguration={einheit?.lernpfade_konfiguration}
            onOpenInArchitekt={onOpenDashboardArchitekt || undefined}
          />
        ))}
      </div>

      {/* Inhalts-Sektion: das Detail-Akkordeon mit der vollen Themenfeld-
          Hierarchie für die manuelle Selektion vor der Übergabe. */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Inhalte zur Übergabe</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Freigegebene Aktivitäten und Aufgaben dieser Einheit. Häkchen setzen → unten übergeben.
          </p>
        </div>

        <EinheitHierarchy
          unitId={selectedUnitId}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          lernpakete={lernpakete}
          themenfelder={themenfelder}
          aktivitaeten={aktivitaeten.filter(a => a.sync_status !== 'to_delete')}
          aktivitaetenKatalog={aktivitaetenKatalog}
          allgemeineAufgaben={allgemeineAufgaben}
          masterAufgaben={masterAufgaben.filter(m => m.sync_status !== 'to_delete')}
          onNavigateToActivity={onNavigateToActivity}
          onNavigateToTask={onNavigateToTask}
        />

        <div className="pt-4 border-t">
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={selectedIds.length === 0 || exportMutation.isPending}
            className="w-full font-semibold"
          >
            {exportMutation.isPending
              ? 'Wird übergeben...'
              : `🚀 ${selectedIds.length} Aktivität${selectedIds.length !== 1 ? 'en' : ''} übergeben`}
          </Button>
        </div>
      </div>

      {/* Workflow-Hilfe — wandert in einen aufklappbaren Block am Ende der
          Seite. Damit bleibt sie für Neulinge auffindbar, raubt aber im
          Alltag keinen Platz mehr. */}
      <details className="group rounded-xl border border-border bg-card">
        <summary className="cursor-pointer list-none p-4 flex items-center gap-2 text-sm font-semibold hover:bg-muted/40 rounded-xl">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span>Status-Workflow im Überblick</span>
          <HelpBadge
            text="Jede Aktivität durchläuft diesen Lebenszyklus: Entwurf → Freigegeben → In Übertragung → Live. Mehr Details in der Dokumentation."
            docsSlug="export-workflow"
          />
          <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { icon: <Pencil className="w-3.5 h-3.5" />, color: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Entwurf', desc: 'Wird von der Lehrkraft bearbeitet. Nicht im Export sichtbar.' },
              { icon: <Upload className="w-3.5 h-3.5" />, color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Freigegeben', desc: 'Fertig und wartet auf den Export.' },
              { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Wird exportiert 🔒', desc: 'Export-Team hat Daten gezogen. Für Lehrkräfte schreibgeschützt.' },
              { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-700 bg-green-50 border-green-200', label: 'In Moodle', desc: 'Export war erfolgreich. Die aktuelle Version ist live.' },
              { icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-red-700 bg-red-50 border-red-200', label: 'Export-Fehler', desc: 'Upload fehlgeschlagen. Sperre aufgehoben – bitte reparieren und neu freigeben.' },
              { icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'text-purple-700 bg-purple-50 border-purple-200', label: 'Geändert (Nicht live)', desc: 'Bereits exportiert, aber nachträglich bearbeitet. Neu freigeben für Moodle.' },
            ].map(({ icon, color, label, desc }) => (
              <div key={label} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${color}`}>
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}