import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DeleteActivityConfirmDialog from '@/components/workspace/DeleteActivityConfirmDialog';
import LernpaketElementZeile from './LernpaketElementZeile';
import ReihenfolgePfeile from './ReihenfolgePfeile';

/**
 * Elemente eines Lernpaket-Teils (Wissensspeicher oder Abschluss) als Zeilen:
 * bearbeiten, löschen, umsortieren und über den Knopf darunter hinzufügen.
 * Mit `einzeln` gibt es höchstens ein Element; eine neue Wahl ersetzt das alte.
 */
export default function LernpaketElementBereich({
  paket, phase, aktivitaeten, katalog, editierbar, einzeln = false, farbe, leerText, knopfText, onOeffnen,
}) {
  const queryClient = useQueryClient();
  // { ids, name, ersatzId } — ersatzId = nach dem Löschen dieses Format anlegen.
  const [zuLoeschen, setZuLoeschen] = useState(null);

  const sortiert = useMemo(() => [...aktivitaeten].sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
    || String(a.created_date).localeCompare(String(b.created_date))), [aktivitaeten]);
  const nameVon = (a) => katalog.find((k) => k.id === a.aktivitaet_id)?.name || 'Unbekanntes Element';
  const auswahl = katalog
    .filter((k) => k.phase === phase && k.is_active !== false && k.name !== 'Kompaktwissen')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

  const neuLaden = () => {
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
  };
  const anlegenRoh = (aktivitaetId, reihenfolge) => base44.entities.LernpaketPhaseAktivitaet.create({
    lernpaket_id: paket.id, phase, aktivitaet_id: aktivitaetId, field_values: {}, is_complete: false, reihenfolge,
  });

  const anlegen = useMutation({
    mutationFn: (aktivitaetId) => anlegenRoh(aktivitaetId, sortiert.length),
    onSuccess: () => { neuLaden(); toast.success('Hinzugefügt.'); },
    onError: () => toast.error('Hinzufügen fehlgeschlagen.'),
  });
  const verschieben = useMutation({
    mutationFn: ({ index, richtung }) => {
      const ids = sortiert.map((a) => a.id);
      [ids[index], ids[index + richtung]] = [ids[index + richtung], ids[index]];
      return Promise.all(ids.map((id, i) => base44.entities.LernpaketPhaseAktivitaet.update(id, { reihenfolge: i })));
    },
    onSuccess: neuLaden,
    onError: () => toast.error('Reihenfolge konnte nicht gespeichert werden.'),
  });
  const loeschen = useMutation({
    mutationFn: async ({ ids, ersatzId }) => {
      for (const id of ids) {
        const res = await base44.functions.invoke('deleteActivityWithTombstoneAndCascade', { activity_id: id });
        if (res?.data?.error) throw new Error(res.data.error);
      }
      if (ersatzId) await anlegenRoh(ersatzId, 0);
    },
    onSuccess: (_, { ersatzId }) => { setZuLoeschen(null); neuLaden(); toast.success(ersatzId ? 'Geändert.' : 'Gelöscht.'); },
    onError: (err) => toast.error(err?.message || 'Löschen fehlgeschlagen.'),
  });

  const waehlen = (aktivitaetId) => {
    if (einzeln && sortiert.length > 0) {
      setZuLoeschen({ ids: sortiert.map((a) => a.id), name: sortiert.map(nameVon).join(', '), ersatzId: aktivitaetId });
    } else {
      anlegen.mutate(aktivitaetId);
    }
  };
  const aendert = einzeln && sortiert.length > 0;

  return (
    <div className="space-y-2">
      {sortiert.length === 0 && <p className="text-xs text-muted-foreground italic">{leerText}</p>}
      {sortiert.map((a, i) => {
        const name = nameVon(a);
        const standard = name === 'Kompaktwissen';
        return (
          <LernpaketElementZeile
            key={a.id}
            activity={a}
            name={name}
            farbe={farbe}
            standard={standard}
            loeschbar={editierbar && !standard && a.content_status !== 'approved'}
            pfeile={editierbar && sortiert.length > 1 ? (
              <ReihenfolgePfeile
                erste={i === 0}
                letzte={i === sortiert.length - 1}
                disabled={verschieben.isPending}
                onHoch={() => verschieben.mutate({ index: i, richtung: -1 })}
                onRunter={() => verschieben.mutate({ index: i, richtung: 1 })}
              />
            ) : null}
            onOeffnen={() => onOeffnen(a.id)}
            onLoeschen={() => setZuLoeschen({ ids: [a.id], name })}
          />
        );
      })}

      {editierbar && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={anlegen.isPending}>
              {aendert ? <Repeat /> : <Plus />} {aendert ? knopfText.aendern : knopfText.neu}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {auswahl.length === 0 && <DropdownMenuItem disabled>Keine Auswahl vorhanden</DropdownMenuItem>}
            {auswahl.map((k) => (
              <DropdownMenuItem key={k.id} onSelect={() => waehlen(k.id)}>{k.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DeleteActivityConfirmDialog
        open={!!zuLoeschen}
        onOpenChange={(offen) => { if (!offen) setZuLoeschen(null); }}
        onConfirm={() => zuLoeschen && loeschen.mutate(zuLoeschen)}
        isDeleting={loeschen.isPending}
        activityName={zuLoeschen?.name}
      />
    </div>
  );
}