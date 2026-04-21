/**
 * KlonDetailView.jsx
 *
 * Bearbeitungsbereich für einen einzelnen gespeicherten Klon.
 * - Pessimistic Locking via useKlonLock
 * - Lock-Banner für andere Nutzer
 * - Realtime-Subscription für sofortige Lock-Updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Save, ArrowRight, Plus, Trash2, Lock, Crown, Loader2, GripVertical, Pencil } from 'lucide-react';
import LockBanner from '@/components/workspace/LockBanner';
import { useKlonLock, isLockExpired } from '@/hooks/useActivityLock';
import { useLernpaketLock } from '@/hooks/useLernpaketLock';
import { useSyncStatus, TASK_SYNC_STATUS } from '@/hooks/useSyncStatus';
import LueckentextEditor, { LueckentextRenderer } from '@/components/workspace/LueckentextEditor';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import MatchTermsForm from '@/components/aufgaben/placeholders/MatchTermsForm';
import SortingListEditor from '@/components/workspace/SortingListEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

function isKlonLockedByOther(klon, myEmail) {
  if (!klon?.lock_status) return false;
  if (klon.locked_by_user === myEmail) return false;
  if (isLockExpired(klon.locked_at)) return false;
  return true;
}

const MATCH_TERMS_NAMES = ['begriffe zuordnen', 'zuordnen', 'match terms'];
const LUECKENTEXT_NAMES = ['lückentext', 'lücken', 'lueckentext', 'cloze', 'fill in'];
const SORTING_NAMES = ['reihenfolge', 'sortierung', 'sorting', 'sort'];

function isMatchTerms(name = '') {
  return MATCH_TERMS_NAMES.some(n => name.toLowerCase().includes(n));
}

function isLueckentext(name = '') {
  return LUECKENTEXT_NAMES.some(n => name.toLowerCase().includes(n));
}

function isSorting(name = '') {
  return SORTING_NAMES.some(n => name.toLowerCase().includes(n));
}

export default function KlonDetailView({ klon, kannBearbeiten, userEmail, masterAufgabe, activityRecord, catalogEntry, onKlonDeleted, onEditModeChange }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);

  // Implizites Locking für Lückentext-Modal (Tab 4)
  const isLuecke = isLueckentext(catalogEntry?.name);
  const { acquireLock, releaseLock } = useLernpaketLock(isLuecke ? klon.lernpaket_id : null);
  const [lueckentextModalOpen, setLueckentextModalOpen] = useState(false);
  const [acquiringLock, setAcquiringLock] = useState(false);

  // Lernpaket-Lock prüfen: Wenn jemand anders den Lernpaket-Lock hält, darf dieser Klon nicht bearbeitet werden
  const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
  const { data: lernpaket } = useQuery({
    queryKey: ['lernpakete', klon.lernpaket_id],
    queryFn: () => base44.entities.Lernpakete.filter({ id: klon.lernpaket_id }),
    select: (data) => data[0],
    enabled: !!klon.lernpaket_id,
    refetchInterval: 5000,
  });

  const lernpaketLockedByOther =
    lernpaket?.is_locked &&
    lernpaket?.locked_by_email !== userEmail &&
    lernpaket?.locked_at &&
    Date.now() - new Date(lernpaket.locked_at).getTime() < LOCK_TIMEOUT_MS;

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

  const lockedByOther = isKlonLockedByOther(klon, userEmail) || lernpaketLockedByOther;

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
      toast.success('Klon gespeichert.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Aufgabenbausteine.delete(klon.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      onKlonDeleted?.();
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

  // Implizites Locking: Lock erwerben → Modal öffnen
  const handleEditKlon = async () => {
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    setLueckentextModalOpen(true);
  };

  const handleCloseLueckentextModal = async () => {
    setLueckentextModalOpen(false);
    await releaseLock();
    onEditModeChange?.(false);
  };

  const convertToMasterMutation = useMutation({
    mutationFn: async () => {
      if (!masterAufgabe?.activity_id) throw new Error('activity_id fehlt – Klon kann nicht promoted werden.');

      // Klon-Inhalt (JSON-String in aufgabentext_inhalt) korrekt als field_values mappen.
      // Lückentext-Klone haben { lueckentext: "..." } direkt in data (geparst aus aufgabentext_inhalt).
      // Match-Terms-Klone haben { instruction, pairs, distractors }.
      // Beide Formate sind direkt als field_values verwendbar.
      const fieldValues = data && Object.keys(data).length > 0 ? data : {};

      // Neue MasterAufgabe aus Klon-Daten erstellen
      await base44.entities.MasterAufgabe.create({
        activity_id: masterAufgabe.activity_id,
        lernpaket_id: klon.lernpaket_id,
        field_values: fieldValues,
        reihenfolge: (masterAufgabe?.reihenfolge || 1) + 1,
        content_status: 'draft',
        sync_status: 'new',  // korrekt für neu angelegte Entities im Moodle-Schema
      });

      // Klon löschen – löst Entkopplung aus (kein master_aufgabe_id mehr)
      await base44.entities.Aufgabenbausteine.delete(klon.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben', 'einheit'] });
      queryClient.invalidateQueries({ queryKey: ['klone', 'einheit'] });
      toast.success('Klon wurde erfolgreich zur Masteraufgabe umgewandelt.');
      onKlonDeleted?.();
    },
    onError: (err) => toast.error('Fehler bei der Umwandlung: ' + (err.message || 'Unbekannt')),
  });

  // Aufgabenstellung aus dem Master oder der Aktivität
  const aufgabenstellung = masterAufgabe?.field_values?.aufgabentext
    || activityRecord?.field_values?.aufgabentext
    || null;

  return (
    <div className="space-y-4 relative">
      {/* Loading-Overlay beim Löschen */}
      {deleteMutation.isPending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-card rounded-lg shadow-lg p-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Kopie wird gelöscht, bitte warten...</p>
          </div>
        </div>
      )}
      {/* ── Header (Tab 4: Info + impliziter "Kopie bearbeiten"-Button) ── */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{catalogEntry?.name || 'Kopie'}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kopie {klon.klon_index} · Phase: {activityRecord?.phase}
          </p>
        </div>
        {kannBearbeiten && !lockedByOther && isLuecke && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleEditKlon}
            disabled={acquiringLock}
            className="gap-1.5 shrink-0"
          >
            {acquiringLock
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sperren…</>
              : <><Pencil className="w-3.5 h-3.5" /> Kopie bearbeiten</>}
          </Button>
        )}
      </div>

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
          <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border-b border-green-200">
            <span className="text-xs font-semibold text-foreground">
              Kopie {klon.klon_index}
            </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[11px] font-medium">
            Entwurf
          </span>
          <div className="flex-1" />
          {kannBearbeiten && !lockedByOther && editMode && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending} className="gap-1.5">
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </Button>
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
        <LockBanner lockedByUser={
          lernpaketLockedByOther ? lernpaket?.locked_by_email :
          isKlonLockedByOther(klon, userEmail) ? klon.locked_by_user : null
        } />

        {/* Lückentext-Klon: Read-only Vorschau + Modal für Bearbeitung */}
        {isLueckentext(catalogEntry?.name) ? (
          <div className="space-y-3">
            {data.lueckentext
              ? <LueckentextEditor value={data.lueckentext} onChange={() => {}} readOnly />
              : <p className="text-sm text-muted-foreground italic">Noch kein Lückentext. Klicke „Kopie bearbeiten".</p>
            }
            <LueckentextWysiwygModal
              open={lueckentextModalOpen}
              onOpenChange={(isOpen) => { if (!isOpen) handleCloseLueckentextModal(); }}
              initialData={data}
              isSaving={saveMutation.isPending}
              isCopy={true}
              onSave={(newData) => {
                const newFv = { ...data, ...newData };
                setData(newFv);
                saveMutation.mutate(newFv, {
                  onSuccess: () => handleCloseLueckentextModal(),
                });
              }}
              onSaveAsNewMaster={async (newData) => {
                // Speichere die Änderungen in die Klon-Daten und promote dann
                const newFv = { ...data, ...newData };
                setData(newFv);
                // Klon-Daten aktualisieren, dann als Master anlegen
                await base44.entities.Aufgabenbausteine.update(klon.id, {
                  aufgabentext_inhalt: JSON.stringify(newFv),
                });
                convertToMasterMutation.mutate(undefined, {
                  onSuccess: () => handleCloseLueckentextModal(),
                });
              }}
            />
          </div>
        ) : isMatchTerms(catalogEntry?.name) ? (
          /* Match-Terms-Formular */
          <div className="space-y-3">
            {editMode ? (
              <MatchTermsForm
                initialData={{
                  instruction: data.instruction || '',
                  pairs: data.pairs || [],
                  distractors: (data.distractors || []).map(v => typeof v === 'string' ? { value: v } : v),
                }}
                onSave={(formData) => {
                  const cleanedData = {
                    instruction: formData.instruction,
                    pairs: formData.pairs,
                    distractors: (formData.distractors || []).map(d => typeof d === 'string' ? d : d.value).filter(Boolean),
                  };
                  setData(cleanedData);
                }}
                onCancel={() => {}}
                onChange={() => {}}
              />
            ) : (
              <div className="space-y-3">
                {data.instruction && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Anweisung</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">{data.instruction}</div>
                  </div>
                )}
                {data.pairs?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Begriffspaare ({data.pairs.length})
                    </p>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                      {data.pairs.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 font-medium">{p.left}</span>
                          <span className="text-muted-foreground/40">→</span>
                          <span className="flex-1 text-muted-foreground">{p.right}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isSorting(catalogEntry?.name) ? (
          /* Sortierungs-Aufgabe */
          editMode ? (
            <SortingListEditor
              initialData={{
                instruction: data.instruction || '',
                orderedItems: data.orderedItems || [],
              }}
              onSave={(formData) => {
                setData(formData);
              }}
              onCancel={() => {}}
              onChange={() => {}}
              readOnly={false}
            />
          ) : (
            <div className="space-y-3">
              {data.instruction && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">{data.instruction}</div>
                </div>
              )}
              {data.orderedItems?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Elemente ({data.orderedItems.length})
                  </p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    {data.orderedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-xs font-semibold text-muted-foreground flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Fallback: Arbeitsanweisung + Distraktoren */
          <>
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
          </>
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