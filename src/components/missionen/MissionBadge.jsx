/**
 * MissionBadge — Kompaktes Badge für Detail-Ansichten und Cockpit.
 *
 * Zeigt Emoji + Label einer didaktischen Mission. Greift auf
 * `lib/missionen.js` als Single Source of Truth zu.
 *
 * Props:
 *   - missionId: string|null  Slug der Mission (z. B. 'transfer'). Bei null/
 *                              unbekannten Werten rendert die Komponente nichts
 *                              (außer `showFallback=true`).
 *   - size:      'sm'|'md'    Größe des Badges (Default 'md').
 *   - showFallback: boolean   Wenn true und keine Mission gesetzt: dezenter
 *                              "Mission fehlt"-Hinweis (für Cockpit, Frage H).
 *   - className: string       Optionale zusätzliche Klassen.
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getMission } from '@/lib/missionen';
import { cn } from '@/lib/utils';

export default function MissionBadge({
  missionId,
  size = 'md',
  showFallback = false,
  className = '',
}) {
  const mission = getMission(missionId);

  // Größen-Varianten als Literale (Tailwind-Purger findet sie statisch)
  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5 gap-1'
      : 'text-xs px-2 py-0.5 gap-1.5';

  if (!mission) {
    if (!showFallback) return null;
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-dashed border-amber-300 bg-amber-50 text-amber-700 font-medium',
          sizeClasses,
          className
        )}
        title="Dieser Aufgabe ist noch keine Mission zugeordnet"
      >
        <AlertCircle className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        Mission fehlt
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        mission.classes.badge,
        sizeClasses,
        className
      )}
      title={mission.kern}
    >
      <span aria-hidden="true">{mission.emoji}</span>
      <span>{mission.label}</span>
    </span>
  );
}