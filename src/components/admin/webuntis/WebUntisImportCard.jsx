/**
 * WebUntisImportCard.jsx
 *
 * „Aus WebUntis vorschlagen": holt aus dem Stundenplan der Jahrgang-9-Klassen,
 * wer welches Fach unterrichtet, und zeigt es als Liste zum Bestätigen.
 * Gespeichert (FachEinsatz, quelle='webuntis') wird ausschließlich, was hier
 * angehakt ist — WebUntis schreibt nie direkt in die Zuordnung.
 *
 * WebUntis liefert nur Nachnamen, keine E-Mails. Eindeutige Namenstreffer sind
 * vorgehakt, unklare und unbekannte bleiben mit dem WebUntis-Namen sichtbar und
 * werden von Hand zugeordnet.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WebUntisVorschlagZeile from './WebUntisVorschlagZeile';

const schluessel = (fach, name) => `${fach}||${name}`;

export default function WebUntisImportCard() {
  const queryClient = useQueryClient();
  const [daten, setDaten] = useState(null);
  const [wahlen, setWahlen] = useState({});

  const holen = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('webuntisFachEinsatzVorschlag', {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (d) => {
      const start = {};
      for (const f of d.faecher) {
        for (const l of f.lehrkraefte) {
          start[schluessel(f.fach, l.untis_name)] = {
            email: l.email,
            aktiv: l.status === 'sicher' && !l.bereits_eingetragen,
          };
        }
      }
      setDaten(d);
      setWahlen(start);
    },
    onError: (err) => toast.error(err?.message || 'WebUntis konnte nicht abgefragt werden.'),
  });

  const speichern = useMutation({
    mutationFn: async () => {
      const neu = [];
      for (const f of daten.faecher) {
        for (const l of f.lehrkraefte) {
          const w = wahlen[schluessel(f.fach, l.untis_name)];
          if (!w?.aktiv || !w.email) continue;
          if (l.bereits_eingetragen && w.email === l.email) continue;
          const person = daten.kollegen.find((k) => k.email === w.email);
          neu.push({
            fach: f.fach,
            jahrgangsstufe: daten.jahrgangsstufe,
            lehrkraft_email: w.email,
            lehrkraft_name: person?.name || w.email,
            quelle: 'webuntis',
          });
        }
      }
      if (neu.length === 0) throw new Error('Es ist nichts angehakt.');
      await base44.entities.FachEinsatz.bulkCreate(neu);
      return neu.length;
    },
    onSuccess: (anzahl) => {
      toast.success(`${anzahl} Zuordnung(en) eingetragen.`);
      queryClient.invalidateQueries({ queryKey: ['fachEinsatz'] });
      setDaten(null);
      setWahlen({});
    },
    onError: (err) => toast.error(err?.message || 'Konnte nicht gespeichert werden.'),
  });

  const offen = Object.values(wahlen).filter((w) => w.aktiv && w.email).length;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Zuordnung aus WebUntis vorschlagen</CardTitle>
            <CardDescription>
              Liest den aktuellen Stundenplan der Jahrgang-9-Klassen und schlägt vor, wer welches
              Fach unterrichtet. Berücksichtigt werden nur Fächer, die es auch hier gibt —
              AGs, Schülerfirma, Sport, Religion und Ähnliches bleiben außen vor.
              Eingetragen wird nur, was du anhakst.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => holen.mutate()}
            disabled={holen.isPending}
          >
            {holen.isPending
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            {daten ? 'Neu abfragen' : 'Vorschläge holen'}
          </Button>
        </div>
      </CardHeader>

      {daten && (
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Klassen: {daten.klassen.join(', ')} · Stundenplan-Woche {String(daten.zeitraum.start).slice(6)}.
            {String(daten.zeitraum.start).slice(4, 6)}.–{String(daten.zeitraum.ende).slice(6)}.
            {String(daten.zeitraum.ende).slice(4, 6)}.
          </p>

          {daten.faecher.map((f) => (
            <div key={f.fach} className="rounded-lg border p-3">
              <p className="text-sm font-semibold mb-1">{f.fach}</p>
              <div className="divide-y">
                {f.lehrkraefte.map((l) => (
                  <WebUntisVorschlagZeile
                    key={l.untis_name}
                    eintrag={l}
                    kollegen={daten.kollegen}
                    wahl={wahlen[schluessel(f.fach, l.untis_name)]}
                    onChange={(w) =>
                      setWahlen((alt) => ({ ...alt, [schluessel(f.fach, l.untis_name)]: w }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-1">
            <span className="text-xs text-muted-foreground">{offen} ausgewählt</span>
            <Button
              size="sm"
              onClick={() => speichern.mutate()}
              disabled={speichern.isPending || offen === 0}
            >
              {speichern.isPending ? 'Wird eingetragen…' : 'Ausgewählte eintragen'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}