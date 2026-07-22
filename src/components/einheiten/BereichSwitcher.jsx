import React from 'react';
import { Rocket, Library, Lock, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Prominenter Umschalter für die vier Einheiten-Bereiche:
 * Private Einheiten · Freigegebene Einheiten (Austausch) · Poolzeit-Einheiten · Basismodule.
 * Die aktive Kachel ist farblich klar hervorgehoben, damit immer eindeutig
 * ist, in welchem Bereich man sich befindet.
 */
export default function BereichSwitcher({ ansicht, onChange, istAdmin }) {
  const bereiche = [
    {
      key: 'privat',
      label: istAdmin ? 'Private Einheiten (alle)' : 'Meine privaten Einheiten',
      desc: 'Ihr persönlicher Arbeitsbereich — nur für Sie sichtbar',
      icon: Lock,
      active: 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30',
      iconActive: 'bg-amber-500 text-white',
    },
    {
      key: 'austausch',
      label: 'Freigegebene Einheiten',
      desc: 'Tauschbörse des Kollegiums — anschauen und private Kopie ziehen',
      icon: Library,
      active: 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30',
      iconActive: 'bg-emerald-500 text-white',
    },
    {
      key: 'oeffentlich',
      label: 'Poolzeit-Einheiten',
      desc: 'Verbindliche Einheiten für die Poolzeit — von der Fachschaft betreut',
      icon: Rocket,
      active: 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/30',
      iconActive: 'bg-blue-500 text-white',
    },
    {
      key: 'basismodule',
      label: 'Basismodule',
      desc: 'Verbindliche Wissensspeicher — zum Nachlernen und Nachschlagen in den Poolzeit-Einheiten',
      icon: Layers,
      active: 'border-violet-500 bg-violet-50 text-violet-900 ring-2 ring-violet-500/30',
      iconActive: 'bg-violet-500 text-white',
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {bereiche.map(({ key, label, desc, icon: Icon, active, iconActive }) => {
          const isActive = ansicht === key;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(key)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-all ${
                    isActive ? active : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
                  }`}
                >
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? iconActive : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className={`min-w-0 truncate text-sm font-semibold ${isActive ? '' : 'text-foreground'}`}>{label}</p>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {desc}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}