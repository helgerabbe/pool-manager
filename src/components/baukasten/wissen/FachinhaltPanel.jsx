import React from 'react';
import { toast } from 'sonner';
import FachinhaltExpose from './FachinhaltExpose';
import FachinhaltEingang from './FachinhaltEingang';
import FachinhaltQuellen from './FachinhaltQuellen';
import PlanungsGrundlage from './PlanungsGrundlage';
import { fachinhaltEinordnen } from '@/lib/kiFachinhalt';

/** Fachinhalt der Einheit: Exposé, eingegebene Informationen, Internetrecherche. */
export default function FachinhaltPanel({ einheit, planung, quellen, onNeu }) {
  const [laedt, setLaedt] = React.useState(null);
  const einordnen = async (recherche, fokus, marke) => {
    setLaedt(marke || (recherche ? 'recherche' : 'einordnen'));
    try { await fachinhaltEinordnen({ einheit, planung, quellen, recherche, fokus }); toast.success('Fachinhalt aktualisiert.'); onNeu(); }
    catch { toast.error('Das Einordnen hat nicht geklappt. Bitte noch einmal versuchen.'); }
    finally { setLaedt(null); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-4">
        <FachinhaltExpose fachinhalt={einheit.fachinhalt} laedt={laedt} onVertiefen={(titel, i) => einordnen(true, titel, `kap-${i}`)} />
        <FachinhaltQuellen quellen={quellen} onNeu={onNeu} />
        <PlanungsGrundlage planung={planung} laedt={laedt === 'recherche'} onRecherche={() => einordnen(true)} />
      </div>
      <FachinhaltEingang einheit={einheit} quellen={quellen} laedt={laedt} onEinordnen={einordnen} onNeu={onNeu} />
    </div>
  );
}