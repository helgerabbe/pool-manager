import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '@/services/FileService';
import { createAllgemeineAufgabe, updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Save, FileUp, BookMarked, Type, ImagePlus, X, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { AUFGABEN_TYPEN, getAufgabenTyp } from '@/lib/aufgabenTypen';
import LernpaketMultiSelect from '@/components/allgemeineAufgaben/LernpaketMultiSelect';
import ProjektAufgabenMultiSelect from '@/components/allgemeineAufgaben/ProjektAufgabenMultiSelect';

// ── Sterne-Rating ──────────────────────────────────────────────────────────────
function SternRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          className={`text-2xl transition-transform hover:scale-110 ${value && value >= star ? 'text-amber-400' : 'text-gray-300'}`}
          title={`${star} Stern${star > 1 ? 'e' : ''}`}
        >★</button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-foreground ml-2">
          Zurücksetzen
        </button>
      )}
    </div>
  );
}

// ── Aufgabenstellung: Text + optionales Bild ───────────────────────────────────
function AufgabenstellungSection({ text, onTextChange, bildUrl, onBildUrlChange, onUploadingChange }) {
  const [uploading, setUploading] = useState(false);

  // Upload-Status nach oben durchreichen, damit der Speichern-Button sauber gesperrt werden kann.
  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleBildUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      onBildUrlChange(file_url);
      toast.success('Bild hochgeladen');
    } catch (err) {
      toast.error('Bild-Upload fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>
        Aufgabenstellung <span className="text-destructive">*</span>
        <span className="text-xs font-normal text-muted-foreground ml-2">(Text, Bild oder beides)</span>
      </Label>

      {/* Textbereich */}
      <textarea
        value={text}
        onChange={e => onTextChange(e.target.value)}
        placeholder="Aufgabentext eingeben (optional wenn ein Bild hochgeladen wird)…"
        className="w-full px-3 py-2 border border-border rounded-lg min-h-28 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {/* Bild-Upload */}
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <ImagePlus className="w-3.5 h-3.5" /> Aufgaben-Bild / Screenshot (optional)
        </p>

        {bildUrl ? (
          <div className="relative inline-block">
            <img src={bildUrl} alt="Aufgabenbild" className="max-h-48 rounded border border-border object-contain" />
            <button
              type="button"
              onClick={() => onBildUrlChange('')}
              className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen…</>
              : <><FileUp className="w-4 h-4" /> Bild auswählen (JPG, PNG, GIF…)</>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleBildUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {!text.trim() && !bildUrl && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <AlertCircle className="w-3 h-3" /> Bitte Text eingeben oder ein Bild hochladen.
        </div>
      )}
    </div>
  );
}

// ── Zusätzliches Material ──────────────────────────────────────────────────────
function ZusaetzlichesMaterialSection({ materials, onMaterialsChange, onUploadingChange }) {
  const [activeTab, setActiveTab] = useState('freitext');
  const [newMaterial, setNewMaterial] = useState({ type: 'freitext', content: '', label: '', file: null });
  const [uploading, setUploading] = useState(false);

  // Upload-Status nach oben durchreichen, damit der Speichern-Button sauber gesperrt werden kann.
  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const typeFromTab = (tab) => tab === 'freitext' ? 'free_text' : tab;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setNewMaterial({ type: typeFromTab(tab), content: '', label: '', file: null });
  };

  const addMaterial = async () => {
    const type = typeFromTab(activeTab);
    if ((type === 'free_text' || type === 'book_ref') && !newMaterial.content.trim()) {
      toast.error('Bitte Inhalt eingeben');
      return;
    }
    if ((type === 'pdf' || type === 'image') && !newMaterial.file) {
      toast.error('Bitte Datei auswählen');
      return;
    }

    let finalMaterial = { type, label: newMaterial.label };

    if (type === 'pdf' || type === 'image') {
      setUploading(true);
      const { file_url } = await uploadFile(newMaterial.file);
      finalMaterial.url = file_url;
      setUploading(false);
    } else {
      finalMaterial.content = newMaterial.content;
    }

    onMaterialsChange([...materials, finalMaterial]);
    setNewMaterial({ type: typeFromTab(activeTab), content: '', label: '', file: null });
    toast.success('Material hinzugefügt');
  };

  const removeMaterial = (idx) => onMaterialsChange(materials.filter((_, i) => i !== idx));

  const ICONS = { free_text: '📝', pdf: '📄', image: '🖼️', book_ref: '📚' };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border">
      <h4 className="text-sm font-semibold">Zusätzliches Material zur Aufgabe</h4>
      <p className="text-xs text-muted-foreground">Weitere Informationen, die zum Lösen der Aufgabe hilfreich sind (z.B. Arbeitsblatt, Tabelle, Buchseite).</p>

      {/* Liste vorhandener Materialien */}
      {materials.length > 0 && (
        <div className="space-y-2">
          {materials.map((mat, idx) => (
            <div key={idx} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-border text-sm">
              <span className="shrink-0 mt-0.5">{ICONS[mat.type] || '📎'}</span>
              <div className="flex-1 min-w-0">
                {mat.type === 'image' && mat.url && (
                  <img src={mat.url} alt={mat.label || 'Bild'} className="max-h-32 rounded border border-border object-contain mb-1" />
                )}
                {mat.type === 'pdf' && mat.url && (
                  <iframe src={mat.url} className="w-full h-40 rounded border border-border mb-1" title={mat.label || 'PDF'} />
                )}
                <span className="text-xs text-muted-foreground break-words">
                  {mat.label || mat.content || (mat.type === 'image' || mat.type === 'pdf' ? '' : mat.url) || '…'}
                </span>
              </div>
              <button type="button" onClick={() => removeMaterial(idx)} className="shrink-0 text-destructive hover:text-destructive/70 mt-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Neues Material hinzufügen */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-2">
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="freitext" className="text-xs"><Type className="w-3 h-3 mr-1" />Text</TabsTrigger>
          <TabsTrigger value="book_ref" className="text-xs"><BookMarked className="w-3 h-3 mr-1" />Buch</TabsTrigger>
          <TabsTrigger value="pdf" className="text-xs"><FileUp className="w-3 h-3 mr-1" />PDF</TabsTrigger>
          <TabsTrigger value="image" className="text-xs">🖼️ Bild</TabsTrigger>
        </TabsList>

        <TabsContent value="freitext" className="space-y-2">
          <textarea
            value={newMaterial.content}
            onChange={e => setNewMaterial(p => ({ ...p, content: e.target.value }))}
            placeholder="Freitext eingeben…"
            className="w-full h-16 px-2 py-1.5 text-xs border border-border rounded resize-none focus:outline-none"
          />
          <Input placeholder="Label (optional)" value={newMaterial.label} onChange={e => setNewMaterial(p => ({ ...p, label: e.target.value }))} className="h-8 text-xs" />
          <Button type="button" onClick={addMaterial} size="sm" className="w-full text-xs">Hinzufügen</Button>
        </TabsContent>

        <TabsContent value="book_ref" className="space-y-2">
          <Input
            placeholder="z.B. 'Seite 45–47', 'Kapitel 3'"
            value={newMaterial.content}
            onChange={e => setNewMaterial(p => ({ ...p, content: e.target.value }))}
            className="h-8 text-xs"
          />
          <Input placeholder="Label (optional)" value={newMaterial.label} onChange={e => setNewMaterial(p => ({ ...p, label: e.target.value }))} className="h-8 text-xs" />
          <Button type="button" onClick={addMaterial} size="sm" className="w-full text-xs">Hinzufügen</Button>
        </TabsContent>

        <TabsContent value="pdf" className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            <FileUp className="w-4 h-4" />
            {newMaterial.file ? newMaterial.file.name : 'PDF auswählen…'}
            <input type="file" accept=".pdf" className="hidden" onChange={e => setNewMaterial(p => ({ ...p, file: e.target.files?.[0] || null }))} />
          </label>
          <Input placeholder="Label (optional)" value={newMaterial.label} onChange={e => setNewMaterial(p => ({ ...p, label: e.target.value }))} className="h-8 text-xs" />
          <Button type="button" onClick={addMaterial} disabled={uploading} size="sm" className="w-full text-xs">
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Hochladen…</> : 'Hochladen & Hinzufügen'}
          </Button>
        </TabsContent>

        <TabsContent value="image" className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            <ImagePlus className="w-4 h-4" />
            {newMaterial.file ? newMaterial.file.name : 'Bild auswählen…'}
            <input type="file" accept="image/*" className="hidden" onChange={e => setNewMaterial(p => ({ ...p, file: e.target.files?.[0] || null }))} />
          </label>
          <Input placeholder="Label (optional)" value={newMaterial.label} onChange={e => setNewMaterial(p => ({ ...p, label: e.target.value }))} className="h-8 text-xs" />
          <Button type="button" onClick={addMaterial} disabled={uploading} size="sm" className="w-full text-xs">
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Hochladen…</> : 'Hochladen & Hinzufügen'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  titel: '',
  aufgabenstellung: '',
  aufgaben_bild_url: '',
  schwierigkeitsgrad: null,
  themenfeld_id: null,
  materialien: [],
  ergebnis_form: '',
  ergebnis_dateiformat: '',
  erwartungshorizont: '',
  aufgaben_typ: 'inhalt',
  verlinkte_lernpaket_ids: [],
  verlinkte_projekt_ids: [],
};

export default function AufgabeCreateView({ open, onOpenChange, einheitId, themenfelder = [], onSuccess, initialData = null, defaultAnforderungsebene = '2 - Transfer', defaultAufgabenTyp = 'inhalt' }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(EMPTY_FORM);
  // Aktive Uploads (Bild oder Material) – sperren den Speichern-Button.
  const [bildUploading, setBildUploading] = useState(false);
  const [materialUploading, setMaterialUploading] = useState(false);
  const isUploading = bildUploading || materialUploading;

  React.useEffect(() => {
    if (open) {
      setFormData(initialData
        ? { ...EMPTY_FORM, ...initialData, aufgaben_typ: initialData.aufgaben_typ || 'inhalt' }
        : { ...EMPTY_FORM, aufgaben_typ: defaultAufgabenTyp || 'inhalt' }
      );
    }
  }, [open, initialData, defaultAufgabenTyp]);

  const set = (field, val) => setFormData(p => ({ ...p, [field]: val }));

  // Validierung je Aufgaben-Typ:
  //  - inhalt: Text ODER Bild Pflicht (wie bisher)
  //  - buendel: mind. ein verlinktes Lernpaket
  //  - projekt_anker: mind. ein verlinktes Ebene-3-Projekt
  //  - prozess: nur Titel + Aufgabentext (Aufgabentext Pflicht)
  const isValid = (() => {
    const typ = formData.aufgaben_typ || 'inhalt';
    if (typ === 'buendel') return (formData.verlinkte_lernpaket_ids || []).length > 0;
    if (typ === 'projekt_anker') return (formData.verlinkte_projekt_ids || []).length > 0;
    if (typ === 'prozess') return !!formData.aufgabenstellung?.trim();
    return !!(formData.aufgabenstellung?.trim() || formData.aufgaben_bild_url);
  })();

  const aufgabenTypMeta = getAufgabenTyp(formData.aufgaben_typ);
  const isInhalt = formData.aufgaben_typ === 'inhalt' || !formData.aufgaben_typ;
  const isBuendel = formData.aufgaben_typ === 'buendel';
  const isProjektAnker = formData.aufgaben_typ === 'projekt_anker';
  const isProzess = formData.aufgaben_typ === 'prozess';

  const createAufgabe = useMutation({
    mutationFn: (data) => createAllgemeineAufgabe({
      einheit_id: einheitId,
      anforderungsebene: defaultAnforderungsebene,
      aufgaben_typ: data.aufgaben_typ || 'inhalt',
      verlinkte_lernpaket_ids: data.verlinkte_lernpaket_ids || [],
      verlinkte_projekt_ids: data.verlinkte_projekt_ids || [],
      themenfeld_id: data.themenfeld_id || null,
      titel: data.titel || null,
      aufgabenstellung: data.aufgabenstellung || '',
      aufgaben_bild_url: data.aufgaben_bild_url || null,
      schwierigkeitsgrad: data.schwierigkeitsgrad || null,
      materialien: data.materialien || [],
      ergebnis_form: data.ergebnis_form || null,
      ergebnis_dateiformat: data.ergebnis_dateiformat || null,
      erwartungshorizont: data.erwartungshorizont || null,
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabe erstellt!');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateAufgabe = useMutation({
    mutationFn: (data) => updateAllgemeineAufgabe(initialData.id, {
      aufgaben_typ: data.aufgaben_typ || 'inhalt',
      verlinkte_lernpaket_ids: data.verlinkte_lernpaket_ids || [],
      verlinkte_projekt_ids: data.verlinkte_projekt_ids || [],
      themenfeld_id: data.themenfeld_id || null,
      titel: data.titel || null,
      aufgabenstellung: data.aufgabenstellung || '',
      aufgaben_bild_url: data.aufgaben_bild_url || null,
      schwierigkeitsgrad: data.schwierigkeitsgrad || null,
      materialien: data.materialien || [],
      ergebnis_form: data.ergebnis_form || null,
      ergebnis_dateiformat: data.ergebnis_dateiformat || null,
      erwartungshorizont: data.erwartungshorizont || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabe aktualisiert');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      const msg = isBuendel
        ? 'Bitte mindestens ein Lernpaket auswählen.'
        : isProjektAnker
          ? 'Bitte mindestens ein Ebene-3-Projekt auswählen.'
          : isProzess
            ? 'Bitte einen Aufgabentext eingeben.'
            : 'Bitte Text eingeben oder Bild hochladen.';
      toast.error(msg);
      return;
    }
    if (initialData) updateAufgabe.mutate(formData);
    else createAufgabe.mutate(formData);
  };

  const isSaving = createAufgabe.isPending || updateAufgabe.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{initialData ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${aufgabenTypMeta.color.bg} ${aufgabenTypMeta.color.text} border ${aufgabenTypMeta.color.border}/40`}>
              <aufgabenTypMeta.icon className="w-3 h-3" />
              {aufgabenTypMeta.label}
            </span>
          </DialogTitle>
          {isProjektAnker && (
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-600" />
              <span>Tipp: Projekt-Anker liegen kognitiv meist auf Ebene 2 (Transfer), verweisen aber auf Projekte der Ebene 3.</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Themenfeld */}
          {themenfelder.length > 0 && (
            <div className="space-y-2">
              <Label>Themenfeld (optional)</Label>
              <select
                value={formData.themenfeld_id || ''}
                onChange={e => set('themenfeld_id', e.target.value || null)}
                className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
              >
                <option value="">-- Kein Themenfeld --</option>
                {themenfelder.map(tf => <option key={tf.id} value={tf.id}>{tf.titel}</option>)}
              </select>
            </div>
          )}

          {/* Titel */}
          <div className="space-y-2">
            <Label>Titel (optional)</Label>
            <Input
              value={formData.titel}
              onChange={e => set('titel', e.target.value)}
              placeholder="z.B. 'Energieflussdiagramm analysieren'"
            />
          </div>

          {/* ── Bündel-Picker (nur bei aufgaben_typ === 'buendel') ── */}
          {isBuendel && (
            <LernpaketMultiSelect
              einheitId={einheitId}
              selectedIds={formData.verlinkte_lernpaket_ids || []}
              onChange={(ids) => set('verlinkte_lernpaket_ids', ids)}
            />
          )}

          {/* ── Projekt-Anker-Picker (nur bei aufgaben_typ === 'projekt_anker') ── */}
          {isProjektAnker && (
            <ProjektAufgabenMultiSelect
              einheitId={einheitId}
              selectedIds={formData.verlinkte_projekt_ids || []}
              onChange={(ids) => set('verlinkte_projekt_ids', ids)}
              excludeAufgabeId={initialData?.id || null}
            />
          )}

          {/* ── Aufgabenstellung (Text + optional Bild) ──
              - inhalt:   Text + Bild (wie bisher)
              - prozess:  nur Text
              - buendel/projekt_anker: optionale Beschreibung als Text */}
          {isInhalt ? (
            <AufgabenstellungSection
              text={formData.aufgabenstellung}
              onTextChange={val => set('aufgabenstellung', val)}
              bildUrl={formData.aufgaben_bild_url}
              onBildUrlChange={val => set('aufgaben_bild_url', val)}
              onUploadingChange={setBildUploading}
            />
          ) : (
            <div className="space-y-2">
              <Label>
                {isProzess ? 'Aufgabentext / Anleitung' : 'Beschreibung (optional)'}
                {isProzess && <span className="text-destructive ml-1">*</span>}
              </Label>
              <textarea
                value={formData.aufgabenstellung}
                onChange={e => set('aufgabenstellung', e.target.value)}
                placeholder={
                  isProzess
                    ? 'z.B. Halte einen kurzen Zwischenstand fest – was hast du bis hier gelernt?'
                    : isBuendel
                      ? 'z.B. Bearbeite die folgenden Pakete in eigenem Tempo.'
                      : 'z.B. Wähle ein Projekt aus, das dich besonders interessiert.'
                }
                className="w-full px-3 py-2 border border-border rounded-lg min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {/* ── Schwierigkeitsgrad (für inhalt + projekt_anker) ── */}
          {(isInhalt || isProjektAnker) && (
            <div className="space-y-2">
              <Label>Schwierigkeitsgrad</Label>
              <SternRating value={formData.schwierigkeitsgrad} onChange={val => set('schwierigkeitsgrad', val)} />
            </div>
          )}

          {/* ── Ergebnis-Angaben (NUR für aufgaben_typ === 'inhalt') ── */}
          {isInhalt && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Erwartete Form des Ergebnisses</Label>
                <select
                  value={formData.ergebnis_form || ''}
                  onChange={e => set('ergebnis_form', e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Bitte wählen --</option>
                  <option>Fließtext / Essay</option>
                  <option>Tabelle / Matrix</option>
                  <option>Präsentation / Folien</option>
                  <option>Schema / Konzept-Map / Zeichnung</option>
                  <option>Stichpunktartige Übersicht</option>
                  <option>Mischform / Offen</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Erwartetes Dateiformat</Label>
                <select
                  value={formData.ergebnis_dateiformat || ''}
                  onChange={e => set('ergebnis_dateiformat', e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Bitte wählen --</option>
                  <option>Textdokument (Word/PDF)</option>
                  <option>Bilddatei (JPG/PNG)</option>
                  <option>Präsentationsdatei (PowerPoint/PDF)</option>
                  <option>Offen / Beliebig</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Erwartungshorizont (NUR für aufgaben_typ === 'inhalt') ── */}
          {isInhalt && (
            <div className="space-y-2">
              <Label>Erwartungshorizont / Zielvorgaben (optional)</Label>
              <textarea
                value={formData.erwartungshorizont}
                onChange={e => set('erwartungshorizont', e.target.value)}
                placeholder="Definieren Sie, wie ein erfolgreiches Ergebnis aussieht: inhaltliche Kriterien, Umfang, Lösungsansätze, Qualitätsmerkmale…"
                className="w-full px-3 py-2 border border-border rounded-lg min-h-32 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Dieses Feld dient als Leitplanke für den KI-Tutor bei der Lernbegleitung.</p>
            </div>
          )}

          {/* ── Zusätzliches Material (NUR für aufgaben_typ === 'inhalt') ── */}
          {isInhalt && (
            <ZusaetzlichesMaterialSection
              materials={formData.materialien}
              onMaterialsChange={mats => set('materialien', mats)}
              onUploadingChange={setMaterialUploading}
            />
          )}

          <DialogFooter>
            {isUploading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-auto">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Datei wird hochgeladen – bitte warten…
              </span>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={isSaving || !isValid || isUploading} className="gap-2">
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Wird gespeichert…</>
                : initialData
                  ? <><Save className="w-4 h-4" />Speichern</>
                  : <><Save className="w-4 h-4" />Speichern & Weiter</>
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}