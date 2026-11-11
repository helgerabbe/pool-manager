import React from 'react';
import AufgabensequenzSeite from '@/components/schueler/lesen/AufgabensequenzSeite';

/** Eine Aufgabe des Lernpakets in der Schüler-Vorschau: Elemente Schritt für Schritt, sonst die Aufgabenstellung. */
export default function LernpaketPreviewAufgabe({ aufgabe }) {
  const schritte = Array.isArray(aufgabe.sequenz_schritte) ? aufgabe.sequenz_schritte : [];
  if (aufgabe.aufgaben_modus === 'sequenz' && schritte.length > 0) {
    return (
      <div className="bg-background h-full flex flex-col">
        <AufgabensequenzSeite
          key={aufgabe.id}
          aktivitaet={{
            id: aufgabe.id,
            field_values: { sequenz_schritte: schritte, aufgabentext: aufgabe.aufgabenstellung || '' },
            phase: 'Übung',
          }}
          busy={false}
          onErledigt={() => {}}
          onBack={() => {}}
        />
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-lg font-bold text-slate-900">{aufgabe.titel || 'Aufgabe'}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">
        {aufgabe.aufgabenstellung || 'Diese Aufgabe hat noch keinen Inhalt.'}
      </p>
    </div>
  );
}