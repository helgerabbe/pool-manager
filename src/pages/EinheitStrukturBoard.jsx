import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, GripVertical, Clock, Trash2, ArrowRight, Layers,
  FolderOpen, X, Check, Lock, AlertTriangle, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStructuralLock } from '@/hooks/useStructuralLock';
import { useRBAC } from '@/hooks/useRBAC';
import { useStructuralUnsavedChanges } from '@/hooks/useStructuralUnsavedChanges';
import EinheitSettingsModal from '@/components/einheiten/EinheitSettingsModal';
import UnsavedChangesModal from '@/components/workspace/UnsavedChangesModal';
import LoadingOverlay from '@/components/workspace/LoadingOverlay';
import { toast } from 'sonner';

// ── Mini-Dialog: Neues Lernpaket ──────────────────────────────────────────────

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

// ── Lernpaket-Karte ───────────────────────────────────────────────────────────

function PaketKarte({ paket, index, onDelete, hasContentLock }) {
  return (
    <Draggable draggableId={paket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'group flex items-start gap-2 p-3 rounded-lg border-2 bg-white text-sm transition-all',
            snapshot.isDragging
              ? 'shadow-xl border-primary/60 rotate-1 scale-105 z-50'
              : 'shadow-sm hover:shadow-lg border-border hover:border-primary/40'
          )}
        >
          <div {...provided.dragHandleProps} className="mt-0.5 text-slate-400 hover:text-foreground cursor-grab transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold leading-snug truncate text-foreground">{paket.titel_des_pakets}</p>
              {hasContentLock && (
                <span title={`Wird bearbeitet von: ${paket.locked_by}`}
                  className="shrink-0 flex items-center gap-0.5 text-[10px] text-white bg-orange-600 px-2 py-0.5 rounded-full font-bold">
                  <Lock className="w-3 h-3" />
                  {paket.locked_by?.split('@')[0]}
                </span>
              )}
            </div>
            {paket.geschaetzte_dauer_minuten && (
              <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" />{paket.geschaetzte_dauer_minuten} Min.
              </p>
            )}
          </div>
          <button
            onClick={() => onDelete(paket.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-all shrink-0 hover:scale-110"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </Draggable>
  );
}

// ── Spalte ─────────────────────────────────────────────────────────────────────

function Spalte({ id, titel, pakete, lockedPaketIds, onAddPaket, onDeletePaket, onDeleteSpalte, onTitelChange, isSammelbecken = false, kannBearbeiten = true }) {
  const [addingPaket, setAddingPaket] = useState(false);
  const [editingTitel, setEditingTitel] = useState(false);
  const [titelDraft, setTitelDraft] = useState(titel);

  useEffect(() => { setTitelDraft(titel); }, [titel]);

  const handleTitelSave = () => {
    if (titelDraft.trim()) onTitelChange?.(titelDraft.trim());
    setEditingTitel(false);
  };

  const hasActiveLocks = pakete.some(p => lockedPaketIds.has(p.id));

  return (
    <div className={cn(
      'flex flex-col rounded-lg border-2 shrink-0 w-72 shadow-sm',
      isSammelbecken ? 'bg-slate-50 border-slate-300' : 'bg-card border-primary/20'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-2 font-semibold',
        isSammelbecken ? 'border-slate-300 bg-slate-200 text-slate-900' : 'border-primary/20 bg-primary/10 text-foreground'
      )}>
        {isSammelbecken
          ? <Layers className="w-5 h-5 text-slate-700 shrink-0" />
          : <FolderOpen className="w-5 h-5 text-amber-600 shrink-0" />}

        {editingTitel && !isSammelbecken ? (
          <Input
            autoFocus value={titelDraft}
            onChange={e => setTitelDraft(e.target.value)}
            onBlur={handleTitelSave}
            onKeyDown={e => { if (e.key === 'Enter') handleTitelSave(); if (e.key === 'Escape') setEditingTitel(false); }}
            className="h-8 text-sm font-semibold flex-1"
          />
        ) : (
          <button
            className={cn('flex-1 text-sm font-semibold text-left truncate', !isSammelbecken && 'hover:text-primary cursor-pointer')}
            onClick={() => !isSammelbecken && setEditingTitel(true)}
            title={!isSammelbecken ? 'Klicken zum Bearbeiten' : undefined}
          >
            {titel}
          </button>
        )}

        <span className="text-xs font-bold text-white bg-primary/80 px-2 py-1 rounded-full shrink-0 w-6 h-6 flex items-center justify-center">{pakete.length}</span>

        {!isSammelbecken && kannBearbeiten && (
          <button
            onClick={onDeleteSpalte}
            title={hasActiveLocks ? 'Enthält aktiv bearbeitete Pakete' : 'Themenfeld löschen'}
            className={cn(
              'p-1 rounded transition-colors',
              hasActiveLocks
                ? 'text-amber-500 hover:bg-amber-50 cursor-pointer'
                : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            )}
          >
            {hasActiveLocks ? <AlertTriangle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Drop-Zone */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 p-3 space-y-2 min-h-[120px] rounded-b-lg transition-colors',
              snapshot.isDraggingOver ? 'bg-primary/15 border-b-2 border-primary/40' : 'bg-white/50'
            )}
          >
            {pakete.map((paket, index) => (
              <PaketKarte
                key={paket.id}
                paket={paket}
                index={index}
                onDelete={onDeletePaket}
                hasContentLock={lockedPaketIds.has(paket.id)}
              />
            ))}
            {provided.placeholder}
            {pakete.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-xs font-semibold text-slate-500 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                📦 Hierher ziehen
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Paket hinzufügen */}
      <div className="px-3 pb-3">
        {addingPaket ? (
          <NeuesPaketInline
            onAdd={(t, d) => { onAddPaket(id, t, d); setAddingPaket(false); }}
            onCancel={() => setAddingPaket(false)}
          />
        ) : (
          <button
            onClick={() => setAddingPaket(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary transition-all border border-primary/30"
          >
            <Plus className="w-4 h-4" /> Lernpaket hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

const SAMMELBECKEN_ID = '__sammelbecken__';

export default function EinheitStrukturBoard({ onSaveStart = null, onSaveEnd = null } = {}) {
  const { id: einheitId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // RBAC: Struktur-Bearbeitung nur für ADMIN + FACHSCHAFTSLEITUNG
  const { permissions, authUser } = useRBAC();

  // Structural Lock sofort beim Betreten setzen (nur wenn berechtigt)
  useStructuralLock(einheitId);

  // ── Daten laden ──────────────────────────────────────────────────────────────
  const { data: einheit, isLoading: einheitLoading } = useQuery({
    queryKey: ['einheiten', einheitId],
    queryFn: () => base44.entities.Einheiten.filter({ id: einheitId }).then(r => r[0]),
    enabled: !!einheitId,
  });

  const { data: remotePakete = [], isLoading: paketeLoading } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: remoteThemenfelder = [], isLoading: tfLoading } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  // ── Lokaler Board-State ───────────────────────────────────────────────────────
  const [spalten, setSpalten]             = useState([]);
  const [paketeMap, setPaketeMap]         = useState({});
  const [saving, setSaving]               = useState(false);
  const [initialized, setInitialized]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastError, setLastError]         = useState(null);
  
  // ── Dirty-State & Navigation Guard ────────────────────────────────────────
  const { isDirty, setIsDirty, shouldBlock, setShouldBlock } = useStructuralUnsavedChanges();
  const [discardOnNavigate, setDiscardOnNavigate] = useState(false);

  // Berechtigungen: Struktur-Board nur für ADMIN + FACHSCHAFTSLEITUNG editierbar
  const kannStrukturBearbeiten = einheit
    ? permissions.kannStrukturBearbeiten(einheit.fach)
    : false;

  // Welche Pakete haben einen aktiven Content-Lock?
  const lockedPaketIds = new Set(
    remotePakete
      .filter(p => {
        if (!p.locked_by) return false;
        const lockedAt = p.locked_at ? new Date(p.locked_at).getTime() : 0;
        return Date.now() - lockedAt < 30 * 60 * 1000;
      })
      .map(p => p.id)
  );

  // ── Initialisierung ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized || paketeLoading || tfLoading) return;

    const tfSpalten = remoteThemenfelder
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(tf => ({ id: `tf-${tf.id}`, titel: tf.titel, themenfeldId: tf.id }));

    const newPaketeMap = { [SAMMELBECKEN_ID]: [] };
    tfSpalten.forEach(s => { newPaketeMap[s.id] = []; });

    remotePakete.forEach(p => {
      const spalteId = p.themenfeld_id ? `tf-${p.themenfeld_id}` : SAMMELBECKEN_ID;
      if (!newPaketeMap[spalteId]) newPaketeMap[spalteId] = [];
      newPaketeMap[spalteId].push(p);
    });

    Object.keys(newPaketeMap).forEach(k => {
      newPaketeMap[k].sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    });

    setSpalten(tfSpalten);
    setPaketeMap(newPaketeMap);
    setInitialized(true);
  }, [remotePakete, remoteThemenfelder, paketeLoading, tfLoading, initialized]);

  // ── DnD: Verschieben mit BroadcastChannel-Notification ───────────────────────

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setIsDirty(true);

    // Welches Paket wird verschoben?
    const movedPaket = (paketeMap[source.droppableId] || [])[source.index];
    const targetSpalte = spalten.find(s => s.id === destination.droppableId);

    // BroadcastChannel-Notification an Bearbeiter wenn Content-Lock aktiv
    if (movedPaket && lockedPaketIds.has(movedPaket.id) && targetSpalte) {
      const ch = new BroadcastChannel(`presence_${einheitId}`);
      ch.postMessage({
        type: 'paket_moved',
        paketId: movedPaket.id,
        paketTitel: movedPaket.titel_des_pakets,
        neuesThemenfeld: targetSpalte.titel,
        lockedBy: movedPaket.locked_by,
      });
      ch.close();
    }

    setPaketeMap(prev => {
      const next = { ...prev };
      const srcList = [...(next[source.droppableId] || [])];
      const [moved] = srcList.splice(source.index, 1);

      if (source.droppableId === destination.droppableId) {
        srcList.splice(destination.index, 0, moved);
        next[source.droppableId] = srcList;
      } else {
        next[source.droppableId] = srcList;
        const dstList = [...(next[destination.droppableId] || [])];
        dstList.splice(destination.index, 0, moved);
        next[destination.droppableId] = dstList;
      }
      return next;
    });
  };

  // ── Board-Aktionen ────────────────────────────────────────────────────────────

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

  // Delete-Sperre: Pakete mit aktivem Content-Lock prüfen
  const handleDeleteSpalteRequest = (spalteId) => {
    const spalte = spalten.find(s => s.id === spalteId);
    const paketeInSpalte = paketeMap[spalteId] || [];
    const aktivGesperrte = paketeInSpalte.filter(p => lockedPaketIds.has(p.id));

    if (aktivGesperrte.length > 0) {
      // Löschen gesperrt → Dialog mit Info
      setDeleteConfirm({
        spalteId,
        titel: spalte?.titel || 'Themenfeld',
        lockedPakete: aktivGesperrte,
        isBlocked: true,
      });
    } else {
      // Kein Lock → direkt löschen (nach Bestätigung)
      setDeleteConfirm({
        spalteId,
        titel: spalte?.titel || 'Themenfeld',
        lockedPakete: [],
        isBlocked: false,
      });
    }
  };

  const handleDeleteSpalteConfirmed = () => {
    setIsDirty(true);
    const { spalteId } = deleteConfirm;
    setPaketeMap(prev => {
      const paketeAusSpalte = prev[spalteId] || [];
      const next = { ...prev, [SAMMELBECKEN_ID]: [...(prev[SAMMELBECKEN_ID] || []), ...paketeAusSpalte] };
      delete next[spalteId];
      return next;
    });
    setSpalten(prev => prev.filter(s => s.id !== spalteId));
    setDeleteConfirm(null);
  };

  const handleAddPaket = (spalteId, titel, dauer) => {
    setIsDirty(true);
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
    setIsDirty(true);
    setPaketeMap(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => { next[k] = v.filter(p => p.id !== paketId); });
      return next;
    });
  };

  // ── Speichern ─────────────────────────────────────────────────────────────────

  const handleSpeichern = async () => {
    setSaving(true);
    setLastError(null);

    try {
      // Backend-Aufruf via Backend-Funktion
      const response = await base44.functions.invoke('saveEinheitStruktur', {
        einheit_id: einheitId,
        spalten,
        paketeMap,
      });

      if (response.data?.success) {
        toast.success('Struktur erfolgreich gespeichert.');
        setIsDirty(false);
        setLastError(null);
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
        queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
        // Nicht automatisch navigieren — Benutzer bleibt auf Board
      } else {
        const errorMsg = response.data?.error || 'Unbekannter Fehler';
        setLastError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
        toast.error('Fehler beim Speichern: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error saving structure:', error);
      setLastError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
      toast.error('Fehler beim Speichern der Struktur.');
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation-Blocker Handler ─────────────────────────────────────────────
  const handleSaveAndNavigate = async () => {
    await handleSpeichern();
  };

  const handleDiscardAndNavigate = () => {
    setIsDirty(false);
    setDiscardOnNavigate(true);
    setShouldBlock(false);
  };

  const handleCancelNavigation = () => {
    setShouldBlock(false);
  };

  // ── Blocker-Effekt: Automatisch navigieren, wenn discard gesetzt ──────────────
  useEffect(() => {
    if (discardOnNavigate) {
      setDiscardOnNavigate(false);
    }
  }, [discardOnNavigate]);

  // ── Rendering ─────────────────────────────────────────────────────────────────

  if (einheitLoading || paketeLoading || tfLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const gesamtPakete = Object.values(paketeMap).flat().length;
  const zugeordnet   = spalten.reduce((n, s) => n + (paketeMap[s.id]?.length || 0), 0);

  return (
    <div className="flex flex-col h-full w-full relative">

      {/* ── Loading Overlay während Speichern ── */}
      <LoadingOverlay isVisible={saving} />

      {/* ── Structural-Lock-Banner oder Readonly-Banner ── */}
      {kannStrukturBearbeiten ? (
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 bg-blue-100 border-b-2 border-blue-300 text-sm text-blue-900 flex items-center gap-3 font-medium">
          <Lock className="w-4 h-4 shrink-0 text-blue-700" />
          <span>
            <strong>✓ Struktur-Editiermodus aktiv</strong> — Andere Nutzer können bestehende Inhalte weiter speichern, aber keine neuen Bearbeitungssitzungen starten.
          </span>
        </div>
      ) : (
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 bg-slate-100 border-b-2 border-slate-300 text-sm text-slate-900 flex items-center gap-3 font-medium">
          <Lock className="w-4 h-4 shrink-0 text-slate-700" />
          <span><strong>🔒 Nur-Lese-Ansicht</strong> — Struktur-Änderungen erfordern die Rolle Fachschaftsleitung oder Administrator.</span>
        </div>
      )}

      {/* ── Hinweis-Banner ── */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 bg-amber-100 border-b-2 border-amber-300 text-sm text-amber-900 flex items-center gap-3 font-medium">
        <FolderOpen className="w-4 h-4 shrink-0 text-amber-700" />
        <span>
          <strong>💡 Tipp:</strong> Ziehen Sie Lernpakete in die passenden Themenfelder. Pakete mit <Lock className="w-4 h-4 inline text-amber-700 mx-1" /> werden gerade bearbeitet.
        </span>
      </div>

      {/* ── Board ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full p-4 min-w-max">

            <Spalte
              id={SAMMELBECKEN_ID}
              titel="Nicht zugeordnet"
              pakete={paketeMap[SAMMELBECKEN_ID] || []}
              lockedPaketIds={lockedPaketIds}
              onAddPaket={handleAddPaket}
              onDeletePaket={handleDeletePaket}
              isSammelbecken
            />

            <div className="w-px bg-border shrink-0 self-stretch" />

            {spalten.map(spalte => (
              <Spalte
                key={spalte.id}
                id={spalte.id}
                titel={spalte.titel}
                pakete={paketeMap[spalte.id] || []}
                lockedPaketIds={lockedPaketIds}
                onAddPaket={handleAddPaket}
                onDeletePaket={handleDeletePaket}
                onDeleteSpalte={() => handleDeleteSpalteRequest(spalte.id)}
                onTitelChange={neuerTitel => handleTitelChange(spalte.id, neuerTitel)}
                kannBearbeiten={kannStrukturBearbeiten}
              />
            ))}

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

      {/* ── Settings-Modal ── */}
      {einheit && (
        <EinheitSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          einheit={einheit}
          currentUserEmail={authUser?.email}
        />
      )}

      {/* ── Unsaved Changes Modal ── */}
      <UnsavedChangesModal
        open={shouldBlock}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={saving}
      />

      {/* ── Delete-Confirm-Dialog ── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteConfirm?.isBlocked
                ? <><AlertTriangle className="w-5 h-5 text-amber-500" /> Löschen gesperrt</>
                : <>Themenfeld „{deleteConfirm?.titel}" löschen?</>}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.isBlocked ? (
                <div className="space-y-2">
                  <p>
                    Das Themenfeld enthält <strong>{deleteConfirm.lockedPakete.length} Lernpaket{deleteConfirm.lockedPakete.length !== 1 ? 'e' : ''}</strong>, die gerade aktiv bearbeitet werden:
                  </p>
                  <ul className="space-y-1 mt-2">
                    {deleteConfirm.lockedPakete.map(p => (
                      <li key={p.id} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span className="font-medium">{p.titel_des_pakets}</span>
                        <span className="text-xs opacity-70">({p.locked_by})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">
                    Warten Sie, bis die Bearbeitungssitzungen abgeschlossen sind, bevor Sie das Themenfeld löschen.
                  </p>
                </div>
              ) : (
                <>
                  Alle Lernpakete werden ins <strong>Sammelbecken</strong> verschoben und bleiben erhalten.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {deleteConfirm?.isBlocked ? 'Verstanden' : 'Abbrechen'}
            </AlertDialogCancel>
            {!deleteConfirm?.isBlocked && (
              <AlertDialogAction
                onClick={handleDeleteSpalteConfirmed}
                className="bg-destructive hover:bg-destructive/90"
              >
                Löschen & ins Sammelbecken
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}