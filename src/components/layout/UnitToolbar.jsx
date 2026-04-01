/**
 * UnitToolbar
 * ─────────────────────────────────────────────────────────────────
 * LOKALER SUB-HEADER mit 3-Bereichs-Layout
 * 
 * Struktur:
 * - LINKS: Ansichts-Umschalter (Struktur vs. Inhalte)
 * - MITTE: Titel + Dynamischer Status-Badge (Dirty/Saving/Saved)
 * - RECHTS: Aktions-Buttons (Neues Themenfeld, Einstellungen, Export)
 */
import React, { useState, useEffect } from 'react';
import { LayoutGrid, SlidersHorizontal, Settings, Download, Plus, Check, Save, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavigationTooltip from '@/components/layout/NavigationTooltip';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function UnitToolbar({
  einheit,
  viewMode,
  onViewModeChange,
  onSettingsOpen,
  onAddThemenfeld,
  isDirty = false,
  onSaveStructure,
  isSaving = false,
  lastError = null,
}) {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Auto-fade Success-Message nach 5 Sekunden
  useEffect(() => {
    if (!isDirty && !isSaving && !lastError) {
      if (!showSuccessMessage) {
        setShowSuccessMessage(true);
        const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isDirty, isSaving, lastError, showSuccessMessage]);

  if (!einheit) return null;

  return (
    <div className="w-full bg-card border-b border-border shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-6">

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* LINKS: Ansichts-Umschalter */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1 shrink-0">
            <NavigationTooltip label="Struktur-Ansicht">
              <button
                onClick={() => onViewModeChange('struktur')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
                  viewMode === 'struktur'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Struktur</span>
              </button>
            </NavigationTooltip>

            <NavigationTooltip label="Inhalts-Bearbeitung">
              <button
                onClick={() => onViewModeChange('inhalte')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
                  viewMode === 'inhalte'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Inhalte</span>
              </button>
            </NavigationTooltip>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* MITTE: Titel + Status-Badge + Metadaten (zentriert) */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 justify-center">
              <h2 className="text-lg font-bold text-foreground">
                {einheit.titel_der_einheit}
              </h2>
              
              {/* Status-Badge */}
              {lastError ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Fehler
                </span>
              ) : isSaving ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Speichere...
                </span>
              ) : isDirty ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Ungespeichert
                </span>
              ) : showSuccessMessage ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 animate-out fade-out-50 slide-out-to-right-1 duration-500">
                  <Check className="w-3.5 h-3.5" />
                  Übernommen
                </span>
              ) : null}
            </div>
            
            <p className="text-xs text-muted-foreground mt-0.5">
              {einheit.fach} • Jg. {einheit.jahrgangsstufe}
            </p>

            {/* Fehler-Text */}
            {lastError && (
              <p className="text-xs text-destructive mt-1 font-medium">
                {lastError}
              </p>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* RECHTS: Aktions-Buttons */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 shrink-0">

            {/* + Neues Themenfeld (nur im Struktur-Modus) */}
            {viewMode === 'struktur' && onAddThemenfeld && (
              <NavigationTooltip label="Neues Themenfeld">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddThemenfeld}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Themenfeld</span>
                </Button>
              </NavigationTooltip>
            )}

            {/* Struktur-Speichern Button (nur im Struktur-Modus) */}
            {viewMode === 'struktur' && onSaveStructure && (
              <NavigationTooltip label={isDirty ? 'Ungespeicherte Änderungen' : 'Alles gespeichert'}>
                <Button
                  onClick={onSaveStructure}
                  disabled={isSaving || !isDirty}
                  className={cn(
                    'gap-1.5',
                    isDirty
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground'
                  )}
                  size="sm"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isDirty ? (
                    <Save className="w-3.5 h-3.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isDirty ? 'Speichern' : 'Gespeichert'}</span>
                </Button>
              </NavigationTooltip>
            )}

            {/* Einstellungen */}
            <NavigationTooltip label="Einheiten-Einstellungen">
              <button
                onClick={onSettingsOpen}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            </NavigationTooltip>

            {/* Moodle-Export */}
            <NavigationTooltip label="Moodle-Export">
              <Link
                to="/einheit/export"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
              >
                <Download className="w-4 h-4" />
              </Link>
            </NavigationTooltip>

          </div>

        </div>
      </div>
    </div>
  );
}