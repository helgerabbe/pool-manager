import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MaterialDateiFeld from '@/components/allgemeineAufgaben/MaterialDateiFeld';
import { MATERIAL_TYPEN, MAX_UPLOAD_MB } from '@/lib/materialaufgabe';
import IServHinweis from '@/components/allgemeineAufgaben/IServHinweis';

/**
 * Editor für das Material einer Materialaufgabe: Typ wählen, Datei hochladen
 * (bzw. Screenshot einfügen) oder verlinken. Videos sollten möglichst
 * verlinkt werden – ein Upload ist bis zur angegebenen Maximalgröße möglich.
 */
export default function MaterialEditor({ material = {}, onChange, disabled = false }) {
  const typ = material.material_typ || 'text';
  const set = (field, value) => onChange({ ...material, [field]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Art des Materials</Label>
        <Select value={typ} onValueChange={(v) => onChange({ ...material, material_typ: v })} disabled={disabled}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MATERIAL_TYPEN.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Kurzbeschreibung <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          value={material.beschreibung || ''}
          onChange={(e) => set('beschreibung', e.target.value)}
          placeholder="z. B. „Hörtext: Interview mit einer Zeitzeugin“"
          disabled={disabled}
        />
      </div>

      {typ === 'text' && (
        <div className="space-y-2">
          <Label>Text</Label>
          <Textarea
            value={material.inhalt || ''}
            onChange={(e) => set('inhalt', e.target.value)}
            placeholder="Text hier eingeben oder einfügen …"
            className="min-h-[160px]"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Alternativ kannst du unten ein Dokument hochladen.
          </p>
          <MaterialDateiFeld
            value={material.datei_url || ''}
            onChange={(url) => set('datei_url', url)}
            materialTyp="text"
            maxMB={MAX_UPLOAD_MB.text}
            disabled={disabled}
          />
        </div>
      )}

      {typ === 'link' && (
        <div className="space-y-2">
          <Label>Link</Label>
          <Input
            value={material.url || ''}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://…"
            disabled={disabled}
          />
          <IServHinweis />
        </div>
      )}

      {(typ === 'bild' || typ === 'pdf') && (
        <div className="space-y-2">
          <Label>{typ === 'bild' ? 'Bild' : 'PDF'} hochladen</Label>
          <MaterialDateiFeld
            value={material.datei_url || ''}
            onChange={(url) => set('datei_url', url)}
            materialTyp={typ}
            maxMB={MAX_UPLOAD_MB[typ]}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            {typ === 'bild'
              ? `Screenshot aus der Zwischenablage einfügen (Strg+V) oder Datei auswählen. Maximal ${MAX_UPLOAD_MB.bild} MB.`
              : `Maximal ${MAX_UPLOAD_MB.pdf} MB.`}
          </p>
        </div>
      )}

      {(typ === 'audio' || typ === 'video') && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{typ === 'audio' ? 'Tondatei hochladen' : 'Videodatei hochladen'}</Label>
            <MaterialDateiFeld
              value={material.datei_url || ''}
              onChange={(url) => set('datei_url', url)}
              materialTyp={typ}
              maxMB={MAX_UPLOAD_MB[typ]}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              {typ === 'audio'
                ? `Maximal ${MAX_UPLOAD_MB.audio} MB (ca. 25 Minuten MP3).`
                : `Videos möglichst verlinken. Ein Upload ist bis ${MAX_UPLOAD_MB.video} MB möglich.`}
            </p>
          </div>
          <div className="space-y-2">
            <Label>… oder Link (YouTube, Vimeo, Direkt-URL)</Label>
            <Input
              value={material.url || ''}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://…"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Transkript <span className="text-muted-foreground font-normal">(optional, für Barrierefreiheit & KI)</span></Label>
            <Textarea
              value={material.transkript || ''}
              onChange={(e) => set('transkript', e.target.value)}
              placeholder="Gesprochener Text …"
              className="min-h-[100px]"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}