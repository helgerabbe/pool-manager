/**
 * UnitToolbar
 * ───────────
 * Lokaler Sub-Header, der nur im Workspace-Kontext erscheint.
 * Enthält: View-Toggle | Präsenz | Einstellungen | Moodle-Export
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
  if (!einheit) return null;

  return (
    <div className="w-full bg-muted/60 border-b border-border shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-11 gap-3">

          {/* ── View-Toggle (Segmented Control) ── */}
          <div className="flex items-center bg-background border border-border rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => onViewModeChange('struktur')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                viewMode === 'struktur'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Struktur</span>
            </button>
            <button
              onClick={() => onViewModeChange('detail')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                viewMode === 'detail'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Inhalte</span>
            </button>
          </div>

          {/* ── Structural-Lock-Hinweis ── */}
          {structLocked && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3 shrink-0" />
              Struktur gesperrt
            </span>
          )}

          {/* ── Spacer ── */}
          <div className="flex-1" />

          {/* ── Präsenz ── */}
          <PresenceBadge onlineUsers={onlineUsers} />

          {/* ── Trennlinie ── */}
          <div className="w-px h-5 bg-border shrink-0" />

          {/* ── Einstellungen ── */}
          <NavigationTooltip label="Einstellungen">
            <button
              onClick={onSettingsOpen}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </NavigationTooltip>

          {/* ── Moodle-Export ── */}
          <NavigationTooltip label="Moodle-Export">
            <Link
              to="/einheit/export"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Moodle-Export</span>
            </Link>
          </NavigationTooltip>

        </div>
      </div>
    </div>
  );
}