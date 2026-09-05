/**
 * CockpitPreviewModals.jsx
 *
 * Sammelt alle Vorschau-Fenster des Lernpfad-Cockpits (Tab 7) an einer Stelle:
 * Dashboard-Vorschau, die vier Onboarding-Elemente, die Themenfeld-Einführung
 * und die Aufgaben-Vorschau. Zustand und Persistenz liegen in
 * `useCockpitPreviews` — diese Komponente rendert ausschließlich.
 */

import React from 'react';
import DashboardPreviewModal from '@/components/lernpfade/DashboardPreviewModal';
import EinfuehrungPreviewModal from '@/components/lernpfade/EinfuehrungPreviewModal';
import EinstiegsdiagnosePreviewModal from '@/components/lernpfade/EinstiegsdiagnosePreviewModal';
import DiagnoseQuizPreviewModal from '@/components/lernpfade/DiagnoseQuizPreviewModal';
import LerntypDiagnosePreviewModal from '@/components/lernpfade/LerntypDiagnosePreviewModal';
import ThemenfeldEinfuehrungPreviewModal from '@/components/lernpfade/ThemenfeldEinfuehrungPreviewModal';
import AufgabePreviewDialog from '@/components/lernpfade/AufgabePreviewDialog';
import LernlandkartePreviewModal from '@/components/lernpfade/LernlandkartePreviewModal';

export default function CockpitPreviewModals({
  previews,
  einheit,
  activeLernTyp,
  sektoren,
  aufgabenById,
  systemBausteineById,
}) {
  const einheitId = einheit?.id;
  const einheitTitel = einheit?.titel_der_einheit;
  const fach = einheit?.fach;
  const { persistOnboardingElement } = previews;

  return (
    <>
      <DashboardPreviewModal
        open={previews.dashboardOpen}
        onOpenChange={previews.setDashboardOpen}
        lerntyp={activeLernTyp}
        einheitTitel={einheitTitel}
        fach={fach}
        sektoren={sektoren}
        aufgabenById={aufgabenById}
        systemBausteineById={systemBausteineById}
        einfuehrungSnapshot={previews.einfuehrungSnapshot}
        qblockSnapshot={previews.qblockSnapshot}
        diagnoseQuizSnapshot={previews.diagnoseQuizSnapshot}
        onPreviewEinfuehrung={previews.openEinfuehrung}
        onPreviewQblock={previews.openQblock}
        onPreviewDiagnoseQuiz={previews.openDiagnoseQuiz}
      />

      <EinfuehrungPreviewModal
        open={previews.einfuehrungOpen}
        onOpenChange={previews.setEinfuehrungOpen}
        einheitId={einheitId}
        einheitTitel={einheitTitel}
        fach={fach}
        onUebernehmen={(snap) => {
          previews.setEinfuehrungSnapshot(snap);
          persistOnboardingElement('einfuehrung', snap);
        }}
      />

      <EinstiegsdiagnosePreviewModal
        open={previews.qblockOpen}
        onOpenChange={previews.setQblockOpen}
        einheitId={einheitId}
        einheitTitel={einheitTitel}
        fach={fach}
        onUebernehmen={(snap) => {
          previews.setQblockSnapshot(snap);
          persistOnboardingElement('fragenblock', snap);
        }}
      />

      <DiagnoseQuizPreviewModal
        open={previews.diagnoseQuizOpen}
        onOpenChange={previews.setDiagnoseQuizOpen}
        einheitId={einheitId}
        einheitTitel={einheitTitel}
        fach={fach}
        initialSnapshot={previews.diagnoseQuizSnapshot}
        onUebernehmen={(snap) => {
          previews.setDiagnoseQuizSnapshot(snap);
          persistOnboardingElement('einstiegsdiagnose', snap);
        }}
      />

      <LerntypDiagnosePreviewModal
        open={previews.lerntypDiagnoseOpen}
        onOpenChange={previews.setLerntypDiagnoseOpen}
        einheitId={einheitId}
        einheitTitel={einheitTitel}
        fach={fach}
        onUebernehmen={(snap) => persistOnboardingElement('lerntyp_diagnose', snap)}
      />

      <ThemenfeldEinfuehrungPreviewModal
        open={!!previews.themenfeldIntroContext}
        onOpenChange={(v) => {
          if (!v) previews.setThemenfeldIntroContext(null);
        }}
        einheitId={einheitId}
        einheitTitel={einheitTitel}
        fach={fach}
        context={previews.themenfeldIntroContext}
      />

      <LernlandkartePreviewModal
        open={previews.lernlandkarteOpen}
        onOpenChange={previews.setLernlandkarteOpen}
        einheitId={einheitId}
        einheitTitel={einheitTitel}
      />

      <AufgabePreviewDialog
        open={!!previews.previewAufgabe}
        onOpenChange={(v) => !v && previews.setPreviewAufgabe(null)}
        aufgabe={previews.previewAufgabe}
      />
    </>
  );
}