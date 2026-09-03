/**
 * PruefbereichTab — Reiter 8: Export-Vorprüfung mit Taskliste.
 *
 * Die Leitung startet hier die Prüfung; sie geht Lernpaket für Lernpaket
 * durch (Fortschrittsbalken) und listet die Befunde nach den fünf
 * MBK-Fehlerkategorien auf. Jeder Befund verlinkt an seinen Arbeitsort und
 * lässt sich als behoben oder — durch die Leitung, mit Begründung — als
 * bewusst gelassen markieren.
 */
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, ShieldCheck, Loader2 } from 'lucide-react';
import { usePruefbefunde, usePruefungLauf } from '@/hooks/usePruefung';
import { getBefundZiel, gruppiereBefunde } from '@/lib/pruefungZiele';
import { PRUEF_SCHWERE } from '@/lib/pruefungKategorien';
import PruefungFortschritt from './PruefungFortschritt';
import PruefbefundKarte from './PruefbefundKarte';

export default function PruefbereichTab({ einheit, aufgaben = [], kannStarten = false }) {
  const einheitId = einheit?.id;
  const { data: befunde = [], isLoading } = usePruefbefunde(einheitId);
  const { laeuft, fortschritt, starten, entscheiden } = usePruefungLauf(einheitId);
  const [nurOffen, setNurOffen] = useState(true);

  const sichtbar = useMemo(() => {
    const liste = nurOffen ? befunde.filter((b) => b.entscheidung === 'offen') : befunde;
    return [...liste].sort(
      (a, b) => (PRUEF_SCHWERE[a.schwere]?.rang ?? 9) - (PRUEF_SCHWERE[b.schwere]?.rang ?? 9)
    );
  }, [befunde, nurOffen]);

  const gruppen = useMemo(() => gruppiereBefunde(sichtbar), [sichtbar]);
  const offen = befunde.filter((b) => b.entscheidung === 'offen').length;
  const behoben = befunde.filter((b) => b.entscheidung === 'behoben').length;
  const bewusst = befunde.filter((b) => b.entscheidung === 'bewusst').length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Vollständigkeitsprüfung
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Die Prüfung geht alle Lernpakete, Aufgaben und die vorab erzeugten KI-Seiten dieser
            Einheit durch und sammelt, was im Kurs später Probleme machen würde.
          </p>
        </div>
        {kannStarten && (
          <Button onClick={starten} disabled={laeuft}>
            {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Prüfung starten
          </Button>
        )}
      </div>

      <PruefungFortschritt fortschritt={fortschritt} />

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">{offen} offen</Badge>
        <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">{behoben} behoben</Badge>
        <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200">{bewusst} bewusst gelassen</Badge>
        <Button size="sm" variant="ghost" onClick={() => setNurOffen((v) => !v)}>
          {nurOffen ? 'Alle Befunde zeigen' : 'Nur offene zeigen'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Befunde werden geladen …</p>
      ) : gruppen.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {befunde.length === 0
            ? 'Noch keine Prüfung gelaufen. Starte die Prüfung, um den Stand dieser Einheit zu sehen.'
            : 'Keine offenen Befunde – alles abgearbeitet.'}
        </div>
      ) : (
        gruppen.map((g) => (
          <div key={g.key} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {g.titel} <span className="font-normal">({g.befunde.length})</span>
            </h3>
            {g.befunde.map((b) => (
              <PruefbefundKarte
                key={b.id}
                befund={b}
                ziel={getBefundZiel(b, { einheitId, aufgaben })}
                kannBewusstSetzen={kannStarten}
                onEntscheiden={entscheiden}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}