/**
 * MeinUnterrichtBereich.jsx
 *
 * Reiter „Mein Unterricht" der Privaten Bibliothek: eine ruhige Übersicht der
 * Fächer und Jahrgangsstufen, in denen die Lehrkraft arbeitet.
 *
 * Die Kacheln entstehen AUTOMATISCH aus den vorhandenen Unterrichtsstunden und
 * Übungsblöcken. Zusätzlich kann die Lehrkraft eigene (auch noch leere) Kacheln
 * anlegen, sie benennen und ihre Reihenfolge ändern — das liegt in der Entity
 * UnterrichtsKachel und lässt die Inhalte selbst unberührt.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import { istUebungsblock } from '@/lib/einheitFormat';
import { getFachFarbe } from '@/lib/fachFarben';
import UnterrichtKachel from './UnterrichtKachel';
import KachelDialog from './KachelDialog';

const schluessel = (fach, jg) => `${fach}::${jg}`;

export default function MeinUnterrichtBereich({ einheiten = [], besitzerEmail, faecher = [] }) {
  const queryClient = useQueryClient();
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(null);

  const { data: stunden = [] } = useQuery({
    queryKey: ['unterrichtsstunden', besitzerEmail],
    queryFn: () =>
      base44.entities.Unterrichtsstunde.filter({ besitzer_email: besitzerEmail }, '-updated_date', 200),
    enabled: !!besitzerEmail,
  });

  const kachelKey = ['unterrichtskacheln', besitzerEmail];
  const { data: eigene = [] } = useQuery({
    queryKey: kachelKey,
    queryFn: () => base44.entities.UnterrichtsKachel.filter({ besitzer_email: besitzerEmail }),
    enabled: !!besitzerEmail,
  });

  const einheitById = useMemo(() => new Map(einheiten.map((e) => [e.id, e])), [einheiten]);
  const bloecke = useMemo(() => einheiten.filter(istUebungsblock), [einheiten]);

  // Automatische Kacheln + eigene Einträge zu einer Liste verschmelzen.
  const kacheln = useMemo(() => {
    const map = new Map();
    const merke = (fach, jg) => {
      if (!fach || !jg) return null;
      const k = schluessel(fach, jg);
      if (!map.has(k)) {
        map.set(k, { key: k, fach, jahrgangsstufe: String(jg), anzahlStunden: 0, anzahlBloecke: 0, reihenfolge: 100 });
      }
      return map.get(k);
    };

    for (const s of stunden) {
      const einheit = einheitById.get(s.einheit_id);
      const eintrag = merke(s.fach || einheit?.fach, s.jahrgangsstufe || einheit?.jahrgangsstufe);
      if (eintrag) eintrag.anzahlStunden += 1;
    }
    for (const b of bloecke) {
      const eintrag = merke(b.fach, b.jahrgangsstufe);
      if (eintrag) eintrag.anzahlBloecke += 1;
    }
    for (const e of eigene) {
      const eintrag = merke(e.fach, e.jahrgangsstufe);
      if (eintrag) {
        eintrag.id = e.id;
        eintrag.anzeigename = e.anzeigename || '';
        eintrag.reihenfolge = e.reihenfolge ?? 100;
      }
    }

    return [...map.values()].sort(
      (a, b) =>
        (a.reihenfolge ?? 100) - (b.reihenfolge ?? 100) ||
        a.fach.localeCompare(b.fach, 'de') ||
        (parseInt(a.jahrgangsstufe, 10) || 0) - (parseInt(b.jahrgangsstufe, 10) || 0)
    );
  }, [stunden, bloecke, eigene, einheitById]);

  // Eine Kachel anpassen heißt: den eigenen Eintrag anlegen oder aktualisieren.
  const speichern = useMutation({
    mutationFn: async ({ id, ...daten }) => {
      if (id) return base44.entities.UnterrichtsKachel.update(id, daten);
      return base44.entities.UnterrichtsKachel.create({ ...daten, besitzer_email: besitzerEmail });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kachelKey }),
    onError: (err) => toast.error(err?.message || 'Konnte nicht gespeichert werden.'),
  });

  const verschieben = (kachel, richtung) => {
    const index = kacheln.findIndex((k) => k.key === kachel.key);
    const nachbar = kacheln[index + richtung];
    if (!nachbar) return;
    // Positionen tauschen: beide Kacheln brauchen dafür einen eigenen Eintrag.
    const a = kachel.reihenfolge ?? (index + 1) * 10;
    const b = nachbar.reihenfolge ?? (index + richtung + 1) * 10;
    const wert = a === b ? { a: index + richtung, b: index } : { a: b, b: a };
    speichern.mutate({
      id: kachel.id,
      fach: kachel.fach,
      jahrgangsstufe: kachel.jahrgangsstufe,
      anzeigename: kachel.anzeigename || '',
      reihenfolge: wert.a,
    });
    speichern.mutate({
      id: nachbar.id,
      fach: nachbar.fach,
      jahrgangsstufe: nachbar.jahrgangsstufe,
      anzeigename: nachbar.anzeigename || '',
      reihenfolge: wert.b,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <LayoutGrid className="h-4 w-4 text-accent" />
            Mein Unterricht
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Deine Fächer und Jahrgangsstufen. Klick auf eine Kachel — dort liegen alle
            Unterrichtsstunden und Übungsblöcke, die du dafür vorbereitet hast.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => { setBearbeiten(null); setDialogOffen(true); }}
        >
          <Plus className="h-4 w-4" />
          Fach hinzufügen
        </Button>
      </div>

      {kacheln.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Noch kein Fach angelegt"
          description="Füge dein erstes Fach hinzu — z. B. Mathematik Jg. 6. Danach planst du dort Stunden und Übungsblöcke."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kacheln.map((k, i) => (
            <UnterrichtKachel
              key={k.key}
              kachel={k}
              farbe={getFachFarbe(k.fach, faecher)}
              istErste={i === 0}
              istLetzte={i === kacheln.length - 1}
              onHoch={(kachel) => verschieben(kachel, -1)}
              onRunter={(kachel) => verschieben(kachel, 1)}
              onUmbenennen={(kachel) => { setBearbeiten(kachel); setDialogOffen(true); }}
            />
          ))}
        </div>
      )}

      <KachelDialog
        open={dialogOffen}
        onOpenChange={setDialogOffen}
        kachel={bearbeiten}
        faecher={faecher}
        busy={speichern.isPending}
        onSpeichern={(daten) => {
          speichern.mutate({ id: bearbeiten?.id, ...daten });
          setDialogOffen(false);
        }}
      />
    </div>
  );
}