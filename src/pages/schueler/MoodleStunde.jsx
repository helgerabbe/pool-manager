/**
 * Schülerseite einer per Moodle verknüpften Unterrichtsstunde (LTI).
 * Die Daten laufen über die geprüfte Backend-Funktion ltiApi — Moodle-Schüler
 * haben kein Base44-Konto.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStunde, listStundenPhasen, getAktivitaetenKatalog } from '@/services/schueler/adapters/ltiAdapter';
import { base44 } from '@/api/base44Client';
import { hasToken } from '@/services/AuthService';
import StundenPlayer from '@/components/unterrichtsstunden/schueler/StundenPlayer';

export default function MoodleStunde() {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  // Eingeloggte Lehrkräfte (Vorschau/Test des Moodle-Einstiegs) lesen direkt,
  // Moodle-Schüler ohne Konto über die geprüfte ltiApi.
  const alsLehrkraft = hasToken();

  const { data: stunde, isLoading, error } = useQuery({
    queryKey: ['ltiStunde', id, alsLehrkraft],
    queryFn: () => (alsLehrkraft ? base44.entities.Unterrichtsstunde.get(id) : getStunde(id)),
    enabled: !!id,
  });
  const { data: phasen = [], isLoading: phasenLoading } = useQuery({
    queryKey: ['ltiStundenPhasen', id, alsLehrkraft],
    queryFn: () =>
      alsLehrkraft
        ? base44.entities.StundenSequenz.filter({ stunde_id: id }, 'reihenfolge')
        : listStundenPhasen(id),
    enabled: !!id,
  });
  const { data: katalog = [] } = useQuery({
    queryKey: ['ltiAktivitaetenKatalog', alsLehrkraft],
    queryFn: () => (alsLehrkraft ? base44.entities.AktivitaetenKatalog.list() : getAktivitaetenKatalog()),
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