/**
 * KlonDetailView.jsx
 *
 * Bearbeitungsbereich für einen einzelnen gespeicherten Klon.
 * - Pessimistic Locking via useKlonLock
 * - Lock-Banner für andere Nutzer
 * - Realtime-Subscription für sofortige Lock-Updates
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Save, ArrowRight, Plus, Trash2, Lock, Crown, Loader2 } from 'lucide-react';
import LockBanner from '@/components/workspace/LockBanner';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import { useKlonLock, isLockExpired } from '@/hooks/useActivityLock';
import { useSyncStatus, TASK_SYNC_STATUS } from '@/hooks/useSyncStatus';
import { toast } from 'sonner';

function isKlonLockedByOther(klon, myEmail) {
  if (!klon?.lock_status) return false;
  if (klon.locked_by_user === myEmail) return false;
  if (isLockExpired(klon.locked_at)) return false;
  return true;
}

export default function KlonDetailView({ klon, kannBearbeiten, userEmail, masterAufgabe, activityRecord, catalogEntry }) {
  const queryClient = useQueryClient();
  // Im Bearbeitungsmodus immer direkt editierbar wenn berechtigt
  const [editMode, setEditMode] = useState(kannBearbeiten);

  // State Machine für Moodle-Sync
  const syncStatus = useSyncStatus(
    klon.id,
    klon.sync_status || TASK_SYNC_STATUS.DRAFT,
    'Aufgabenbausteine',
    ['klone', 'aufgabenbausteine']
  );

  const [data, setData] = useState(() => {
    try {
      return typeof klon.aufgabentext_inhalt === 'string'
        ? JSON.parse(klon.aufgabentext_inhalt)
        : klon.aufgabentext_inhalt || {};
    } catch {
      return { instruction: klon.aufgabentext_inhalt || '', pairs: [], distractors: [] };
    }
  });

  // Pessimistic Lock
  useKlonLock(klon.id, userEmail, editMode);

  const lockedByOther = isKlonLockedByOther(klon, userEmail);

  // Realtime-Subscription: Lock-Änderungen sofort spiegeln
  useEffect(() => {
    const unsub = base44.entities.Aufgabenbausteine.subscribe((event) => {
      if (event.id === klon.id || event.data?.id === klon.id) {
        queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', 'klone'] });
        queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      }
    });
    return unsub;
  }, [klon.id]);

  const saveMutation = useMutation({
    mutationFn: (updated) => {
      // State Machine: exported + edit → modified, approved + edit → draft
      const newSyncStatus = syncStatus.getSyncStatusForSave();
      return base44.entities.Aufgabenbausteine.update(klon.id, {
        aufgabentext_inhalt: JSON.stringify(updated),
        sync_status: newSyncStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      setEditMode(false);
      toast.success('Klon gespeichert.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Aufgabenbausteine.delete(klon.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success('Klon gelöscht.');
    },
  });

  const pairs = data.pairs || [];
  const distractors = data.distractors || [];

  const updatePair = (idx, side, val) =>
    setData(d => ({ ...d, pairs: d.pairs.map((p, i) => i === idx ? { ...p, [side]: val } : p) }));
  const addPair = () => setData(d => ({ ...d, pairs: [...(d.pairs || []), { left: '', right: '' }] }));
  const removePair = (idx) => setData(d => ({ ...d, pairs: d.pairs.filter((_, i) => i !== idx) }));
  const updateDistractor = (idx, val) =>
    setData(d => ({ ...d, distractors: d.distractors.map((v, i) => i === idx ? val : v) }));
  const addDistractor = () => setData(d => ({ ...d, distractors: [...(d.distractors || []), ''] }));
  const removeDistractor = (idx) => setData(d => ({ ...d, distractors: d.distractors.filter((_, i) => i !== idx) }));

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const convertToMasterMutation = useMutation({
    mutationFn: async () => {
      // 1. Neue MasterAufgabe aus Klon-Daten erstellen
      const reihenfolge = (masterAufgabe?.reihenfolge || 1) + 1;
      await base44.entities.MasterAufgabe.create({
        activity_id: klon.lernpaket_id ? undefined : masterAufgabe?.activity_id,
        // activity_id vom Master übernehmen
        ...(masterAufgabe?.activity_id ? { activity_id: masterAufgabe.activity_id } : {}),
        lernpaket_id: klon.lernpaket_id,
        field_values: data,
        reihenfolge,
        content_status: 'draft',
        sync_status: TASK_SYNC_STATUS.DRAFT || 'new',
      });
      // 2. Klon löschen
      await base44.entities.Aufgabenbausteine.delete(klon.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success('Klon wurde erfolgreich zur Masteraufgabe umgewandelt.');
    },
    onError: (err) => toast.error('Fehler bei der Umwandlung: ' + (err.message || 'Unbekannt')),
  });

  // Aufgabenstellung aus dem Master oder der Aktivität
  const aufgabenstellung = masterAufgabe?.field_values?.aufgabentext
    || activityRecord?.field_values?.aufgabentext
    || null;

  return (
    <div className="space-y-4">
      {/* ── Aktivitäts-Header (ActivityDetailView) ── */}
      {activityRecord && (
        <div className="rounded-xl border border-border bg-card p-4">
          <ActivityDetailView
            activityRecord={activityRecord}
            kannBearbeiten={kannBearbeiten}
            queryClient={queryClient}
          />
        </div>
      )}

      {/* ── Aufgabenstellung des Masters ── */}
      {aufgabenstellung && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenstellung</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
            {aufgabenstellung}
          </div>
        </div>
      )}

      {/* ── Klon-Karte ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold text-foreground">
            Klon {klon.klon_index || ''}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[11px] font-medium">
            Entwurf
          </span>
          <div className="flex-1" />
          {kannBearbeiten && !lockedByOther && (
            <div className="flex items-center gap-2">
              {editMode && (
                <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending} className="gap-1.5">
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Speichern
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setConvertDialogOpen(true)}
                disabled={convertToMasterMutation.isPending}
                className="gap-1.5 text-primary border-primary/40 hover:bg-primary/5 text-xs h-7">
                {convertToMasterMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                Zur Masteraufgabe machen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                className="gap-1.5 text-destructive hover:bg-red-50 text-xs h-7">
                <Trash2 className="w-3.5 h-3.5" /> Löschen
              </Button>
            </div>
          )}
          {lockedByOther && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Lock className="w-3.5 h-3.5" /> Gesperrt
            </span>
          )}
        </div>

      {/* Inhalt */}
      <div className="p-5 space-y-5">
        <LockBanner lockedByUser={lockedByOther ? klon.locked_by_user : null} />

        {/* Arbeitsanweisung */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Arbeitsanweisung</Label>
          {editMode ? (
            <Textarea value={data.instruction || ''} onChange={e => setData(d => ({ ...d, instruction: e.target.value }))}
              className="resize-none h-20 text-sm" />
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              {data.instruction || <span className="italic text-muted-foreground">Nicht ausgefüllt</span>}
            </div>
          )}
        </div>

        {/* Begriffspaare */}
        {pairs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Begriffspaare</Label>
              {editMode && (
                <Button type="button" size="sm" variant="ghost" onClick={addPair} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Paar
                </Button>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              {pairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {editMode ? (
                    <>
                      <Input value={pair.left} onChange={e => updatePair(idx, 'left', e.target.value)} className="flex-1 h-8 text-xs" />
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <Input value={pair.right} onChange={e => updatePair(idx, 'right', e.target.value)} className="flex-1 h-8 text-xs" />
                      <button onClick={() => removePair(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{pair.left}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-muted-foreground">{pair.right}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distraktoren */}
        {(distractors.length > 0 || editMode) && (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distraktoren</Label>
              {editMode && (
                <Button type="button" size="sm" variant="ghost" onClick={addDistractor} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Distraktor
                </Button>
              )}
            </div>
            {distractors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {distractors.map((d, idx) => (
                  editMode ? (
                    <div key={idx} className="flex items-center gap-1">
                      <Input value={d} onChange={e => updateDistractor(idx, e.target.value)} className="h-7 text-xs w-32" />
                      <button onClick={() => removeDistractor(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-muted text-xs border border-dashed border-border">{d}</span>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Bestätigungsdialog: Klon → Masteraufgabe */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klon zur Masteraufgabe umwandeln?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Klon wird als eigenständige Masteraufgabe in der Aktivität angelegt. 
              Er wird aus dem bisherigen Master-Klon-Verbund herausgelöst und ist danach eine vollständig 
              unabhängige Masteraufgabe, von der du wieder Klone generieren kannst.
              <br /><br />
              <strong>Diese Aktion kann nicht rückgängig gemacht werden.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => convertToMasterMutation.mutate()}
              className="bg-primary hover:bg-primary/90"
            >
              Ja, zur Masteraufgabe machen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}