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
import { Loader2, BookOpen, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CockpitActionToolbar({
  lerntypLabel,
  istPfadGesperrt,
  darfFreigeben,
  darfEntsperren,
  statusBusy,
  isStructuralEditingActive,
  isLockedByOther,
  onOpenGuide,
  onReleasePath,
  onUnlockPath,
}) {
  return (
    <div className="shrink-0 px-4 py-2 border-b border-border bg-card flex items-center gap-3 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={onOpenGuide}
        className="gap-1.5 h-7 text-xs"
        title="Didaktische Erklärung & Standard-Raster für diesen Lerntyp"
      >
        <BookOpen className="w-3 h-3" />
        Didaktischer Guide
      </Button>

      {istPfadGesperrt ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <ShieldCheck className="w-3 h-3" />
            Pfad „{lerntypLabel}" freigegeben &amp; gesperrt
          </span>
          <span className="text-[11px] text-muted-foreground">
            Aufgaben sind in Tab 5 read-only.
          </span>
          {darfEntsperren && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUnlockPath}
              disabled={statusBusy}
              className="ml-auto gap-1.5 h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
            >
              {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
              Lernpfad entsperren
            </Button>
          )}
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
            Pfad „{lerntypLabel}" – Entwurf
          </span>
          {darfFreigeben && (
            <Button
              size="sm"
              onClick={onReleasePath}
              disabled={statusBusy || !isStructuralEditingActive || isLockedByOther}
              className="ml-auto gap-1.5 h-7 text-xs"
              title={
                !isStructuralEditingActive
                  ? 'Bitte zuerst Bearbeiten starten'
                  : 'Validieren und freigeben'
              }
            >
              {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              Lernpfad prüfen &amp; freigeben
            </Button>
          )}
        </>
      )}
    </div>
  );
}