import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import AktiveNutzerListe from '@/components/admin/AktiveNutzerListe';

/**
 * Prominenter Toggle für den Globalen Wartungsmodus.
 * Nur Admin-seitig. Der Banner für non-Admins ist in WartungsBanner.jsx.
 */
export default function WartungsmodusToggle({ aktiv, onChange, isPending }) {
  return (
    <div className={`rounded-xl border-2 p-5 transition-all ${
      aktiv
        ? 'border-orange-300 bg-orange-50'
        : 'border-border bg-background'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            aktiv ? 'bg-orange-100' : 'bg-muted'
          }`}>
            {aktiv
              ? <ShieldOff className="w-5 h-5 text-orange-600" />
              : <ShieldOff className="w-5 h-5 text-muted-foreground" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">Globaler Wartungsmodus</h3>
              {aktiv && (
                <Badge className="bg-orange-100 text-orange-700 text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3" />AKTIV
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {aktiv
                ? 'Das System ist für alle Nicht-Administratoren komplett gesperrt — sie sehen einen Wartungs-Hinweis und können sich nur abmelden.'
                : 'Alle Nutzer können normal arbeiten. Aktivieren Sie den Wartungsmodus vor wichtigen Änderungen, um alle Nutzer vorübergehend auszusperren.'
              }
            </p>
          </div>
        </div>
        <Switch
          checked={aktiv}
          onCheckedChange={onChange}
          disabled={isPending}
          className={aktiv ? 'data-[state=checked]:bg-orange-500' : ''}
        />
      </div>

      {aktiv && (
        <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-200">
          <p className="text-xs text-orange-700 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Alle Nicht-Administratoren sind ausgesperrt und sehen den Wartungs-Sperrbildschirm.
          </p>
        </div>
      )}

      {/* Vor dem Aktivieren prüfen: Wer arbeitet gerade im System? */}
      <AktiveNutzerListe />
    </div>
  );
}