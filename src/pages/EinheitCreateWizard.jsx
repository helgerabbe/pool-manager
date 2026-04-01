import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, BookOpen, MessageSquare, Zap, Layers } from 'lucide-react';
import WizardStep1Meta from '@/components/wizard/WizardStep1Meta';
import WizardStep2Coach from '@/components/wizard/WizardStep2Coach';
import WizardStep3Generator from '@/components/wizard/WizardStep3Generator';
import WizardStep4Bausteine from '@/components/wizard/WizardStep4Bausteine';

const STEPS = [
  { id: 1, label: 'Meta-Daten',      icon: BookOpen,       desc: 'Titel, Fach, Jahrgang' },
  { id: 2, label: 'Didaktik-Coach',  icon: MessageSquare,  desc: 'KI-gestützte Strukturierung' },
  { id: 3, label: 'Massenimport',    icon: Zap,            desc: 'Lernpakete & Ziele anlegen' },
  { id: 4, label: 'Basis-Befüllung', icon: Layers,         desc: 'Pflicht-Aktivitäten' },
];

export default function EinheitCreateWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [einheitId, setEinheitId]     = useState(null);
  const [coachOutput, setCoachOutput] = useState('');
  const [paketeCreated, setPaketeCreated] = useState([]);

  const handleStep1Done = async (metaData) => {
    const einheit = await base44.entities.Einheiten.create({
      ...metaData,
      freigabe_status: 'In Planung',
      sync_status: 'new',
    });
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    setEinheitId(einheit.id);
    setCurrentStep(2);
  };

  const handleStep2Done = (braindumpText) => {
    setCoachOutput(braindumpText);
    setCurrentStep(3);
  };

  const handleStep3Done = (pakete) => {
    setPaketeCreated(pakete || []);
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['lernziele'] });
    setCurrentStep(4);
  };

  const handleStep4Done = () => {
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
    navigate(`/workspace?einheit=${einheitId}&fromWizard=1`);
  };

  const handleSkipToStruktur = async () => {
    if (einheitId) {
      // Prüfen ob bereits Themenfelder vorhanden
      const vorhandeneThemenfelder = await base44.entities.Themenfeld.filter({ einheit_id: einheitId });
      if (vorhandeneThemenfelder.length === 0) {
        // Default-Themenfeld anlegen
        const themenfeld = await base44.entities.Themenfeld.create({
          einheit_id: einheitId,
          titel: 'Themenfeld 1',
          reihenfolge: 1,
        });
        // Default-Lernpaket anlegen
        await base44.entities.Lernpakete.create({
          einheit_id: einheitId,
          themenfeld_id: themenfeld.id,
          titel_des_pakets: 'Neues Lernpaket',
          reihenfolge_nummer: 1,
          geschaetzte_dauer_minuten: 45,
        });
        queryClient.invalidateQueries({ queryKey: ['themenfelder', einheitId] });
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      }
    }
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
      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone    = currentStep > step.id;
          const isActive  = currentStep === step.id;
          const isLocked  = currentStep < step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  isDone   ? 'bg-primary border-primary text-primary-foreground' :
                  isActive ? 'bg-primary/10 border-primary text-primary' :
                             'bg-background border-border text-muted-foreground'
                )}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="text-center">
                  <p className={cn('text-xs font-semibold truncate max-w-[80px]',
                    isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                  )}>{step.label}</p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[90px]">{step.desc}</p>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('h-0.5 flex-1 mt-[-18px] mx-1 transition-all',
                  currentStep > step.id ? 'bg-primary' : 'bg-border'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
        {currentStep === 1 && (
          <WizardStep1Meta onDone={handleStep1Done} />
        )}
        {currentStep === 2 && (
          <WizardStep2Coach
            onDone={handleStep2Done}
            onSkip={() => setCurrentStep(3)}
            onSkipAll={handleSkipToStruktur}
          />
        )}
        {currentStep === 3 && einheitId && (
          <WizardStep3Generator
            einheitId={einheitId}
            initialBraindump={coachOutput}
            onDone={handleStep3Done}
            onSkipAll={handleSkipToStruktur}
          />
        )}
        {currentStep === 4 && einheitId && (
          <WizardStep4Bausteine
            einheitId={einheitId}
            pakete={paketeCreated}
            onDone={handleStep4Done}
            onSkipAll={handleSkipToStruktur}
          />
        )}
      </div>
    </div>
  );
}