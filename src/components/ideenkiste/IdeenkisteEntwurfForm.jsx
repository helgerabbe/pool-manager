import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Formular zum Anlegen/Bearbeiten einer Aufgaben-Idee in der Ideenkiste,
 * inkl. Material-Upload (Screenshot, PDF, Dokument).
 */
export default function IdeenkisteEntwurfForm({ einheitId, idee = null, onClose }) {
  const queryClient = useQueryClient();
  const [titel, setTitel] = useState(idee?.titel || '');
  const [beschreibung, setBeschreibung] = useState(idee?.beschreibung || '');
  const [materialien, setMaterialien] = useState(idee?.material_urls || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const neue = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        neue.push({ url: file_url, name: file.name });
      }
      setMaterialien((prev) => [...prev, ...neue]);
    } catch (_err) {
      toast.error('Upload fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!titel.trim()) {
      toast.error('Bitte einen Titel für die Aufgaben-Idee angeben.');
      return;
    }
    setSaving(true);
    try {
      const data = { einheit_id: einheitId, titel: titel.trim(), beschreibung, material_urls: materialien };
      if (idee?.id) {
        await base44.entities.AufgabenIdee.update(idee.id, data);
        toast.success('Aufgaben-Idee aktualisiert.');
      } else {
        await base44.entities.AufgabenIdee.create({ ...data, status: 'offen' });
        toast.success('Aufgaben-Idee in der Ideenkiste gespeichert.');
      }
      queryClient.invalidateQueries({ queryKey: ['aufgaben-ideen', einheitId] });
      onClose();
    } catch (_err) {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <p className="text-sm font-semibold">{idee?.id ? 'Aufgaben-Idee bearbeiten' : 'Neue Aufgaben-Idee'}</p>
      <div className="space-y-1.5">
        <Label htmlFor="idee-titel">Titel</Label>
        <Input
          id="idee-titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z. B. Quellenanalyse zum Mauerbau"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="idee-beschreibung">Beschreibung</Label>
        <Textarea
          id="idee-beschreibung"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={4}
          placeholder="Was sollen die Schüler:innen tun? Was sollen sie daran lernen? Welche Inhalte?"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Material (Screenshot, PDF, Dokument)</Label>
        {materialien.map((m, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs bg-card border rounded-md px-2 py-1.5">
            <Paperclip className="w-3 h-3 shrink-0 text-muted-foreground" />
            <a href={m.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary hover:underline">
              {m.name || 'Datei'}
            </a>
            <button
              onClick={() => setMaterialien((prev) => prev.filter((_, i) => i !== idx))}
              className="text-muted-foreground hover:text-destructive"
              title="Material entfernen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <label className="flex items-center justify-center gap-1.5 text-xs font-medium border border-dashed rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          {uploading ? 'Wird hochgeladen …' : 'Datei hinzufügen'}
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading}
            accept="image/*,.pdf,.doc,.docx,.odt,.txt" />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Abbrechen</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || uploading}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}