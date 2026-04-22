import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Puzzle, Edit } from 'lucide-react';
import StepEmptyState from '@/components/shared/EmptyState';
import ActivityContentForm from '@/components/workspace/ActivityContentForm';

export default function AktivitaetEditPanel({
  paket,
  phaseKey,
  phaseLabel,
  kannBearbeiten,
  queryClient,
  activityRecordId,
}) {
  const [contentFormOpen, setContentFormOpen] = useState(false);

  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['aktivitaeten'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const phasenConfig = paket.phasen_konfiguration || {};
  const phaseConfig = phasenConfig[phaseKey] || {};
  const aktivitaet = aktivitaeten.find(a => a.id === phaseConfig.selected_aktivitaet_id);

  // Öffne die ContentForm automatisch beim Mounten
  useEffect(() => {
    if (aktivitaet) setContentFormOpen(true);
  }, [aktivitaet?.id]);

  if (!aktivitaet) {
    return (
      <StepEmptyState
        icon={Puzzle}
        title="Aktivität nicht gefunden"
        description="Die dieser Phase zugeordnete Aktivität konnte nicht geladen werden."
        status="yellow"
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{phaseLabel}</p>
          <h2 className="text-lg font-bold">{aktivitaet.name}</h2>
        </div>
        {kannBearbeiten && (
          <Button onClick={() => setContentFormOpen(true)} className="gap-2">
            <Edit className="w-4 h-4" /> Inhalt bearbeiten
          </Button>
        )}
      </div>

      <ActivityContentForm
        open={contentFormOpen}
        onOpenChange={setContentFormOpen}
        aktivitaet={aktivitaet}
        initialData={phaseConfig.field_values || {}}
        onSave={async ({ content_data, is_complete }) => {
          const newConfig = {
            ...phasenConfig,
            [phaseKey]: {
              ...phaseConfig,
              field_values: content_data,
              is_complete,
            },
          };
          try {
            // Schreibe in beide Datenstrukturen für Konsistenz
            await base44.entities.Lernpakete.update(paket.id, {
              phasen_konfiguration: newConfig,
            });
            // Aktualisiere auch den LernpaketPhaseAktivitaet-Record (neue Architektur)
            if (activityRecordId) {
              await base44.entities.LernpaketPhaseAktivitaet.update(
                activityRecordId,
                {
                  field_values: content_data,
                  is_complete,
                }
              );
            }
            queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
            queryClient.invalidateQueries({
              queryKey: ['lernpaketPhaseAktivitaeten'],
            });
            setContentFormOpen(false);
          } catch (err) {
            toast.error('Fehler beim Speichern: ' + (err.message || 'Unbekannter Fehler'));
          }
        }}
      />
    </>
  );
}