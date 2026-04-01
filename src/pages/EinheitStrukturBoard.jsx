import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, GripVertical, Clock, Trash2, ArrowRight, Layers, FolderOpen, X, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
          type="number"
          min={5}
          value={dauer}
          onChange={e => setDauer(parseInt(e.target.value) || 45)}
          className="h-7 text-xs w-20"
        />
        <span className="text-xs text-muted-foreground">Min.</span>
        <div className="flex gap-1 ml-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            className="h-7 w-7"
            disabled={!titel.trim()}
            onClick={() => onAdd(titel.trim(), dauer)}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Lernpaket-Karte ───────────────────────────────────────────────────────────

function PaketKarte({ paket, index, onDelete }) {
  return (
    <Draggable draggableId={paket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'group flex items-start gap-2 p-3 rounded-lg border bg-card text-sm transition-shadow',
            snapshot.isDragging ? 'shadow-xl border-primary/40 rotate-1 scale-105' : 'shadow-sm hover:shadow-md border-border'
          )}
        >
          <div {...provided.dragHandleProps} className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-snug">{paket.titel_des_pakets}</p>
            {paket.geschaetzte_dauer_minuten && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {paket.geschaetzte_dauer_minuten} Min.
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

// ── Spalte (Sammelbecken oder Themenfeld) ─────────────────────────────────────

function Spalte({ id, titel, pakete, onAddPaket, onDeletePaket, onDeleteSpalte, onTitelChange, isSammelbecken = false }) {
  const [addingPaket, setAddingPaket] = useState(false);
  const [editingTitel, setEditingTitel] = useState(false);
  const [titelDraft, setTitelDraft] = useState(titel);

  const handleTitelSave = () => {
    if (titelDraft.trim()) onTitelChange(titelDraft.trim());
    setEditingTitel(false);
  };

  return (
    <div className={cn(
      'flex flex-col rounded-xl border shrink-0 w-72',
      isSammelbecken
        ? 'bg-slate-50 border-slate-200'
        : 'bg-card border-border'
    )}>
      {/* Spalten-Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-3 rounded-t-xl border-b',
        isSammelbecken ? 'border-slate-200 bg-slate-100/80' : 'border-border bg-muted/40'
      )}>
        {isSammelbecken
          ? <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          : <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />}

        {editingTitel && !isSammelbecken ? (
          <Input
            autoFocus
            value={titelDraft}
            onChange={e => setTitelDraft(e.target.value)}
            onBlur={handleTitelSave}
            onKeyDown={e => { if (e.key === 'Enter') handleTitelSave(); if (e.key === 'Escape') setEditingTitel(false); }}
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

        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {pakete.length}
        </span>

        {!isSammelbecken && onDeleteSpalte && (
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
            className={cn(
              'flex-1 p-2 space-y-2 min-h-[120px] rounded-b-xl transition-colors',
              snapshot.isDraggingOver ? 'bg-primary/5' : ''
            )}
          >
            {pakete.map((paket, index) => (
              <PaketKarte
                key={paket.id}
                paket={paket}
                index={index}
                onDelete={onDeletePaket}
              />
            ))}
            {provided.placeholder}

            {pakete.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-20 text-center text-xs text-muted-foreground/50 border-2 border-dashed border-muted rounded-lg">
                <p>Hierher ziehen</p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Paket hinzufügen */}
      <div className="px-2 pb-2">
        {addingPaket ? (
          <NeuesPaketInline
            onAdd={(titel, dauer) => { onAddPaket(id, titel, dauer); setAddingPaket(false); }}
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

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function EinheitStrukturBoard() {
  const { id: einheitId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  // Spalten: { id, titel, themenfeldId|null }
  // Pakete:  { id, titel_des_pakets, geschaetzte_dauer_minuten, spalteId, reihenfolge_nummer, isNew? }

  const SAMMELBECKEN_ID = '__sammelbecken__';

  const [spalten, setSpalten] = useState([]); // Themenfeld-Spalten
  const [paketeMap, setPaketeMap] = useState({}); // spalteId → paket[]
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialisierung sobald Daten geladen
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

    // Reihenfolge innerhalb jeder Spalte
    Object.keys(newPaketeMap).forEach(k => {
      newPaketeMap[k].sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    });

    setSpalten(tfSpalten);
    setPaketeMap(newPaketeMap);
    setInitialized(true);
  }, [remotePakete, remoteThemenfelder, paketeLoading, tfLoading, initialized]);

  // ── DnD Handler ──────────────────────────────────────────────────────────────

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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
    const newId = `tf-new-${Date.now()}`;
    const anzahl = spalten.length + 1;
    setSpalten(prev => [...prev, { id: newId, titel: `Themenfeld ${anzahl}`, themenfeldId: null }]);
    setPaketeMap(prev => ({ ...prev, [newId]: [] }));
  };

  const handleTitelChange = (spalteId, neuerTitel) => {
    setSpalten(prev => prev.map(s => s.id === spalteId ? { ...s, titel: neuerTitel } : s));
  };

  const handleDeleteSpalte = (spalteId) => {
    // Pakete zurück ins Sammelbecken
    setPaketeMap(prev => {
      const paketeAusSpalte = prev[spalteId] || [];
      const next = { ...prev, [SAMMELBECKEN_ID]: [...(prev[SAMMELBECKEN_ID] || []), ...paketeAusSpalte] };
      delete next[spalteId];
      return next;
    });
    setSpalten(prev => prev.filter(s => s.id !== spalteId));
  };

  const handleAddPaket = (spalteId, titel, dauer) => {
    const tempId = `new-${Date.now()}`;
    const neuesPaket = {
      id: tempId,
      titel_des_pakets: titel,
      geschaetzte_dauer_minuten: dauer,
      reihenfolge_nummer: (paketeMap[spalteId] || []).length + 1,
      einheit_id: einheitId,
      isNew: true,
    };
    setPaketeMap(prev => ({
      ...prev,
      [spalteId]: [...(prev[spalteId] || []), neuesPaket],
    }));
  };

  const handleDeletePaket = (paketId) => {
    setPaketeMap(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        next[k] = v.filter(p => p.id !== paketId);
      });
      return next;
    });
  };

  // ── Speichern ─────────────────────────────────────────────────────────────────

  const handleSpeichern = async () => {
    setSaving(true);

    // 1. Themenfelder anlegen/updaten
    const spaltenMitId = [];
    for (let i = 0; i < spalten.length; i++) {
      const spalte = spalten[i];
      let themenfeldId = spalte.themenfeldId;

      if (!themenfeldId) {
        // Neues Themenfeld anlegen
        const neu = await base44.entities.Themenfeld.create({
          einheit_id: einheitId,
          titel: spalte.titel,
          reihenfolge: i + 1,
        });
        themenfeldId = neu.id;
      } else {
        // Bestehendes Themenfeld updaten (Titel/Reihenfolge)
        await base44.entities.Themenfeld.update(themenfeldId, {
          titel: spalte.titel,
          reihenfolge: i + 1,
        });
      }
      spaltenMitId.push({ ...spalte, themenfeldId });
    }

    // 2. Lernpakete anlegen / themenfeld_id + reihenfolge setzen
    for (const [spalteId, pakete] of Object.entries(paketeMap)) {
      const spalte = spaltenMitId.find(s => s.id === spalteId);
      const themenfeldId = spalte?.themenfeldId || null;

      for (let i = 0; i < pakete.length; i++) {
        const paket = pakete[i];
        const updateData = {
          themenfeld_id: themenfeldId,
          reihenfolge_nummer: i + 1,
        };

        if (paket.isNew) {
          await base44.entities.Lernpakete.create({
            einheit_id: einheitId,
            titel_des_pakets: paket.titel_des_pakets,
            geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
            ...updateData,
          });
        } else {
          await base44.entities.Lernpakete.update(paket.id, updateData);
        }
      }
    }

    // 3. Cache invalidieren & navigieren
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
    navigate(`/workspace?einheit=${einheitId}`);
  };

  // ── Rendering ──────────────────────────────────────────────────────────────────

  if (einheitLoading || paketeLoading || tfLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const alleSpaltenIds = [SAMMELBECKEN_ID, ...spalten.map(s => s.id)];
  const gesamtPakete   = Object.values(paketeMap).flat().length;
  const zugeordnet     = spalten.reduce((n, s) => n + (paketeMap[s.id]?.length || 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-8">

      {/* ── Top-Bar ── */}
      <div className="shrink-0 px-6 py-3 border-b border-border bg-card flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold leading-tight">{einheit?.titel_der_einheit}</h1>
          <p className="text-sm text-muted-foreground">
            {einheit?.fach} · Jg. {einheit?.jahrgangsstufe} ·{' '}
            <span className={zugeordnet === gesamtPakete && gesamtPakete > 0 ? 'text-green-600 font-medium' : 'text-amber-600'}>
              {zugeordnet}/{gesamtPakete} Pakete zugeordnet
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleNeuesThemenfeld} className="gap-2">
            <Plus className="w-4 h-4" /> Neues Themenfeld
          </Button>
          <Button onClick={handleSpeichern} disabled={saving} className="gap-2">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Speichern & Zum Workspace
          </Button>
        </div>
      </div>

      {/* ── Hinweis-Banner ── */}
      <div className="shrink-0 px-6 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        <span>
          <strong>Tipp:</strong> Ziehen Sie die Lernpakete aus dem Sammelbecken in die passenden Themenfelder. Klicken Sie auf einen Themenfeld-Titel, um ihn umzubenennen.
        </span>
      </div>

      {/* ── Board ── */}
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

            {/* Trennlinie */}
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
                onDeleteSpalte={() => handleDeleteSpalte(spalte.id)}
                onTitelChange={(neuerTitel) => handleTitelChange(spalte.id, neuerTitel)}
              />
            ))}

            {/* Neues Themenfeld CTA */}
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
    </div>
  );
}