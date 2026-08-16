/**
 * Offene Aufgabe einer Stunden-Phase: aus der Aufgabenbeschreibung eine
 * interaktive Aufgabe (HTML-Mini-App) generieren, ausprobieren und als
 * Snapshot übernehmen.
 *
 * Wiederverwendung des Einheiten-Flows: OffeneAufgabePreviewModal erzeugt die
 * Umsetzung und liefert das HTML zurück; hier wird es in
 * StundenSequenz.field_values.approved_snapshot_html gespeichert — genau das
 * Feld, das die Schüler-Seite (OffeneAufgabeSeite) rendert.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Wand2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import OffeneAufgabePreviewModal from '@/components/workspace/preview/OffeneAufgabePreviewModal';

export default function StundenOffeneAufgabeVorschauButton({ phase, katalogEntry, stundeId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const fv = phase.field_values || {};
  const description = fv.description || '';
  const snapshot = fv.approved_snapshot_html || '';

  const uebernehmen = async (html) => {
    await base44.entities.StundenSequenz.update(phase.id, {
      field_values: { ...fv, approved_snapshot_html: html },
      is_complete: true,
    });
    queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
    toast.success('Interaktive Aufgabe übernommen.');
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-violet-900">Interaktive Umsetzung der Aufgabe</p>
        <p className="text-xs text-violet-800/80 inline-flex items-center gap-1">
          {snapshot ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Aufgabe ist umgesetzt — Schüler sehen diese interaktive Version.</>
          ) : description ? (
            'Aus Ihrer Beschreibung wird eine funktionierende Aufgabe gebaut, die Sie vorab ausprobieren können.'
          ) : (
            <><AlertTriangle className="w-3.5 h-3.5" /> Beschreiben Sie die Aufgabe zuerst unter „Aufgabe bearbeiten".</>
          )}
        </p>
      </div>
      <Button
        size="sm"
        className="gap-2 shrink-0 bg-violet-600 hover:bg-violet-700"
        onClick={() => setOpen(true)}
        disabled={!description.trim()}
      >
        <Wand2 className="w-3.5 h-3.5" />
        {snapshot ? 'Aufgabe neu generieren' : 'Aufgabe jetzt generieren'}
      </Button>

      <OffeneAufgabePreviewModal
        open={open}
        onOpenChange={setOpen}
        description={description}
        kontext={phase.lehrer_hinweis || ''}
        catalogName={katalogEntry?.name || 'Offene Aufgabe'}
        phase={phase.phasenname || 'Übung'}
        existingSnapshotHtml={snapshot}
        canApprove
        onApproveSnapshot={uebernehmen}
      />
    </div>
  );
}