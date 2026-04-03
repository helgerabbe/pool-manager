import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Meta-Daten', desc: 'Titel, Fach, Jahrgang' },
  { id: 2, label: 'Struktur-Entwurf', desc: 'KI-gestützte Strukturierung' },
  { id: 3, label: 'Werkbank', desc: 'Lernpakete arrangieren' },
  { id: 4, label: 'Lernziele', desc: 'KI-Vorschlag oder manuell' },
  { id: 5, label: 'Basis-Befüllung', desc: 'Phasenzuordnung & Export' },
];

export default function WizardStepper({ currentStep, onStepClick, completedSteps = [] }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const isDone = completedSteps.includes(step.id) || currentStep > step.id;
        const isActive = currentStep === step.id;
        const isClickable = isDone;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-opacity',
                isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                isDone ? 'bg-primary border-primary text-primary-foreground' :
                isActive ? 'bg-primary/10 border-primary text-primary' :
                'bg-background border-border text-muted-foreground'
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center">
                <p className={cn(
                  'text-xs font-semibold truncate max-w-[100px]',
                  isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[110px]">
                  {step.desc}
                </p>
              </div>
            </button>

            {idx < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mt-[-18px] mx-1 transition-all',
                currentStep > step.id ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}