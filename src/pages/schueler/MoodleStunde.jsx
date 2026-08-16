/**
 * Schülerseite einer per Moodle verknüpften Unterrichtsstunde (LTI).
 * Die Daten laufen über die geprüfte Backend-Funktion ltiApi — Moodle-Schüler
 * haben kein Base44-Konto.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStunde, listStundenPhasen, getAktivitaetenKatalog } from '@/services/schueler/adapters/ltiAdapter';
import StundenPlayer from '@/components/unterrichtsstunden/schueler/StundenPlayer';

export default function MoodleStunde() {
  const id = new URLSearchParams(window.location.search).get('id') || '';

  const { data: stunde, isLoading, error } = useQuery({
    queryKey: ['ltiStunde', id],
    queryFn: () => getStunde(id),
    enabled: !!id,
  });
  const { data: phasen = [], isLoading: phasenLoading } = useQuery({
    queryKey: ['ltiStundenPhasen', id],
    queryFn: () => listStundenPhasen(id),
    enabled: !!id,
  });
  const { data: katalog = [] } = useQuery({
    queryKey: ['ltiAktivitaetenKatalog'],
    queryFn: getAktivitaetenKatalog,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || phasenLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stunde) {
    return (
      <p className="text-sm text-muted-foreground py-16 text-center">
        Diese Unterrichtsstunde konnte nicht geladen werden. Bitte gehe zurück zu Moodle und klicke dort erneut auf die Aktivität.
      </p>
    );
  }

  return <StundenPlayer stunde={stunde} phasen={phasen} katalog={katalog} />;
}