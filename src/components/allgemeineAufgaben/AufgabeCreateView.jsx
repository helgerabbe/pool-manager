import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Save, FileUp, BookMarked, Type } from 'lucide-react';
import { toast } from 'sonner';

// ── Sterne-Rating (1-3, mit Reset) ──
function SternRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(star => (
        <button
          key={star}
          onClick={() => onChange(value === star ? null : star)}
          className={`text-2xl transition-transform hover:scale-110 ${
            value && value >= star ? 'text-amber-400' : 'text-gray-300'
          }`}
          title={`${star} Stern${star > 1 ? 'e' : ''}`}
        >
          ★
        </button>
      ))}
      {value && (
        <button
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-foreground ml-2"
        >
          Zurücksetzen
        </button>
      )}
    </div>
  );
}

// ── Material-Uploader mit Tabs ──
function MaterialUploader({ materials, onMaterialsChange }) {
  const [activeTab, setActiveTab] = useState('freitext');
  const [newMaterial, setNewMaterial] = useState({ type: 'freitext', content: '', label: '' });
  const [uploading, setUploading] = useState(false);

  const addMaterial = async () => {
    if (!newMaterial.content) {
      toast.error('Bitte geben Sie Inhalt ein');
      return;
    }

    let finalMaterial = { ...newMaterial };

    // Datei-Upload
    if (newMaterial.type === 'pdf' || newMaterial.type === 'image') {
      if (!newMaterial.file) {
        toast.error('Bitte wählen Sie eine Datei');
        return;
      }
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: newMaterial.file });
        finalMaterial = { ...finalMaterial, url: file_url, content: '' };
      } catch (err) {
        toast.error('Fehler beim Upload');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onMaterialsChange([...materials, finalMaterial]);
    setNewMaterial({ type: 'freitext', content: '', label: '', file: null });
    setActiveTab('freitext');
    toast.success('Material hinzugefügt');
  };

  const removeMaterial = (idx) => {
    onMaterialsChange(materials.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
      <h4 className="text-sm font-semibold">Materialien</h4>

      {/* Materialien-Liste */}
      {materials.length > 0 && (
        <div className="space-y-2 mb-4">
          {materials.map((mat, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded bg-white border border-border text-sm"
            >
              <span>
                {mat.type === 'freitext' && '📝'} {mat.type === 'pdf' && '📄'}{' '}
                {mat.type === 'image' && '🖼️'} {mat.type === 'book_ref' && '📚'}
                <span className="ml-2 truncate">{mat.label || mat.content || mat.url || '…'}</span>
              </span>
              <button
                onClick={() => removeMaterial(idx)}
                className="text-xs text-destructive hover:text-destructive/80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Material-Input Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="freitext" className="text-xs">
            <Type className="w-3 h-3 mr-1" /> Text
          </TabsTrigger>
          <TabsTrigger value="book_ref" className="text-xs">
            <BookMarked className="w-3 h-3 mr-1" /> Buch
          </TabsTrigger>
          <TabsTrigger value="pdf" className="text-xs">
            <FileUp className="w-3 h-3 mr-1" /> PDF
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs">
            🖼️ Bild
          </TabsTrigger>
        </TabsList>

        <TabsContent value="freitext" className="space-y-2">
          <textarea
            value={newMaterial.type === 'freitext' ? newMaterial.content : ''}
            onChange={(e) =>
              newMaterial.type === 'freitext' && setNewMaterial({ ...newMaterial, content: e.target.value })
            }
            placeholder="Text eingeben…"
            className="w-full h-20 px-2 py-1 text-xs border rounded"
          />
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial({ ...newMaterial, label: e.target.value })}
            className="h-8 text-xs"
          />
          <Button
            onClick={addMaterial}
            disabled={uploading}
            size="sm"
            className="w-full text-xs"
          >
            Hinzufügen
          </Button>
        </TabsContent>

        <TabsContent value="book_ref" className="space-y-2">
          <Input
            placeholder="z.B. 'Seite 45-47', 'Kapitel 3'"
            value={newMaterial.type === 'book_ref' ? newMaterial.content : ''}
            onChange={(e) =>
              newMaterial.type === 'book_ref' && setNewMaterial({ ...newMaterial, content: e.target.value })
            }
            className="h-8 text-xs"
          />
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial({ ...newMaterial, label: e.target.value })}
            className="h-8 text-xs"
          />
          <Button
            onClick={addMaterial}
            disabled={uploading}
            size="sm"
            className="w-full text-xs"
          >
            Hinzufügen
          </Button>
        </TabsContent>

        <TabsContent value="pdf" className="space-y-2">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) =>
              newMaterial.type === 'pdf' &&
              setNewMaterial({ ...newMaterial, file: e.target.files?.[0] || null })
            }
            className="w-full text-xs"
          />
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial({ ...newMaterial, label: e.target.value })}
            className="h-8 text-xs"
          />
          <Button
            onClick={addMaterial}
            disabled={uploading}
            size="sm"
            className="w-full text-xs"
          >
            {uploading ? 'Wird hochgeladen…' : 'Hochladen'}
          </Button>
        </TabsContent>

        <TabsContent value="image" className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              newMaterial.type === 'image' &&
              setNewMaterial({ ...newMaterial, file: e.target.files?.[0] || null })
            }
            className="w-full text-xs"
          />
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial({ ...newMaterial, label: e.target.value })}
            className="h-8 text-xs"
          />
          <Button
            onClick={addMaterial}
            disabled={uploading}
            size="sm"
            className="w-full text-xs"
          >
            {uploading ? 'Wird hochgeladen…' : 'Hochladen'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Haupt-Component ──
export default function AufgabeCreateView({ open, onOpenChange, einheitId, themenfelder = [], onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    titel: '',
    aufgabenstellung: '',
    schwierigkeitsgrad: null,
    themenfeld_id: null,
    materialien: [],
  });

  const createAufgabe = useMutation({
    mutationFn: (data) =>
      base44.entities.AllgemeineAufgabe.create({
        einheit_id: einheitId,
        ...data,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabe erstellt! Schritt 2: Kompetenzen zuordnen.');
      onSuccess?.(result);
      setFormData({ titel: '', aufgabenstellung: '', schwierigkeitsgrad: null, themenfeld_id: null, materialien: [] });
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.aufgabenstellung.trim()) {
      toast.error('Aufgabenstellung ist erforderlich');
      return;
    }
    createAufgabe.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Allgemeine Aufgabe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Themenfeld */}
          {themenfelder.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="themenfeld">Themenfeld (optional)</Label>
              <select
                id="themenfeld"
                value={formData.themenfeld_id || ''}
                onChange={(e) => setFormData({ ...formData, themenfeld_id: e.target.value || null })}
                className="w-full h-9 px-3 border rounded-lg text-sm bg-white"
              >
                <option value="">-- Kein Themenfeld --</option>
                {themenfelder.map(tf => (
                  <option key={tf.id} value={tf.id}>{tf.titel}</option>
                ))}
              </select>
            </div>
          )}

          {/* Titel */}
          <div className="space-y-2">
            <Label htmlFor="titel">Titel (optional)</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
              placeholder="z.B. 'Energieflussdiagram analysieren'"
            />
          </div>

          {/* Aufgabenstellung */}
          <div className="space-y-2">
            <Label htmlFor="aufgabe">
              Aufgabenstellung <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="aufgabe"
              value={formData.aufgabenstellung}
              onChange={(e) => setFormData({ ...formData, aufgabenstellung: e.target.value })}
              placeholder="Beschreiben Sie die Aufgabe im Detail…"
              className="w-full px-3 py-2 border rounded-lg min-h-32"
            />
            {!formData.aufgabenstellung && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                Dieses Feld ist erforderlich
              </div>
            )}
          </div>

          {/* Schwierigkeitsgrad */}
          <div className="space-y-2">
            <Label>Schwierigkeitsgrad</Label>
            <SternRating
              value={formData.schwierigkeitsgrad}
              onChange={(val) => setFormData({ ...formData, schwierigkeitsgrad: val })}
            />
          </div>

          {/* Materialien */}
          <MaterialUploader
            materials={formData.materialien}
            onMaterialsChange={(mats) => setFormData({ ...formData, materialien: mats })}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={createAufgabe.isPending || !formData.aufgabenstellung.trim()}
              className="gap-2"
            >
              {createAufgabe.isPending ? (
                <>Wird gespeichert…</>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Speichern & Weiter zu Kompetenzen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}