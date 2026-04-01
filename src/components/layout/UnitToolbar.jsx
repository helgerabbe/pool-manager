/**
 * UnitToolbar
 * ─────────────────────────────────────────────────────────────────
 * LOKALER SUB-HEADER mit 3-Bereichs-Layout
 * 
 * Struktur:
 * - LINKS: Ansichts-Umschalter (Struktur vs. Inhalte)
 * - MITTE: Titel + Metadaten (Fach, Jahrgang, Pakete)
 * - RECHTS: Aktions-Buttons (Neues Themenfeld, Einstellungen, Export)
 */
import React from 'react';
import { LayoutGrid, SlidersHorizontal, Settings, Download, Plus } from 'lucide-react';
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
}) {
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
          {/* MITTE: Titel + Metadaten (zentriert) */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-bold text-foreground">
              {einheit.titel_der_einheit}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {einheit.fach} • Jg. {einheit.jahrgangsstufe}
            </p>
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