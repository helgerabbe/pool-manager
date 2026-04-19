/**
 * ExportCockpitView.jsx
 *
 * Freigabe-Cockpit für Moodle-Export.
 * Eine Einheit wählen → Inhalte selektieren → Übergeben
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, AlertCircle, CheckCircle2, Clock, ShieldCheck, Info, Pencil, Upload, RefreshCw } from 'lucide-react';
import HelpBadge from '@/components/ui/HelpBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  // draft / new
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

// ── Bestätigungs-Dialog nach Export ─────────────────────────────────────────

function ExportConfirmDialog({ pendingItems, einheitId, onConfirmed, onCancel }) {
  const queryClient = useQueryClient();
  const [checkedIds, setCheckedIds] = useState(new Set(pendingItems.map(i => i.id)));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleId = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const successfulIds = pendingItems.filter(i => checkedIds.has(i.id)).map(i => i.id);
    const failedIds = pendingItems.filter(i => !checkedIds.has(i.id)).map(i => i.id);
    await base44.functions.invoke('confirmExportCompletion', { einheit_id: einheitId, successfulIds, failedIds });
    setIsSubmitting(false);
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-base">Export bestätigen</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Welche Elemente wurden erfolgreich nach Moodle übertragen?
            Abgewählte Elemente werden als <strong>Fehler</strong> markiert.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pendingItems.map(item => (
            <div key={item.id} className={cn('flex items-center gap-3 p-2.5 rounded-lg border transition', checkedIds.has(item.id) ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40')}>
              <Checkbox checked={checkedIds.has(item.id)} onCheckedChange={() => toggleId(item.id)} className="h-4 w-4 shrink-0" />
              <span className="text-sm flex-1 truncate">{item.label}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', checkedIds.has(item.id) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                {checkedIds.has(item.id) ? '✓ Erfolgreich' : '✗ Fehler'}
              </span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Abbrechen</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="gap-2">
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Speichern…</>
              : <><CheckCircle2 className="w-4 h-4" />Bestätigen ({checkedIds.size}/{pendingItems.length})</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Haupt-Hierarchie-Renderer ────────────────────────────────────────────────

function EinheitHierarchy({ unitId, selectedIds, setSelectedIds, lernpakete, themenfelder, aktivitaeten, aktivitaetenKatalog, allgemeineAufgaben, onNavigateToActivity, onNavigateToTask }) {

  const toggleActivities = useCallback((activityArray) => {
    const exportable = activityArray.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending' && a.sync_status !== 'synced');
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

              return (
                <div key={paket.id} className="space-y-1">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                    <Checkbox checked={allSelected} onCheckedChange={() => toggleActivities(paketAktivitaeten)} disabled={exportable.length === 0} className="h-4 w-4" />
                    <span className="text-sm font-semibold flex-1 truncate">{paket.titel_des_pakets}</span>
                    {exportable.length > 0 && <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>}
                  </div>
                  <div className="pl-5 space-y-1 border-l border-muted/50">
                    {paketAktivitaeten.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Keine Aktivitäten</p>
                    ) : (
                      paketAktivitaeten
                        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
                        .map(act => {
                          const actName = aktivitaetenKatalog.find(k => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                          const isSelected = selectedIds.includes(act.id);
                          const isPending = act.sync_status === 'pending';
                          const isSynced = act.sync_status === 'synced';
                          const isApproved = act.content_status === 'approved';
                          const isSelectable = isApproved && !isPending && !isSynced;

                          return (
                            <div key={act.id} className={cn('flex items-center gap-2 p-1.5 rounded transition', isSelectable ? 'hover:bg-muted/20' : 'opacity-70')}>
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([act])} disabled={!isSelectable} className="h-4 w-4 shrink-0" />
                              <button
                                onClick={() => onNavigateToActivity?.(act.id, paket.id)}
                                className={cn('text-xs flex-1 truncate text-left transition', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}
                              >
                                {act.phase === 'Input' ? '📚' : act.phase === 'Übung' ? '✏️' : '🎯'} {actName}
                              </button>
                              {isPending && <UndoButton activityId={act.id} />}
                              <AktivitaetStatusBadge activity={act} />
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              );
            })}

            {tfAufgaben.length > 0 && (() => {
              const exportable = tfAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
              const selectedCount = exportable.filter(a => selectedIds.includes(a.id)).length;
              const allSelected = exportable.length > 0 && selectedCount === exportable.length;
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                    <Checkbox checked={allSelected} onCheckedChange={() => toggleActivities(tfAufgaben)} disabled={exportable.length === 0} className="h-4 w-4" />
                    <span className="text-sm font-semibold flex-1">Allgemeine Aufgaben (Ebene 1/2)</span>
                    {exportable.length > 0 && <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>}
                  </div>
                  <div className="pl-5 space-y-1 border-l border-muted/50">
                    {tfAufgaben.map(aufgabe => {
                      const isSelected = selectedIds.includes(aufgabe.id);
                      const isPending = aufgabe.sync_status === 'pending';
                      const isApproved = aufgabe.content_status === 'approved';
                      const isSelectable = isApproved && !isPending;
                      return (
                        <div key={aufgabe.id} className={cn('flex items-center gap-2 p-1.5 rounded transition', isSelectable ? 'hover:bg-muted/20' : 'opacity-70')}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([aufgabe])} disabled={!isSelectable} className="h-4 w-4 shrink-0" />
                          <button onClick={() => onNavigateToTask?.('ebene12', aufgabe.id)} className={cn('text-xs flex-1 truncate text-left', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}>
                            📝 {aufgabe.titel || 'Aufgabe ohne Titel'}
                            {aufgabe.anforderungsebene && <span className="ml-1 text-muted-foreground">({aufgabe.anforderungsebene})</span>}
                          </button>
                          {isPending && <UndoButton activityId={aufgabe.id} entityType="allgemein" />}
                          <AktivitaetStatusBadge activity={aufgabe} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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

export default function ExportCockpitView({ initialEinheitId = null, onNavigateToActivity: onNavCallback = null, onNavigateToTask = null }) {
  const queryClient = useQueryClient();
  const { permissions } = useRBAC();
  const navigate = useNavigate();
  const [selectedUnitId, setSelectedUnitId] = useState(initialEinheitId);
  const [selectedIds, setSelectedIds] = useState([]);

  const onNavigateToActivity = (activityId, paketId) => {
    if (onNavCallback) {
      onNavCallback(activityId, paketId);
    } else {
      navigate(`/workspace?einheit=${selectedUnitId}&aufgaben=true&activity=${activityId}`);
    }
  };

  const { data: einheiten = [], isLoading: einheitenLoading } = useQuery({ queryKey: ['einheiten'], queryFn: () => base44.entities.Einheiten.list() });
  const { data: lernpakete = [], isLoading: lernpaketeLoading } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [], isLoading: themenfelderLoading } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: aktivitaeten = [], isLoading: aktivitaetenLoading } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [], isLoading: katalogLoading } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });
  const { data: allgemeineAufgaben = [], isLoading: allgemeineLoading } = useQuery({ queryKey: ['allgemeineAufgaben'], queryFn: () => base44.entities.AllgemeineAufgabe.list() });

  // ✅ Strikter Ladezustand: Verhindert "Flash of Unfiltered Data"
  const isInitialLoading = einheitenLoading || lernpaketeLoading || themenfelderLoading || aktivitaetenLoading || katalogLoading || allgemeineLoading;

  // Auto-select when unit changes
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
      const items = [];
      for (const id of selectedIds) {
        if (allgemeineIds.has(id)) {
          const aufgabe = allgemeineAufgaben.find(a => a.id === id);
          await base44.entities.AllgemeineAufgabe.update(id, { sync_status: 'pending' });
          items.push({ id, label: aufgabe?.titel || 'Aufgabe ohne Titel' });
        } else {
          const akt = aktivitaeten.find(a => a.id === id);
          const katalogName = aktivitaetenKatalog.find(k => k.id === akt?.aktivitaet_id)?.name || 'Aktivität';
          await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
          items.push({ id, label: `${akt?.phase || ''}: ${katalogName}` });
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
      <div className="min-h-screen bg-muted/20 p-6 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Kein Zugriff. Nur Moodle-Designer dürfen den Export bedienen.</p>
        </div>
      </div>
    );
  }

  // ✅ Strikter Early Return: Verhindert Rendering von ungefilterten Daten
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-muted/20 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Cockpit-Daten werden geladen, bitte einen Moment Geduld...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Freigabe-Cockpit
            <HelpBadge
              text="Hier siehst du alle von Lehrkräften freigegebenen Inhalte. Wähle Elemente aus und übergebe sie für den Moodle-Export."
              docsSlug="export-workflow"
            />
          </h2>
          <p className="text-muted-foreground mt-2">
            Wähle eine Einheit, selektiere freigegebene Inhalte und übergebe sie an das Moodle-Export-Team.
          </p>
        </div>

        {/* Workflow-Info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Status-Workflow im Überblick</span>
            <HelpBadge
              text="Jede Aktivität durchläuft diesen Lebenszyklus: Entwurf → Freigegeben → In Übertragung → Live. Mehr Details in der Dokumentation."
              docsSlug="export-workflow"
            />
          </div>
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

        {/* Einheit-Selector + Inhalt */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">Einheit auswählen</label>
            <Select value={selectedUnitId || ''} onValueChange={(val) => setSelectedUnitId(val)}>
              <SelectTrigger className="h-10 text-sm font-semibold bg-background">
                <SelectValue placeholder="Einheit wählen..." />
              </SelectTrigger>
              <SelectContent>
                {einheiten.map(e => (
                  <SelectItem key={e.id} value={e.id} className="text-sm">
                    {e.titel_der_einheit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedUnitId ? (
            <div className="flex items-center justify-center text-center py-10 text-muted-foreground text-sm">
              Bitte wähle eine Einheit, um die Struktur zu laden.
            </div>
          ) : (
            <>
              <EinheitHierarchy
                unitId={selectedUnitId}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                lernpakete={lernpakete}
                themenfelder={themenfelder}
                aktivitaeten={aktivitaeten.filter(a => a.sync_status !== 'to_delete')}
                aktivitaetenKatalog={aktivitaetenKatalog}
                allgemeineAufgaben={allgemeineAufgaben}
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
            </>
          )}
        </div>
      </div>

    </div>
  );
}