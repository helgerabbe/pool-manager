/**
 * useCockpitPreviews.js
 *
 * Bündelt den kompletten Vorschau-Zustand des Lernpfad-Cockpits (Tab 7):
 *   - die vier Onboarding-Vorschauen (Einführung, freiwilliger Fragenblock,
 *     Einstiegsdiagnose, Lerntyp-Diagnose),
 *   - die Themenfeld-Einführung (instanzbezogen),
 *   - die Aufgaben-Vorschau,
 *   - das Speichern eines übernommenen Onboarding-Elements.
 *
 * Zweck der Auslagerung: Das Cockpit hält nur noch `previews` in der Hand und
 * gibt es an <CockpitPreviewModals /> weiter — Öffnen/Schließen, Snapshots und
 * Persistenz liegen hier gesammelt statt verteilt im Orchestrator.
 *
 * Die „Snapshots" sind transient: Ein übernommener Snapshot wird sofort
 * einheits-global gespeichert UND lokal gehalten, damit die Dashboard-Vorschau
 * ihn ohne Refetch direkt anzeigen kann.
 */

import { useCallback, useMemo, useState } from 'react';
import { speichereOnboardingSnapshot } from '@/lib/onboardingSnapshots';

export function useCockpitPreviews({ einheitId, toast, queryClient }) {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [einfuehrungOpen, setEinfuehrungOpen] = useState(false);
  const [qblockOpen, setQblockOpen] = useState(false);
  const [diagnoseQuizOpen, setDiagnoseQuizOpen] = useState(false);
  const [lerntypDiagnoseOpen, setLerntypDiagnoseOpen] = useState(false);

  const [einfuehrungSnapshot, setEinfuehrungSnapshot] = useState(null);
  const [qblockSnapshot, setQblockSnapshot] = useState(null);
  const [diagnoseQuizSnapshot, setDiagnoseQuizSnapshot] = useState(null);

  // Themenfeld-Einführung: trägt Lerntyp + instance_id + themenfeld_id, damit
  // das Modal genau die richtige Snapshot-Instanz vorschaut/überschreibt.
  const [themenfeldIntroContext, setThemenfeldIntroContext] = useState(null);
  const [previewAufgabe, setPreviewAufgabe] = useState(null);

  /**
   * Speichert ein Onboarding-Element (einfuehrung | fragenblock |
   * einstiegsdiagnose | lerntyp_diagnose) als einheits-globalen Snapshot
   * (SchuelerInhaltSnapshot, geltungsbereich='einheit').
   */
  const persistOnboardingElement = useCallback(
    async (key, snapshot) => {
      if (!einheitId) return;
      try {
        await speichereOnboardingSnapshot(einheitId, key, snapshot, 'lehrer_tool');
        queryClient.invalidateQueries({ queryKey: ['onboardingSnapshots', einheitId] });
        toast({
          title: 'Für die Einheit gespeichert',
          description: 'Dieses Onboarding-Element wird allen Arbeitsplänen vorgeschaltet.',
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Speichern fehlgeschlagen',
          description: err?.message || 'Bitte erneut versuchen.',
        });
      }
    },
    [einheitId, queryClient, toast]
  );

  const openEinfuehrung = useCallback(() => setEinfuehrungOpen(true), []);
  const openQblock = useCallback(() => setQblockOpen(true), []);
  const openDiagnoseQuiz = useCallback(() => setDiagnoseQuizOpen(true), []);
  const openLerntypDiagnose = useCallback(() => setLerntypDiagnoseOpen(true), []);
  const openDashboard = useCallback(() => setDashboardOpen(true), []);
  const openThemenfeldIntro = useCallback((ctx) => setThemenfeldIntroContext(ctx), []);

  return useMemo(
    () => ({
      // Öffnen
      openDashboard,
      openEinfuehrung,
      openQblock,
      openDiagnoseQuiz,
      openLerntypDiagnose,
      openThemenfeldIntro,
      setPreviewAufgabe,
      // Zustand (wird an CockpitPreviewModals durchgereicht)
      dashboardOpen,
      setDashboardOpen,
      einfuehrungOpen,
      setEinfuehrungOpen,
      qblockOpen,
      setQblockOpen,
      diagnoseQuizOpen,
      setDiagnoseQuizOpen,
      lerntypDiagnoseOpen,
      setLerntypDiagnoseOpen,
      einfuehrungSnapshot,
      setEinfuehrungSnapshot,
      qblockSnapshot,
      setQblockSnapshot,
      diagnoseQuizSnapshot,
      setDiagnoseQuizSnapshot,
      themenfeldIntroContext,
      setThemenfeldIntroContext,
      previewAufgabe,
      persistOnboardingElement,
    }),
    [
      openDashboard,
      openEinfuehrung,
      openQblock,
      openDiagnoseQuiz,
      openLerntypDiagnose,
      openThemenfeldIntro,
      dashboardOpen,
      einfuehrungOpen,
      qblockOpen,
      diagnoseQuizOpen,
      lerntypDiagnoseOpen,
      einfuehrungSnapshot,
      qblockSnapshot,
      diagnoseQuizSnapshot,
      themenfeldIntroContext,
      previewAufgabe,
      persistOnboardingElement,
    ]
  );
}

export default useCockpitPreviews;