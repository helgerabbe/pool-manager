/**
 * LernzieleUebersichtTab
 * ──────────────────────
 * Eigener Heimatort für alle Lernziele einer Einheit (Schritt A).
 *
 * Zeigt sämtliche Lernpakete gruppiert nach Themenfeld und lässt pro Paket
 * die Lernziele bearbeiten – inkl. KI-Prüfung (LernzielRow). Speichern läuft
 * pro Paket: neue Ziele werden angelegt, geänderte aktualisiert, entfernte
 * gelöscht. Danach werden die Workspace-Daten neu geladen.
 *
 * Bewusst rein additiv: Tab 2 (Struktur) und Tab 3 (Aktivitäten) bleiben
 * unverändert, bis dieser Tab als stabil bestätigt ist.
 */

import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Target, Inbox } from 'lucide-react';
import {
  createLernziel,
  updateLernziel,
  deleteLernziel,
} from '@/services/LernzielService';
import LernpaketZielKarte from '@/components/workspace/lernziele/LernpaketZielKarte';

export default function LernzieleUebersichtTab({
  einheit,
  lernpakete = [],
  lernziele = [],
  themenfelder = [],
  kannBearbeiten,
}) {
  const queryClient = useQueryClient();

  const kontext = useMemo(
    () => ({ fach: einheit?.fach, jahrgangsstufe: einheit?.jahrgangsstufe }),
    [einheit?.fach, einheit?.jahrgangsstufe]
  );

  // Pakete nach Themenfeld gruppieren (inkl. „Ohne Themenfeld"-Bucket).
  const gruppen = useMemo(() => {
    const tfMap = new Map(themenfelder.map((tf) => [tf.id, tf]));
    const sortierteTf = [...themenfelder].sort(
      (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
    );

    const buckets = sortierteTf.map((tf) => ({
      id: tf.id,
      titel: tf.titel,
      pakete: lernpakete
        .filter((lp) => lp.themenfeld_id === tf.id)
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)),
    }));

    const ohne = lernpakete
      .filter((lp) => !lp.themenfeld_id || !tfMap.has(lp.themenfeld_id))
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    if (ohne.length > 0) {
      buckets.push({ id: '__none__', titel: 'Ohne Themenfeld', pakete: ohne });
    }
    return buckets.filter((b) => b.pakete.length > 0);
  }, [lernpakete, themenfelder]);

  const zieleProPaket = useMemo(() => {
    const map = new Map();
    for (const lz of lernziele) {
      if (!map.has(lz.lernpaket_id)) map.set(lz.lernpaket_id, []);
      map.get(lz.lernpaket_id).push(lz);
    }
    return map;
  }, [lernziele]);

  const gesamtZiele = lernziele.length;

  // Speichern eines Pakets: Diff zwischen Entwurf und Server-Stand bilden.
  const handleSavePaket = async (lernpaketId, draft, serverZiele) => {
    const draftPersistedIds = new Set(
      draft.filter((d) => d._persisted).map((d) => d.id)
    );
    const toDelete = (serverZiele || []).filter((z) => !draftPersistedIds.has(z.id));

    const isEmpty = (d) =>
      !(d.formulierung_fachsprache || '').trim() && !(d.schueler_uebersetzung || '').trim();

    try {
      const ops = [];
      for (const d of draft) {
        if (isEmpty(d)) {
          // Leere neue Zeile ignorieren; leere persistierte Zeile löschen.
          if (d._persisted) ops.push(deleteLernziel(d.id));
          continue;
        }
        const payload = {
          lernpaket_id: lernpaketId,
          formulierung_fachsprache: (d.formulierung_fachsprache || '').trim(),
          schueler_uebersetzung: (d.schueler_uebersetzung || '').trim(),
          kategorie: d.kategorie || undefined,
        };
        if (d._persisted) {
          ops.push(updateLernziel(d.id, payload));
        } else {
          ops.push(createLernziel(payload));
        }
      }
      for (const z of toDelete) ops.push(deleteLernziel(z.id));

      await Promise.all(ops);
      await queryClient.refetchQueries({ queryKey: ['workspace-data', einheit?.id], type: 'all' });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      toast.success('Lernziele gespeichert.');
    } catch (err) {
      toast.error(`Speichern fehlgeschlagen: ${err.message}`);
      throw err;
    }
  };

  if (lernpakete.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center text-muted-foreground">
        <Inbox className="w-12 h-12 opacity-30" />
        <p className="font-semibold">Noch keine Lernpakete</p>
        <p className="text-sm max-w-md">
          Lege zuerst in „Struktur der Einheit" (Tab 2) Themenfelder und Lernpakete an.
          Anschließend kannst du hier die Lernziele zentral pflegen.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Intro */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm">Lernziele der Einheit</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hier pflegst du zentral alle Lernziele – gruppiert nach Themenfeld und Lernpaket.
              Nutze die KI-Prüfung pro Lernziel für eine saubere Formulierung in Fach- und Schülersprache.
              Aktuell: <strong>{gesamtZiele}</strong> {gesamtZiele === 1 ? 'Lernziel' : 'Lernziele'} in {lernpakete.length} Lernpaketen.
            </p>
          </div>
        </div>

        {/* Gruppen */}
        {gruppen.map((gruppe) => (
          <section key={gruppe.id} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1">
              {gruppe.titel}
            </h3>
            <div className="space-y-4">
              {gruppe.pakete.map((paket) => (
                <LernpaketZielKarte
                  key={paket.id}
                  paket={paket}
                  themenfeldTitel={gruppe.id === '__none__' ? null : gruppe.titel}
                  ziele={zieleProPaket.get(paket.id) || []}
                  kontext={kontext}
                  kannBearbeiten={kannBearbeiten}
                  onSave={handleSavePaket}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}