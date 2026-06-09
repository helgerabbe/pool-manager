import { useMemo, useState } from 'react';
import {
  ermittleMasterModus,
  naechsteMasterAufgabe,
  masterFortschritt,
  masterCompositeId,
  MASTER_MODUS,
} from '@/lib/masterAufgabenModus';
import TextLesenSeite from '@/components/schueler/lesen/TextLesenSeite';
import LinkOeffnenSeite from '@/components/schueler/lesen/LinkOeffnenSeite';
import ReihenfolgeSortierenSeite from '@/components/schueler/lesen/ReihenfolgeSortierenSeite';
import BegriffeZuordnenSeite from '@/components/schueler/lesen/BegriffeZuordnenSeite';
import BearbeitungBestaetigenSeite from '@/components/schueler/lesen/BearbeitungBestaetigenSeite';
import LernpaketAktivitaetSeite from './LernpaketAktivitaetSeite';

/**
 * Zentraler Wrapper für ALLE masterfähigen Aktivitäten.
 *
 * Verantwortlich für die generische 3-Modi-Logik:
 *   - einzel:      zeigt die einzige MasterAufgabe.
 *   - sequenziell: zeigt der Reihe nach die nächste noch offene MasterAufgabe;
 *                  nach „Erledigt" wird (falls noch welche offen sind) die
 *                  nächste angeboten, sonst zurück zur Übersicht.
 *   - shuffle:     zeigt eine zufällige noch offene MasterAufgabe; eine gelöste
 *                  reicht, danach zurück zur Übersicht.
 *
 * Jede konkrete Einzelseite (TextLesen, Reihenfolge, …) muss NUR „ihre eine
 * Aufgabe" rendern – sie bekommt eine Aktivität, deren `field_values` aus der
 * aktiven MasterAufgabe gemerged ist. Die gesamte Master-Orchestrierung liegt
 * hier zentral, sodass jede neue masterfähige Aufgabe sie automatisch erhält.
 */
export default function MasterfaehigeAktivitaet({
  aktivitaet,
  kat,
  lernpaketInstanceId,
  lernpaketTitel,
  fortschrittByCompositeId,
  busy,
  onMarkMaster,   // (compositeId, { itemType, refId }) => Promise
  onMarkErledigt, // (aktivitaet) => Promise – markiert eine Aktivität OHNE MasterAufgaben
  onFertig,       // () => void  – Aktivität (als Ganzes) abgeschlossen → zurück
  onBack,
}) {
  const modus = ermittleMasterModus(aktivitaet);

  // Aktive MasterAufgabe einmal bei Mount/Re-Entry wählen (stabil pro Versuch).
  const [aktiveMaster, setAktiveMaster] = useState(() =>
    naechsteMasterAufgabe(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId)
  );

  const { gesamt } = masterFortschritt(aktivitaet, lernpaketInstanceId, fortschrittByCompositeId);

  // Aktivität mit den field_values der aktiven MasterAufgabe „verschmolzen".
  const aktiveAktivitaet = useMemo(() => {
    if (!aktiveMaster) return aktivitaet;
    return { ...aktivitaet, field_values: aktiveMaster.field_values || aktivitaet.field_values };
  }, [aktivitaet, aktiveMaster]);

  const handleErledigt = async () => {
    // Aktivität ohne MasterAufgaben (z. B. „Bearbeitung bestätigen", „Text lesen"
    // ohne Master): die Aktivität selbst als erledigt speichern, damit sie grün wird.
    if (!aktiveMaster) {
      await onMarkErledigt?.(aktivitaet);
      onFertig?.();
      return;
    }
    const compositeId = masterCompositeId(lernpaketInstanceId, aktivitaet.id, aktiveMaster.id);
    await onMarkMaster(compositeId, { itemType: 'aufgabe', refId: aktivitaet.ref_id || null });

    // Nach dem Speichern: nächste offene MasterAufgabe bestimmen.
    // (fortschrittByCompositeId ist hier noch der alte Stand → die gerade
    // gelöste manuell ausschließen.)
    const erledigtIds = new Set(
      (aktivitaet.master_aufgaben || [])
        .filter((m) => fortschrittByCompositeId.get(masterCompositeId(lernpaketInstanceId, aktivitaet.id, m.id)) === 'erledigt')
        .map((m) => m.id)
    );
    erledigtIds.add(aktiveMaster.id);

    // Shuffle: eine gelöste reicht → fertig.
    if (modus === MASTER_MODUS.SHUFFLE) { onFertig?.(); return; }

    // Sequenziell/Einzel: gibt es noch offene MasterAufgaben?
    const offen = (aktivitaet.master_aufgaben || []).filter((m) => !erledigtIds.has(m.id));
    if (offen.length === 0) { onFertig?.(); return; }
    setAktiveMaster(offen[0]); // nächste anbieten, auf derselben Seite bleiben
  };

  const katName = (kat?.name || '').toLowerCase();
  const istTextLesen = katName.includes('text lesen');
  const istLinkUrl = katName.includes('link') || katName.includes('url');
  const istReihenfolge = katName.includes('reihenfolge') || katName.includes('sortier');
  const istBegriffeZuordnen = katName.includes('begriffe zuordnen') || katName.includes('zuordn');
  const istBestaetigen = katName.includes('bestätig') || katName.includes('bestaetig');

  // key pro aktiver MasterAufgabe → erzwingt frischen internen State der
  // Einzelseite (z. B. neu gemischte Karten), wenn sequenziell die nächste kommt.
  const seitenKey = aktiveMaster?.id || aktivitaet.id;

  const gemeinsameProps = {
    key: seitenKey,
    aktivitaet: aktiveAktivitaet,
    kat,
    lernpaketTitel,
    busy,
    onErledigt: handleErledigt,
    onBack,
    // Fortschritts-Banner für mehrere MasterAufgaben (sequenziell): „Aufgabe x von y".
    masterHinweis:
      modus === MASTER_MODUS.SEQUENZIELL && gesamt > 1
        ? { aktuell: nummerVon(aktivitaet, aktiveMaster), gesamt }
        : null,
  };

  if (istTextLesen) return <TextLesenSeite {...gemeinsameProps} />;
  if (istLinkUrl) return <LinkOeffnenSeite {...gemeinsameProps} />;
  if (istReihenfolge) return <ReihenfolgeSortierenSeite {...gemeinsameProps} />;
  if (istBegriffeZuordnen) return <BegriffeZuordnenSeite {...gemeinsameProps} />;
  if (istBestaetigen) return <BearbeitungBestaetigenSeite {...gemeinsameProps} />;
  return <LernpaketAktivitaetSeite {...gemeinsameProps} />;
}

/** 1-basierte Nummer der aktiven MasterAufgabe innerhalb der sequenziellen Liste. */
function nummerVon(aktivitaet, aktiveMaster) {
  const master = aktivitaet?.master_aufgaben || [];
  const idx = master.findIndex((m) => m.id === aktiveMaster?.id);
  return idx === -1 ? 1 : idx + 1;
}