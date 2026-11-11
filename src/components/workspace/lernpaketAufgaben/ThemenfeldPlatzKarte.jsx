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