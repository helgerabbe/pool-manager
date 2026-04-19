/**
 * EinheitAccessBadge.jsx
 * 
 * Wiederverwendbare Komponente für das "Eigene Mitarbeit"-Badge.
 * Zeigt violettes Badge wenn User als LEITUNG in EinheitMembers eingetragen ist.
 * 
 * Verwendung:
 * - EinheitCard (Dashboard, Einheitenliste)
 * - Workspace Header
 * - Alle anderen Stellen wo Unit-Level-Zugriff angezeigt werden soll
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.currentUserEmail - Email des aktuellen Users
 * @param {Array} props.members - EinheitMembers Array der Einheit
 * @param {string} [props.variant='default'] - 'default' oder 'compact' für unterschiedliche Größen
 */
export default function EinheitAccessBadge({ currentUserEmail, members, variant = 'default' }) {
  if (!currentUserEmail || !members || members.length === 0) {
    return null;
  }

  const isAssignedMember = members.some(
    m => m.user_email === currentUserEmail && m.unit_role === 'LEITUNG'
  );

  if (!isAssignedMember) {
    return null;
  }

  return (
    <Badge 
      className={`bg-violet-100 text-violet-700 border border-violet-200 gap-1 ${
        variant === 'compact' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'
      }`}
    >
      <BookOpen className={variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      Eigene Mitarbeit
    </Badge>
  );
}