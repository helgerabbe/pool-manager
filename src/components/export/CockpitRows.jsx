/**
 * CockpitRows.jsx
 * 
 * Zeilen-Komponenten für Klone, Masters, Aktivitäten und Lernpakete.
 */

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { ContentStatusBadge, SyncStatusBadge } from './StatusBadges';
import { getEffectiveContentStatus } from './StatusCalculations';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Klon-Zeile
// ──────────────────────────────────────────────────────────────────────────────

export function KlonRow({ klon, selected, onToggleSelect, navigate }) {
  const isSelectableForExport = klon.content_status === 'approved';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border-l-2',
        klon.content_status === 'draft'
          ? 'border-l-red-300 bg-red-50/30'
          : 'border-l-green-300 bg-green-50/30'
      )}
    >
      {isSelectableForExport && (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(klon.id, 'klon')}
        />
      )}
      {!isSelectableForExport && <div className="w-5" />}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Klon {klon.klon_index || '?'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <ContentStatusBadge status={klon.content_status} />
          <SyncStatusBadge status={klon.sync_status} />
        </div>
      </div>

      <button
        onClick={() =>
          navigate(`/einheiten/${klon.lernpaket_id}?tab=tasks&klon=${klon.id}`)
        }
        className="text-muted-foreground hover:text-primary text-xs font-medium transition-colors"
      >
        Bearbeiten →
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Master-Zeile
// ──────────────────────────────────────────────────────────────────────────────

export function MasterRow({ master, selectedIds, onToggleSelect, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const isSelectableForExport = master.effective_content_status === 'approved';
  const hasUnfinishedChild = master.children?.some(c => c.effective_content_status === 'draft');

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg border-l-2 transition-colors cursor-pointer hover:bg-muted/40',
          master.effective_content_status === 'draft'
            ? 'border-l-red-400 bg-red-50/20'
            : 'border-l-green-400 bg-green-50/20'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {isSelectableForExport && (
          <Checkbox
            checked={selectedIds.includes(master.id)}
            onCheckedChange={() => onToggleSelect(master.id, 'master')}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {!isSelectableForExport && <div className="w-5" />}

        <ChevronRight
          className={cn('w-4 h-4 text-muted-foreground transition-transform', expanded && 'rotate-90')}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Master {master.titel ? `(${master.titel})` : ''}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <ContentStatusBadge status={master.effective_content_status} />
            <SyncStatusBadge status={master.sync_status} />
            {master.children?.length > 0 && (
              <span className="text-xs text-muted-foreground">{master.children.length} Klone</span>
            )}
          </div>
        </div>

        {hasUnfinishedChild && (
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        )}
      </div>

      {expanded && master.children && (
        <div className="ml-6 space-y-1">
          {master.children.map((klon) => (
            <KlonRow
              key={klon.id}
              klon={klon}
              selected={selectedIds.includes(klon.id)}
              onToggleSelect={onToggleSelect}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Aktivitäts-Zeile
// ──────────────────────────────────────────────────────────────────────────────

export function ActivityRow({ activity, selectedIds, onToggleSelect, navigate }) {
  const [expanded, setExpanded] = useState(activity.effective_content_status === 'draft');
  
  // Masterfähige Aktivitäten sind nicht direkt exportierbar — nur ihre Masters
  const hasMasterChildren = activity.children?.some(c => c.type === 'master');
  const isSelectableForExport = !hasMasterChildren && activity.effective_content_status === 'approved';
  const hasUnfinishedChild = activity.children?.some(c => c.effective_content_status === 'draft');

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-colors cursor-pointer hover:bg-muted/40',
          activity.effective_content_status === 'draft'
            ? 'border-l-red-500 bg-red-50/30'
            : 'border-l-green-500 bg-green-50/30'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {isSelectableForExport && (
          <Checkbox
            checked={selectedIds.includes(activity.id)}
            onCheckedChange={() => onToggleSelect(activity.id, 'activity')}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {!isSelectableForExport && <div className="w-5" />}

        <ChevronRight
          className={cn('w-4 h-4 text-muted-foreground transition-transform', expanded && 'rotate-90')}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Aktivität</p>
          <div className="flex items-center gap-2 mt-0.5">
            <ContentStatusBadge status={activity.effective_content_status} />
            <SyncStatusBadge status={activity.sync_status} />
            {activity.children?.length > 0 && (
              <span className="text-xs text-muted-foreground">{activity.children.length} Aufgaben</span>
            )}
          </div>
        </div>

        {hasUnfinishedChild && (
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        )}
      </div>

      {expanded && activity.children && (
        <div className="ml-6 space-y-1">
          {activity.children.map((child) =>
            child.type === 'master' ? (
              <MasterRow
                key={child.id}
                master={child}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                navigate={navigate}
              />
            ) : (
              <KlonRow
                key={child.id}
                klon={child}
                selected={selectedIds.includes(child.id)}
                onToggleSelect={onToggleSelect}
                navigate={navigate}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Lernpaket-Container
// ──────────────────────────────────────────────────────────────────────────────

export function LernpaketContainer({ paket, activities, selectedIds, onToggleSelect, navigate }) {
  const paketActivities = activities.filter(a => a.lernpaket_id === paket.id);
  const effectiveStatus = getEffectiveContentStatus(paketActivities);
  const hasUnfinished = paketActivities.some(a => a.effective_content_status === 'draft');
  const [expanded, setExpanded] = useState(hasUnfinished); // Smart Expand

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border">
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/30',
          effectiveStatus === 'draft'
            ? 'border-l-4 border-l-red-500 bg-red-50/20'
            : 'border-l-4 border-l-green-500 bg-green-50/20'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{paket.titel_des_pakets}</p>
          <div className="flex items-center gap-2 mt-1">
            <ContentStatusBadge status={effectiveStatus} />
            <SyncStatusBadge status={paket.sync_status} />
          </div>
        </div>

        {hasUnfinished && (
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        )}
      </div>

      {expanded && paketActivities.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 border-border pl-3">
          {paketActivities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {paketActivities.length === 0 && expanded && (
        <p className="text-xs text-muted-foreground italic px-3 py-2">Keine Aktivitäten</p>
      )}
    </div>
  );
}