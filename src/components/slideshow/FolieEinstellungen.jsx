/**
 * FolieEinstellungen.jsx
 *
 * Rechte Spalte des Slideshow-Editors: Vorlage, Hintergrundfarbe und die
 * optionale Einblende-Reihenfolge der Elemente der aktuellen Folie.
 */
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import VorlageWahl from '@/components/slideshow/VorlageWahl';
import { HINTERGRUND_FARBEN, folieMitVorlage, slotsInReihenfolge } from '@/lib/slideshowVorlagen';
import { cn } from '@/lib/utils';

export default function FolieEinstellungen({ folie, onChange }) {
  if (!folie) return null;
  const slots = slotsInReihenfolge(folie);
  const nacheinander = folie.einblenden === 'nacheinander';

  const verschieben = (von, nach) => {
    if (nach < 0 || nach >= slots.length) return;
    const keys = slots.map((s) => s.key);
    const [k] = keys.splice(von, 1);
    keys.splice(nach, 0, k);
    onChange({ reihenfolge: keys });
  };

  return (
    <div className="h-full overflow-y-auto p-3 space-y-5">
      <div className="space-y-2">
        <Label className="text-xs">Vorlage</Label>
        <VorlageWahl kompakt value={folie.vorlage} onSelect={(key) => onChange(folieMitVorlage(folie, key))} />
        <p className="text-[11px] text-muted-foreground">
          Du kannst das Design jederzeit wechseln – auch nachträglich. Texte und Bilder, für die das neue Design keinen Platz hat, werden nur ausgeblendet und kommen zurück, sobald du wieder ein passendes Design wählst.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Hintergrundfarbe</Label>
        <div className="flex flex-wrap gap-1.5 items-center">
          {HINTERGRUND_FARBEN.map((f) => (
            <button
              key={f.wert}
              type="button"
              title={f.label}
              onClick={() => onChange({ hintergrund: f.wert })}
              className={cn('w-7 h-7 rounded-full border shadow-sm', folie.hintergrund === f.wert ? 'ring-2 ring-primary ring-offset-1' : 'border-border')}
              style={{ background: f.wert }}
            />
          ))}
          <label className="w-7 h-7 rounded-full border border-dashed border-border overflow-hidden cursor-pointer relative" title="Eigene Farbe">
            <input
              type="color"
              value={folie.hintergrund || '#ffffff'}
              onChange={(e) => onChange({ hintergrund: e.target.value })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="absolute inset-0 bg-gradient-to-br from-red-300 via-green-300 to-blue-300" />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Elemente nacheinander einblenden</Label>
          <Switch checked={nacheinander} onCheckedChange={(v) => onChange({ einblenden: v ? 'nacheinander' : 'sofort' })} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {nacheinander
            ? 'Die Schüler holen mit „Weiter" ein Element nach dem anderen auf die Folie (sanft eingeblendet).'
            : 'Alle Elemente erscheinen sofort.'}
        </p>
        {nacheinander && (
          <ol className="space-y-1">
            {slots.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 truncate">{s.label}</span>
                <button type="button" onClick={() => verschieben(i, i - 1)} disabled={i === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                <button type="button" onClick={() => verschieben(i, i + 1)} disabled={i === slots.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}