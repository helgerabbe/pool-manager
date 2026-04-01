/**
 * UnitToolbar
 * ─────────────────────────────────────────────────────────────────
 * LOKALER SUB-HEADER
 * 
 * Erscheint nur im Workspace/Struktur-Kontext (unterhalb der globalen TopBar).
 * Organisiert einheitenspezifische Werkzeuge in drei Bereiche:
 * - Links: Ansichts-Umschalter (Struktur vs. Inhalte)
 * - Mitte: Live-Präsenz-Anzeige
 * - Rechts: Einheiten-Einstellungen + Moodle-Export
 */
import React from 'react';
import { LayoutGrid, SlidersHorizontal, Settings, Download, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import PresenceBadge from '@/components/workspace/PresenceBadge';
import NavigationTooltip from '@/components/layout/NavigationTooltip';
import { Link } from 'react-router-dom';

export default function UnitToolbar({
  einheit,
  viewMode,
  onViewModeChange,
  onSettingsOpen,
  onlineUsers = [],
  structLocked = false,
  currentUserEmail,
}) {
  // Nur rendern wenn in Einheit-Kontext
  if (!einheit) return null;

  return (
    <div className="w-full bg-muted/40 border-b border-border/50 shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-10 gap-4">

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* LINKS: Ansichts-Umschalter (Struktur vs. Inhalte) */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1 shrink-0">
            <NavigationTooltip label="Struktur-Ansicht">
              <button
                onClick={() => onViewModeChange('struktur')}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                  viewMode === 'struktur'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Struktur</span>
              </button>
            </NavigationTooltip>

            <NavigationTooltip label="Inhalts-Bearbeitung">
              <button
                onClick={() => onViewModeChange('detail')}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                  viewMode === 'detail'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inhalte</span>
              </button>
            </NavigationTooltip>
          </div>

          {/* Structural-Lock-Hinweis (optional) */}
          {structLocked && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-orange-700 bg-orange-50/80 border border-orange-200/60 px-2 py-0.5 rounded-full shrink-0">
              <Lock className="w-3 h-3" />
              Struktur-Bearbeitung aktiv
            </span>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* MITTE: Spacer + Präsenz-Badge */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0" />

          <PresenceBadge onlineUsers={onlineUsers} />

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* RECHTS: Einstellungen + Export */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Einstellungen (Zahnrad) */}
            <NavigationTooltip label="Einheiten-Einstellungen">
              <button
                onClick={onSettingsOpen}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent hover:border-border/50 transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            </NavigationTooltip>

            {/* Moodle-Export */}
            <NavigationTooltip label="Moodle-Export">
              <Link
                to="/einheit/export"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent hover:border-border/50 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export</span>
              </Link>
            </NavigationTooltip>

          </div>

        </div>
      </div>
    </div>
  );
}