/**
 * UnterrichtFachSeite.jsx
 *
 * Die Arbeitsseite EINER Unterrichts-Kachel (Fach + Jahrgangsstufe).
 *
 * Aufbau (2026-09-14 umgestellt): Die EINHEITEN sind die Oberstruktur — so
 * arbeiten Lehrkräfte tatsächlich („Deutsch 9, gerade Rechtschreibung"). Jede
 * Einheit ist ein Container, in dem ihre Unterrichtsstunden und ihre
 * Übungsblöcke liegen; angelegt wird von dort aus mit nur einem Namen.
 *
 * Vorher standen Stunden und Übungsblöcke als zwei lose Bereiche nebeneinander,
 * ohne die Einheit, zu der sie gehören.
 *
 * Aufruf: /unterricht?fach=Mathematik&jg=6
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRBAC } from '@/hooks/useRBAC';
import { istUebungsblock } from '@/lib/einheitFormat';
import FachEinheitKarte from '@/components/unterricht/FachEinheitKarte';
import SchnellAnlegenDialog from '@/components/unterricht/SchnellAnlegenDialog';
import { useEinheitAnlegen } from '@/hooks/useFachEinheitInhalte';
import AnleitungDialogButton from '@/components/shared/AnleitungDialogButton';
import StundenMoodleWegInfoBox from '@/components/unterrichtsstunden/StundenMoodleWegInfoBox';
import UebungsblockMoodleWegInfoBox from '@/components/uebungsbloecke/UebungsblockMoodleWegInfoBox';

export default function UnterrichtFachSeite() {
  const navigate = useNavigate();
  const { authUser } = useRBAC();
  const [neuOffen, setNeuOffen] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const fach = params.get('fach') || '';
  const jahrgang = params.get('jg') || '';

  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten', 'privat'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitenListSecure', { page: 1, limit: 100, view: 'privat' });
      return res.data?.data || [];
    },
  });

  const { data: stunden = [] } = useQuery({
    queryKey: ['unterrichtsstunden', authUser?.email],
    queryFn: () => base44.entities.Unterrichtsstunde.filter({ besitzer_email: authUser.email }, '-updated_date', 200),
    enabled: !!authUser?.email,
  });

  const einheitAnlegen = useEinheitAnlegen(fach, jahrgang);

  // Für diese Kachel zählt nur, was zu Fach UND Jahrgang passt.
  const passende = useMemo(
    () => einheiten.filter((e) => e.fach === fach && String(e.jahrgangsstufe) === String(jahrgang)),
    [einheiten, fach, jahrgang]
  );
  const container = useMemo(() => passende.filter((e) => !istUebungsblock(e)), [passende]);
  const bloecke = useMemo(() => passende.filter(istUebungsblock), [passende]);

  // Übungsblöcke ohne Zuordnung (Altbestand) hängen an der ersten Einheit,
  // damit sie nicht unsichtbar werden.
  const ersteId = container[0]?.id;
  const bloeckeZu = (einheitId) =>
    bloecke.filter((b) =>
      b.eltern_einheit_id ? b.eltern_einheit_id === einheitId : einheitId === ersteId
    );

  if (!fach || !jahrgang) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Kein Fach ausgewählt.</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">Zurück zur Übersicht</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Zurück zu meinem Unterricht"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {fach} · Jg. {jahrgang}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Deine Einheiten in diesem Fach — mit ihren Unterrichtsstunden und Übungsblöcken.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AnleitungDialogButton titel="Wie kommt meine Unterrichtsstunde zu den Schülern nach Moodle?">
            <StundenMoodleWegInfoBox />
          </AnleitungDialogButton>
          <AnleitungDialogButton titel="Wie kommt mein Übungsblock zu den Schülern nach Moodle?">
            <UebungsblockMoodleWegInfoBox />
          </AnleitungDialogButton>
          <Button size="sm" onClick={() => setNeuOffen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Neue Einheit
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : container.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Einheit in {fach} Jg. {jahrgang}. Leg eine an — z. B. „Rechtschreibung" —
            und plane darin Stunden und Übungsblöcke.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {container.map((e) => (
            <FachEinheitKarte
              key={e.id}
              einheit={e}
              stunden={stunden.filter((s) => s.einheit_id === e.id)}
              bloecke={bloeckeZu(e.id)}
              besitzerEmail={authUser?.email}
            />
          ))}
        </div>
      )}

      <SchnellAnlegenDialog
        open={neuOffen}
        onOpenChange={setNeuOffen}
        titel={`Neue Einheit in ${fach} Jg. ${jahrgang}`}
        label="Name der Einheit *"
        platzhalter="z. B. Rechtschreibung"
        hinweis="Den Namen kannst du später jederzeit ändern."
        aktionText="Einheit anlegen"
        laeuft={einheitAnlegen.isPending}
        onSubmit={(name, reset) => einheitAnlegen.mutate(name, {
          onSuccess: () => { reset(); setNeuOffen(false); },
        })}
      />
    </div>
  );
}