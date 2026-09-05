/**
 * LernlandkarteVorschauInhalt.jsx
 *
 * Reine Darstellung der Lernlandkarte in der LEHRER-Vorschau — 1:1 die
 * Anordnung, die Schüler in `components/schueler/pfad/LernlandkarteSeite`
 * sehen (Selbstcheck-Kopf, Themenfeld-Gruppen, Lernpaket-Karten, Ampeln).
 *
 * Unterschied zur Schüleransicht: Die Selbsteinschätzung ist hier nur lokal
 * (nichts wird gespeichert) und es gibt keinen „Erledigt"-Knopf. So kann die
 * Lehrkraft gefahrlos ausprobieren, wie sich die Karte anfühlt.
 */
import React, { useMemo, useState } from 'react';
import { Map as MapIcon, Layers } from 'lucide-react';
import LernzielAmpel from '@/components/schueler/pfad/LernzielAmpel';

export default function LernlandkarteVorschauInhalt({ themenfelder, lernpakete, lernziele }) {
  const [lokal, setLokal] = useState({});

  const zieleByPaket = useMemo(() => {
    const map = new Map();
    (lernziele || []).forEach((z) => {
      if (!map.has(z.lernpaket_id)) map.set(z.lernpaket_id, []);
      map.get(z.lernpaket_id).push(z);
    });
    return map;
  }, [lernziele]);

  const gruppen = useMemo(() => {
    const pakete = [...(lernpakete || [])]
      .filter((p) => p.sync_status !== 'to_delete')
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    const felder = [...(themenfelder || [])].sort(
      (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
    );
    const result = [];
    for (const tf of felder) {
      const tfPakete = pakete.filter(
        (p) => p.themenfeld_id === tf.id && (zieleByPaket.get(p.id) || []).length > 0
      );
      if (tfPakete.length > 0) result.push({ id: tf.id, titel: tf.titel, pakete: tfPakete });
    }
    const ohneFeld = pakete.filter(
      (p) =>
        !felder.some((tf) => tf.id === p.themenfeld_id) &&
        (zieleByPaket.get(p.id) || []).length > 0
    );
    if (ohneFeld.length > 0) result.push({ id: '_rest', titel: 'Weitere Themen', pakete: ohneFeld });
    return result;
  }, [themenfelder, lernpakete, zieleByPaket]);

  const sichtbareZiele = gruppen.flatMap((g) =>
    g.pakete.flatMap((p) => zieleByPaket.get(p.id) || [])
  );
  const stats = sichtbareZiele.reduce(
    (acc, z) => {
      const w = lokal[z.id];
      if (w) acc[w] += 1;
      return acc;
    },
    { sicher: 0, unsicher: 0, schwierig: 0 }
  );
  const sicherProzent =
    sichtbareZiele.length > 0 ? Math.round((stats.sicher / sichtbareZiele.length) * 100) : 0;

  const setWert = (zielId, wert) =>
    setLokal((prev) => ({ ...prev, [zielId]: prev[zielId] === wert ? null : wert }));

  if (sichtbareZiele.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground p-8">
        Für diese Einheit sind noch keine Lernziele hinterlegt — die Lernlandkarte
        bleibt für die Schüler leer.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-5 py-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
          <MapIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Deine Übersicht</p>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Lernlandkarte</h1>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-1">
            Wie sicher fühlst du dich schon? Schätze dich bei jedem Ziel ein.
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            💪 Kann ich · 🤔 Bin unsicher · 🆘 Brauche Hilfe — du kannst deine
            Einschätzung jederzeit ändern.
          </p>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${sicherProzent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="font-medium text-emerald-600">
              {stats.sicher} von {sichtbareZiele.length} Zielen sicher
            </span>
            <span className="text-muted-foreground">
              🤔 {stats.unsicher} · 🆘 {stats.schwierig}
            </span>
          </div>
        </div>

        {gruppen.map((gruppe, gi) => (
          <section key={gruppe.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                {gi + 1}
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground shrink-0">
                {gruppe.titel}
              </h2>
              <span className="h-px flex-1 rounded-full bg-border" />
            </div>

            {gruppe.pakete.map((paket) => (
              <div
                key={paket.id}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {paket.titel_des_pakets}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Status und „Üben"-Sprung erscheinen bei den Schülern je nach
                      eigenem Fortschritt.
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-border">
                  {(zieleByPaket.get(paket.id) || []).map((ziel) => (
                    <li
                      key={ziel.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2"
                    >
                      <p className="text-sm text-foreground leading-snug flex-1 min-w-0">
                        {ziel.schueler_uebersetzung?.trim() || ziel.formulierung_fachsprache}
                      </p>
                      <LernzielAmpel
                        value={lokal[ziel.id] || null}
                        onSelect={(w) => setWert(ziel.id, w)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}