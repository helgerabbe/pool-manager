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
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, GripVertical, Clock, Trash2, FolderOpen, Layers, X, Check, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const SAMMELBECKEN_ID = '__sammelbecken__';

// ── Inline-Paket-Erstellen ────────────────────────────────────────────────────

function NeuesPaketInline({ onAdd, onCancel }) {
  const [titel, setTitel] = useState('');
  const [dauer, setDauer] = useState(45);
  return (
    <div className="p-2 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
      <Input
        autoFocus
        placeholder="Titel des Lernpakets…"
        value={titel}
        onChange={e => setTitel(e.target.value)}
        className="h-8 text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter' && titel.trim()) onAdd(titel.trim(), dauer);
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          type="number" min={5}
          value={dauer}
          onChange={e => setDauer(parseInt(e.target.value) || 45)}
          className="h-7 text-xs w-20"
        />
        <span className="text-xs text-muted-foreground">Min.</span>
        <div className="flex gap-1 ml-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" className="h-7 w-7" disabled={!titel.trim()} onClick={() => onAdd(titel.trim(), dauer)}>
            <Check className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Paket-Karte ───────────────────────────────────────────────────────────────

function PaketKarte({ paket, index, onDelete }) {
  return (
    <Draggable draggableId={paket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'group flex items-start gap-2 p-3 rounded-lg border bg-card text-sm transition-shadow',
            snapshot.isDragging
              ? 'shadow-xl border-primary/40 rotate-1 scale-105'
              : 'shadow-sm hover:shadow-md border-border'
          )}
        >
          <div {...provided.dragHandleProps} className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-snug">{paket.titel_des_pakets}</p>
            {paket.geschaetzte_dauer_minuten && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />{paket.geschaetzte_dauer_minuten} Min.
              </p>
            )}
          </div>
          <button
            onClick={() => onDelete(paket.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </Draggable>
  );
}

// ── Spalte ────────────────────────────────────────────────────────────────────

function Spalte({ id, titel, pakete, onAddPaket, onDeletePaket, onDeleteSpalte, onTitelChange, isSammelbecken = false }) {
  const [addingPaket, setAddingPaket]     = useState(false);
  const [editingTitel, setEditingTitel]   = useState(false);
  const [titelDraft, setTitelDraft]       = useState(titel);

  // sync when parent renames
  useEffect(() => { setTitelDraft(titel); }, [titel]);

  const saveTitel = () => { if (titelDraft.trim()) onTitelChange(titelDraft.trim()); setEditingTitel(false); };

  return (
    <div className={cn('flex flex-col rounded-xl border shrink-0 w-72', isSammelbecken ? 'bg-slate-50 border-slate-200' : 'bg-card border-border')}>
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-3 rounded-t-xl border-b', isSammelbecken ? 'border-slate-200 bg-slate-100/80' : 'border-border bg-muted/40')}>
        {isSammelbecken
          ? <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          : <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />}

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
            title={!isSammelbecken ? 'Klicken zum Bearbeiten' : undefined}
          >
            {titel}
          </button>
        )}

        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{pakete.length}</span>

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
            className={cn('flex-1 p-2 space-y-2 min-h-[120px] rounded-b-xl transition-colors', snapshot.isDraggingOver && 'bg-primary/5')}
          >
            {pakete.map((paket, index) => (
              <PaketKarte key={paket.id} paket={paket} index={index} onDelete={onDeletePaket} />
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

      {/* Paket hinzufügen */}
      <div className="px-2 pb-2">
        {addingPaket ? (
          <NeuesPaketInline
            onAdd={(t, d) => { onAddPaket(id, t, d); setAddingPaket(false); }}
            onCancel={() => setAddingPaket(false)}
          />
        ) : (
          <button
            onClick={() => setAddingPaket(true)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Lernpaket hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}

// ── Haupt-Komponente (eingebettet) ────────────────────────────────────────────

export default function StrukturBoardEmbedded({
  einheitId,
  lernpakete: remotePakete,
  themenfelder: remoteThemenfelder,
  queryClient,
  onSaved,   // callback nach erfolgreichem Speichern
}) {
  const [spalten, setSpalten]         = useState([]);
  const [paketeMap, setPaketeMap]     = useState({});
  const [saving, setSaving]           = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { spalteId, titel, paketCount }

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
    setInitialized(true);
  }, [remotePakete, remoteThemenfelder, initialized]);

  // Re-init wenn einheit sich ändert
  useEffect(() => { setInitialized(false); }, [einheitId]);

  // ── DnD ───────────────────────────────────────────────────────────────────

  const handleDragEnd = ({ source, destination }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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

  const handleNeuesThemenfeld = () => {
    const newId = `tf-new-${Date.now()}`;
    setSpalten(prev => [...prev, { id: newId, titel: `Themenfeld ${prev.length + 1}`, themenfeldId: null }]);
    setPaketeMap(prev => ({ ...prev, [newId]: [] }));
  };

  const handleTitelChange = (spalteId, neuerTitel) =>
    setSpalten(prev => prev.map(s => s.id === spalteId ? { ...s, titel: neuerTitel } : s));

  const handleDeleteSpalteRequest = (spalteId) => {
    const spalte = spalten.find(s => s.id === spalteId);
    const paketCount = (paketeMap[spalteId] || []).length;
    setDeleteConfirm({ spalteId, titel: spalte?.titel || 'Themenfeld', paketCount });
  };

  const handleDeleteSpalteConfirmed = () => {
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

  const handleAddPaket = (spalteId, titel, dauer) => {
    const tempId = `new-${Date.now()}`;
    setPaketeMap(prev => ({
      ...prev,
      [spalteId]: [...(prev[spalteId] || []), {
        id: tempId,
        titel_des_pakets: titel,
        geschaetzte_dauer_minuten: dauer,
        reihenfolge_nummer: (prev[spalteId] || []).length + 1,
        einheit_id: einheitId,
        isNew: true,
      }],
    }));
  };

  const handleDeletePaket = (paketId) => {
    setPaketeMap(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => { next[k] = v.filter(p => p.id !== paketId); });
      return next;
    });
  };

  // ── Speichern (nur themenfeld_id + reihenfolge_nummer ändern) ─────────────

  const handleSpeichern = async () => {
    setSaving(true);

    // 1. Themenfelder anlegen/updaten
    const spaltenMitId = [];
    for (let i = 0; i < spalten.length; i++) {
      const spalte = spalten[i];
      let themenfeldId = spalte.themenfeldId;
      if (!themenfeldId) {
        const neu = await base44.entities.Themenfeld.create({ einheit_id: einheitId, titel: spalte.titel, reihenfolge: i + 1 });
        themenfeldId = neu.id;
      } else {
        await base44.entities.Themenfeld.update(themenfeldId, { titel: spalte.titel, reihenfolge: i + 1 });
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
          await base44.entities.Lernpakete.create({
            einheit_id: einheitId,
            titel_des_pakets: paket.titel_des_pakets,
            geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
            ...update,
          });
        } else {
          // Nur Struktur-Felder – phasen_konfiguration, locked_by etc. bleiben unangetastet
          await base44.entities.Lernpakete.update(paket.id, update);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['themenfelder', einheitId] });
    setSaving(false);
    onSaved?.();
  };

  const gesamtPakete = Object.values(paketeMap).flat().length;
  const zugeordnet   = spalten.reduce((n, s) => n + (paketeMap[s.id]?.length || 0), 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Aktions-Leiste */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-card/50 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          <span className={cn('font-medium', zugeordnet === gesamtPakete && gesamtPakete > 0 ? 'text-green-600' : 'text-amber-600')}>
            {zugeordnet}/{gesamtPakete}
          </span>{' '}
          Pakete Themenfeldern zugeordnet
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNeuesThemenfeld} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Neues Themenfeld
          </Button>
          <Button size="sm" onClick={handleSpeichern} disabled={saving} className="gap-1.5">
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            Struktur speichern
          </Button>
        </div>
      </div>

      {/* Tipp */}
      <div className="shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        Lernpakete per Drag & Drop in Themenfelder ziehen · Themenfeld-Titel anklicken zum Umbenennen
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full p-4 min-w-max">
            {/* Sammelbecken */}
            <Spalte
              id={SAMMELBECKEN_ID}
              titel="Nicht zugeordnet"
              pakete={paketeMap[SAMMELBECKEN_ID] || []}
              onAddPaket={handleAddPaket}
              onDeletePaket={handleDeletePaket}
              isSammelbecken
            />

            <div className="w-px bg-border shrink-0 self-stretch" />

            {/* Themenfeld-Spalten */}
            {spalten.map(spalte => (
              <Spalte
                key={spalte.id}
                id={spalte.id}
                titel={spalte.titel}
                pakete={paketeMap[spalte.id] || []}
                onAddPaket={handleAddPaket}
                onDeletePaket={handleDeletePaket}
                onDeleteSpalte={() => handleDeleteSpalteRequest(spalte.id)}
                onTitelChange={neuerTitel => handleTitelChange(spalte.id, neuerTitel)}
              />
            ))}

            {/* Neue-Spalte CTA */}
            <button
              onClick={handleNeuesThemenfeld}
              className="shrink-0 w-64 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors self-stretch"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">Neues Themenfeld</span>
            </button>
          </div>
        </DragDropContext>
      </div>

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