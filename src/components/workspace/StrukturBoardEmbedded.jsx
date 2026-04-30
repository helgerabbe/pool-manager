/**
 * StrukturBoardEmbedded
 * ─────────────────────
 * Eingebettete Version des Struktur-Boards für den Workspace-Toggle.
 * Erhält einheitId + queryClient als Props (keine eigenen Queries / useParams).
 * Speichert Änderungen direkt ins Backend (nur themenfeld_id + reihenfolge_nummer),
 * alle anderen Paket-Daten bleiben unberührt.
 */

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createThemenfeld, updateThemenfeld, deleteThemenfeld } from '@/services/ThemenfeldService';
import { createLernziel, updateLernziel, deleteLernziel } from '@/services/LernzielService';
import { createLernpaket, updateLernpaket, deleteLernpaket } from '@/services/LernpaketService';
import { useRBAC } from '@/hooks/useRBAC';
import { hasUnitLevelAccess } from '@/lib/rbac';
import { useVersionConflict, isVersionConflictError } from '@/hooks/useVersionConflict';
import VersionConflictDialog from '@/components/ui/VersionConflictDialog';
import { ROLLEN } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, GripVertical, Clock, Trash2, FolderOpen, Layers, X, Save, Target, ChevronLeft, ChevronRight, ChevronsLeft, AlignJustify, LayoutList, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Lernpaket-Dialog ──────────────────────────────────────────────────────────
// Öffnet sich beim Klick auf eine Paket-Karte oder beim Erstellen eines neuen Pakets.

function LernpaketDialog({ open, onOpenChange, initialData, onSave }) {
  // isNew = true nur wenn initialData null/undefined ist (= "Neues Lernpaket" Button geklickt)
  // Hat initialData eine id oder isNew-Flag, dann ist es immer "Bearbeiten"-Modus
  const isNew = !initialData;
  const [titel, setTitel] = useState('');
  const [dauer, setDauer] = useState(45);
  const [lernziele, setLernziele] = useState([]);

  useEffect(() => {
    if (open) {
      setTitel(initialData?.titel_des_pakets || '');
      setDauer(initialData?.geschaetzte_dauer_minuten || 45);
      setLernziele(initialData?.lernziele || []);
    }
  }, [open, initialData]);

  const addLernziel = () =>
    setLernziele(prev => [...prev, { id: `lz-${Date.now()}`, formulierung_fachsprache: '', kategorie: 'Fachwissen', isNew: true }]);

  const updateLernziel = (id, field, value) =>
    setLernziele(prev => prev.map(lz => lz.id === id ? { ...lz, [field]: value } : lz));

  const removeLernziel = (id) =>
    setLernziele(prev => prev.filter(lz => lz.id !== id));

  const handleSave = () => {
    onSave({ titel, dauer, lernziele });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Neues Lernpaket' : 'Lernpaket bearbeiten'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Titel */}
          <div className="space-y-2">
            <Label>Titel des Lernpakets *</Label>
            <Input
              autoFocus
              placeholder="z.B. Grundlagen der linearen Funktionen"
              value={titel}
              onChange={e => setTitel(e.target.value)}
            />
          </div>
          {/* Dauer */}
          <div className="space-y-2">
            <Label>Geschätzte Bearbeitungsdauer</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={5} step={5}
                value={dauer}
                onChange={e => setDauer(parseInt(e.target.value) || 45)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">Minuten</span>
            </div>
          </div>
          {/* Lernziele */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Lernziele</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLernziel} className="gap-1.5 h-7 text-xs">
                <Plus className="w-3.5 h-3.5" /> Lernziel hinzufügen
              </Button>
            </div>
            {lernziele.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Noch keine Lernziele – optional hier hinzufügen oder später im Workspace anlegen.</p>
            )}
            <div className="space-y-3">
              {lernziele.map((lz, idx) => (
                <div key={lz.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-green-600 shrink-0 mt-2" />
                    <div className="flex-1 space-y-2">
                      {/* Offizielle Formulierung – mehrzeilig, damit lange
                          „Ich kann…"-Sätze vollständig sichtbar bleiben. */}
                      <div className="space-y-1">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Offizielle Formulierung (Fachsprache)</Label>
                        <Textarea
                          placeholder={`Lernziel ${idx + 1}: Ich kann…`}
                          value={lz.formulierung_fachsprache}
                          onChange={e => updateLernziel(lz.id, 'formulierung_fachsprache', e.target.value)}
                          rows={3}
                          className="text-sm min-h-[72px] resize-y"
                        />
                      </div>
                      {/* Schüler-Übersetzung – optional, ebenfalls mehrzeilig. */}
                      <div className="space-y-1">
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Schülergerechte Formulierung (optional)</Label>
                        <Textarea
                          placeholder="Wie würdest du das Lernziel einem Schüler erklären?"
                          value={lz.schueler_uebersetzung || ''}
                          onChange={e => updateLernziel(lz.id, 'schueler_uebersetzung', e.target.value)}
                          rows={2}
                          className="text-sm min-h-[56px] resize-y"
                        />
                      </div>
                      <div className="flex gap-2">
                        {['Fachwissen', 'Fähigkeit/Fertigkeit'].map(kat => (
                          <button
                            key={kat}
                            type="button"
                            onClick={() => updateLernziel(lz.id, 'kategorie', kat)}
                            className={cn(
                              'flex-1 py-1 px-2 rounded-md border text-xs font-medium transition-all',
                              lz.kategorie === kat
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/40 text-muted-foreground'
                            )}
                          >
                            {kat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLernziel(lz.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={!titel.trim()}>
            {isNew ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SAMMELBECKEN_ID = '__sammelbecken__';

// ── Paket-Karte ───────────────────────────────────────────────────────────────

function PaketKarte({ paket, index, onDelete, onEdit, compact = false, readOnly = false, istLesemodus = false }) {
  return (
    <Draggable draggableId={paket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'group flex items-start gap-1.5 rounded-lg border bg-card text-sm transition-shadow',
            compact ? 'p-1.5' : 'p-3',
            snapshot.isDragging
              ? 'shadow-xl border-primary/40 rotate-1 scale-105'
              : 'shadow-sm hover:shadow-md border-border hover:border-primary/30 cursor-pointer'
          )}
          onClick={() => onEdit(paket)}
          title={compact ? paket.titel_des_pakets : undefined}
        >
          <div
            {...provided.dragHandleProps}
            className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium leading-snug', compact && 'truncate whitespace-nowrap text-xs')}>
              {paket.titel_des_pakets}
            </p>
            {!compact && paket.geschaetzte_dauer_minuten && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />{paket.geschaetzte_dauer_minuten} Min.
              </p>
            )}
            {!compact && paket.lernziele && paket.lernziele.length > 0 && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Target className="w-3 h-3" />{paket.lernziele.length} Lernziel{paket.lernziele.length !== 1 ? 'e' : ''}
              </p>
            )}
          </div>
          {!readOnly && !istLesemodus && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(paket.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-all shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── Spalte ────────────────────────────────────────────────────────────────────

function Spalte({ id, titel, pakete, onAddPaket, onDeletePaket, onEditPaket, onDeleteSpalte, onTitelChange, isSammelbecken = false, compact = false, collapsed = false, onToggleCollapse, sequenzNummer = null, readOnly = false, istLesemodus = false, onMoveLeft, onMoveRight, canMoveLeft = false, canMoveRight = false }) {
  const [editingTitel, setEditingTitel]   = useState(false);
  const [titelDraft, setTitelDraft]       = useState(titel);

  useEffect(() => { setTitelDraft(titel); }, [titel]);

  const saveTitel = () => { if (titelDraft.trim()) onTitelChange(titelDraft.trim()); setEditingTitel(false); };

  // Eingeklappte Ansicht
  if (collapsed) {
    return (
      <div className={cn('flex flex-col rounded-xl border shrink-0 w-12 max-h-full', isSammelbecken ? 'bg-slate-50 border-slate-200' : 'bg-card border-border')}>
        {/* Collapse-Toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-2 flex justify-center hover:bg-muted/60 rounded-t-xl transition-colors"
          title="Spalte ausklappen"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>
        {/* Sequenz-Nummer (collapsed) */}
        {sequenzNummer !== null && (
          <div className="flex justify-center pb-1">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{sequenzNummer}</span>
          </div>
        )}
        {/* Vertikaler Titel */}
        <div className="flex-1 flex items-center justify-center py-3 overflow-hidden">
          <span
            className="text-xs font-semibold text-muted-foreground whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
            title={titel}
          >
            {titel} ({pakete.length})
          </span>
        </div>
        {/* Drop-Zone (unsichtbar, aber aktiv) */}
          <Droppable droppableId={id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'w-full min-h-[40px] rounded-b-xl transition-colors overflow-hidden',
                  snapshot.isDraggingOver && 'bg-primary/20'
                )}
              >
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col rounded-xl border shrink-0 max-h-full transition-all duration-200',
      compact ? 'w-56' : 'w-72',
      isSammelbecken ? 'bg-slate-50 border-slate-200' : 'bg-card border-border'
    )}>
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-3 rounded-t-xl border-b shrink-0', isSammelbecken ? 'border-slate-200 bg-slate-100/80' : 'border-border bg-muted/40')}>
        {/* Reorder-Pfeil links (nur Themenfelder, nur im Edit-Modus).
            Volle Pfeile mit Schaft (ArrowLeft) + dezenter Pill-Hintergrund,
            damit sie sich klar vom dünnen Einklappen-Chevron unterscheiden.
            Sammelbecken ist von der Reorder-Logik ausgenommen. */}
        {!isSammelbecken && !readOnly && !istLesemodus && onMoveLeft && (
          <button
            onClick={onMoveLeft}
            disabled={!canMoveLeft}
            className="p-1 rounded-md bg-amber-100/60 hover:bg-amber-200 text-amber-700 hover:text-amber-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-100/60"
            title="Themenfeld nach links verschieben"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {isSammelbecken
          ? <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          : sequenzNummer !== null
            ? <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">{sequenzNummer}</span>
            : <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
        }

        {editingTitel && !isSammelbecken ? (
          <Input
            autoFocus value={titelDraft}
            onChange={e => setTitelDraft(e.target.value)}
            onBlur={saveTitel}
            onKeyDown={e => { if (e.key === 'Enter') saveTitel(); if (e.key === 'Escape') setEditingTitel(false); }}
            className="h-7 text-sm font-semibold flex-1"
          />
        ) : (
          <button
            className={cn('flex-1 text-sm font-semibold text-left truncate', !isSammelbecken && 'hover:text-primary')}
            onClick={() => !isSammelbecken && setEditingTitel(true)}
            title={titel}
          >
            {titel}
          </button>
        )}

        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{pakete.length}</span>

        {/* Reorder-Pfeil rechts (gleicher Stil wie links: voller Pfeil + Pill). */}
        {!isSammelbecken && !readOnly && !istLesemodus && onMoveRight && (
          <button
            onClick={onMoveRight}
            disabled={!canMoveRight}
            className="p-1 rounded-md bg-amber-100/60 hover:bg-amber-200 text-amber-700 hover:text-amber-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-100/60"
            title="Themenfeld nach rechts verschieben"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Einklapp-Button (nur für Themenfelder).
            Doppel-Chevron + andere Farbe (slate), klar abgegrenzt von den
            bernsteinfarbenen Reorder-Pfeilen oben. */}
        {!isSammelbecken && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-muted text-slate-500 hover:text-slate-900 transition-colors"
            title="Spalte einklappen"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {!isSammelbecken && !readOnly && !istLesemodus && (
          <button onClick={() => !istLesemodus && onDeleteSpalte()} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Drop-Zone */}
       <Droppable droppableId={id}>
         {(provided, snapshot) => (
           <div
             ref={provided.innerRef}
             {...provided.droppableProps}
             className={cn('flex-1 p-2 space-y-1.5 min-h-[120px] transition-colors overflow-y-auto', snapshot.isDraggingOver && 'bg-primary/5')}
           >
            {pakete.map((paket, index) => (
              <PaketKarte key={paket.id} paket={paket} index={index} onDelete={onDeletePaket} onEdit={onEditPaket} compact={compact} readOnly={readOnly} istLesemodus={istLesemodus} />
            ))}
            {provided.placeholder}
            {pakete.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40 border-2 border-dashed border-muted rounded-lg">
                Hierher ziehen
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Neues Lernpaket */}
      {!readOnly && !istLesemodus && (
        <div className="px-2 pb-2 pt-1 shrink-0">
          <button
            onClick={() => !istLesemodus && onAddPaket(id)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Neues Lernpaket
          </button>
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente (eingebettet) ────────────────────────────────────────────

export default function StrukturBoardEmbedded({
  einheitId,
  einheit, // wird von Workspace mitgegeben
  lernpakete: remotePakete,
  lernziele: remoteLernziele = [],
  themenfelder: remoteThemenfelder,
  queryClient,
  onSaved,   // callback nach erfolgreichem Speichern
  readOnly = false, // ← Structural Lock nicht aktiv
  isStructuralEditingActive = false, // ← NEU: Expliziter Lock-Status von Workspace
  isLockedByOther = false, // ← GLOBALE SPERRE: Wenn true, dann ist gesamte Einheit read-only
}) {
  const { permissions, authUser, rolle } = useRBAC();

  // ── Versionskonflikt-Handling (Phase 3) ────────────────────────────────
  // Fachschaftsleitung & Admin dürfen ggf. force-overwriten.
  const canForceOverwrite = rolle === ROLLEN.ADMIN || rolle === ROLLEN.FACHSCHAFT;
  const versionConflict = useVersionConflict({
    invalidateKeys: [
      ['lernpakete'],
      ['themenfelder'],
      ['lernziele'],
      ['einheit', einheitId],
      ['workspace-data', einheitId],
    ],
    canForceOverwrite,
    // forceOverwriteFn wird in Phase 3.x aktiviert, sobald das Backend
    // einen `force: true`-Pfad akzeptiert. Bis dahin bleibt nur "neu laden".
    forceOverwriteFn: null,
  });

  const [spalten, setSpalten]         = useState([]);
  const [paketeMap, setPaketeMap]     = useState({});
  const [saving, setSaving]           = useState(false);
  const [isSavingPhase, setIsSavingPhase] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isDirty, setIsDirty]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [paketDialog, setPaketDialog] = useState({ open: false, spalteId: null, paket: null });
  const [originalSpaltenIds, setOriginalSpaltenIds] = useState(new Set());
  const [originalPaketIds, setOriginalPaketIds] = useState(new Set());
  // View options
  const [compact, setCompact]                   = useState(false);
  const [collapsedSpalten, setCollapsedSpalten] = useState(new Set());
  // Speicher-Overlay
  const [saveOverlayOpen, setSaveOverlayOpen] = useState(false);

  const toggleCollapse = (spalteId) => {
    setCollapsedSpalten(prev => {
      const next = new Set(prev);
      next.has(spalteId) ? next.delete(spalteId) : next.add(spalteId);
      return next;
    });
  };

  // ── Init: Props → Lokaler State (nur wenn nicht im Edit-Modus UND nicht gerade Speichern) ──────────
  useEffect(() => {
    if (isDirty || isSavingPhase) return; // Nicht initialisieren wenn Nutzer bearbeitet ODER gerade speichert

    console.log('[StrukturBoard] 🔄 Initialisiere State aus Remote-Props...');
    const pakete = remotePakete || [];
    const felder = remoteThemenfelder || [];

    const tfSpalten = [...felder]
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(tf => ({ id: `tf-${tf.id}`, titel: tf.titel, themenfeldId: tf.id }));

    const newMap = { [SAMMELBECKEN_ID]: [] };
    tfSpalten.forEach(s => { newMap[s.id] = []; });

    // Lernziele pro Paket gruppieren (damit sie im Dialog + auf der Karte sichtbar sind)
    const zieleByPaket = (remoteLernziele || []).reduce((acc, lz) => {
      if (!acc[lz.lernpaket_id]) acc[lz.lernpaket_id] = [];
      acc[lz.lernpaket_id].push(lz);
      return acc;
    }, {});

    pakete.forEach(p => {
      const sid = p.themenfeld_id ? `tf-${p.themenfeld_id}` : SAMMELBECKEN_ID;
      if (!newMap[sid]) newMap[sid] = [];
      // Lernziele an Paket hängen, damit sie im Dialog wieder angezeigt werden
      newMap[sid].push({ ...p, lernziele: zieleByPaket[p.id] || [] });
    });

    Object.keys(newMap).forEach(k => {
      newMap[k].sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    });

    setSpalten(tfSpalten);
    setPaketeMap(newMap);
    setOriginalSpaltenIds(new Set(tfSpalten.map(s => s.themenfeldId).filter(Boolean)));
    setOriginalPaketIds(new Set(pakete.map(p => p.id)));
  }, [remotePakete, remoteLernziele, remoteThemenfelder, isDirty, isSavingPhase]);



  // ✅ RBAC: Wer darf Struktur bearbeiten? AUSSCHLIEẞLICH unitAccess.hasFullAccess verwenden
  const unitAccess = hasUnitLevelAccess(
    permissions.rolle,
    permissions.faecher,
    einheit?.fach,
    einheit?.members || [],
    authUser?.email
  );
  const kannStrukturBearbeiten = einheit ? unitAccess.hasFullAccess : false;
  
  // 🔒 HARTE SPERRE: Nur wenn Structural Lock aktiv ist, darf bearbeitet werden
  // + GLOBALE SPERRE: Wenn isLockedByOther, dann immer Lesemodus
  // ✅ LESEMODUS für normale Lehrkräfte (können sehen, aber nicht bearbeiten)
  const istLesemodus = !kannStrukturBearbeiten || !isStructuralEditingActive || isLockedByOther;

  // Early Return nur wenn Einheit wirklich fehlt
  if (!einheit) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <FolderOpen className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Einheit nicht geladen</p>
          <p className="text-sm text-muted-foreground mt-1">
            Bitte laden Sie die Einheit neu.
          </p>
        </div>
      </div>
    );
  }



  // ── DnD ───────────────────────────────────────────────────────────────────

  const handleDragEnd = ({ source, destination }) => {
    if (readOnly || istLesemodus) return;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setIsDirty(true);
    setPaketeMap(prev => {
      const next = { ...prev };
      const src = [...(next[source.droppableId] || [])];
      const [moved] = src.splice(source.index, 1);

      if (source.droppableId === destination.droppableId) {
        src.splice(destination.index, 0, moved);
        next[source.droppableId] = src;
      } else {
        next[source.droppableId] = src;
        const dst = [...(next[destination.droppableId] || [])];
        dst.splice(destination.index, 0, moved);
        next[destination.droppableId] = dst;
      }
      return next;
    });
  };

  // ── Aktionen ──────────────────────────────────────────────────────────────

  const DEFAULT_PHASEN = {
    Input:     { disabled: false, selected_aktivitaet_id: null, field_values: {} },
    Übung:     { disabled: false, selected_aktivitaet_id: null, field_values: {} },
    Abschluss: { disabled: false, selected_aktivitaet_id: null, field_values: {} },
  };

  const handleNeuesThemenfeld = () => {
    if (istLesemodus) return;
    setIsDirty(true);
    const newId = `tf-new-${Date.now()}`;
    setSpalten(prev => [...prev, { id: newId, titel: `Themenfeld ${prev.length + 1}`, themenfeldId: null }]);
    setPaketeMap(prev => ({ ...prev, [newId]: [] }));
  };

  const handleTitelChange = (spalteId, neuerTitel) => {
    if (istLesemodus) return;
    setIsDirty(true);
    setSpalten(prev => prev.map(s => s.id === spalteId ? { ...s, titel: neuerTitel } : s));
  };

  // Themenfeld eine Position nach links/rechts verschieben.
  // Reihenfolge wird beim Speichern via Index → reihenfolge=i+1 persistiert
  // (siehe PHASE 3 in handleSpeichern). Sammelbecken ist nicht Teil von
  // `spalten` und damit automatisch ausgeschlossen.
  const moveSpalte = (spalteId, direction) => {
    if (istLesemodus) return;
    setSpalten(prev => {
      const idx = prev.findIndex(s => s.id === spalteId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
    setIsDirty(true);
  };

  const handleDeleteSpalteRequest = (spalteId) => {
    if (istLesemodus) return;
    const spalte = spalten.find(s => s.id === spalteId);
    const paketCount = (paketeMap[spalteId] || []).length;
    setDeleteConfirm({ spalteId, titel: spalte?.titel || 'Themenfeld', paketCount });
  };

  const handleDeleteSpalteConfirmed = () => {
    setIsDirty(true);
    const { spalteId } = deleteConfirm;

    // Sammelbecken-Liste: verschobene Pakete ans Ende anhängen, mit neuen Sort-Indizes
    setPaketeMap(prev => {
      const paketeInSpalte = (prev[spalteId] || []).map(p => ({ ...p, themenfeld_id: null }));
      const sammelbecken   = prev[SAMMELBECKEN_ID] || [];
      // Sort-Indizes fortführend vergeben
      const verschoben = paketeInSpalte.map((p, i) => ({
        ...p,
        reihenfolge_nummer: sammelbecken.length + i + 1,
      }));
      const next = { ...prev, [SAMMELBECKEN_ID]: [...sammelbecken, ...verschoben] };
      delete next[spalteId];
      return next;
    });

    setSpalten(prev => prev.filter(s => s.id !== spalteId));
    setDeleteConfirm(null);
  };

  // Öffnet Dialog zum Erstellen (paket=null) oder Bearbeiten (paket=existierendes Paket)
  const openPaketDialog = (spalteId, paket = null) => {
    if (istLesemodus) return;
    setPaketDialog({ open: true, spalteId, paket });
  };

  const handlePaketSave = ({ titel, dauer, lernziele }) => {
   console.log('[StrukturBoard] 📝 handlePaketSave aufgerufen:', { titel, dauer, lernzieleCount: lernziele?.length, lernziele });
   setIsDirty(true);
   const { spalteId, paket } = paketDialog;
   console.log('[StrukturBoard] 📝 Dialog-Kontext:', { spalteId, paketId: paket?.id, istBearbeiten: !!paket });
   if (paket) {
     // Paket bearbeiten (ob neu oder existierend)
     setPaketeMap(prev => {
       const next = {};
       Object.entries(prev).forEach(([k, v]) => {
         next[k] = v.map(p => p.id === paket.id
           ? { ...p, titel_des_pakets: titel, geschaetzte_dauer_minuten: dauer, lernziele }
           : p);
       });
       return next;
     });
   } else {
     // Neues Paket anlegen (Dialog wurde ohne paket=null geöffnet)
     const tempId = `new-${Date.now()}`;
     setPaketeMap(prev => ({
       ...prev,
       [spalteId]: [...(prev[spalteId] || []), {
         id: tempId,
         titel_des_pakets: titel,
         geschaetzte_dauer_minuten: dauer,
         lernziele,
         reihenfolge_nummer: (prev[spalteId] || []).length + 1,
         einheit_id: einheitId,
         phasen_konfiguration: DEFAULT_PHASEN,
         isNew: true,
       }],
     }));
   }
   setPaketDialog({ open: false, spalteId: null, paket: null });
  };

  const handleDeletePaket = (paketId) => {
    if (istLesemodus) return;
    setIsDirty(true);
    setPaketeMap(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => { next[k] = v.filter(p => p.id !== paketId); });
      return next;
    });
  };

  // ── Speichern (nur themenfeld_id + reihenfolge_nummer ändern) ─────────────

  const handleSpeichern = async () => {
    setSaving(true);
    setIsSavingPhase(true); // ← BLOCKIERE Remote-Updates während Speichern
    setSaveOverlayOpen(true);

    // Timeout: Wenn Speichern länger als 30 Sekunden dauert → Error erzwingen
    const timeoutId = setTimeout(() => {
      console.error('[StrukturBoard] ⏰ TIMEOUT: Speichern hat mehr als 30 Sekunden gedauert!');
      setSaving(false);
      toast.error('❌ Speichern hat zu lange gedauert (Timeout nach 30s). Bitte überprüfe deine Internetverbindung und versuche erneut.', {
        duration: 15000
      });
    }, 30000);

    try {
      console.log('[StrukturBoard] 🔄 Starte pessimistisches Speichern...');
      console.log('[StrukturBoard] Helper-Funktionen verfügbar?', {
        createThemenfeld: typeof createThemenfeld,
        updateThemenfeld: typeof updateThemenfeld,
        deleteThemenfeld: typeof deleteThemenfeld,
        createLernpaket: typeof createLernpaket,
        updateLernpaket: typeof updateLernpaket,
        deleteLernpaket: typeof deleteLernpaket,
      });

      // ── PHASE 1: Identifiziere alle Änderungen ──────────────────────────────
      const aktuellePacketIds = new Set(Object.values(paketeMap).flat().map(p => p.id));
      const paketIdZumLoeschen = Array.from(originalPaketIds).filter(id => !aktuellePacketIds.has(id) && !id.startsWith('new-'));
      
      const aktuelleThemenfeldIds = new Set(spalten.map(s => s.themenfeldId).filter(Boolean));
      const themenfeldIdZumLoeschen = Array.from(originalSpaltenIds).filter(id => !aktuelleThemenfeldIds.has(id));

      console.log(`[StrukturBoard] 📋 Änderungen: ${paketIdZumLoeschen.length} Pakete zu löschen, ${themenfeldIdZumLoeschen.length} Themenfelder zu löschen`);

      // ── PHASE 2: Löschungen (SEQUENZIELL) ──────────────────────────────────
      if (paketIdZumLoeschen.length > 0) {
        console.log(`[StrukturBoard] 🗑️ Lösche ${paketIdZumLoeschen.length} Pakete...`);
        for (const paketId of paketIdZumLoeschen) {
          console.log(`[StrukturBoard]   → deleteLernpaket(${paketId}) wird aufgerufen...`);
          const result = await deleteLernpaket(paketId);
          console.log(`[StrukturBoard]   ✓ deleteLernpaket(${paketId}) abgeschlossen. Result:`, result);
          if (!result) throw new Error(`Fehler: Paket ${paketId} konnte nicht gelöscht werden`);
        }
      }

      if (themenfeldIdZumLoeschen.length > 0) {
        console.log(`[StrukturBoard] 🗑️ Lösche ${themenfeldIdZumLoeschen.length} Themenfelder...`);
        for (const themenfeldId of themenfeldIdZumLoeschen) {
          console.log(`[StrukturBoard]   → deleteThemenfeld(${themenfeldId}) wird aufgerufen...`);
          const result = await deleteThemenfeld(themenfeldId);
          console.log(`[StrukturBoard]   ✓ deleteThemenfeld(${themenfeldId}) abgeschlossen. Result:`, result);
          if (!result) throw new Error(`Fehler: Themenfeld ${themenfeldId} konnte nicht gelöscht werden`);
        }
      }

      // ── PHASE 3: Themenfelder anlegen/updaten (SEQUENZIELL) ────────────────
      console.log(`[StrukturBoard] 📁 Verarbeite ${spalten.length} Themenfelder...`);
      const spaltenMitId = [];
      for (let i = 0; i < spalten.length; i++) {
        const spalte = spalten[i];
        let themenfeldId = spalte.themenfeldId;

        try {
          if (!themenfeldId) {
            console.log(`[StrukturBoard] ➕ PHASE3[${i}] Erstelle Themenfeld: "${spalte.titel}"...`);
            const neu = await createThemenfeld({ einheitId, titel: spalte.titel, reihenfolge: i + 1 });
            console.log(`[StrukturBoard] ➕ PHASE3[${i}] ✓ Fertig. Neue ID:`, neu?.id);
            if (!neu?.id) throw new Error(`Fehler: Neu erstelltes Themenfeld hat keine ID`);
            themenfeldId = neu.id;
          } else {
            console.log(`[StrukturBoard] ✏️ PHASE3[${i}] Update Themenfeld: "${spalte.titel}" (${themenfeldId})...`);
            const originalThemenfeld = remoteThemenfelder.find(tf => tf.id === themenfeldId);
            const updateData = { titel: spalte.titel, reihenfolge: i + 1 };
            if (originalThemenfeld && originalThemenfeld.titel !== spalte.titel) {
              console.log(`[StrukturBoard] ✏️ PHASE3[${i}] → Titel geändert: "${originalThemenfeld.titel}" → "${spalte.titel}"`);
            }
            const result = await updateThemenfeld(themenfeldId, updateData);
            console.log(`[StrukturBoard] ✏️ PHASE3[${i}] ✓ Fertig. Result:`, result);
            if (!result) throw new Error(`Fehler: Themenfeld ${themenfeldId} konnte nicht aktualisiert werden`);
          }
          spaltenMitId.push({ ...spalte, themenfeldId });
        } catch (err) {
          console.error(`[StrukturBoard] ❌ PHASE3[${i}] FEHLER:`, err);
          throw new Error(`Fehler bei Themenfeld "${spalte.titel}": ${err.message}`);
        }
      }

      // ── PHASE 4: Lernpakete aktualisieren (SEQUENZIELL) ───────────────────
      console.log(`[StrukturBoard] 📦 Verarbeite Lernpakete und Verschiebungen...`);
      let paketCounter = 0;

      for (const [spalteId, pakete] of Object.entries(paketeMap)) {
        const themenfeldId = spalteId === SAMMELBECKEN_ID ? null : spaltenMitId.find(s => s.id === spalteId)?.themenfeldId || null;
        console.log(`[StrukturBoard] 📦 PHASE4: Spalte ${spalteId} hat ${pakete.length} Pakete`);

        for (let i = 0; i < pakete.length; i++) {
          const paket = pakete[i];
          const update = { themenfeld_id: themenfeldId, reihenfolge_nummer: i + 1 };
          paketCounter++;

          try {
            if (paket.isNew) {
              console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}] Erstelle Paket: "${paket.titel_des_pakets}"...`);
              const neuesPaket = await createLernpaket({
                einheit_id: einheitId,
                titel_des_pakets: paket.titel_des_pakets,
                geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
                phasen_konfiguration: paket.phasen_konfiguration || DEFAULT_PHASEN,
                ...update,
              });
              console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}] ✓ Paket erstellt. ID:`, neuesPaket?.id);
              if (!neuesPaket?.id) throw new Error(`Fehler: Neu erstelltes Lernpaket hat keine ID`);

              if (paket.lernziele && paket.lernziele.length > 0) {
                console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}] Erstelle ${paket.lernziele.length} Lernziele...`);
                for (let lzIdx = 0; lzIdx < paket.lernziele.length; lzIdx++) {
                  const lz = paket.lernziele[lzIdx];
                  if (lz.formulierung_fachsprache?.trim()) {
                    console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}]   → LZ${lzIdx}: "${lz.formulierung_fachsprache.substring(0, 40)}..."...`);
                    await createLernziel({
                      lernpaket_id: neuesPaket.id,
                      formulierung_fachsprache: lz.formulierung_fachsprache.trim(),
                      kategorie: lz.kategorie || 'Fachwissen',
                    });
                    console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}]   ✓ LZ${lzIdx} fertig`);
                  }
                }
              }
            } else {
              console.log(`[StrukturBoard] ✏️ PHASE4[${paketCounter}] Update Paket: "${paket.titel_des_pakets}" (ID: ${paket.id})...`);
              // Titel-Änderungen auch speichern, falls geändert
              const originalPaket = remotePakete.find(p => p.id === paket.id);
              const updateData = { ...update };
              if (originalPaket && originalPaket.titel_des_pakets !== paket.titel_des_pakets) {
                updateData.titel_des_pakets = paket.titel_des_pakets;
                console.log(`[StrukturBoard] ✏️ PHASE4[${paketCounter}] → Titel geändert: "${originalPaket.titel_des_pakets}" → "${paket.titel_des_pakets}"`);
              }
              const result = await updateLernpaket(paket.id, updateData);
              console.log(`[StrukturBoard] ✏️ PHASE4[${paketCounter}] ✓ Fertig. Result:`, result);
              if (!result) throw new Error(`Fehler: Paket ${paket.id} konnte nicht aktualisiert werden`);

              // Lernziele synchronisieren: Neue anlegen, entfernte löschen
              const aktuelleLernziele = Array.isArray(paket.lernziele) ? paket.lernziele : [];
              const originalLernziele = (remoteLernziele || []).filter(lz => lz.lernpaket_id === paket.id);
              console.log(`[StrukturBoard] 🔍 PHASE4[${paketCounter}] Lernziele: ${originalLernziele.length} original, ${aktuelleLernziele.length} aktuell`);

              // 1) Gelöschte Lernziele finden (waren in DB, sind jetzt nicht mehr in der Liste)
              const aktuelleIds = new Set(aktuelleLernziele.map(lz => lz.id));
              const zuLoeschen = originalLernziele.filter(lz => !aktuelleIds.has(lz.id));
              if (zuLoeschen.length > 0) {
                console.log(`[StrukturBoard] 🗑️ PHASE4[${paketCounter}] Lösche ${zuLoeschen.length} Lernziele...`);
                for (const lz of zuLoeschen) {
                  console.log(`[StrukturBoard] 🗑️ PHASE4[${paketCounter}]   → deleteLernziel(${lz.id})...`);
                  await deleteLernziel(lz.id);
                  console.log(`[StrukturBoard] 🗑️ PHASE4[${paketCounter}]   ✓ Gelöscht`);
                }
              }

              // 2) Neue Lernziele anlegen (isNew=true ODER Temp-ID 'lz-...')
              const istNeu = (lz) => lz.isNew === true || (typeof lz.id === 'string' && lz.id.startsWith('lz-'));
              const neueLernziele = aktuelleLernziele.filter(lz =>
                istNeu(lz) && lz.formulierung_fachsprache?.trim()
              );
              if (neueLernziele.length > 0) {
                console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}] Erstelle ${neueLernziele.length} neue Lernziele für Paket ${paket.id}...`);
                for (const lz of neueLernziele) {
                  console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}]   → LZ: "${lz.formulierung_fachsprache.substring(0, 40)}..."`);
                  await createLernziel({
                    lernpaket_id: paket.id,
                    formulierung_fachsprache: lz.formulierung_fachsprache.trim(),
                    kategorie: lz.kategorie || 'Fachwissen',
                  });
                  console.log(`[StrukturBoard] ➕ PHASE4[${paketCounter}]   ✓ Fertig`);
                }
              }

              // 3) Bestehende Lernziele aktualisieren (echte DB-ID, nicht neu) –
              //    nur wenn sich Formulierung, Kategorie oder Schüler-Übersetzung
              //    tatsächlich geändert haben. Ohne diesen Pfad gingen
              //    Inline-Edits (z. B. Tippfehler korrigieren) verloren, weil sie
              //    weder in „neu" noch in „löschen" fielen.
              const bestehendeLernziele = aktuelleLernziele.filter(lz => !istNeu(lz));
              for (const lz of bestehendeLernziele) {
                const original = originalLernziele.find(o => o.id === lz.id);
                if (!original) continue;
                const neueFormulierung = (lz.formulierung_fachsprache || '').trim();
                if (!neueFormulierung) continue;
                const neueKategorie = lz.kategorie || 'Fachwissen';
                const neueUebersetzung = lz.schueler_uebersetzung ?? original.schueler_uebersetzung ?? '';
                const titelGeandert = neueFormulierung !== (original.formulierung_fachsprache || '').trim();
                const kategorieGeandert = neueKategorie !== (original.kategorie || 'Fachwissen');
                const uebersetzungGeandert = (neueUebersetzung || '') !== (original.schueler_uebersetzung || '');
                if (!titelGeandert && !kategorieGeandert && !uebersetzungGeandert) continue;

                const lzUpdate = {};
                if (titelGeandert) lzUpdate.formulierung_fachsprache = neueFormulierung;
                if (kategorieGeandert) lzUpdate.kategorie = neueKategorie;
                if (uebersetzungGeandert) lzUpdate.schueler_uebersetzung = neueUebersetzung;
                console.log(`[StrukturBoard] ✏️ PHASE4[${paketCounter}] Update Lernziel ${lz.id}:`, lzUpdate);
                await updateLernziel(lz.id, lzUpdate);
                console.log(`[StrukturBoard] ✏️ PHASE4[${paketCounter}]   ✓ Lernziel aktualisiert`);
              }
            }
          } catch (err) {
            console.error(`[StrukturBoard] ❌ PHASE4[${paketCounter}] FEHLER:`, err);
            throw new Error(`Fehler bei Paket "${paket.titel_des_pakets}": ${err.message}`);
          }
        }
      }
      console.log(`[StrukturBoard] 📦 PHASE4 ✓ ALLE ${paketCounter} PAKETE FERTIG!`);

      // ── PHASE 5: Dirty-Flag SOFORT auf false setzen ─────────────────────
      // Damit der useEffect die neuen Props nicht blockiert
      console.log('[StrukturBoard] 🔄 Setze isDirty=false, damit UI-Sync stattfinden kann...');
      setIsDirty(false);

      // ── PHASE 6: "Gedenksekunde" für Datenbank-Schreibvorgänge ──────────
      // Race-Condition Fix: Gib der Datenbank Zeit, alle Schreibvorgänge zu beenden
      // bevor wir die Daten neu laden. Backend sagt "OK!" aber die DB braucht noch Zeit.
      console.log('[StrukturBoard] ⏳ Warte 800ms, damit Datenbank alle Schreibvorgänge abschließt...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // ── PHASE 7: Query Refetch (AGGRESSIV) ───────────────────
      console.log(`[StrukturBoard] 🔄 Lade alle Daten neu...`);
      
      // REFETCH statt INVALIDATE – zwingt sofortiges Neuladen
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['lernpakete'] }),
        queryClient.refetchQueries({ queryKey: ['themenfelder'] }),
        queryClient.refetchQueries({ queryKey: ['lernziele'] }),
        queryClient.refetchQueries({ queryKey: ['einheit', einheitId] }),
      ]);

      // ── PHASE 8: Erfolg! Board-Remount wird über Callback getriggert ─────
      console.log('[StrukturBoard] ✅ Speichern 100% erfolgreich! Triggere Key-Remount im Parent...');
      clearTimeout(timeoutId);
      
      // Erst nach kurzer Verzögerung: Overlay schließen + Erfolg
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSaving(false);
      setSaveOverlayOpen(false);
      
      toast.success('✅ Struktur erfolgreich gespeichert! Bearbeitungsmodus wird beendet...');
      
      // 🔄 KEY-REMOUNT: Callback triggert Lock-Release UND kompletten Board-Neustart
      // Der Neustart erzwingt Initialisierung aus 100% neuen Props
      // WICHTIG: isSavingPhase wird später im Callback auf false gesetzt
      onSaved?.();

    } catch (error) {
      // ── FEHLERBEHANDLUNG (HART) ───────────────────────────────────────────
      clearTimeout(timeoutId);

      // Phase 3: Versionskonflikt → eigenen Dialog statt generischem Toast
      if (isVersionConflictError(error)) {
        console.warn('[StrukturBoard] ⚠️ Versionskonflikt erkannt – Dialog öffnen.');
        setSaving(false);
        setSaveOverlayOpen(false);
        versionConflict.handle(error);
        return;
      }

      console.error('[StrukturBoard] ❌ KRITISCHER FEHLER beim Speichern:', error);
      console.error('[StrukturBoard] Error Name:', error?.name);
      console.error('[StrukturBoard] Error Stack:', error?.stack);
      console.error('[StrukturBoard] Error Details:', {
        status: error?.response?.status,
        message: error?.message,
        data: error?.response?.data,
        type: error?.constructor?.name,
      });
      
      // Explizite Fehlermeldung mit vollständigen Details
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error ||
        error?.name ||
        error?.message || 
        'Speichern fehlgeschlagen: Unbekannter Fehler';

      // 🚨 HART UND DEUTLICH
      setSaving(false);
      toast.error(`❌ FEHLER beim Speichern: ${errorMessage}`, {
        duration: 10000 // 10 Sekunden
      });
      
      // Overlay bleibt offen bis Nutzer es schließt
      console.warn('[StrukturBoard] ⚠️ Speichern fehlgeschlagen! Bearbeitungsmodus bleibt aktiv.');
      console.warn('[StrukturBoard] Lokale Änderungen sind NICHT verloren. Bitte Internet prüfen und erneut versuchen.');
      
    } finally {
      clearTimeout(timeoutId);
      // Immer aufräumen, auch bei Fehler
      setIsSavingPhase(false);
      // setSaving(false) wurde bereits oben im catch/success gesetzt
    }
  };

  const gesamtPakete = Object.values(paketeMap).flat().length;
  const zugeordnet   = spalten.reduce((n, s) => n + (paketeMap[s.id]?.length || 0), 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Aktions-Leiste – nur im Edit-Modus */}
      {!readOnly && isStructuralEditingActive && (
        <div className="shrink-0 px-4 py-2 border-b border-border bg-card/50 flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSpeichern}
            disabled={saving || !isDirty}
            className={cn(
              'gap-1.5 transition-all duration-200',
              isDirty
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 animate-heartbeat'
                : 'opacity-50'
            )}
          >
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            {isDirty ? '⚠ Struktur speichern' : 'Struktur gespeichert'}
          </Button>
          {isDirty && (
            <p className="text-sm text-amber-600 font-medium">
              Ungespeicherte Änderungen – bitte speichern bevor du den Tab wechselst!
            </p>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCompact(c => !c)}
              className="h-7 gap-1.5 text-xs"
            >
              {compact ? <AlignJustify className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
              {compact ? 'Normal' : 'Kompakt'}
            </Button>
          </div>
        </div>
      )}

      {/* Lesemodus-Banner – wenn nicht im Edit-Modus */}
      {(readOnly || !isStructuralEditingActive) && (
        <div className="shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Save className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>
            {isLockedByOther
              ? 'Einheit wird gerade von einem anderen Nutzer bearbeitet. Bitte warten Sie.'
              : !unitAccess.hasFullAccess
                ? 'Bearbeitungsmodus für Struktur nicht verfügbar.'
                : 'Bearbeitungsmodus beenden oben rechts'}
          </span>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCompact(c => !c)}
              className="h-7 gap-1.5 text-xs"
            >
              {compact ? <AlignJustify className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
              {compact ? 'Normal' : 'Kompakt'}
            </Button>
          </div>
        </div>
      )}

      {/* Tipp */}
      {!readOnly && isStructuralEditingActive && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          Lernpakete per Drag & Drop in Themenfelder ziehen · Themenfeld-Titel anklicken zum Umbenennen
        </div>
      )}

      {/* Sequenziell-Banner */}
      {einheit?.bearbeitungsmodus === 'sequenziell' && (
        <div className="shrink-0 px-4 py-2 bg-primary/5 border-b border-primary/20 text-xs text-primary flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Sequenzieller Modus:</strong> Themenfelder sind nummeriert – Schüler im Minimalpfad müssen sie in dieser Reihenfolge durcharbeiten. Einzelne Lernpakete bleiben jederzeit direkt ansteuerbar.
          </span>
        </div>
      )}

      {/* Board – EINZIGER Scroll-Container für DnD! */}
      <div className={cn('flex-1 overflow-x-auto overflow-y-auto min-h-0', readOnly && 'opacity-60')}>
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Hinweis: Im Lesemodus KEIN `pointer-events-none` setzen –
              das würde das vertikale Scrolling innerhalb der Spalten blockieren.
              DnD selbst ist im Lesemodus bereits durch readOnly/istLesemodus
              an den Drag-Handles deaktiviert. */}
          <div className="flex gap-4 h-full p-4 min-w-max items-start">
            {/* Sammelbecken */}
            <Spalte
              id={SAMMELBECKEN_ID}
              titel="Nicht zugeordnet"
              pakete={paketeMap[SAMMELBECKEN_ID] || []}
              onAddPaket={(spalteId) => openPaketDialog(spalteId)}
              onDeletePaket={handleDeletePaket}
              onEditPaket={(paket) => openPaketDialog(SAMMELBECKEN_ID, paket)}
              isSammelbecken
              compact={compact}
              readOnly={readOnly || !isStructuralEditingActive}
              istLesemodus={istLesemodus || !isStructuralEditingActive}
            />

            <div className="w-px bg-border shrink-0 self-stretch" />

            {/* Themenfeld-Spalten */}
            {spalten.map((spalte, idx) => (
              <Spalte
                key={spalte.id}
                id={spalte.id}
                titel={spalte.titel}
                pakete={paketeMap[spalte.id] || []}
                onAddPaket={(spalteId) => openPaketDialog(spalteId)}
                onDeletePaket={handleDeletePaket}
                onEditPaket={(paket) => openPaketDialog(spalte.id, paket)}
                onDeleteSpalte={() => handleDeleteSpalteRequest(spalte.id)}
                onTitelChange={neuerTitel => handleTitelChange(spalte.id, neuerTitel)}
                compact={compact}
                collapsed={collapsedSpalten.has(spalte.id)}
                onToggleCollapse={() => toggleCollapse(spalte.id)}
                sequenzNummer={einheit?.bearbeitungsmodus === 'sequenziell' ? idx + 1 : null}
                readOnly={readOnly || !isStructuralEditingActive}
                istLesemodus={istLesemodus || !isStructuralEditingActive}
                onMoveLeft={() => moveSpalte(spalte.id, 'left')}
                onMoveRight={() => moveSpalte(spalte.id, 'right')}
                canMoveLeft={idx > 0}
                canMoveRight={idx < spalten.length - 1}
              />
            ))}

            {/* Neue-Spalte CTA – nur im Edit-Modus */}
            {!readOnly && isStructuralEditingActive && !istLesemodus && (
              <button
                onClick={handleNeuesThemenfeld}
                className="shrink-0 w-64 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors self-stretch"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Neues Themenfeld</span>
              </button>
            )}
          </div>
        </DragDropContext>
      </div>

      {/* Lernpaket-Dialog */}
      <LernpaketDialog
        open={paketDialog.open}
        onOpenChange={(open) => !open && setPaketDialog({ open: false, spalteId: null, paket: null })}
        initialData={paketDialog.paket}
        onSave={handlePaketSave}
      />

      {/* ── Speicher-Overlay (blocking) ── */}
      {saveOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">Struktur wird gespeichert…</p>
              <p className="text-sm text-muted-foreground mt-2">Bitte warten Sie, alle Änderungen werden in die Datenbank geschrieben.</p>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Versionskonflikt-Dialog (Phase 3) */}
      <VersionConflictDialog {...versionConflict.dialogProps} />

      {/* Bestätigungsdialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Themenfeld „{deleteConfirm?.titel}" löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.paketCount > 0
                ? <>
                    Das Themenfeld enthält <strong>{deleteConfirm.paketCount} Lernpaket{deleteConfirm.paketCount !== 1 ? 'e' : ''}</strong>.
                    {' '}Diese werden sicher zurück in das <strong>Sammelbecken</strong> verschoben und bleiben vollständig erhalten – kein Inhalt geht verloren.
                  </>
                : 'Das leere Themenfeld wird entfernt.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSpalteConfirmed}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteConfirm?.paketCount > 0 ? 'Löschen & ins Sammelbecken verschieben' : 'Themenfeld löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}