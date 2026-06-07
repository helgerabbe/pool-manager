/**
 * ExportTodoRow.jsx
 *
 * Eine Zeile der vertikalen Übergabe-To-Do-Liste im Export-Center.
 * Ersetzt die alte Tab-Leiste: Jeder Übergabe-Schritt ist jetzt eine
 * aufklappbare Zeile (wie eine Einkaufsliste, die man von oben nach
 * unten abarbeitet).
 *
 * Die "Steuerzentrale" liegt direkt in der Zeile (oberste Ebene):
 *   - Übergeben-Häkchen ("An die MBK übergeben")
 *   - Kopieren / JSON-Download (für den ganzen Schritt)
 *   - "Payload ansehen" → öffnet ein eigenes Dialog-Fenster
 * Nur die Detail-Ansicht (Item-Liste / Status) liegt im Aufklapp-Bereich.
 *
 * Wichtig: Die Action-Buttons dürfen NICHT im Accordion-Trigger liegen
 * (kein <button> im <button>). Darum ist der Trigger nur der linke
 * Titel-Bereich; die Aktionen stehen als Geschwister rechts daneben.
 */
import React from 'react';
import { Check, ChevronDown, Copy, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function ExportTodoRow({
  value,
  stepNumber,
  title,
  description,
  done = false,
  badge = null,
  children,
  // Steuerzentrale (alles optional — Info/Meta nutzen keine Aktionen):
  showActions = false,
  onToggleDelivered,
  onCopy,
  onDownload,
  onPreview,
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-colors',
        done ? 'border-emerald-300 bg-emerald-50/40' : 'border-border'
      )}
    >
      <div className="flex items-center gap-2 pr-3">
        <AccordionPrimitive.Header className="flex flex-1 min-w-0">
          <AccordionPrimitive.Trigger className="group flex flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 min-w-0">
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

            <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>

        {/* Steuerzentrale auf oberster Ebene (außerhalb des Triggers) */}
        {showActions && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onPreview && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onPreview}
                className="gap-1.5 h-8 px-2 text-muted-foreground hover:text-foreground"
                title="Payload in eigenem Fenster ansehen"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Ansehen</span>
              </Button>
            )}
            {onCopy && (
              <Button
                size="sm"
                onClick={onCopy}
                className="gap-1.5 h-8 px-2.5"
                title="Als Markdown-Code-Block in die Zwischenablage kopieren"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Kopieren</span>
              </Button>
            )}
            {onDownload && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
                className="gap-1.5 h-8 px-2.5"
                title="Als .json-Datei herunterladen"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">JSON</span>
              </Button>
            )}
            <label
              className="flex items-center gap-1.5 text-xs cursor-pointer pl-2 ml-1 border-l border-border h-8"
              title="An die MBK übergeben"
            >
              <Checkbox checked={done} onCheckedChange={(v) => onToggleDelivered?.(!!v)} />
              <span className="hidden xl:inline text-muted-foreground whitespace-nowrap">
                Übergeben
              </span>
            </label>
          </div>
        )}
      </div>

      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="border-t bg-muted/20 px-4 py-4">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}