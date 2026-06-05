/**
 * LernzieleUebersichtTab
 * ──────────────────────
 * Eigener Heimatort für alle Lernziele einer Einheit (Schritt A).
 *
 * Master-Detail-Layout: links eine kompakte, klickbare Liste aller
 * Lernpakete (gruppiert nach Themenfeld, mit Ziel-Anzahl), rechts die
 * Lernziele des gewählten Pakets. Die Erklärung steckt als Kontexthilfe
 * im HelpDialog (schlanke Kopfzeile) statt als raumgreifende Info-Box.
 *
 * Speichern läuft pro Paket: neue Ziele werden angelegt, geänderte
 * aktualisiert, entfernte gelöscht. Danach Workspace-Daten neu laden.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Target, Inbox } from 'lucide-react';
import HelpDialog from '@/components/ui/HelpDialog';
import {
  createLernziel,
  updateLernziel,
  deleteLernziel,
} from '@/services/LernzielService';
import LernpaketZielKarte from '@/components/workspace/lernziele/LernpaketZielKarte';
import LernpaketZielSidebar from '@/components/workspace/lernziele/LernpaketZielSidebar';

const HELP = {
  title: 'Lernziele der Einheit',
  description:
    'Hier pflegst du zentral alle Lernziele – gruppiert nach Themenfeld und Lernpaket. Wähle links ein Lernpaket aus, um rechts seine Lernziele zu bearbeiten. Nutze die KI-Prüfung pro Lernziel für eine saubere Formulierung in Fach- und Schülersprache.',
  features: [
    'Links alle Lernpakete der Einheit – klick dich durch',
    'Pro Lernziel: offizielle Formulierung (Fachsprache) + schülergerechte Übersetzung',
    'Schülergerechte Formulierungen sind grafisch klar markiert (Schüler-Symbol, kursiv)',
    'KI-Prüfung pro Lernziel schlägt beide Varianten formuliert vor',
    'Speichern erfolgt gezielt pro Lernpaket',
  ],
  faqs: [
    { question: 'Was ist der Unterschied zwischen Fachsprache und schülergerecht?', answer: 'Die Fachsprache („Ich kann …") ist die offizielle Formulierung. Die schülergerechte Übersetzung erklärt dasselbe in einfacher Sprache und erscheint später in der Lernlandkarte für die Schüler:innen.' },
    { question: 'Wie funktioniert die KI-Prüfung?', answer: 'Tippe deine Idee ein und klicke auf „KI prüfen". Die KI schlägt eine präzise Fachsprachen- und eine schülergerechte Formulierung vor, die du übernehmen oder verwerfen kannst.' },
  ],
  docsSlug: 'lernpakete-aktivitaeten',
};

export default function LernzieleUebersichtTab({
  einheit,
  lernpakete = [],
  lernziele = [],
  themenfelder = [],
  kannBearbeiten,
}) {
  const queryClient = useQueryClient();
  const [selectedPaketId, setSelectedPaketId] = useState(null);

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

  const zielCount = useMemo(() => {
    const map = new Map();
    for (const [paketId, list] of zieleProPaket.entries()) map.set(paketId, list.length);
    return map;
  }, [zieleProPaket]);

  // Erstes Paket automatisch wählen, sobald Daten da sind / Auswahl ungültig wird.
  useEffect(() => {
    const alleIds = gruppen.flatMap((g) => g.pakete.map((p) => p.id));
    if (alleIds.length === 0) {
      if (selectedPaketId !== null) setSelectedPaketId(null);
      return;
    }
    if (!selectedPaketId || !alleIds.includes(selectedPaketId)) {
      setSelectedPaketId(alleIds[0]);
    }
  }, [gruppen, selectedPaketId]);

  const selectedPaket = useMemo(
    () => lernpakete.find((p) => p.id === selectedPaketId) || null,
    [lernpakete, selectedPaketId]
  );

  const selectedThemenfeldTitel = useMemo(() => {
    if (!selectedPaket?.themenfeld_id) return null;
    return themenfelder.find((tf) => tf.id === selectedPaket.themenfeld_id)?.titel || null;
  }, [selectedPaket, themenfelder]);

  const gesamtZiele = lernziele.length;

  // Speichern eines Pakets: Diff zwischen Entwurf und Server-Stand bilden.
  const handleSavePaket = async (lernpaketId, draft, serverZiele) => {
    const draftPersistedIds = new Set(draft.filter((d) => d._persisted).map((d) => d.id));
    const toDelete = (serverZiele || []).filter((z) => !draftPersistedIds.has(z.id));

    const isEmpty = (d) =>
      !(d.formulierung_fachsprache || '').trim() && !(d.schueler_uebersetzung || '').trim();

    try {
      const ops = [];
      for (const d of draft) {
        if (isEmpty(d)) {
          if (d._persisted) ops.push(deleteLernziel(d.id));
          continue;
        }
        const payload = {
          lernpaket_id: lernpaketId,
          formulierung_fachsprache: (d.formulierung_fachsprache || '').trim(),
          schueler_uebersetzung: (d.schueler_uebersetzung || '').trim(),
          kategorie: d.kategorie || undefined,
        };
        if (d._persisted) ops.push(updateLernziel(d.id, payload));
        else ops.push(createLernziel(payload));
      }
      for (const z of toDelete) ops.push(deleteLernziel(z.id));

      await Promise.all(ops);
      // Robustes Neuladen: erst invalidieren, dann erzwungen neu holen.
      await queryClient.invalidateQueries({ queryKey: ['workspace-data', einheit?.id] });
      await queryClient.refetchQueries({ queryKey: ['workspace-data', einheit?.id], type: 'active' });
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
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-full">
      {/* ── Sidebar: Lernpaket-Liste ──────────────────────────────────── */}
      <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden h-56 lg:h-full min-h-0">
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold flex-1">Lernziele</span>
          <span className="text-[10px] text-muted-foreground">{gesamtZiele} gesamt</span>
          <HelpDialog {...HELP} />
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <LernpaketZielSidebar
            gruppen={gruppen}
            zielCount={zielCount}
            selectedPaketId={selectedPaketId}
            onSelect={setSelectedPaketId}
          />
        </div>
      </aside>

      {/* ── Detail: Lernziele des gewählten Pakets ────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {selectedPaket ? (
            <LernpaketZielKarte
              key={selectedPaket.id}
              paket={selectedPaket}
              themenfeldTitel={selectedThemenfeldTitel}
              ziele={zieleProPaket.get(selectedPaket.id) || []}
              kontext={kontext}
              kannBearbeiten={kannBearbeiten}
              onSave={handleSavePaket}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[40vh] gap-2 text-muted-foreground">
              <Target className="w-10 h-10 opacity-30" />
              <p className="text-sm">Wähle links ein Lernpaket aus.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}