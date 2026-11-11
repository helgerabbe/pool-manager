import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AufgabenWerkstatt from '@/components/werkstatt/AufgabenWerkstatt';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';
import DeleteAufgabeConfirmDialog from '@/components/allgemeineAufgaben/DeleteAufgabeConfirmDialog';
import LernpaketAufgabeZeile from './LernpaketAufgabeZeile';
import ReihenfolgePfeile from './ReihenfolgePfeile';
import {
  getAufgabenByEinheit, updateAllgemeineAufgabe, deleteAllgemeineAufgabe,
} from '@/services/AllgemeineAufgabeService';
import { getThemenfelderByEinheit } from '@/services/ThemenfeldService';
import { NIVEAU_STANDARD } from '@/lib/aufgabenNiveau';

/**
 * Teil „Aufgaben" eines Lernpakets: Aufgabe 1, Aufgabe 2, … Jede Aufgabe
 * entsteht in der Aufgabenwerkstatt und trägt Niveau sowie Pflicht/Wahl.
 */
export default function LernpaketAufgabenBereich({ paket, einheit = null, editierbar, platz = null, onUebersicht = null }) {
  // Mit `onUebersicht` führt ein Klick auf eine Aufgabe zu ihrer Übersichtsseite statt in die Werkstatt.
  // Mit `platz` zeigt der Bereich statt eines Lernpakets einen festen Platz
  // des Themenfelds (Einstieg / Gesamtaufgabe); `paket` trägt dann nur
  // einheit_id und themenfeld_id.
  const queryClient = useQueryClient();
  const einheitId = paket.einheit_id;
  // null = Werkstatt zu; { aufgabe: null } = neue Aufgabe; { aufgabe } = bearbeiten
  const [werkstatt, setWerkstatt] = useState(null);
  const [zuLoeschen, setZuLoeschen] = useState(null);

  const { data: alle = [], isLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => getAufgabenByEinheit(einheitId),
    enabled: !!einheitId,
  });
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder-by-einheit', einheitId],
    queryFn: () => getThemenfelderByEinheit(einheitId),
    enabled: !!einheitId,
  });

  const aufgaben = useMemo(() => alle
    .filter((a) => a.sync_status !== 'to_delete')
    .filter((a) => (platz
      ? !a.lernpaket_id && a.themenfeld_id === paket.themenfeld_id && a.themenfeld_platz === platz.key
      : a.lernpaket_id === paket.id))
    .sort((a, b) => (a.reihenfolge_im_lernpaket ?? 0) - (b.reihenfolge_im_lernpaket ?? 0)
      || String(a.created_date).localeCompare(String(b.created_date))), [alle, paket.id, paket.themenfeld_id, platz]);

  const anlegeFelder = useMemo(() => ({
    ...(platz
      ? { themenfeld_platz: platz.key, themenfeld_id: paket.themenfeld_id }
      : { lernpaket_id: paket.id }),
    niveau: NIVEAU_STANDARD,
    pflicht: true,
    reihenfolge_im_lernpaket: aufgaben.length + 1,
  }), [paket.id, paket.themenfeld_id, platz, aufgaben.length]);

  const alteEinzelaufgabe = werkstatt?.aufgabe && werkstatt.aufgabe.aufgaben_modus !== 'sequenz'
    ? werkstatt.aufgabe : null;

  const neuLaden = () => queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });

  const aendern = useMutation({
    mutationFn: ({ id, daten }) => updateAllgemeineAufgabe(id, daten),
    onSuccess: neuLaden,
    onError: (err) => toast.error('Änderung konnte nicht gespeichert werden: ' + (err?.message || 'Unbekannter Fehler')),
  });
  const verschieben = useMutation({
    mutationFn: ({ index, richtung }) => {
      const liste = [...aufgaben];
      [liste[index], liste[index + richtung]] = [liste[index + richtung], liste[index]];
      return Promise.all(liste.map((a, i) => (a.reihenfolge_im_lernpaket === i + 1
        ? null
        : updateAllgemeineAufgabe(a.id, { reihenfolge_im_lernpaket: i + 1 }))));
    },
    onSuccess: neuLaden,
    onError: (err) => toast.error('Reihenfolge konnte nicht gespeichert werden: ' + (err?.message || 'Unbekannter Fehler')),
  });
  const loeschen = useMutation({
    mutationFn: (id) => deleteAllgemeineAufgabe(id),
    onSuccess: () => { setZuLoeschen(null); neuLaden(); toast.success('Aufgabe gelöscht'); },
    onError: (err) => toast.error('Löschen fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler')),
  });

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aufgaben werden geladen…
        </div>
      ) : aufgaben.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{platz ? platz.leer : 'Noch keine Aufgabe in diesem Lernpaket.'}</p>
      ) : (
        <>
        {aufgaben.map((a, i) => (
          <LernpaketAufgabeZeile
            key={a.id}
            aufgabe={a}
            nummer={i + 1}
            editierbar={editierbar}
            pfeile={editierbar && aufgaben.length > 1 ? (
              <ReihenfolgePfeile
                erste={i === 0}
                letzte={i === aufgaben.length - 1}
                disabled={verschieben.isPending}
                onHoch={() => verschieben.mutate({ index: i, richtung: -1 })}
                onRunter={() => verschieben.mutate({ index: i, richtung: 1 })}
              />
            ) : null}
            onAendern={(daten) => aendern.mutate({ id: a.id, daten })}
            onOeffnen={() => (onUebersicht ? onUebersicht(a.id) : setWerkstatt({ aufgabe: a }))}
            onLoeschen={() => setZuLoeschen(a)}
          />
        ))}
        </>
      )}

      {editierbar && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setWerkstatt({ aufgabe: null })}>
          <Plus /> Neue Aufgabe
        </Button>
      )}

      {/* Umgezogene Einzelaufgaben behalten ihr bisheriges Formular. */}
      <AufgabeCreateView
        open={!!alteEinzelaufgabe}
        onOpenChange={(offen) => { if (!offen) setWerkstatt(null); }}
        einheitId={einheitId}
        themenfelder={themenfelder}
        initialData={alteEinzelaufgabe}
        onSuccess={neuLaden}
      />

      <AufgabenWerkstatt
        open={werkstatt !== null && !alteEinzelaufgabe}
        onOpenChange={(offen) => { if (!offen) { setWerkstatt(null); neuLaden(); } }}
        einheitId={einheitId}
        einheit={einheit}
        themenfelder={themenfelder}
        initialData={werkstatt?.aufgabe || null}
        defaultThemenfeldId={paket.themenfeld_id || null}
        anlegeFelder={anlegeFelder}
        isReleased={!editierbar || werkstatt?.aufgabe?.content_status === 'approved'}
      />

      <DeleteAufgabeConfirmDialog
        open={!!zuLoeschen}
        onOpenChange={(offen) => { if (!offen) setZuLoeschen(null); }}
        aufgabe={zuLoeschen}
        isDeleting={loeschen.isPending}
        onConfirm={() => loeschen.mutate(zuLoeschen.id)}
      />
    </div>
  );
}