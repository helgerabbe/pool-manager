/**
 * PfadKopierenMenu.jsx
 *
 * Dropdown-Button "Pfad kopieren..." im Header des Lernpfad-Architekten.
 * Listet die jeweils anderen drei Lerntypen als Quelle zur Auswahl.
 */

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export default function PfadKopierenMenu({
  lernTypen = [],
  activeLernTyp,
  konfiguration = {},
  onCopyFrom,
  disabled,
}) {
  const sourceCandidates = lernTypen.filter((t) => t.key !== activeLernTyp);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className="gap-1.5 h-7 text-xs"
        >
          <Copy className="w-3 h-3" /> Pfad kopieren…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs">Struktur übernehmen von:</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sourceCandidates.map((t) => {
          const Icon = t.icon;
          const count = (konfiguration?.[t.key] || []).length;
          const isEmpty = count === 0;
          return (
            <DropdownMenuItem
              key={t.key}
              disabled={isEmpty}
              onSelect={() => !isEmpty && onCopyFrom?.(t.key)}
              className="gap-2 cursor-pointer"
            >
              <Icon className={`w-3.5 h-3.5 ${t.color.text}`} />
              <span className="flex-1 text-xs">{t.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {count} Sektor{count === 1 ? '' : 'en'}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}