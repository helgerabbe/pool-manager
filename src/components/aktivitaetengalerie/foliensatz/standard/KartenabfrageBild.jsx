import React, { useState } from 'react';
import KartenTablet from './kartenabfrage/KartenTablet';
import KartenTafel from './kartenabfrage/KartenTafel';

const START = [
  { t: 'Ein Junge reist allein', n: 'Mia' }, { t: 'Es geht um Freundschaft', n: 'Ben' },
  { t: 'Spielt am Meer', n: 'Lea' }, { t: 'Jemand hat Angst', n: 'Tom' },
];

/** Interaktive Aufgabenfolie Digitale Kartenabfrage: Karten schreiben (Tablet), verdeckter Stapel und Clustern (Tafel). */
export default function KartenabfrageBild({ ansicht }) {
  const [stapel, setStapel] = useState(START);
  if (ansicht === 'schueler') return <KartenTablet onSenden={(t) => setStapel([...stapel, { t, n: 'Du' }])} />;
  return <KartenTafel stapel={stapel} setStapel={setStapel} />;
}