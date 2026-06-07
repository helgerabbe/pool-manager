/**
 * ExportTodoRow.jsx
 *
 * Eine Zeile der vertikalen Übergabe-To-Do-Liste im Export-Center.
 * Ersetzt die alte Tab-Leiste: Jeder Übergabe-Schritt ist jetzt eine
 * aufklappbare Zeile (wie eine Einkaufsliste, die man von oben nach
 * unten abarbeitet).
 *
 * Reine Präsentation. Auf/Zu wird vom Eltern-Accordion gesteuert.
 *
 * Linker Block:
 *   - Schritt-Nummer in einem Kreis (grau, bzw. grün wenn erledigt)
 *   - Titel + Kurzbeschreibung
 * Rechter Block:
 *   - optionaler Status-Zähler (badge)
 *   - „erledigt"-Häkchen, sobald der Schritt an die MBK übergeben wurde
 */
import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as AccordionPrimitive from '@radix-ui/react-accordion';

export default function ExportTodoRow({
  value,
  stepNumber,
  title,
  description,
  done = false,
  badge = null,
  children,
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-colors',
        done ? 'border-emerald-300 bg-emerald-50/40' : 'border-border'
      )}
    >
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 [&[data-state=open]>.chevron]:rotate-180">
          {/* Schritt-Nummer / Erledigt-Kreis */}
          <span
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
              done ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
            )}
          >
            {done ? <Check className="w-4 h-4" /> : stepNumber}
          </span>

          {/* Titel + Beschreibung */}
          <span className="flex flex-col min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {title}
              {badge}
            </span>
            {description && (
              <span className="text-xs text-muted-foreground truncate">{description}</span>
            )}
          </span>

          <span className="ml-auto flex items-center gap-3 shrink-0">
            {done && (
              <span className="hidden sm:inline text-[11px] font-medium text-emerald-700">
                Übergeben
              </span>
            )}
            <ChevronDown className="chevron h-4 w-4 text-muted-foreground transition-transform duration-200" />
          </span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>

      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="border-t bg-muted/20 px-4 py-4">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}