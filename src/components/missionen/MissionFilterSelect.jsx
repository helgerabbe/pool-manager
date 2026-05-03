/**
 * MissionFilterSelect — Kompakte Dropdown-Variante des Mission-Filters.
 *
 * Wird in schmalen/höhenkritischen Layouts (z. B. Sidebar der Allgemeinen
 * Aufgaben) anstelle der breiten `MissionFilterChips` verwendet. Identische
 * Werte-Semantik:
 *   value = 'all' | <mission-id> | 'none'
 *
 * Props:
 *   - value:    string         aktueller Filter
 *   - onChange: (val) => void
 *   - counts:   optional { all?, none?, [missionId]?: number }
 *   - showNoneFilter: boolean  zeigt die Option "Ohne Mission" an (Default true)
 */
import React from 'react';
import { MISSIONEN } from '@/lib/missionen';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';

const FILTER_ALL = 'all';
const FILTER_NONE = 'none';

export default function MissionFilterSelect({
  value = FILTER_ALL,
  onChange,
  counts = null,
  showNoneFilter = true,
}) {
  const renderCount = (key) => {
    if (!counts || counts[key] === undefined) return null;
    return (
      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
        {counts[key]}
      </span>
    );
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs gap-1.5">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Filter nach Mission" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>
          <span className="flex items-center gap-2 w-full">
            <span>Alle Missionen</span>
            {renderCount('all')}
          </span>
        </SelectItem>
        {MISSIONEN.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <span className="flex items-center gap-2 w-full">
              <span aria-hidden="true">{m.emoji}</span>
              <span>{m.label}</span>
              {renderCount(m.id)}
            </span>
          </SelectItem>
        ))}
        {showNoneFilter && (
          <SelectItem value={FILTER_NONE}>
            <span className="flex items-center gap-2 w-full">
              <span aria-hidden="true">⚠️</span>
              <span>Ohne Mission</span>
              {renderCount(FILTER_NONE)}
            </span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export { FILTER_ALL, FILTER_NONE };