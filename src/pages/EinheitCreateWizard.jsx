import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import WizardStep1Meta from '@/components/wizard/WizardStep1Meta';
import WizardStepAssistenz from '@/components/wizard/WizardStepAssistenz';
import WizardStep3Generator from '@/components/wizard/WizardStep3Generator';
import WizardStepLernziele from '@/components/wizard/WizardStepLernziele';
import WizardStepper from '@/components/wizard/WizardStepper';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, X } from 'lucide-react';

export default function EinheitCreateWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Draft-Resume: URL-Parameter auslesen
  const urlParams = new URLSearchParams(window.location.search);
  const draftId = urlParams.get('draftId');
  const draftStep = parseInt(urlParams.get('step') || '1', 10);
  // Basismodul-Modus: derselbe Wizard, aber die Einheit wird als Basismodul gestempelt.
  const istBasismodul = urlParams.get('basismodul') === '1';
  const listePfad = istBasismodul ? '/basismodule' : '/einheiten';

  const [currentStep, setCurrentStep] = useState(draftId ? draftStep : 1);
  const [einheitId, setEinheitId]     = useState(draftId || null);
  const [stammdaten, setStammdaten]   = useState({});
  const [completedSteps, setCompletedSteps] = useState(
    draftId ? Array.from({ length: draftStep - 1 }, (_, i) => i + 1) : []
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDraftLoading, setIsDraftLoading] = useState(!!draftId);

  // Beim Wiederaufnehmen: Stammdaten aus DB laden
  useEffect(() => {
    if (!draftId) return;
    base44.entities.Einheiten.filter({ id: draftId }).then(results => {
      const einheit = results?.[0];
      if (einheit) {
        setStammdaten({
          fach: einheit.fach,
          titel_der_einheit: einheit.titel_der_einheit,
          jahrgangsstufe: einheit.jahrgangsstufe,
          zeit_phase_id: einheit.zeit_phase_id,
        });
        // Lade den tatsächlich erreichten max Schritt
        const maxStep = einheit.wizard_max_step || draftStep;
        setCurrentStep(maxStep);
        setCompletedSteps(Array.from({ length: maxStep - 1 }, (_, i) => i + 1));
      }
      setIsDraftLoading(false);
    });
  }, [draftId]);

  const handleCancel = async () => {
    setIsCancelling(true);
    if (draftId) {
      // Draft-Resume: Entwurf bleibt erhalten, einfach zurück
      navigate(listePfad);
      return;
    }
    if (einheitId) {
      // Neuer Wizard: Einheit wurde angelegt → Cascade-Delete
      await base44.functions.invoke('deleteEinheitSecure', { einheit_id: einheitId });
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      queryClient.invalidateQueries({ queryKey: ['basismodule'] });
    }
    navigate(listePfad);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStep1Done = async (metaData) => {
    // `beschreibung` ist nur ein Briefing für die Struktur-KI in Schritt 2 und
    // KEIN Feld der Einheiten-Entity → vor dem Backend-Call rausfiltern, aber
    // im Wizard-State behalten, damit es an WizardStepAssistenz weitergeht.
    const { beschreibung, ...metaForDb } = metaData;
    const res = await base44.functions.invoke('createEinheitMitDefaults', { metaData: metaForDb, istBasismodul });
    const { einheit } = res.data;
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    queryClient.invalidateQueries({ queryKey: ['basismodule'] });
    queryClient.invalidateQueries({ queryKey: ['themenfelder', einheit.id] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    setEinheitId(einheit.id);
    setStammdaten(metaData);
    setCompletedSteps(prev => [...new Set([...prev, 1])]);
    setCurrentStep(2);
  };

  const handleStep2Done = async (structureData) => {
    const { themenfelder = [], lernpakete = [] } = structureData || {};

    // Themenfelder + Lernpakete aus dem KI-Assistenten in die DB schreiben
    if (einheitId && themenfelder.length > 0) {
      // Zuerst alte Default-Einträge bereinigen
      const existingTf = await base44.entities.Themenfeld.filter({ einheit_id: einheitId });
      const existingLp = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
      await Promise.all([
        ...existingTf.map(tf => base44.entities.Themenfeld.delete(tf.id)),
        ...existingLp.map(lp => base44.entities.Lernpakete.delete(lp.id)),
      ]);

      // Neue Struktur anlegen
      for (let i = 0; i < themenfelder.length; i++) {
        const tf = themenfelder[i];
        const newTf = await base44.entities.Themenfeld.create({
          einheit_id: einheitId,
          titel: tf.titel,
          reihenfolge: i + 1,
        });
        const pakete = lernpakete.filter(lp => lp.themenfeld_id === tf.id);
        for (let j = 0; j < pakete.length; j++) {
          await base44.entities.Lernpakete.create({
            einheit_id: einheitId,
            themenfeld_id: newTf.id,
            titel_des_pakets: pakete[j].titel_des_pakets,
            geschaetzte_dauer_minuten: pakete[j].geschaetzte_dauer_minuten || 45,
            reihenfolge_nummer: j + 1,
          });
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['themenfelder', einheitId] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });

    if (einheitId) {
      await base44.entities.Einheiten.update(einheitId, { wizard_max_step: 3 });
    }

    setCompletedSteps(prev => [...new Set([...prev, 2])]);
    setCurrentStep(3);
  };

  const handleStep3Done = async (pakete) => {
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['lernziele'] });
    setCompletedSteps(prev => [...new Set([...prev, 3])]);
    if (einheitId) {
      await base44.entities.Einheiten.update(einheitId, { wizard_max_step: 4 });
    }
    setCurrentStep(4);
  };

  // Schritt 4 = letzter Schritt: Lernziele speichern → Einheit aktivieren → Workspace.
  const handleStep4Done = async () => {
    queryClient.invalidateQueries({ queryKey: ['lernziele'] });
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    queryClient.invalidateQueries({ queryKey: ['basismodule'] });
    setCompletedSteps(prev => [...new Set([...prev, 4])]);
    if (einheitId) {
      await base44.entities.Einheiten.update(einheitId, {
        wizard_max_step: 4,
        wizard_status: 'aktiv',
      });
    }
    if (istBasismodul) {
      navigate(`/basismodule/${einheitId}`);
    } else {
      navigate(`/workspace?einheit=${einheitId}&tab=einheit&fromWizard=1`);
    }
  };

  const handleStepClick = (stepId) => {
    if (completedSteps.includes(stepId) || stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleSkipToStruktur = () => {
    // Defaults wurden bereits in handleStep1Done atomar angelegt
    if (istBasismodul) {
      navigate(`/basismodule/${einheitId}`);
    } else {
      navigate(`/workspace?einheit=${einheitId}&fromWizard=1`);
    }
  };

  if (isDraftLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {draftId
            ? 'Entwurf weiterbearbeiten'
            : istBasismodul ? 'Neues Basismodul erstellen' : 'Neue Einheit erstellen'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {draftId
            ? `Weiter an: ${stammdaten.titel_der_einheit || '...'}`
            : 'Geführter Prozess in 4 Schritten – vom Thema bis zu den Lernzielen.'}
        </p>
      </div>

      {/* Stepper */}
      <WizardStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Navigation: Zurück + Abbrechen */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="gap-1.5 text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCancelDialog(true)}
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="w-4 h-4" />
          Abbrechen
        </Button>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <WizardStep1Meta onDone={handleStep1Done} istBasismodul={istBasismodul} />
        </div>
      )}
      {currentStep === 2 && einheitId && (
        <WizardStepAssistenz
          einheitId={einheitId}
          stammdaten={stammdaten}
          onStructureAccepted={handleStep2Done}
          onSkipToManual={handleSkipToStruktur}
        />
      )}
      {currentStep === 3 && einheitId && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col min-h-[600px]">
          <WizardStep3Generator
            einheitId={einheitId}
            onDone={handleStep3Done}
          />
        </div>
      )}
      {currentStep === 4 && einheitId && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
          <WizardStepLernziele
            einheitId={einheitId}
            onDone={handleStep4Done}
            isFinalStep
          />
        </div>
      )}
      {/* Abbrechen-Bestätigungsdialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wizard abbrechen?</AlertDialogTitle>
            <AlertDialogDescription>
              {draftId
                ? 'Der Entwurf bleibt gespeichert und kann später weiterbearbeitet werden. Möchtest du zurück zur Einheitenliste?'
                : einheitId
                  ? 'Die bereits angelegte Einheit und alle zugehörigen Daten werden unwiderruflich gelöscht.'
                  : 'Der Wizard wird geschlossen. Es wurden noch keine Daten gespeichert.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Weitermachen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Wird gelöscht...' : 'Ja, abbrechen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}