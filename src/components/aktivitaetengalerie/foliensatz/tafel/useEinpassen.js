import React from 'react';

// Tafelregel: Erst verkleinern, bis alles ohne Scrollen passt; erst unter der Mindestgröße scrollt das Element selbst.
// Mindestgröße 16 px auf der 900-px-Tafel ≈ Schriftgröße 14 am Active Board, aus der letzten Reihe noch lesbar.
export const TAFEL_MIN_SCHRIFT = 16;

export default function useEinpassen(max, abh = []) {
  const ref = React.useRef(null);
  const [groesse, setGroesse] = React.useState(max);
  React.useLayoutEffect(() => {
    const el = ref.current;
    let g = max;
    el.style.fontSize = `${g}px`;
    while (g > TAFEL_MIN_SCHRIFT && el.scrollHeight > el.clientHeight + 1) { g -= 1; el.style.fontSize = `${g}px`; }
    setGroesse(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, ...abh]);
  return [ref, groesse];
}