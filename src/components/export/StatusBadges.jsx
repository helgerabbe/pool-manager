/**
 * StatusBadges.jsx
 * 
 * Signal-Mapping und Badge-Komponenten für das Freigabe-Cockpit.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const CONTENT_STATUS_BADGE = {
  draft: { emoji: '🔴', label: 'unfertig', color: 'bg-red-100 text-red-700 border-red-300' },
  approved: { emoji: '🟢', label: 'freigegeben', color: 'bg-green-100 text-green-700 border-green-300' },
};

export const SYNC_STATUS_BADGE = {
  new: { emoji: '🆕', label: 'neu', color: 'bg-slate-100 text-slate-700' },
  pending: { emoji: '🔒', label: 'gesperrt', color: 'bg-blue-100 text-blue-700' },
  synced: { emoji: '✅', label: 'synced', color: 'bg-green-100 text-green-700' },
  modified: { emoji: '⚠️', label: 'verändert', color: 'bg-amber-100 text-amber-700' },
  to_delete: { emoji: '🗑️', label: 'wird entfernt', color: 'bg-red-100 text-red-700' },
};

export function ContentStatusBadge({ status }) {
  const cfg = CONTENT_STATUS_BADGE[status] || CONTENT_STATUS_BADGE.draft;
  return (
    <Badge className={cn('font-medium px-2 py-0.5', cfg.color)}>
      {cfg.emoji} {cfg.label}
    </Badge>
  );
}

export function SyncStatusBadge({ status }) {
  const cfg = SYNC_STATUS_BADGE[status] || SYNC_STATUS_BADGE.new;
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-1.5 py-0.5', cfg.color)}>
      {cfg.emoji} {cfg.label}
    </Badge>
  );
}