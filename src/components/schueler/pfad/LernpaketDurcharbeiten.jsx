import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, Layers } from 'lucide-react';
import {
  sortAktivitaetenNachLogik,
  istLernpaketGegated,
  istPhaseOptional,
} from '@/lib/lernpaketAktivitaetenOrder';
import MasterfaehigeAktivitaet from './MasterfaehigeAktivitaet';
import LernpaketAktivitaetItem from './LernpaketAktivitaetItem';
import PhasenAbschnitt from './PhasenAbschnitt';
import { istMasterAktivitaetErledigt } from '@/lib/masterAufgabenModus';

/**
 * Sub-Ansicht: Ein Lernpaket „durcharbeiten". Zeigt die enthaltenen
 * Aktivitäten (Input/Übung/Abschluss) in der vom Logik-Typ vorgegebenen
 * Reihenfolge. Standard/Fast-Track werden sequenziell freigeschaltet;
 * sobald alle Aktivitäten erledigt sind (oder Wissensspeicher), sind alle
 * frei wiederholbar. Erledigte Aktivitäten bleiben grün markiert.
 */
export default function LernpaketDurcharbeiten({
  item,                  // Lernpaket-Item aus dem Pfad ({ instance_id, ref_id, ... })
  meta,                  // Anzeige-Meta des Lernpakets
  lernpaketLogik,        // 'standard' | 'fast_track' | 'wissensspeicher' | 'test_only'
  lerntyp,               // Lerntyp des Dashboards – steuert Phasen-Reihenfolge + optionale Übungen (Pragmatiker)
  loadLernpaketAktivitaeten,
  katalogById,
  fortschrittByCompositeId,
  onMarkErledigt,        // (compositeId, aktivitaet) => Promise
  onMarkMaster,          // (compositeId, { itemType, refId }) => Promise – pro MasterAufgabe
  onMarkLernpaketErledigt, // () => Promise – markiert das Lernpaket selbst als erledigt
  istLernpaketErledigt,  // bool – ob das Lernpaket-Item bereits erledigt ist
  onBack,                // zurück zur Pfad-Startseite
}) {
  const [aktivitaeten, setAktivitaeten] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [aktiveAktId, setAktiveAktId] = useState(null); // null = Inhaltsseite

  useEffect(() => {
    let abort = false;
    setAktivitaeten(null);
    setAktiveAktId(null);
    loadLernpaketAktivitaeten(item.ref_id).then((list) => {
      if (!abort) setAktivitaeten(list || []);
    });
    return () => { abort = true; };
  }, [item.ref_id, loadLernpaketAktivitaeten]);

  const compositeId = (akt) => `${item.instance_id}::${akt.id}`;

  const sortiert = useMemo(
    () => (aktivitaeten ? sortAktivitaetenNachLogik(aktivitaeten, lernpaketLogik, lerntyp) : []),
    [aktivitaeten, lernpaketLogik, lerntyp]
  );

  // Nach Phase gruppiert (Reihenfolge der ersten Vorkommen bleibt erhalten),
  // jeweils mit dem ORIGINAL-Index aus `sortiert` – wichtig für Nummerierung
  // und das sequenzielle Gating.
  const gruppiertNachPhase = useMemo(() => {
    const gruppen = [];
    sortiert.forEach((akt, idx) => {
      let g = gruppen.find((x) => x.phase === akt.phase);
      if (!g) { g = { phase: akt.phase, items: [] }; gruppen.push(g); }
      g.items.push({ akt, idx });
    });
    return gruppen;
  }, [sortiert]);

  // Erledigt-Status pro Aktivität – master-aware:
  //  - masterfähig (≥1 MasterAufgabe): zentrale Logik (sequenziell=alle, shuffle=eine).
  //  - sonst: klassischer Composite-Status der Aktivität selbst.
  const erledigtSet = useMemo(() => {
    const set = new Set();
    sortiert.forEach((akt) => {
      const masterErledigt = istMasterAktivitaetErledigt(akt, item.instance_id, fortschrittByCompositeId);
      const erledigt = masterErledigt !== null
        ? masterErledigt
        : fortschrittByCompositeId.get(compositeId(akt)) === 'erledigt';
      if (erledigt) set.add(akt.id);
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortiert, fortschrittByCompositeId, item.instance_id]);

  // Pflicht-Aktivitäten: optionale Phasen (Übung beim Pragmatiker) zählen
  // NICHT für den Paket-Abschluss – Input + Abschluss genügen.
  const pflicht = useMemo(
    () => sortiert.filter((akt) => !istPhaseOptional(akt.phase, lerntyp)),
    [sortiert, lerntyp]
  );
  const alleErledigt = pflicht.length > 0 && pflicht.every((akt) => erledigtSet.has(akt.id));
  const gegated = istLernpaketGegated(lernpaketLogik, alleErledigt);

  // Sobald alle Aktivitäten erledigt sind, das Lernpaket-Item selbst als
  // erledigt markieren (damit es im Pfad/Menü grün wird) – einmalig.
  useEffect(() => {
    if (alleErledigt && !istLernpaketErledigt) {
      onMarkLernpaketErledigt?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alleErledigt, istLernpaketErledigt]);

  // Sequenzielles Gating: eine Aktivität ist nur frei, wenn alle PFLICHT-
  // Aktivitäten davor erledigt sind. Optionale Aktivitäten (Übungen beim
  // Pragmatiker) sind nie gesperrt und blockieren nichts.
  const istGesperrt = (idx) => {
    if (!gegated) return false;
    if (istPhaseOptional(sortiert[idx]?.phase, lerntyp)) return false;
    return sortiert
      .slice(0, idx)
      .some((akt) => !istPhaseOptional(akt.phase, lerntyp) && !erledigtSet.has(akt.id));
  };

  // Einzel-Aktivitätsseite anzeigen, wenn eine Aktivität gewählt ist.
  const aktiveAkt = aktiveAktId ? sortiert.find((a) => a.id === aktiveAktId) : null;
  if (aktiveAkt) {
    const aktiveKat = katalogById.get(aktiveAkt.aktivitaet_id);
    return (
      <MasterfaehigeAktivitaet
        aktivitaet={aktiveAkt}
        kat={aktiveKat}
        lernpaketInstanceId={item.instance_id}
        lernpaketTitel={meta.titel}
        fortschrittByCompositeId={fortschrittByCompositeId}
        busy={busyId === aktiveAkt.id}
        onMarkMaster={onMarkMaster}
        onMarkErledigt={async (akt) => {
          setBusyId(akt.id);
          await onMarkErledigt?.(compositeId(akt), akt);
        }}
        onFertig={() => { setBusyId(null); setAktiveAktId(null); }}
        onBack={() => setAktiveAktId(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Kopf */}
      <div className="flex items-center gap-3 mb-1">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
          <Layers className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Lernpaket</p>
          <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{meta.titel}</h1>
        </div>
      </div>
      <button
        onClick={onBack}
        className="self-start inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück
      </button>

      {/* Aktivitäten-Liste */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {aktivitaeten === null ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sortiert.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
            Dieses Lernpaket enthält noch keine Aktivitäten.
          </div>
        ) : (
          <div className="space-y-7">
            {gruppiertNachPhase.map((gruppe) => (
              <section key={gruppe.phase} className="space-y-3">
                <PhasenAbschnitt
                  phase={gruppe.phase}
                  optional={istPhaseOptional(gruppe.phase, lerntyp)}
                />
                <ul className="space-y-2.5">
                  {gruppe.items.map(({ akt, idx }) => (
                    <LernpaketAktivitaetItem
                      key={akt.id}
                      aktivitaet={akt}
                      kat={katalogById.get(akt.aktivitaet_id)}
                      nummer={idx + 1}
                      lernpaketInstanceId={item.instance_id}
                      fortschrittByCompositeId={fortschrittByCompositeId}
                      erledigt={erledigtSet.has(akt.id)}
                      gesperrt={istGesperrt(idx)}
                      onOeffnen={() => setAktiveAktId(akt.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {alleErledigt && (
        <p className="pt-4 text-center text-sm font-medium text-emerald-600 shrink-0">
          <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          {lerntyp === 'pragmatiker'
            ? 'Lernpaket abgeschlossen – die Übungen stehen dir weiterhin freiwillig zur Verfügung.'
            : 'Lernpaket abgeschlossen – du kannst alle Übungen jederzeit wiederholen.'}
        </p>
      )}
    </div>
  );
}