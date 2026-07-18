import React from 'react';
import { Rocket, Library, Lock } from 'lucide-react';

/**
 * Prominenter Umschalter für die drei Einheiten-Bereiche:
 * Poolzeit-Einheiten · Freigegebene Einheiten (Austausch) · Private Einheiten.
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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {bereiche.map(({ key, label, desc, icon: Icon, active, iconActive }) => {
        const isActive = ansicht === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
              isActive ? active : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
            }`}
          >
            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? iconActive : 'bg-muted text-muted-foreground'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isActive ? '' : 'text-foreground'}`}>{label}</p>
              <p className="text-xs mt-0.5 leading-snug opacity-80">{desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}