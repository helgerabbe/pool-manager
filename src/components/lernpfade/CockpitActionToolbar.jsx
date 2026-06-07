/**
 * CockpitActionToolbar.jsx
 *
 * Aktionsleiste oberhalb der Lerntyp-Tabs im Lernpfad-Cockpit.
 * Zeigt:
 *   - „Didaktischer Guide"-Trigger (links, immer sichtbar – auch im Lese-Modus).
 *   - Status-Badge des aktiven Pfads (Entwurf | Freigegeben & gesperrt).
 *   - CTA „Prüfen & freigeben" (DRAFT, mit Berechtigung).
 *   - CTA „Lernpfad entsperren" (LOCKED, mit Berechtigung).
 *
 * Reine Präsentationskomponente – alle Handler kommen aus useDashboardRelease.
 */

import React from 'react';
import { Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CockpitActionToolbar({
  lerntypLabel,
  istPfadGesperrt,
  darfFreigeben,
  darfEntsperren,
  statusBusy,
  isStructuralEditingActive,
  isLockedByOther,
  onReleasePath,
  onUnlockPath,
  saveIcon: SaveIcon,
  saveIconCls,
  saveTitle,
}) {
  return (
    <div className="shrink-0 px-4 py-1 border-b border-border bg-card flex items-center gap-2 flex-wrap">
      {/* Kompakter Save-Indicator als reines Icon (Tooltip via title). */}
      {SaveIcon && (
        <span title={saveTitle} className="inline-flex items-center">
          <SaveIcon className={`w-3.5 h-3.5 ${saveIconCls || ''}`} />
        </span>
      )}

      {istPfadGesperrt ? (
        <>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5"
            title={`Dashboard „${lerntypLabel}" als geprüft markiert – die Aufgaben bleiben bearbeitbar. Erst die finale Einheits-Freigabe sperrt alles.`}
          >
            <CheckCircle2 className="w-3 h-3" />
            {lerntypLabel} · geprüft
          </span>
          {darfEntsperren && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUnlockPath}
              disabled={statusBusy}
              className="ml-auto gap-1.5 h-6 text-[11px] px-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              title={`Das Dashboard „${lerntypLabel}" wurde als geprüft markiert – die Aufgaben sind dadurch NICHT gesperrt und können weiter bearbeitet werden. Erst „Einheit final freigeben" sperrt alle Aufgaben. Hier nimmst du nur die Prüf-Markierung zurück.`}
            >
              {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Prüfung zurücknehmen
            </Button>
          )}
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5">
            {lerntypLabel} · Entwurf
          </span>
          {darfFreigeben && (
            <Button
              size="sm"
              onClick={onReleasePath}
              disabled={statusBusy || !isStructuralEditingActive || isLockedByOther}
              className="ml-auto gap-1.5 h-6 text-[11px] px-2"
              title={
                !isStructuralEditingActive
                  ? 'Bitte zuerst Bearbeiten starten'
                  : 'Dashboard als geprüft markieren'
              }
            >
              {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Als geprüft markieren
            </Button>
          )}
        </>
      )}
    </div>
  );
}