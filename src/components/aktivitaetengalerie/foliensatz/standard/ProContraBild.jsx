import React, { useState } from 'react';

const SPALTEN = {
  zwei: [['Spricht dafür', '#DDEFE3', ['Hochdeutsch öffnet Türen', 'Bewerbungen']], ['Spricht dagegen', '#F5E1DC', ['Dialekt ist Heimat', 'Können zählt mehr']]],
  vier: [['Spricht dafür', '#DDEFE3', ['Bewerbungen']], ['Eher dafür', '#EEF6E8', ['Erster Eindruck']], ['Eher dagegen', '#FBEDE6', ['Je nach Beruf']], ['Spricht dagegen', '#F5E1DC', ['Können zählt mehr']]],
};

/** Standardfolie Sammlung Pro / Contra: zwei Spalten oder vier abgestufte Spalten. */
export default function ProContraBild({ ansicht }) {
  const [form, setForm] = useState('zwei');
  if (ansicht === 'schueler') return <p className="text-xs">Eigene Notizen und Meldeknopf · die Sammlung steht an der Tafel</p>;
  return (
    <div className="w-full text-[9px]">
      <div className="mb-1 flex gap-1">
        {[['zwei', 'Zwei Spalten'], ['vier', 'Abgestuft (vier Spalten)']].map(([k, l]) => <button key={k} onClick={() => setForm(k)} className={`rounded-full border px-2 py-0.5 ${form === k ? 'bg-[#F5E1DC] font-semibold' : 'bg-white'}`}>{l}</button>)}
      </div>
      <p className="mb-1 font-bold">Was spricht dafür, was dagegen?</p>
      <div className="flex gap-1">
        {SPALTEN[form].map(([titel, farbe, punkte]) => (
          <div key={titel} className="min-h-[60px] flex-1 rounded-lg p-1" style={{ background: farbe }}>
            <p className="mb-0.5 font-semibold">{titel}</p>
            {punkte.map((p) => <p key={p}>• {p}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}