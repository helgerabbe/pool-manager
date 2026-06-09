import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lock, Loader2, ArrowLeft, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  sortAktivitaetenNachLogik,
  istLernpaketGegated,
} from '@/lib/lernpaketAktivitaetenOrder';
import MasterfaehigeAktivitaet from './MasterfaehigeAktivitaet';
import MasterModusBadge from './MasterModusBadge';
import {
  ermittleMasterModus,
  masterFortschritt,
  istMasterAktivitaetErledigt,
} from '@/lib/masterAufgabenModus';

const PHASE_LABEL = { Input: 'Erklärung', 'Übung': 'Übung', Abschluss: 'Abschluss' };

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
    () => (aktivitaeten ? sortAktivitaetenNachLogik(aktivitaeten, lernpaketLogik) : []),
    [aktivitaeten, lernpaketLogik]
  );

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

  const alleErledigt = sortiert.length > 0 && sortiert.every((akt) => erledigtSet.has(akt.id));
  const gegated = istLernpaketGegated(lernpaketLogik, alleErledigt);

  // Sobald alle Aktivitäten erledigt sind, das Lernpaket-Item selbst als
  // erledigt markieren (damit es im Pfad/Menü grün wird) – einmalig.
  useEffect(() => {
    if (alleErledigt && !istLernpaketErledigt) {
      onMarkLernpaketErledigt?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alleErledigt, istLernpaketErledigt]);

  // Sequenzielles Gating: eine Aktivität ist nur frei, wenn alle davor erledigt sind.
  const istGesperrt = (idx) => {
    if (!gegated) return false;
    return sortiert.slice(0, idx).some((akt) => !erledigtSet.has(akt.id));
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
          <ul className="space-y-2.5">
            {sortiert.map((akt, idx) => {
              const kat = katalogById.get(akt.aktivitaet_id);
              const erledigt = erledigtSet.has(akt.id);
              const gesperrt = istGesperrt(idx);
              const busy = busyId === akt.id;
              return (
                <li
                  key={akt.id}
                  className={cn(
                    'rounded-xl border p-3.5 transition-colors',
                    gesperrt ? 'border-border bg-muted/30 opacity-70' : 'border-border bg-card',
                    erledigt && 'border-emerald-200 bg-emerald-50/60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5">
                      {erledigt ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : gesperrt ? (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {PHASE_LABEL[akt.phase] || akt.phase}
                      </p>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', erledigt ? 'text-emerald-700' : 'text-foreground')}>
                          {kat?.name || 'Aktivität'}
                        </p>
                        <MasterModusBadge
                          modus={ermittleMasterModus(akt)}
                          {...masterFortschritt(akt, item.instance_id, fortschrittByCompositeId)}
                        />
                      </div>
                    </div>
                    {!gesperrt && (
                      <Button
                        size="sm"
                        variant={erledigt ? 'outline' : 'default'}
                        className={cn('shrink-0', !erledigt && 'bg-primary hover:bg-primary/90')}
                        onClick={() => setAktiveAktId(akt.id)}
                      >
                        {erledigt ? 'Nochmal machen' : 'Jetzt machen'}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {alleErledigt && (
        <p className="pt-4 text-center text-sm font-medium text-emerald-600 shrink-0">
          <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          Lernpaket abgeschlossen – du kannst alle Übungen jederzeit wiederholen.
        </p>
      )}
    </div>
  );
}