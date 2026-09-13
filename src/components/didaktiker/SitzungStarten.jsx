import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

/**
 * Der Einstieg: Thema, Fach, Jahrgang — und optional Buchseiten des Lehrwerks.
 * Die Buchseiten sind der Grund, warum der Entwurf zur Klasse passt und nicht
 * zu einem beliebigen Lehrplan.
 */
export default function SitzungStarten({ email, onStart, laeuft }) {
  const [fach, setFach] = useState('');
  const [jahrgang, setJahrgang] = useState('9');
  const [thema, setThema] = useState('');
  const [vorgaben, setVorgaben] = useState('');
  const [dateien, setDateien] = useState([]);
  const [laedt, setLaedt] = useState(false);

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('name', 100),
  });

  const hochladen = async (event) => {
    const liste = Array.from(event.target.files || []);
    if (liste.length === 0) return;
    setLaedt(true);
    try {
      for (const file of liste) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        setDateien((alt) => [...alt, { url: file_url, name: file.name }]);
      }
    } catch (error) {
      toast.error('Die Datei konnte nicht hochgeladen werden.');
    } finally {
      setLaedt(false);
      event.target.value = '';
    }
  };

  const bereit = fach && jahrgang && thema.trim().length > 2;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Neues Basispaket entwickeln</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Sagen Sie, was die Klasse lernen soll. Der Didaktiker recherchiert, wie man das gut aufbaut,
          und schlägt Ihnen eine Struktur vor.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fach</Label>
            <Select value={fach} onValueChange={setFach}>
              <SelectTrigger>
                <SelectValue placeholder="Fach wählen" />
              </SelectTrigger>
              <SelectContent>
                {faecher
                  .filter((f) => f.ist_aktiv !== false)
                  .map((f) => (
                    <SelectItem key={f.id} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Jahrgangsstufe</Label>
            <Select value={jahrgang} onValueChange={setJahrgang}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JAHRGAENGE.map((j) => (
                  <SelectItem key={j} value={j}>
                    Jahrgang {j}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Thema</Label>
          <Input
            value={thema}
            onChange={(e) => setThema(e.target.value)}
            placeholder="z. B. Dezimalzahlen addieren und subtrahieren"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Besondere Wünsche (optional)</Label>
          <Textarea
            rows={3}
            value={vorgaben}
            onChange={(e) => setVorgaben(e.target.value)}
            placeholder="Schwerpunkte, Situation der Klasse, Zeitrahmen …"
          />
        </div>

        <div className="space-y-2">
          <Label>Seiten aus dem Lehrwerk (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Fotos oder PDF-Seiten des Buches. Der Entwurf richtet sich dann an Begriffen und
            Aufgabentypen aus, die die Klasse kennt.
          </p>
          <div className="flex flex-wrap gap-2">
            {dateien.map((d, i) => (
              <span
                key={`${d.url}-${i}`}
                className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
              >
                {d.name}
                <button
                  type="button"
                  onClick={() => setDateien((alt) => alt.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
            {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Dateien wählen
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={hochladen}
            />
          </label>
        </div>

        <Button
          className="gap-2"
          disabled={!bereit || laeuft || laedt}
          onClick={() =>
            onStart({
              besitzer_email: email,
              titel: thema.trim(),
              fach,
              jahrgangsstufe: jahrgang,
              thema: thema.trim(),
              vorgaben: vorgaben.trim(),
              buch_dateien: dateien,
              schritt: 'einstieg',
              status: 'offen',
            })
          }
        >
          {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Recherche starten
        </Button>
      </CardContent>
    </Card>
  );
}