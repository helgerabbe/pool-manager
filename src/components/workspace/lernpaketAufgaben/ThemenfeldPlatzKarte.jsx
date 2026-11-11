import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ElementKopf from '@/components/workspace/kopf/ElementKopf';
import BearbeitenKnopf from '@/components/workspace/kopf/BearbeitenKnopf';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { aufgabenAmPlatz } from '@/lib/lernpaketAufgaben';
import LernpaketAufgabenBereich from './LernpaketAufgabenBereich';
import AufgabenEinstellungenHilfe from './AufgabenEinstellungenHilfe';
import ThemenfeldPlatzAktionen from './ThemenfeldPlatzAktionen';
import ThemenfeldPlatzDetails from './ThemenfeldPlatzDetails';
import { istVollstaendig } from './LernpaketAufgabenGruppe';
import NacharbeitToggle from '@/components/release/NacharbeitToggle';
import ElementHinweise from '@/components/workspace/kopf/ElementHinweise';

/**
 * Ein fester Platz im Themenfeld („Einstieg" oder „Gesamtaufgabe") im Aufbau
 * eines Lernpakets: Kopf mit Status und Bearbeiten, Aktions-Leiste, Aufgaben.
 * Änderungen werden sofort gespeichert; „Speichern" beendet den Bearbeitungsmodus.
 */
export default function ThemenfeldPlatzKarte({ platz, themenfeld, editierbar, onAufgabeOeffnen = null }) {
  const [bearbeitet, setBearbeitet] = useState(false);
  const { data: alle = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', themenfeld.einheit_id],
    queryFn: () => getAufgabenByEinheit(themenfeld.einheit_id),
    enabled: !!themenfeld.einheit_id,
  });
  const aufgaben = aufgabenAmPlatz(alle, themenfeld.id, platz.key);
  const vollstaendig = aufgaben.length > 0 && aufgaben.every(istVollstaendig);
  const freigegeben = aufgaben.length > 0 && aufgaben.every((a) => a.content_status === 'approved');
  const status = aufgaben.length === 0 ? 'new' : freigegeben ? 'released' : vollstaendig ? 'green' : 'red';

  return (
    <div className="space-y-6">
      <ElementKopf
        overline={themenfeld.titel}
        titel={platz.titel}
        status={status}
        beschreibung={platz.beschreibung}
        details={<ThemenfeldPlatzDetails aufgaben={aufgaben} freigegeben={freigegeben} />}
        rechts={editierbar && (
          <BearbeitenKnopf aktiv={bearbeitet} onClick={() => setBearbeitet((v) => !v)} disabled={freigegeben}
            title={freigegeben ? '🔒 Freigegeben – zum Bearbeiten erst die Freigabe zurücknehmen.' : ''} />
        )}
        aktionen={<ThemenfeldPlatzAktionen aufgaben={aufgaben} vollstaendig={vollstaendig} freigegeben={freigegeben}
          editierbar={editierbar} bearbeitet={bearbeitet} />}
      />

      {/* Merker und Hinweise der Aufgaben dieses Platzes – wie am Lernpaket-Element. */}
      {editierbar && aufgaben.length > 0 && (
        <div className="space-y-2">
          {aufgaben.map((a, i) => (
            <div key={a.id} className="space-y-1">
              {aufgaben.length > 1 && (
                <p className="text-xs font-semibold text-muted-foreground">Aufgabe {i + 1}: {a.titel}</p>
              )}
              <NacharbeitToggle activity={a} entity="AllgemeineAufgabe" queryKey="allgemeineAufgaben" />
            </div>
          ))}
          <ElementHinweise einheitId={themenfeld.einheit_id} zielIds={aufgaben.map((a) => a.id)} gesperrt={freigegeben} />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">✏️</span>
          <h3 className="text-xl font-bold text-foreground">Aufgaben</h3>
          <AufgabenEinstellungenHilfe imLernpaket={false} />
        </div>
        <LernpaketAufgabenBereich
          paket={{ einheit_id: themenfeld.einheit_id, themenfeld_id: themenfeld.id }}
          platz={platz}
          editierbar={editierbar && bearbeitet && !freigegeben}
          onUebersicht={onAufgabeOeffnen}
        />
      </div>
    </div>
  );
}