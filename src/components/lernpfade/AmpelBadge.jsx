/**
 * AmpelBadge.jsx
 *
 * Kleines visuelles Status-Badge für Lernpfad-Items (Tab 7).
 *   - green  → Haken
 *   - yellow → Ausrufezeichen
 *   - red    → Warn-Punkt (klickbar, ruft onFix auf, falls gesetzt)
 *
 * Wird im Sektor neben dem Item-Titel gerendert. Keine eigene Query – Status
 * wird vom Aufrufer (LernpfadeSektor) aus dem Batch berechnet.
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, BadgeCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AMPEL, getAmpelLabel } from '@/lib/ampelLogic';

const STYLES = {
  [AMPEL.GREEN]: {
    Icon: CheckCircle2,
    cls: 'text-emerald-600',
  },
  [AMPEL.YELLOW]: {
    Icon: AlertTriangle,
    cls: 'text-amber-600',
  },
  [AMPEL.RED]: {
    Icon: AlertCircle,
    cls: 'text-red-600',
  },
};

/**
 * AmpelBadge
 *
 * Props:
 *   - status        : 'green' | 'yellow' | 'red'  (Inhalts-Ampel)
 *   - onFix         : Callback bei Klick auf Rot (Editor öffnen)
 *   - tooltipExtra  : Optionaler Zusatztext im Tooltip
 *   - exportReady   : Wenn true → blauer Haken (Element ist exportiert/freigegeben)
 *   - contentApproved: Lightweight-Vollständigkeitsindikator (kleiner Punkt).
 *                     true → grün-grauer Punkt; false → leer-grauer Punkt.
 *                     System-Bausteine: undefined lassen → kein Punkt.
 */
export default function AmpelBadge({ status, onFix, tooltipExtra, exportReady = false, contentApproved, fixLabel = 'Editor öffnen' }) {
  const cfg = STYLES[status] || STYLES[AMPEL.RED];
  const Icon = cfg.Icon;
  const label = getAmpelLabel(status);
  const isRed = status === AMPEL.RED;

  const handleClick = (e) => {
    if (!isRed || !onFix) return;
    e.stopPropagation(); // verhindert, dass das umgebende Item selektiert wird
    onFix();
  };

  return (
    <span className="shrink-0 inline-flex items-center gap-1">
      {/* Vollständigkeits-Punkt (Lightweight) – nur wenn der Aufrufer ihn übergibt */}
      {typeof contentApproved === 'boolean' && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-label={contentApproved ? 'Inhaltlich vollständig' : 'Inhaltlich unvollständig'}
                className={`w-1.5 h-1.5 rounded-full ${
                  contentApproved ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {contentApproved ? 'Inhaltlich vollständig' : 'Inhaltlich unvollständig'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Blauer Haken: Export-Freigabe */}
      {exportReady && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span aria-label="Für Export freigegeben" className="inline-flex text-blue-500">
                <BadgeCheck className="w-3.5 h-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Für Export freigegeben
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Klassische Ampel */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              className={`inline-flex items-center justify-center rounded-full ${cfg.cls} ${
                isRed && onFix ? 'cursor-pointer hover:bg-red-50 p-0.5' : 'cursor-default'
              }`}
              aria-label={label}
              tabIndex={isRed && onFix ? 0 : -1}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            <span className="font-medium">{label}</span>
            {tooltipExtra && <span className="block mt-0.5 opacity-80">{tooltipExtra}</span>}
            {isRed && onFix && (
              <span className="block mt-0.5 text-[10px] opacity-70">Klick: {fixLabel}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}