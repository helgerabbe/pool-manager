import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import WizardStep1Meta from '@/components/wizard/WizardStep1Meta';
import WizardStepAssistenz from '@/components/wizard/WizardStepAssistenz';
import WizardStep3Generator from '@/components/wizard/WizardStep3Generator';
import WizardStep4Bausteine from '@/components/wizard/WizardStep4Bausteine';
import WizardStepper from '@/components/wizard/WizardStepper';

export default function EinheitCreateWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [einheitId, setEinheitId]     = useState(null);
  const [stammdaten, setStammdaten]   = useState({});
  const [paketeCreated, setPaketeCreated] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);

  const handleStep1Done = async (metaData) => {
    // Atomare Erstellung: Einheit + Default-Themenfeld + Default-Lernpaket
    const res = await base44.functions.invoke('createEinheitMitDefaults', { metaData });
    const { einheit } = res.data;
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    queryClient.invalidateQueries({ queryKey: ['themenfelder', einheit.id] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    setEinheitId(einheit.id);
    setStammdaten(metaData);
    setCompletedSteps(prev => [...new Set([...prev, 1])]);
    setCurrentStep(2);
  };

  const handleStep2Done = async (structureData) => {
    // Structure wurde bereits aktualisiert, weitergehen zu Step 3
    setCompletedSteps(prev => [...new Set([...prev, 2])]);
    setCurrentStep(3);
  };

  const handleStep3Done = (pakete) => {
    setPaketeCreated(pakete || []);
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['lernziele'] });
    setCompletedSteps(prev => [...new Set([...prev, 3])]);
    setCurrentStep(4);
  };

  const handleStep4Done = () => {
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
    setCompletedSteps(prev => [...new Set([...prev, 4])]);
    navigate(`/workspace?einheit=${einheitId}&fromWizard=1`);
  };

  const handleStepClick = (stepId) => {
    if (completedSteps.includes(stepId) || stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleSkipToStruktur = () => {
    // Defaults wurden bereits in handleStep1Done atomar angelegt
    navigate(`/workspace?einheit=${einheitId}&fromWizard=1`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Neue Einheit erstellen</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Geführter Prozess in 4 Schritten – vom Thema bis zur befüllten Lernstruktur.
        </p>
      </div>

      {/* Stepper */}
      <WizardStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      {currentStep === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <WizardStep1Meta onDone={handleStep1Done} />
        </div>
      )}
      {currentStep === 2 && einheitId && (
        <WizardStepAssistenz
          einheitId={einheitId}
          stammdaten={stammdaten}
          onStructureAccepted={handleStep2Done}
        />
      )}
      {currentStep === 3 && einheitId && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
          <WizardStep3Generator
            einheitId={einheitId}
            onDone={handleStep3Done}
            onSkipAll={handleSkipToStruktur}
          />
        </div>
      )}
      {currentStep === 4 && einheitId && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
          <WizardStep4Bausteine
            einheitId={einheitId}
            pakete={paketeCreated}
            onDone={handleStep4Done}
            onSkipAll={handleSkipToStruktur}
          />
        </div>
      )}
    </div>
  );
}