/**
 * MbkBefundeReiter — Reiter „Rückmeldung der MBK" im Prüfbereich (Tab 8).
 *
 * Der Bau legt seine Funde als Datei im Repository ab (Format:
 * src/docs/mbk-rueckmeldung-format.md); hier werden sie abgeholt und in
 * dieselbe Taskliste übernommen wie die eigenen Befunde.
 *
 * Bewusst zwei getrennte Schritte:
 *   1. Abholen — übernimmt ALLES ungefiltert, damit nichts verloren geht.
 *   2. Auf Dubletten prüfen — startet die Lehrkraft selbst; markiert nur, was
 *      die interne Liste schon enthält, und löscht nie etwas.
 */
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DownloadCloud, Loader2, CopyCheck, Inbox } from 'lucide-react';
import { getBefundZiel } from '@/lib/pruefungZiele';
import { PRUEF_SCHWERE } from '@/lib/pruefungKategorien';
import {
  useMbkBefunde,
  useMbkAdminTodos,
  useMbkRueckmeldungAktionen,
  useMbkAdminTodoErledigen,
} from '@/hooks/useMbkRueckmeldung';
import PruefbefundKarte from './PruefbefundKarte';
import MbkAdminPunkteListe from './MbkAdminPunkteListe';

export default function MbkBefundeReiter({
  einheitId,
  aufgaben = [],
  kannStarten = false,
  istAdmin = false,
  onEntscheiden,
}) {
  const { data: befunde = [], isLoading } = useMbkBefunde(einheitId);
  const { data: adminPunkte = [] } = useMbkAdminTodos(einheitId);
  const { abholen, abholenLaeuft, dublettenPruefen, dublettenLaeuft } =
    useMbkRueckmeldungAktionen(einheitId);
  const erledigen = useMbkAdminTodoErledigen();
  const [zeigeDubletten, setZeigeDubletten] = useState(false);

  const offene = useMemo(
    () => befunde.filter((b) => (b.entscheidung || 'offen') === 'offen'),
    [befunde]
  );
  const dubletten = useMemo(
    () => offene.filter((b) => b.dublette_status === 'dublette'),
    [offene]
  );
  const sichtbar = useMemo(() => {
    const liste = zeigeDubletten ? offene : offene.filter((b) => b.dublette_status !== 'dublette');
    return [...liste].sort(
      (a, b) => (PRUEF_SCHWERE[a.schwere]?.rang ?? 9) - (PRUEF_SCHWERE[b.schwere]?.rang ?? 9)
    );
  }, [offene, zeigeDubletten]);

  const ungeprueft = offene.filter((b) => (b.dublette_status || 'offen') === 'offen').length;
  const offeneAdminPunkte = adminPunkte.filter((p) => p.status !== 'erledigt');

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-[240px]">
          Wenn das Moodle-Team deine Einheit in den Kurs einbaut, fällt ihm manchmal noch etwas auf.
          Diese Hinweise landen automatisch hier — einmal am Tag. Mit dem Knopf holst du sie sofort,
          wenn du nicht warten willst.
        </p>
        <div className="flex flex-col gap-2 items-end">
          <Button onClick={abholen} disabled={abholenLaeuft}>
            {abholenLaeuft ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DownloadCloud className="w-4 h-4" />
            )}
            Neue Hinweise holen
          </Button>
          {kannStarten && befunde.length > 0 && (
            <Button variant="outline" onClick={dublettenPruefen} disabled={dublettenLaeuft}>
              {dublettenLaeuft ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CopyCheck className="w-4 h-4" />
              )}
              Doppelte Punkte finden
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
          {offene.length - dubletten.length} zu klären
        </Badge>
        <Badge variant="outline" className="bg-slate-50">
          {dubletten.length} doppelt (stehen schon unter „Selbst prüfen")
        </Badge>
        {ungeprueft > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
            {ungeprueft} noch nicht auf Doppelte geprüft
          </Badge>
        )}
        {dubletten.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setZeigeDubletten((v) => !v)}>
            {zeigeDubletten ? 'Doppelte ausblenden' : 'Doppelte mitanzeigen'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Hinweise werden geladen …</p>
      ) : sichtbar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Inbox className="w-5 h-5 mx-auto mb-2 opacity-60" />
          {befunde.length === 0
            ? 'Vom Moodle-Team gibt es zu dieser Einheit noch keine Hinweise.'
            : 'Alle Hinweise sind erledigt oder stehen schon unter „Selbst prüfen".'}
        </div>
      ) : (
        <div className="space-y-2">
          {sichtbar.map((b) => (
            <div key={b.id} className="space-y-1">
              {b.dublette_status === 'dublette' && (
                <p className="text-xs text-muted-foreground">
                  Doppelt
                  {b.dublette_begruendung ? `: ${b.dublette_begruendung}` : '.'} Steht schon unter
                  „Selbst prüfen".
                </p>
              )}
              <PruefbefundKarte
                befund={b}
                ziel={getBefundZiel(b, { einheitId, aufgaben })}
                einheitId={einheitId}
                kannBewusstSetzen={kannStarten}
                onEntscheiden={onEntscheiden}
              />
            </div>
          ))}
        </div>
      )}

      {offeneAdminPunkte.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Für die Administration <span className="font-normal">({offeneAdminPunkte.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Diese Punkte erledigt die Administration direkt in Moodle. Du musst hier nichts tun.
          </p>
          <MbkAdminPunkteListe
            punkte={offeneAdminPunkte}
            kannErledigen={istAdmin}
            onErledigen={erledigen}
          />
        </div>
      )}
    </div>
  );
}