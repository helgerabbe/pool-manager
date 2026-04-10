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
import { createLernziel } from '@/services/LernzielService';
import { createLernpaket, updateLernpaket, deleteLernpaket } from '@/services/LernpaketService';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, GripVertical, Clock, Trash2, FolderOpen, Layers, X, Save, Target, ChevronLeft, AlignJustify, LayoutList, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                      <Input
                        placeholder={`Lernziel ${idx + 1}: Ich kann…`}
                        value={lz.formulierung_fachsprache}
                        onChange={e => updateLernziel(lz.id, 'formulierung_fachsprache', e.target.value)}
                        className="text-sm"
                      />
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

function PaketKarte({ paket, index, onDelete, onEdit, compact = false }) {
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
          <button
            onClick={e => { e.stopPropagation(); onDelete(paket.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-all shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </Draggable>
  );
}

// ── Spalte ────────────────────────────────────────────────────────────────────

function Spalte({ id, titel, pakete, onAddPaket, onDeletePaket, onEditPaket, onDeleteSpalte, onTitelChange, isSammelbecken = false, compact = false, collapsed = false, onToggleCollapse, sequenzNummer = null }) {
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
                'w-full min-h-[40px] rounded-b-xl transition-colors',
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

        {/* Einklapp-Button (nur für Themenfelder) */}
        {!isSammelbecken && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Spalte einklappen"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {!isSammelbecken && (
          <button onClick={onDeleteSpalte} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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
            className={cn('flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[120px] transition-colors scroll-container', snapshot.isDraggingOver && 'bg-primary/5')}
          >
            {pakete.map((paket, index) => (
              <PaketKarte key={paket.id} paket={paket} index={index} onDelete={onDeletePaket} onEdit={onEditPaket} compact={compact} />
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
      <div className="px-2 pb-2 pt-1 shrink-0">
        <button
          onClick={() => onAddPaket(id)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Neues Lernpaket
        </button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente (eingebettet) ────────────────────────────────────────────

export default function StrukturBoardEmbedded({
  einheitId,
  einheit, // wird von Workspace mitgegeben
  lernpakete: remotePakete,
  themenfelder: remoteThemenfelder,
  queryClient,
  onSaved,   // callback nach erfolgreichem Speichern
  readOnly = false, // ← Structural Lock nicht aktiv
}) {
  const { permissions } = useRBAC();

  const [spalten, setSpalten]         = useState([]);
  const [paketeMap, setPaketeMap]     = useState({});
  const [saving, setSaving]           = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isDirty, setIsDirty]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [paketDialog, setPaketDialog] = useState({ open: false, spalteId: null, paket: null });
  const [originalSpaltenIds, setOriginalSpaltenIds] = useState(new Set());
  const [originalPaketIds, setOriginalPaketIds] = useState(new Set());
  // View options
  const [compact, setCompact]                   = useState(false);
  const [collapsedSpalten, setCollapsedSpalten] = useState(new Set());

  const toggleCollapse = (spalteId) => {
    setCollapsedSpalten(prev => {
      const next = new Set(prev);
      next.has(spalteId) ? next.delete(spalteId) : next.add(spalteId);
      return next;
    });
  };

  // ── Initialisierung ───────────────────────────────────────────────────────

  useEffect(() => {
    if (initialized) return;
    if (!remotePakete || !remoteThemenfelder) return;

    const tfSpalten = [...remoteThemenfelder]
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(tf => ({ id: `tf-${tf.id}`, titel: tf.titel, themenfeldId: tf.id }));

    const newMap = { [SAMMELBECKEN_ID]: [] };
    tfSpalten.forEach(s => { newMap[s.id] = []; });

    remotePakete.forEach(p => {
      const sid = p.themenfeld_id ? `tf-${p.themenfeld_id}` : SAMMELBECKEN_ID;
      if (!newMap[sid]) newMap[sid] = [];
      newMap[sid].push(p);
    });

    Object.keys(newMap).forEach(k => {
      newMap[k].sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    });

    setSpalten(tfSpalten);
    setPaketeMap(newMap);
    // Store original IDs to detect deletions
    setOriginalSpaltenIds(new Set(tfSpalten.map(s => s.themenfeldId)));
    setOriginalPaketIds(new Set(remotePakete.map(p => p.id)));
    setInitialized(true);
  }, [remotePakete, remoteThemenfelder, initialized]);

  // Re-init NUR wenn Remote-Daten sich ändern oder einheit wechselt
  // isDirty = local changes, sollte nicht triggern
  useEffect(() => {
    if (isDirty) return; // Nicht re-initialisieren, wenn lokale Änderungen ausstehen
    setInitialized(false);
  }, [einheitId, remotePakete, remoteThemenfelder, isDirty]);

  // RBAC: Nur Struktur-Bearbeiter dürfen hier rein (Bereich 1: Struktur) - nach allen Hooks
  const kannStrukturBearbeiten = einheit ? permissions.kannStrukturBearbeiten(einheit.fach) : false;
  if (!kannStrukturBearbeiten) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <FolderOpen className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Kein Zugriff</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nur Fachschaftsleitung und Administratoren dürfen die Struktur bearbeiten.
          </p>
        </div>
      </div>
    );
  }

  // ── DnD ───────────────────────────────────────────────────────────────────

  const handleDragEnd = ({ source, destination }) => {
    if (readOnly) return;
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
    setIsDirty(true);
    const newId = `tf-new-${Date.now()}`;
    setSpalten(prev => [...prev, { id: newId, titel: `Themenfeld ${prev.length + 1}`, themenfeldId: null }]);
    setPaketeMap(prev => ({ ...prev, [newId]: [] }));
  };

  const handleTitelChange = (spalteId, neuerTitel) => {
    setIsDirty(true);
    setSpalten(prev => prev.map(s => s.id === spalteId ? { ...s, titel: neuerTitel } : s));
  };

  const handleDeleteSpalteRequest = (spalteId) => {
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
  const openPaketDialog = (spalteId, paket = null) =>
    setPaketDialog({ open: true, spalteId, paket });

  const handlePaketSave = ({ titel, dauer, lernziele }) => {
   setIsDirty(true);
   const { spalteId, paket } = paketDialog;
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

    try {
      // 0. Identifiziere gelöschte Pakete und Themenfelder
      const aktuellePacketIds = new Set(Object.values(paketeMap).flat().map(p => p.id));
      const paketIdZumLoeschen = Array.from(originalPaketIds).filter(id => !aktuellePacketIds.has(id) && !id.startsWith('new-'));
      
      const aktuelleThemenfeldIds = new Set(spalten.map(s => s.themenfeldId).filter(Boolean));
      const themenfeldIdZumLoeschen = Array.from(originalSpaltenIds).filter(id => !aktuelleThemenfeldIds.has(id));

      // Lösche Pakete
      for (const paketId of paketIdZumLoeschen) {
        await deleteLernpaket(paketId);
      }

      // Lösche Themenfelder
      for (const themenfeldId of themenfeldIdZumLoeschen) {
        await deleteThemenfeld(themenfeldId);
      }

      // 1. Themenfelder anlegen/updaten
      const spaltenMitId = [];
      for (let i = 0; i < spalten.length; i++) {
        const spalte = spalten[i];
        let themenfeldId = spalte.themenfeldId;
        if (!themenfeldId) {
          const neu = await createThemenfeld({ einheitId, titel: spalte.titel, reihenfolge: i + 1 });
          themenfeldId = neu.id;
        } else {
          await updateThemenfeld(themenfeldId, { titel: spalte.titel, reihenfolge: i + 1 });
        }
        spaltenMitId.push({ ...spalte, themenfeldId });
      }

      // 2. Lernpakete: NUR themenfeld_id + reihenfolge_nummer aktualisieren
      for (const [spalteId, pakete] of Object.entries(paketeMap)) {
        const spalte = spaltenMitId.find(s => s.id === spalteId);
        const themenfeldId = spalte?.themenfeldId || null;

        for (let i = 0; i < pakete.length; i++) {
          const paket = pakete[i];
          const update = { themenfeld_id: themenfeldId, reihenfolge_nummer: i + 1 };

          if (paket.isNew) {
            const neuesPaket = await createLernpaket({
              einheit_id: einheitId,
              titel_des_pakets: paket.titel_des_pakets,
              geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
              phasen_konfiguration: paket.phasen_konfiguration || DEFAULT_PHASEN,
              ...update,
            });
            if (paket.lernziele && paket.lernziele.length > 0) {
              for (const lz of paket.lernziele) {
                if (lz.formulierung_fachsprache?.trim()) {
                  await createLernziel({
                    lernpaket_id: neuesPaket.id,
                    formulierung_fachsprache: lz.formulierung_fachsprache.trim(),
                    kategorie: lz.kategorie || 'Fachwissen',
                  });
                }
              }
            }
          } else {
            // Nur Struktur-Felder – phasen_konfiguration, locked_by etc. bleiben unangetastet
            await updateLernpaket(paket.id, update);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['themenfelder', einheitId] });
      setSaving(false);
      setIsDirty(false);
      onSaved?.();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setSaving(false);
    }
  };

  const gesamtPakete = Object.values(paketeMap).flat().length;
  const zugeordnet   = spalten.reduce((n, s) => n + (paketeMap[s.id]?.length || 0), 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Read-Only Banner */}
      {readOnly && (
        <div className="shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Save className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>
            <strong>Lesemodus</strong> – Starten Sie den Bearbeitungsmodus über den Button oben, um Änderungen vorzunehmen.
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

      {/* Aktions-Leiste */}
      {!readOnly && (
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

      {/* Tipp */}
      {!readOnly && (
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

      {/* Board */}
      <div className={cn('flex-1 overflow-x-auto overflow-y-hidden min-h-0', readOnly && 'opacity-60')}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={cn('flex gap-4 h-full p-4 min-w-max items-start', readOnly && 'pointer-events-none select-none')}>
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
              />
            ))}

            {/* Neue-Spalte CTA – nur im Edit-Modus */}
            {!readOnly && <button
              onClick={handleNeuesThemenfeld}
              className="shrink-0 w-64 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors self-stretch"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">Neues Themenfeld</span>
            </button>}
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