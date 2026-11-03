import React from 'react';
import Abschnitt from './Abschnitt';
import QuelleZeile from './QuelleZeile';

/** Eingegebene Informationen: alles Hinzugefügte im Original, mit Datum und Uhrzeit. */
export default function FachinhaltQuellen({ quellen, onNeu }) {
  return (
    <Abschnitt titel={`Eingegebene Informationen (${quellen.length})`}>
      <div className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Alles, was du hinzugefügt hast, im Original. Du kannst Einträge bearbeiten oder löschen; danach erneut einordnen.</p>
        {!quellen.length && <p className="text-muted-foreground">Noch nichts hinzugefügt.</p>}
        {quellen.map((q) => <QuelleZeile key={q.id} q={q} onNeu={onNeu} />)}
      </div>
    </Abschnitt>
  );
}