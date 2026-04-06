import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Save, FileUp, BookMarked, Type, ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
function AufgabenstellungSection({ text, onTextChange, bildUrl, onBildUrlChange }) {
  const [uploading, setUploading] = useState(false);

  const handleBildUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onBildUrlChange(file_url);
    setUploading(false);
    toast.success('Bild hochgeladen');
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
function ZusaetzlichesMaterialSection({ materials, onMaterialsChange }) {
  const [activeTab, setActiveTab] = useState('freitext');
  const [newMaterial, setNewMaterial] = useState({ type: 'freitext', content: '', label: '', file: null });
  const [uploading, setUploading] = useState(false);

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
      const { file_url } = await base44.integrations.Core.UploadFile({ file: newMaterial.file });
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
        <div className="space-y-1.5">
          {materials.map((mat, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-border text-sm">
              <span className="shrink-0">{ICONS[mat.type] || '📎'}</span>
              {mat.type === 'image' && mat.url && (
                <img src={mat.url} alt="" className="h-8 w-8 object-cover rounded border" />
              )}
              <span className="flex-1 truncate text-xs">{mat.label || mat.content || mat.url || '…'}</span>
              <button type="button" onClick={() => removeMaterial(idx)} className="shrink-0 text-destructive hover:text-destructive/70">
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
};

export default function AufgabeCreateView({ open, onOpenChange, einheitId, themenfelder = [], onSuccess, initialData = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(EMPTY_FORM);

  React.useEffect(() => {
    if (open) {
      setFormData(initialData
        ? { ...EMPTY_FORM, ...initialData }
        : { ...EMPTY_FORM }
      );
    }
  }, [open, initialData]);

  const set = (field, val) => setFormData(p => ({ ...p, [field]: val }));

  const isValid = !!(formData.aufgabenstellung?.trim() || formData.aufgaben_bild_url);

  const createAufgabe = useMutation({
    mutationFn: (data) => base44.entities.AllgemeineAufgabe.create({
      einheit_id: einheitId,
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
    mutationFn: (data) => base44.entities.AllgemeineAufgabe.update(initialData.id, {
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
    if (!isValid) { toast.error('Bitte Text eingeben oder Bild hochladen'); return; }
    if (initialData) updateAufgabe.mutate(formData);
    else createAufgabe.mutate(formData);
  };

  const isSaving = createAufgabe.isPending || updateAufgabe.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Aufgabe bearbeiten' : 'Neue Allgemeine Aufgabe'}</DialogTitle>
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

          {/* Aufgabenstellung (Text + Bild) */}
          <AufgabenstellungSection
            text={formData.aufgabenstellung}
            onTextChange={val => set('aufgabenstellung', val)}
            bildUrl={formData.aufgaben_bild_url}
            onBildUrlChange={val => set('aufgaben_bild_url', val)}
          />

          {/* Schwierigkeitsgrad */}
          <div className="space-y-2">
            <Label>Schwierigkeitsgrad</Label>
            <SternRating value={formData.schwierigkeitsgrad} onChange={val => set('schwierigkeitsgrad', val)} />
          </div>

          {/* Ergebnis-Angaben */}
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

          {/* Erwartungshorizont (für Ebene 3) */}
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

          {/* Zusätzliches Material */}
          <ZusaetzlichesMaterialSection
            materials={formData.materialien}
            onMaterialsChange={mats => set('materialien', mats)}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={isSaving || !isValid} className="gap-2">
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