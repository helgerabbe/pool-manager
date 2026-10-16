import React from 'react';

/** Lädt die Assistenten-Hinweise neu, sobald sich die Phasen des Entwurfs ändern. */
export default function useEntwurfsTipps(entwurf, laden) {
  const [tipps, setTipps] = React.useState([]);
  const [laedt, setLaedt] = React.useState(false);
  const schluessel = JSON.stringify(entwurf.phasen.map((p) => [p.name, p.aktivitaet]));
  React.useEffect(() => {
    let aktuell = true;
    setLaedt(true); setTipps([]);
    laden(entwurf).then((t) => { if (aktuell) { setTipps(t); setLaedt(false); } });
    return () => { aktuell = false; };
  }, [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps
  const verwerfen = (t) => setTipps((all) => all.filter((x) => x !== t));
  return { tipps, laedt, verwerfen };
}