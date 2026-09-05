/**
 * WebUntisVorschlagZeile.jsx
 *
 * Eine Zeile der WebUntis-Vorschlagsliste: der Nachname, wie er im Stundenplan
 * steht, die Klassen dazu — und rechts die Lehrkraft aus unserer Benutzerliste.
 * Ist der Treffer nicht eindeutig, bleibt der WebUntis-Name sichtbar und die
 * Person wird von Hand ausgewählt; nur wer eine Lehrkraft hat, kann angehakt
 * werden.
 */
import React from 'react';
import { Check } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function WebUntisVorschlagZeile({ eintrag, kollegen, wahl, onChange }) {
  const email = wahl?.email || '';
  const schonDa = eintrag.bereits_eingetragen && email === eintrag.email;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={!!wahl?.aktiv && !!email && !schonDa}
        disabled={!email || schonDa}
        onChange={(e) => onChange({ email, aktiv: e.target.checked })}
        className="cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="w-44 shrink-0 text-sm">
        <span className="font-medium">{eintrag.untis_name}</span>
        <span className="ml-1.5 text-xs text-muted-foreground">
          {eintrag.klassen.join(', ')}
        </span>
      </div>

      {eintrag.status === 'sicher' ? (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          {eintrag.name}
        </span>
      ) : (
        <Select value={email} onValueChange={(v) => onChange({ email: v, aktiv: true })}>
          <SelectTrigger className="h-8 max-w-xs text-sm">
            <SelectValue
              placeholder={
                eintrag.status === 'unklar'
                  ? 'Mehrere möglich — wer ist gemeint?'
                  : 'Kein Konto gefunden — Lehrkraft wählen…'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {/* Kandidaten des Namenstreffers zuerst, danach alle übrigen Kolleg:innen. */}
            {[
              ...eintrag.kandidaten,
              ...kollegen.filter((k) => !eintrag.kandidaten.some((c) => c.email === k.email)),
            ].map((k) => (
              <SelectItem key={k.email} value={k.email}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {schonDa && <span className="text-xs text-muted-foreground">schon eingetragen</span>}
    </div>
  );
}