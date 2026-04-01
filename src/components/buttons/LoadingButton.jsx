import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Gehärteter Button für Operationen mit Loading/Pending State
 * 
 * Phase 5: Fehlertoleranz & UX Verbesserungen
 * - Automatisch disabled während Laden
 * - Zeigt Spinner und ändert Text
 * - Verhindert Doppelklicks
 * - Unterstützt Custom Loading Text
 */
export default function LoadingButton({
  isLoading = false,
  disabled = false,
  onClick,
  children,
  loadingText = 'Wird gespeichert...',
  loadingIcon = true,
  variant = 'default',
  size = 'default',
  className,
  ...props
}) {
  const isDisabled = isLoading || disabled;

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={cn('gap-2 transition-opacity', isDisabled && 'opacity-75', className)}
      {...props}
    >
      {isLoading && loadingIcon && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {isLoading ? loadingText : children}
    </Button>
  );
}