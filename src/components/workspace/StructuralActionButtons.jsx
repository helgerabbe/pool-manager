import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDisabledActionsForLock, isActionDisabled } from '@/lib/structuralLockEnhanced';

/**
 * Wrapper für strukturelle Aktions-Buttons (BEREICH 1: STRUKTUR)
 * Disabler automatisch wenn Structural Lock aktiv ist.
 * Zusätzlich: Prüft, ob User die Struktur überhaupt bearbeiten darf.
 * 
 * @param {Object} einheit - Die Einheit
 * @param {string} currentUserEmail
 * @param {string} action - Action-Key (z.B. 'DELETE_THEMENFELD')
 * @param {JSX.Element} children - Button-Inhalt
 * @param {boolean} kannBearbeiten - Ob User Struktur bearbeiten darf (RBAC-Check)
 * @param {Object} props - Button-Props
 */
export function StructuralActionButton({
  einheit,
  currentUserEmail,
  action,
  kannBearbeiten = true, // Default: true für backward compat
  children,
  ...props
}) {
  const { isLocked, disabledActions, lockOwner, remainingMinutes } = getDisabledActionsForLock(
    einheit,
    currentUserEmail,
    null
  );

  const disabled = isActionDisabled(action, disabledActions) || !kannBearbeiten;
  const tooltipText = !kannBearbeiten
    ? 'Kein Zugriff: Nur Fachschaftsleitung darf die Struktur bearbeiten'
    : isLocked 
    ? `Nicht verfügbar: ${lockOwner} bearbeitet die Struktur (noch ~${remainingMinutes} Min)`
    : undefined;

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...props} disabled={disabled}>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Button {...props} disabled={disabled}>{children}</Button>;
}