import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SchritteFeld from '@/components/importcenter/SchritteFeld';

/**
 * Rendert die Parameter-Felder eines Auftrags DIREKT aus dem JSON-Schema-Vertrag
 * seiner Auftragsart. Dadurch kann das Formular nie andere Felder anbieten, als
 * die Empfangsprüfung akzeptiert — ein Vertrag, zwei Verbraucher.
 */
export default function ParameterFelder({
  schema,
  werte,
  onChange,
  faecher = [],
  aufgabenarten = [],
  schrittTypen = [],
}) {
  const properties = schema?.properties || {};
  const pflicht = schema?.required || [];

  const setzen = (key, wert) => onChange({ ...werte, [key]: wert });

  return (
    <div className="space-y-4">
      {Object.entries(properties).map(([key, def]) => {
        const label = def.label || key;
        const istPflicht = pflicht.includes(key);
        const wert = werte?.[key];

        // Schritte einer Aufgabensequenz sind keine Textfelder, sondern eine
        // eigene Blockliste — ein JSON-Kasten wäre hier unbedienbar.
        if (key === 'sequenz_schritte' || key === 'schritt') {
          return (
            <SchritteFeld
              key={key}
              label={label}
              werte={wert}
              onChange={(v) => setzen(key, v)}
              typen={schrittTypen}
              aufgabenarten={aufgabenarten}
              einzeln={key === 'schritt'}
            />
          );
        }

        // Fach und Aufgabenart bekommen echte Auswahllisten aus dem Bestand.
        const optionen =
          key === 'fach' ? faecher.map((f) => ({ value: f, label: f })) :
          key === 'aktivitaet_id' ? aufgabenarten.map((a) => ({ value: a.id, label: `${a.name} (${a.phase})` })) :
          def.enum ? def.enum.map((e) => ({ value: e, label: e })) : null;

        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm">
              {label}
              {istPflicht && <span className="ml-1 text-destructive">*</span>}
              <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">{key}</span>
            </Label>

            {optionen ? (
              <Select value={wert || ''} onValueChange={(v) => setzen(key, v)}>
                <SelectTrigger>
                  <SelectValue placeholder={`${label} wählen`} />
                </SelectTrigger>
                <SelectContent>
                  {optionen.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : def.type === 'object' ? (
              <Textarea
                rows={10}
                className="font-mono text-xs"
                placeholder='{ "aufgabenstellung": "…" }'
                value={typeof wert === 'string' ? wert : wert ? JSON.stringify(wert, null, 2) : ''}
                onChange={(e) => setzen(key, e.target.value)}
              />
            ) : def.type === 'array' ? (
              <Input
                placeholder="Werte mit Komma trennen"
                value={Array.isArray(wert) ? wert.join(', ') : wert || ''}
                onChange={(e) => setzen(key, e.target.value)}
              />
            ) : def.type === 'number' ? (
              <Input
                type="number"
                value={wert ?? ''}
                onChange={(e) => setzen(key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            ) : (
              <Input value={wert || ''} onChange={(e) => setzen(key, e.target.value)} />
            )}

            {def.hinweis && <p className="text-xs text-muted-foreground">{def.hinweis}</p>}
          </div>
        );
      })}
    </div>
  );
}