import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Star, GripVertical, Plus, Target, Puzzle, X,
  BookOpen, FileText, Upload, Zap, Save, Info, AlertTriangle
} from 'lucide-react';
import LernzielQuickAddModal from './LernzielQuickAddModal';

// ── Stern-Bewertung ──────────────────────────────────────────────────────────
const SCHWIERIGKEITSGRADE = ['1-Stern', '2-Sterne', '3-Sterne'];

function SternBewertung({ value, onChange }) {
  const count = value === '1-Stern' ? 1 : value === '2-Sterne' ? 2 : value === '3-Sterne' ? 3 : 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === 1 ? '1-Stern' : n === 2 ? '2-Sterne' : '3-Sterne')}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              n <= count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
      {count > 0 && (
        <span className="text-xs text-muted-foreground ml-1">{value}</span>
      )}
    </div>
  );
}

// ── Draggable Lernziel-Chip ───────────────────────────────────────────────────
function LernzielChip({ lernziel, index, inDropzone = false, onRemove }) {
  return (
    <Draggable draggableId={lernziel.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
            snapshot.isDragging
              ? 'shadow-lg bg-primary/10 border-primary rotate-1 scale-105'
              : inDropzone
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-card border-border hover:border-primary/40'
          }`}
        >
          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing shrink-0">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <Target className={`w-3.5 h-3.5 shrink-0 ${inDropzone ? 'text-green-600' : 'text-muted-foreground'}`} />
          <span className="truncate flex-1 text-xs">{lernziel.formulierung_fachsprache}</span>
          {inDropzone && onRemove && (
            <button
              onClick={() => onRemove(lernziel.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Ebene2MappingView({ aufgabe, lernpaketId, einheitId, kannBearbeiten }) {
  const queryClient = useQueryClient();

  // ── lokaler Form-State (Felder der Aufgabe)
  const [formData, setFormData] = useState({
    aufgabentext_inhalt:         aufgabe?.aufgabentext_inhalt || '',
    schwierigkeitsgrad:          aufgabe?.schwierigkeitsgrad  || '',
    material_typ:                aufgabe?.material_typ        || '',
    material_referenz:           aufgabe?.material_referenz   || '',
    erwartungshorizont_ki_prompt: aufgabe?.erwartungshorizont_ki_prompt || '',
  });

  // Re-sync wenn sich aufgabe ändert
  useEffect(() => {
    if (aufgabe) {
      setFormData({
        aufgabentext_inhalt:         aufgabe.aufgabentext_inhalt || '',
        schwierigkeitsgrad:          aufgabe.schwierigkeitsgrad  || '',
        material_typ:                aufgabe.material_typ        || '',
        material_referenz:           aufgabe.material_referenz   || '',
        erwartungshorizont_ki_prompt: aufgabe.erwartungshorizont_ki_prompt || '',
      });
    }
  }, [aufgabe?.id]);

  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // ── Nur Pakete der aktuellen Einheit laden (gefiltert)
  const { data: einheitPakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const einheitPaketIds = einheitPakete.map(p => p.id);

  // ── Alle Lernziele dieser Einheit laden (alle sind Basis-Atome)
  const { data: ebene1Ziele = [] } = useQuery({
    queryKey: ['lernziele-einheit', einheitPaketIds.join(',')],
    queryFn: async () => {
      const alle = await base44.entities.Lernziele.list();
      return alle.filter(lz => einheitPaketIds.includes(lz.lernpaket_id));
    },
    enabled: einheitPaketIds.length > 0,
  });

  // ── Bestehendes Mapping laden
  const { data: mappings = [] } = useQuery({
    queryKey: ['mappingBasisziele', aufgabe?.id],
    queryFn: () => base44.entities.MappingAufgabeBasisziel.filter({ aufgabe_id: aufgabe?.id }),
    enabled: !!aufgabe?.id,
  });

  // IDs der bereits zugeordneten Ziele
  const zugeordneteIds = new Set(mappings.map(m => m.basisziel_id));
  const zugeordneteZiele = ebene1Ziele.filter(lz => zugeordneteIds.has(lz.id));
  const verfuegbareZiele = ebene1Ziele.filter(lz => !zugeordneteIds.has(lz.id));

  // ── Mutations
  const updateAufgabe = useMutation({
    mutationFn: (data) => base44.entities.Aufgabenbausteine.update(aufgabe.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
  });

  const addMapping = useMutation({
    mutationFn: ({ basisziel_id, reihenfolge }) =>
      base44.entities.MappingAufgabeBasisziel.create({
        aufgabe_id: aufgabe.id,
        basisziel_id,
        reihenfolge,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mappingBasisziele', aufgabe?.id] }),
  });

  const removeMapping = useMutation({
    mutationFn: (basisziel_id) => {
      const m = mappings.find(x => x.basisziel_id === basisziel_id);
      if (m) return base44.entities.MappingAufgabeBasisziel.delete(m.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mappingBasisziele', aufgabe?.id] }),
  });

  // Ziel-Paket für neue Basiskompetenzen: erstes Paket der Einheit (nicht das Transferaufgaben-Paket)
  const zielPaketFuerBasis = einheitPakete.find(p => p.id !== lernpaketId)?.id || lernpaketId;

  const createLernziel = useMutation({
    mutationFn: (data) => base44.entities.Lernziele.create({ ...data, lernpaket_id: zielPaketFuerBasis }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernziele-ebene1', einheitId] });
    },
  });

  // ── Drag & Drop Handler
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const fromDropzone = source.droppableId === 'dropzone';
    const toDropzone   = destination.droppableId === 'dropzone';

    if (!fromDropzone && toDropzone) {
      // Verfügbar → Dropzone: Mapping anlegen
      addMapping.mutate({ basisziel_id: draggableId, reihenfolge: destination.index });
    } else if (fromDropzone && !toDropzone) {
      // Dropzone → Verfügbar: Mapping entfernen
      removeMapping.mutate(draggableId);
    }
    // Reihenfolge innerhalb der Dropzone: nur lokal (kein DB-Aufruf nötig)
  };

  const handleSave = () => {
    updateAufgabe.mutate(formData);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(f => ({ ...f, material_referenz: file_url }));
  };

  if (!aufgabe) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-cyan-100 text-cyan-800">Ebene-2-Aufgabe</Badge>
          <h2 className="text-lg font-bold flex-1">Transfer-Aufgabe bearbeiten</h2>
          {kannBearbeiten && (
            <Button onClick={handleSave} size="sm" className="gap-2" disabled={updateAufgabe.isPending}>
              {updateAufgabe.isPending
                ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              Speichern
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_260px] gap-5">

          {/* ══ BEREICH A: Task Details ══════════════════════════════════════ */}
          <div className="space-y-4 p-4 rounded-xl border bg-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Puzzle className="w-4 h-4 text-cyan-600" />
              A — Aufgaben-Details
            </h3>

            {/* Schwierigkeit */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Schwierigkeitsgrad</Label>
              <SternBewertung
                value={formData.schwierigkeitsgrad}
                onChange={v => setFormData(f => ({ ...f, schwierigkeitsgrad: v }))}
              />
            </div>

            {/* Aufgabentext */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Aufgabentext</Label>
              <Textarea
                value={formData.aufgabentext_inhalt}
                onChange={e => setFormData(f => ({ ...f, aufgabentext_inhalt: e.target.value }))}
                placeholder="Beschreibe die Transfer-Aufgabe..."
                rows={4}
                disabled={!kannBearbeiten}
              />
            </div>

            {/* Material-Typ */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Materialtyp</Label>
              <Select
                value={formData.material_typ}
                onValueChange={v => setFormData(f => ({ ...f, material_typ: v, material_referenz: '' }))}
                disabled={!kannBearbeiten}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Kein Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freitext">
                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" />Freitext</span>
                  </SelectItem>
                  <SelectItem value="Buchverweis">
                    <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" />Buchverweis</span>
                  </SelectItem>
                  <SelectItem value="Datei-Upload">
                    <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5" />Datei-Upload</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bedingtes Material-Feld */}
            {formData.material_typ === 'Buchverweis' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Buchverweis</Label>
                <Input
                  value={formData.material_referenz}
                  onChange={e => setFormData(f => ({ ...f, material_referenz: e.target.value }))}
                  placeholder="z.B. Lambacher Schweizer S. 42, Aufg. 3"
                  disabled={!kannBearbeiten}
                />
              </div>
            )}
            {formData.material_typ === 'Datei-Upload' && kannBearbeiten && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Datei hochladen</Label>
                {formData.material_referenz ? (
                  <div className="flex items-center gap-2">
                    <a href={formData.material_referenz} target="_blank" rel="noreferrer"
                      className="text-xs text-primary underline truncate flex-1">
                      Datei anzeigen
                    </a>
                    <button onClick={() => setFormData(f => ({ ...f, material_referenz: '' }))}
                      className="text-destructive hover:opacity-70">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <input type="file" onChange={handleFileUpload}
                    className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs hover:file:bg-primary/90 cursor-pointer" />
                )}
              </div>
            )}
            {formData.material_typ === 'Freitext' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Material-Text</Label>
                <Textarea
                  value={formData.material_referenz}
                  onChange={e => setFormData(f => ({ ...f, material_referenz: e.target.value }))}
                  placeholder="Beschreibung des Materials..."
                  rows={3}
                  disabled={!kannBearbeiten}
                />
              </div>
            )}

            {/* KI-Prompt */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Erwartungshorizont / KI-Prompt</Label>
              <Textarea
                value={formData.erwartungshorizont_ki_prompt}
                onChange={e => setFormData(f => ({ ...f, erwartungshorizont_ki_prompt: e.target.value }))}
                placeholder="Vorgaben für den KI-Tutor..."
                rows={3}
                disabled={!kannBearbeiten}
              />
            </div>
          </div>

          {/* ══ BEREICH B: Dropzone ══════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Target className="w-4 h-4 text-green-600" />
                B — Zugeordnete Basiskompetenzen
              </h3>
              <Badge variant="secondary" className="text-[10px]">{zugeordneteZiele.length}</Badge>
            </div>

            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-1.5 text-[11px] text-blue-700">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Ziehe Basiskompetenzen hierher, die für diese Transferaufgabe beherrscht werden müssen.</span>
            </div>

            {/* Pflicht-Hinweis: Text vorhanden aber kein Mapping */}
            {zugeordneteZiele.length === 0 && formData.aufgabentext_inhalt?.trim() !== '' && (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-1.5 text-[11px] text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Achtung:</strong> Ordne mindestens eine Basiskompetenz per Drag &amp; Drop zu,
                  um diesen Baustein abzuschließen.
                </span>
              </div>
            )}

            <Droppable droppableId="dropzone">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-48 p-3 rounded-xl border-2 border-dashed transition-all space-y-2 ${
                    snapshot.isDraggingOver
                      ? 'border-green-400 bg-green-50 scale-[1.01]'
                      : zugeordneteZiele.length === 0
                        ? 'border-muted-foreground/20 bg-muted/20'
                        : 'border-green-200 bg-green-50/40'
                  }`}
                >
                  {zugeordneteZiele.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex flex-col items-center justify-center h-36 text-muted-foreground/50 gap-2">
                      <Target className="w-8 h-8" />
                      <p className="text-xs text-center">Basiskompetenzen hierher ziehen</p>
                    </div>
                  )}
                  {zugeordneteZiele.map((lz, index) => (
                    <LernzielChip
                      key={lz.id}
                      lernziel={lz}
                      index={index}
                      inDropzone
                      onRemove={kannBearbeiten ? (id) => removeMapping.mutate(id) : undefined}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* ══ BEREICH C: Verfügbare Draggables ════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Zap className="w-4 h-4 text-amber-500" />
                C — Basiskompetenzen
              </h3>
              <Badge variant="secondary" className="text-[10px]">{verfuegbareZiele.length}</Badge>
            </div>

            <Droppable droppableId="available">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-1.5 min-h-32 p-2 rounded-xl transition-colors ${
                    snapshot.isDraggingOver ? 'bg-muted/60' : ''
                  }`}
                >
                  {verfuegbareZiele.length === 0 && !snapshot.isDraggingOver && (
                    <p className="text-[11px] text-muted-foreground text-center py-4">
                      Alle Basiskompetenzen zugeordnet.
                    </p>
                  )}
                  {verfuegbareZiele.map((lz, index) => (
                    <LernzielChip key={lz.id} lernziel={lz} index={index} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {kannBearbeiten && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                onClick={() => setQuickAddOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Basiskompetenz anlegen
              </Button>
            )}
          </div>
        </div>
      </div>

      <LernzielQuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSubmit={(data) => createLernziel.mutate(data)}
      />
    </DragDropContext>
  );
}