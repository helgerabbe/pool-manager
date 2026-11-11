import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/workspace/panels/SharedUI';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { aufgabenAmPlatz } from '@/lib/lernpaketAufgaben';
import LernpaketAufgabenBereich from './LernpaketAufgabenBereich';
import AufgabenEinstellungenHilfe from './AufgabenEinstellungenHilfe';
import ThemenfeldPlatzAktionen from './ThemenfeldPlatzAktionen';
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
      <div className="space-y-3">
        <div className="pb-3 border-b flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{themenfeld.titel}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{platz.titel}</h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{platz.beschreibung}</p>
          </div>
          {editierbar && (bearbeitet ? (
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setBearbeitet(false)}>
              <Save /> Speichern
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBearbeitet(true)} disabled={freigegeben}
              title={freigegeben ? '🔒 Freigegeben – zum Bearbeiten erst die Freigabe zurücknehmen.' : ''}
              className="gap-2 shrink-0 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900">
              <PenLine /> Bearbeiten
            </Button>
          ))}
        </div>
        <ThemenfeldPlatzAktionen aufgaben={aufgaben} vollstaendig={vollstaendig} freigegeben={freigegeben}
          editierbar={editierbar} bearbeitet={bearbeitet} />
      </div>

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