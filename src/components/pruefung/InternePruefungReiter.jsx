/**
 * InternePruefungReiter — Reiter „Interne Prüfung" im Prüfbereich (Tab 8).
 *
 * Die eigene Prüfung der Schule: Schnellprüfung (mechanisch) und KI-Durchsicht.
 * Zeigt ausschließlich Befunde eigener Herkunft – die Rückmeldungen des Baus
 * liegen im zweiten Reiter, damit die Liste hier übersichtlich bleibt.
 */
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, Sparkles } from 'lucide-react';
import { getBefundZiel, gruppiereBefunde } from '@/lib/pruefungZiele';
import { PRUEF_SCHWERE } from '@/lib/pruefungKategorien';
import PruefungFortschritt from './PruefungFortschritt';
import PruefbefundKarte from './PruefbefundKarte';
import BrianCheckCard from '@/components/exportcenter/BrianCheckCard';

export default function InternePruefungReiter({
  einheitId,
  befunde = [],
  isLoading = false,
  aufgaben = [],
  kannStarten = false,
  laeuft = false,
  fortschritt = null,
  onStarten,
  onEntscheiden,
}) {
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
    <div className="space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-[240px]">
          Der Pool-Manager schaut alle Lernpakete und Aufgaben dieser Einheit durch und sammelt, was
          den Schülern später Probleme machen würde. Der schnelle Check findet leere Felder und
          vergessene Platzhalter. Die gründliche Prüfung liest zusätzlich mit und sagt dir, wenn eine
          Aufgabenstellung unklar ist, die Musterlösung fehlt oder ein Text zu schwer ist — das
          dauert ein paar Minuten.
        </p>
        {kannStarten && (
          <div className="flex flex-col gap-2 items-end">
            <Button onClick={() => onStarten({ mitKI: false })} disabled={laeuft}>
              {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Schneller Check
            </Button>
            <Button variant="outline" onClick={() => onStarten({ mitKI: true })} disabled={laeuft}>
              <Sparkles className="w-4 h-4" /> Gründlich prüfen (mit KI)
            </Button>
          </div>
        )}
      </div>

      <PruefungFortschritt fortschritt={fortschritt} />

      {/* Vollständigkeits-Check, den die KI-Prüfung nicht abdeckt: Sind die vier
          Brian-Übergabefelder erzeugt? Das ÜBERTRAGEN nach Brian.study bleibt im
          Export-Center. Fehlende KI-Inhalte werden nicht mehr zentral gesammelt,
          sondern direkt in der jeweiligen Befund-Kachel erzeugt. */}
      <BrianCheckCard einheitId={einheitId} />

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">{offen} offen</Badge>
        <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">{behoben} erledigt</Badge>
        <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200">{bewusst} bleiben so</Badge>
        <Button size="sm" variant="ghost" onClick={() => setNurOffen((v) => !v)}>
          {nurOffen ? 'Auch erledigte Punkte zeigen' : 'Nur offene Punkte zeigen'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Offene Punkte werden geladen …</p>
      ) : gruppen.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {befunde.length === 0
            ? 'Noch nicht geprüft. Klicke oben auf „Schneller Check" oder „Gründlich prüfen", dann siehst du hier, was noch fehlt.'
            : 'Keine offenen Punkte – alles erledigt.'}
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
                einheitId={einheitId}
                kannBewusstSetzen={kannStarten}
                onEntscheiden={onEntscheiden}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}