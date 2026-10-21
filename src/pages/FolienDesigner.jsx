import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ElementPalette from '@/components/foliendesigner/ElementPalette';
import FolienArbeitsflaeche from '@/components/foliendesigner/FolienArbeitsflaeche';
import { FOLIEN_ELEMENT } from '@/lib/folienElemente';
import ElementEinstellungen from '@/components/foliendesigner/ElementEinstellungen';
import OrganisationDialog from '@/components/foliendesigner/organisation/OrganisationDialog';
import { ORGANISATION_START } from '@/lib/folienOrganisation';
import FolienKonzeptDialog from '@/components/foliendesigner/FolienKonzeptDialog';
import LehrerSteuerung from '@/components/foliendesigner/LehrerSteuerung';

/** Folien-Designer: Übersicht der Bausteine, auf die der Grafikassistent zurückgreifen kann (noch ohne Funktion). */
export default function FolienDesigner() {
  const [elemente, setElemente] = React.useState([]);
  const [gewaehlt, setGewaehlt] = React.useState(null);
  const [organisation, setOrganisation] = React.useState(ORGANISATION_START);
  const gewaehltEl = elemente.find((e) => e.id === gewaehlt);
  const aktiv = FOLIEN_ELEMENT[gewaehltEl?.typ];

  return (
    <div className="flex h-full">
      <ElementPalette />
      <div className="flex flex-1 flex-col items-center gap-4 overflow-auto bg-muted/40 p-6">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Folien-Designer</h1>
            <p className="text-sm text-muted-foreground">
              {aktiv ? `${aktiv.label}${aktiv.modus ? ' · später wählbar: Einzelmodus oder Gruppenmodus' : ''}` : 'Vorschau der Bausteine des Grafikassistenten, noch ohne hinterlegte Funktion.'}
            </p>
          </div>
          <div className="flex gap-2"><FolienKonzeptDialog /><OrganisationDialog o={organisation} setO={setOrganisation} />
          <Button variant="outline" size="sm" disabled={!elemente.length} onClick={() => { setElemente([]); setGewaehlt(null); }}><Trash2 />Folie leeren</Button></div>
        </div>
        <LehrerSteuerung o={organisation} />
        <FolienArbeitsflaeche elemente={elemente} setElemente={setElemente} gewaehlt={gewaehlt} setGewaehlt={setGewaehlt} />
      </div>
      {gewaehltEl && <ElementEinstellungen el={gewaehltEl} setze={(p) => setElemente(elemente.map((e) => (e.id === gewaehlt ? { ...e, ...p } : e)))} />}
    </div>
  );
}