/**
 * MeinUnterrichtBereich.jsx
 *
 * Reiter „Mein Unterricht" der Privaten Bibliothek: die Lerngruppen der
 * Lehrkraft (Fach + Jahrgang + Name) als Kacheln. Klick → Unterrichtseinheiten
 * dieser Lerngruppe. Eine optionale Filterleiste grenzt nach Fach/Jahrgang ein,
 * ohne eine Navigationsebene hinzuzufügen.
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
import { useLerngruppen } from '@/hooks/useLerngruppen';
import UnterrichtKachel from './UnterrichtKachel';
import KachelDialog from './KachelDialog';
import LerngruppenFilter from './LerngruppenFilter';
import { AKTUELLES_SCHULJAHR } from '@/lib/schuljahre';

export default function MeinUnterrichtBereich({ einheiten = [], besitzerEmail, faecher = [] }) {
  const queryClient = useQueryClient();
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(null);
  const [filter, setFilter] = useState({ fach: '', jg: '', sj: AKTUELLES_SCHULJAHR });

  const { data: stunden = [] } = useQuery({
    queryKey: ['unterrichtsstunden', besitzerEmail],
    queryFn: () => base44.entities.Unterrichtsstunde.filter({ besitzer_email: besitzerEmail }, '-updated_date', 200),
    enabled: !!besitzerEmail,
  });
  const bloecke = useMemo(() => einheiten.filter(istUebungsblock), [einheiten]);
  const { lerngruppen, unterrichtseinheiten } = useLerngruppen(besitzerEmail, { stunden, bloecke });

  const kacheln = useMemo(() => {
    const ueZuLg = new Map(unterrichtseinheiten.map((u) => [u.id, u.lerngruppe_id]));
    const zaehle = (liste, feld) => {
      const m = new Map();
      liste.forEach((x) => { const lg = ueZuLg.get(x[feld]); if (lg) m.set(lg, (m.get(lg) || 0) + 1); });
      return m;
    };
    const st = zaehle(stunden, 'unterrichtseinheit_id');
    const bl = zaehle(bloecke, 'eltern_einheit_id');
    const ue = new Map();
    unterrichtseinheiten.forEach((u) => u.lerngruppe_id && ue.set(u.lerngruppe_id, (ue.get(u.lerngruppe_id) || 0) + 1));
    return [...lerngruppen]
      .sort((a, b) => (a.reihenfolge ?? 100) - (b.reihenfolge ?? 100) || a.fach.localeCompare(b.fach, 'de'))
      .map((lg) => ({ ...lg, anzahlEinheiten: ue.get(lg.id) || 0, anzahlStunden: st.get(lg.id) || 0, anzahlBloecke: bl.get(lg.id) || 0 }));
  }, [lerngruppen, unterrichtseinheiten, stunden, bloecke]);

  const sichtbar = kacheln.filter(
    (k) => (!filter.sj || k.schuljahr === filter.sj) && (!filter.fach || k.fach === filter.fach) && (!filter.jg || String(k.jahrgangsstufe) === filter.jg)
  );

  const speichern = useMutation({
    mutationFn: async ({ id, ...daten }) => {
      if (id) return base44.entities.Lerngruppe.update(id, daten);
      return base44.entities.Lerngruppe.create({ ...daten, besitzer_email: besitzerEmail });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lerngruppen'] }),
    onError: (err) => toast.error(err?.message || 'Konnte nicht gespeichert werden.'),
  });

  const verschieben = (kachel, richtung) => {
    const index = kacheln.findIndex((k) => k.id === kachel.id);
    const nachbar = kacheln[index + richtung];
    if (!nachbar) return;
    speichern.mutate({ id: kachel.id, reihenfolge: index + richtung });
    speichern.mutate({ id: nachbar.id, reihenfolge: index });
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
            Dein klassen- und kursbezogener Unterricht. Jede Kachel ist eine Lerngruppe — darin liegen
            deine Unterrichtseinheiten mit Stunden und selbstständigen Übungen.
          </p>
        </div>
        <Button size="sm" className="shrink-0 gap-2" onClick={() => { setBearbeiten(null); setDialogOffen(true); }}>
          <Plus className="h-4 w-4" />
          Lerngruppe hinzufügen
        </Button>
      </div>

      {kacheln.length > 0 && <LerngruppenFilter kacheln={kacheln} filter={filter} onChange={setFilter} />}

      {kacheln.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Noch keine Lerngruppe angelegt"
          description="Füge deine erste Lerngruppe hinzu — z. B. Deutsch Jg. 9, „9a“. Danach legst du dort Unterrichtseinheiten an."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sichtbar.map((k) => (
            <UnterrichtKachel
              key={k.id}
              kachel={k}
              farbe={getFachFarbe(k.fach, faecher)}
              istErste={k.id === kacheln[0]?.id}
              istLetzte={k.id === kacheln[kacheln.length - 1]?.id}
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