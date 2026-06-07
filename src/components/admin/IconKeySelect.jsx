/**
 * IconKeySelect.jsx
 *
 * Auswahlmenü für die Icon-Keys der System-Bausteine. Zeigt zu jedem Key
 * das passende Lucide-Symbol an, damit Admins nicht die Fachausdrücke
 * auswendig kennen müssen.
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSystemBausteinIcon, SYSTEM_BAUSTEIN_ICON_KEYS } from '@/lib/systemBausteinIcons';

export default function IconKeySelect({ value, onChange, className = '' }) {
  const SelectedIcon = getSystemBausteinIcon(value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-8 text-xs ${className}`}>
        <span className="flex items-center gap-2 min-w-0">
          <SelectedIcon className="w-4 h-4 shrink-0 text-slate-700" />
          <SelectValue placeholder="Symbol wählen…" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {SYSTEM_BAUSTEIN_ICON_KEYS.map((key) => {
          const Icon = getSystemBausteinIcon(key);
          return (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-700" />
                <span className="font-mono text-xs">{key}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}