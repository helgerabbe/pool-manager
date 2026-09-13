import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';
import ParameterFelder from '@/components/importcenter/ParameterFelder';
import PruefergebnisListe from '@/components/importcenter/PruefergebnisListe';
import { useAuftragsSchemata, useImportAuftragAktionen } from '@/hooks/useImportCenter';
import { normalisiereSchritt, normalisiereSchrittfolge } from '@/lib/importSchritte';

const ZIEL_LABEL = {
  einheit: 'Einheit',
  themenfeld: 'Themenfeld',
  lernpaket: 'Lernpaket',
  aktivitaet: 'Aktivität',
  allgemeine_aufgabe: 'Allgemeine Aufgabe',
};

/**
 * Der interne Eingang (v1): Eine berechtigte Person stellt hier einen Auftrag,
 * statt ihn von außen zu schicken. Geprüft wird er über genau denselben Weg,
 * den später ein externer Absender nimmt.
 */
export default function AuftragFormular() {
  const { data: schemata, isLoading } = useAuftragsSchemata();
  const { pruefen } = useImportAuftragAktionen();

  const [art, setArt] = useState('');
  const [titel, setTitel] = useState('');
  const [zielId, setZielId] = useState('');
  const [position, setPosition] = useState('');
  const [parameter, setParameter] = useState({});
  const [ergebnis, setErgebnis] = useState(null);
  const [formatFehler, setFormatFehler] = useState('');

  const artDef = useMemo(
    () => (schemata?.auftragsarten || []).find((a) => a.art === art) || null,
    [schemata, art]
  );

  const artWechseln = (neu) => {
    setArt(neu);
    setParameter({});
    setZielId('');
    setPosition('');
    setErgebnis(null);
    setFormatFehler('');
  };

  const absenden = async () => {
    setFormatFehler('');
    const pSchema = artDef?.parameter?.properties || {};
    const nutzdaten = {};

    const schrittTypen = schemata?.schritt_typen || [];

    for (const [key, def] of Object.entries(pSchema)) {
      const wert = parameter[key];
      if (wert === undefined || wert === '' || wert === null) continue;

      // Schritte tragen ihre Nutzdaten in Unterobjekten — die Umwandlung
      // (JSON-Texte, Komma-Listen) liegt zentral in lib/importSchritte.
      if (key === 'sequenz_schritte' || key === 'schritt') {
        try {
          nutzdaten[key] =
            key === 'schritt'
              ? normalisiereSchritt(wert, schrittTypen)
              : normalisiereSchrittfolge(wert, schrittTypen);
        } catch {
          setFormatFehler('Ein Schritt enthält ungültiges JSON in den Inhalten der Aufgabenart.');
          return;
        }
        continue;
      }

      if (def.type === 'object') {
        try {
          nutzdaten[key] = typeof wert === 'string' ? JSON.parse(wert) : wert;
        } catch {
          setFormatFehler(`Das Feld "${def.label || key}" enthält kein gültiges JSON.`);
          return;
        }
      } else if (def.type === 'array') {
        nutzdaten[key] = Array.isArray(wert)
          ? wert
          : String(wert)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
      } else {
        nutzdaten[key] = wert;
      }
    }

    const data = await pruefen.mutateAsync({
      auftrags_art: art,
      titel,
      ziel_id: zielId || undefined,
      position: artDef?.position_erlaubt && position !== '' ? Number(position) : undefined,
      parameter: nutzdaten,
    });
    setErgebnis(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Vertrag wird geladen …
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neuen Auftrag stellen</CardTitle>
          <p className="text-sm text-muted-foreground">
            Der Auftrag wird geprüft und im Posteingang abgelegt. Ausgeführt wird er erst,
            wenn ihn dort jemand bewusst freigibt.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm">Auftragsart *</Label>
            <Select value={art} onValueChange={artWechseln}>
              <SelectTrigger>
                <SelectValue placeholder="Was soll geschehen?" />
              </SelectTrigger>
              <SelectContent>
                {(schemata?.auftragsarten || []).map((a) => (
                  <SelectItem key={a.art} value={a.art}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {artDef && <p className="text-xs text-muted-foreground">{artDef.beschreibung}</p>}
          </div>

          {artDef && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">Bezeichnung im Posteingang</Label>
                <Input
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  placeholder={artDef.label}
                />
              </div>

              {artDef.ziel_typ !== 'keines' && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {ZIEL_LABEL[artDef.ziel_typ]}-ID *
                  </Label>
                  <Input
                    className="font-mono text-xs"
                    value={zielId}
                    onChange={(e) => setZielId(e.target.value)}
                    placeholder="ID aus dem Reiter „Nachschlagen“ kopieren"
                  />
                </div>
              )}

              {artDef.position_erlaubt && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Position (0 = an den Anfang)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="leer = hinten anhängen"
                  />
                </div>
              )}

              <ParameterFelder
                schema={artDef.parameter}
                werte={parameter}
                onChange={setParameter}
                faecher={schemata?.faecher || []}
                aufgabenarten={schemata?.aufgabenarten || []}
                schrittTypen={schemata?.schritt_typen || []}
              />

              {formatFehler && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formatFehler}
                </div>
              )}

              <Button onClick={absenden} disabled={pruefen.isPending} className="gap-2">
                {pruefen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Auftrag prüfen und einreichen
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {ergebnis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prüfergebnis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PruefergebnisListe punkte={ergebnis.pruefergebnis || []} />
            <p className="text-sm text-muted-foreground">
              Der Auftrag liegt jetzt im Posteingang. Dort kann er begutachtet, in der
              Schüler-Vorschau angesehen und freigegeben werden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}