import React from 'react';
import { FileText } from 'lucide-react';
import { oeffneDatei } from './dateiOeffnen';
import Abschnitt from './Abschnitt';

const Liste = ({ dateien, leer }) => (dateien.length ? (
  <ul className="space-y-1">{dateien.map((d, i) => (
    <li key={i}><button onClick={() => oeffneDatei(d.file_uri)} className="flex items-center gap-2 text-primary hover:underline"><FileText className="h-4 w-4" />{d.name || 'Datei'}</button></li>
  ))}</ul>
) : <p className="text-muted-foreground">{leer}</p>);

/** Hochgeladene Materialien der Einheit und Lehrwerksseiten aus dem Fachregister. */
export default function MaterialienPanel({ planung, fachregister }) {
  const lehrwerk = fachregister.flatMap((f) => (f.lehrwerk_dateien || []).map((d) => ({ ...d, name: `${f.titel}: ${d.name}` })));
  const zusatz = fachregister.flatMap((f) => (f.zusatz_materialien || []).map((d) => ({ ...d, name: `${f.titel}: ${d.name}` })));
  return (
    <div className="space-y-3 text-sm">
      <Abschnitt titel="Materialien der Einheit" offen><Liste dateien={planung?.materialien || []} leer="Keine Materialien hochgeladen." /></Abschnitt>
      <Abschnitt titel="Lehrwerk und Arbeitsheft (Fachregister)" offen><Liste dateien={lehrwerk} leer="Keine Buch- oder Arbeitsheftseiten eingescannt." /></Abschnitt>
      <Abschnitt titel="Zusatzmaterial der Fachschaft" offen><Liste dateien={zusatz} leer="Kein Zusatzmaterial hinterlegt." /></Abschnitt>
    </div>
  );
}