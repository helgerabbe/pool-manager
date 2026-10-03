/**
 * UnterrichtFachSeite.jsx
 *
 * Die Arbeitsseite EINER Unterrichts-Kachel (Fach + Jahrgangsstufe).
 *
 * Aufbau: Die UNTERRICHTSEINHEITEN sind die Oberstruktur — so arbeiten
 * Lehrkräfte tatsächlich („Deutsch 9, gerade Rechtschreibung"). Jede
 * Unterrichtseinheit ist eine Mappe, in der ihre Unterrichtsstunden und ihre
 * Übungsblöcke liegen; angelegt wird von dort aus mit nur einem Namen.
 *
 * BEGRIFFE (2026-09-14 getrennt): Eine UNTERRICHTSEINHEIT (eigene Entity) ist
 * die Ordnungsmappe dieses Bereichs. Eine EINHEIT (Bereich „Meine Einheiten")
 * ist das vollständige Lernszenario mit Dashboards, Freigabe und Moodle-Kurs.
 * Beides sind verschiedene Dinge und getrennte Datensätze.
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
import { useUnterrichtseinheitAnlegen } from '@/hooks/useFachEinheitInhalte';
import { lerngruppeTitel } from '@/hooks/useLerngruppen';
import AnleitungDialogButton from '@/components/shared/AnleitungDialogButton';
import StundenMoodleWegInfoBox from '@/components/unterrichtsstunden/StundenMoodleWegInfoBox';
import UebungsblockMoodleWegInfoBox from '@/components/uebungsbloecke/UebungsblockMoodleWegInfoBox';

export default function UnterrichtFachSeite() {
  const navigate = useNavigate();
  const { authUser } = useRBAC();
  const [neuOffen, setNeuOffen] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const lgId = params.get('lg') || '';
  // Altlinks (?fach=&jg=) landen in der ersten passenden Lerngruppe.
  const altFach = params.get('fach') || '';
  const altJg = params.get('jg') || '';

  const { data: lerngruppen = [], isLoading: lgLaden } = useQuery({
    queryKey: ['lerngruppen', authUser?.email],
    queryFn: () => base44.entities.Lerngruppe.filter({ besitzer_email: authUser.email }, 'reihenfolge', 200),
    enabled: !!authUser?.email,
  });
  const lerngruppe = lgId
    ? lerngruppen.find((l) => l.id === lgId)
    : lerngruppen.find((l) => l.fach === altFach && String(l.jahrgangsstufe) === String(altJg));
  const fach = lerngruppe?.fach || '';
  const jahrgang = lerngruppe?.jahrgangsstufe || '';

  const { data: mappen = [], isLoading: ueLaden } = useQuery({
    queryKey: ['unterrichtseinheiten', authUser?.email, 'lg', lerngruppe?.id],
    queryFn: () => base44.entities.Unterrichtseinheit.filter({
      besitzer_email: authUser.email,
      lerngruppe_id: lerngruppe.id,
    }, 'reihenfolge', 100),
    enabled: !!authUser?.email && !!lerngruppe?.id,
  });
  const isLoading = lgLaden || ueLaden;

  const { data: einheiten = [] } = useQuery({
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

  const anlegen = useUnterrichtseinheitAnlegen(lerngruppe, authUser?.email);

  // Übungsblöcke bleiben Einheiten-Datensätze (sie brauchen Moodle-Anbindung);
  // ihre Ordnung in diesem Bereich läuft über eltern_einheit_id.
  const bloecke = useMemo(
    () => einheiten.filter(
      (e) => istUebungsblock(e) && e.fach === fach && String(e.jahrgangsstufe) === String(jahrgang)
    ),
    [einheiten, fach, jahrgang]
  );

  if (lgLaden) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!lerngruppe) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Lerngruppe nicht gefunden.</p>
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
            {lerngruppeTitel(lerngruppe)}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {lerngruppe.name ? `${fach} · Jg. ${jahrgang} — ` : ''}Deine Unterrichtseinheiten in dieser Lerngruppe — mit Unterrichtsstunden und selbstständigen Übungen.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AnleitungDialogButton titel="Wie kommen Stunden und selbstständige Übungen zu den Schülern nach Moodle?">
            <div className="space-y-4">
              <StundenMoodleWegInfoBox />
              <UebungsblockMoodleWegInfoBox />
            </div>
          </AnleitungDialogButton>
          <Button size="sm" onClick={() => setNeuOffen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Neue Unterrichtseinheit
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : mappen.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Unterrichtseinheit in dieser Lerngruppe. Leg eine an — z. B.
            „Rechtschreibung" — und plane darin Stunden und selbstständige Übungen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mappen.map((m) => (
            <FachEinheitKarte
              key={m.id}
              unterrichtseinheit={m}
              stunden={stunden.filter((s) => s.unterrichtseinheit_id === m.id)}
              bloecke={bloecke.filter((b) => b.eltern_einheit_id === m.id)}
              besitzerEmail={authUser?.email}
            />
          ))}
        </div>
      )}

      <SchnellAnlegenDialog
        open={neuOffen}
        onOpenChange={setNeuOffen}
        titel={`Neue Unterrichtseinheit in ${lerngruppeTitel(lerngruppe)}`}
        label="Name der Unterrichtseinheit *"
        platzhalter="z. B. Rechtschreibung"
        hinweis="Den Namen kannst du später jederzeit ändern."
        aktionText="Anlegen"
        laeuft={anlegen.isPending}
        onSubmit={(name, reset) => anlegen.mutate(name, {
          onSuccess: () => { reset(); setNeuOffen(false); },
        })}
      />
    </div>
  );
}