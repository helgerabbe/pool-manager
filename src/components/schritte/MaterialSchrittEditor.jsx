import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MaterialDateiFeld from '@/components/allgemeineAufgaben/MaterialDateiFeld';

/**
 * MaterialSchrittEditor
 * ─────────────────────
 * Editor für einen Material-Schritt: Text, Video, Audio, Bild, PDF, Link.
 *
 * Unverändert aus dem SequenzBuilder herausgelöst (2026-08-29), damit die
 * Aufgabenwerkstatt dieselben eingespielten Felder benutzt statt eigener.
 * Inhaltliche Änderungen bitte nur hier — es gibt keine zweite Fassung mehr.
 */

export const MATERIAL_TYPEN = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'bild', label: 'Bild' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link' },
];

export default function MaterialSchrittEditor({ schritt, onChange }) {
  const mat = schritt.material || {};
  const setMat = (field, val) => onChange({ ...schritt, material: { ...mat, [field]: val } });

  const brauchtInhalt = mat.material_typ === 'text';
  const brauchtUrl = mat.material_typ === 'video' || mat.material_typ === 'audio' || mat.material_typ === 'link';
  const brauchtDatei = mat.material_typ === 'bild' || mat.material_typ === 'pdf';
  const brauchtTranskript = mat.material_typ === 'video' || mat.material_typ === 'audio';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Material-Typ</Label>
        <Select value={mat.material_typ || 'text'} onValueChange={(v) => setMat('material_typ', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MATERIAL_TYPEN.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {brauchtTranskript ? (
        <div className="space-y-2">
          <Label>Transkript</Label>
          <Textarea
            value={mat.transkript || ''}
            onChange={(e) => setMat('transkript', e.target.value)}
            placeholder="Gesprochener Inhalt des Videos/Audios als Text – damit Brian den Schülern helfen kann…"
            className="min-h-[100px]"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Kurzbeschreibung (für Sie)</Label>
          <Input
            value={mat.beschreibung || ''}
            onChange={(e) => setMat('beschreibung', e.target.value)}
            placeholder="z. B. 'Quelle A: Rede von …'"
          />
        </div>
      )}

      {brauchtInhalt && (
        <div className="space-y-2">
          <Label>Text-Inhalt</Label>
          <Textarea
            value={mat.inhalt || ''}
            onChange={(e) => setMat('inhalt', e.target.value)}
            placeholder="Text hier eingeben oder einfügen…"
            className="min-h-[120px]"
          />
        </div>
      )}

      {brauchtUrl && (
        <div className="space-y-2">
          <Label>{mat.material_typ === 'link' ? 'Link' : 'Link (z. B. YouTube, Vimeo, Studyflix)'}</Label>
          <Input
            value={mat.url || ''}
            onChange={(e) => setMat('url', e.target.value)}
            placeholder="https://…"
          />
        </div>
      )}

      {/* Video/Audio können alternativ als Datei hochgeladen werden. */}
      {(mat.material_typ === 'video' || mat.material_typ === 'audio') && (
        <div className="space-y-2">
          <Label>… oder {mat.material_typ === 'video' ? 'Videodatei' : 'Audiodatei'} hochladen</Label>
          <MaterialDateiFeld
            value={mat.datei_url || ''}
            onChange={(url) => setMat('datei_url', url)}
            materialTyp={mat.material_typ}
          />
        </div>
      )}

      {brauchtDatei && (
        <div className="space-y-2">
          <Label>{mat.material_typ === 'bild' ? 'Bild' : 'PDF-Dokument'}</Label>
          <MaterialDateiFeld
            value={mat.datei_url || ''}
            onChange={(url) => setMat('datei_url', url)}
            materialTyp={mat.material_typ}
          />
        </div>
      )}

      {mat.material_typ === 'text' && (
        <div className="space-y-2">
          <Label>… oder Textdokument hochladen (optional)</Label>
          <MaterialDateiFeld
            value={mat.datei_url || ''}
            onChange={(url) => setMat('datei_url', url)}
            materialTyp="text"
          />
        </div>
      )}
    </div>
  );
}
