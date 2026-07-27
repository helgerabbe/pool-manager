/**
 * components/workspace/lernpaketWizard/WizardIdeenkisteAuswahl.jsx
 *
 * Aufgabeneditor — Ideenkiste-Integration (2026-07-27): Zeigt die offenen
 * Aufgaben-Ideen der Einheit als Checkbox-Liste. Ausgewählte Ideen werden
 * im Mapping-Schritt in konkrete Aktivitäten übersetzt (inkl. Material).
 */
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Archive, FileText } from 'lucide-react';

export default function WizardIdeenkisteAuswahl({ eintraege = [], selectedIds, onToggle, disabled = false }) {
  if (eintraege.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {eintraege.map((e) => {
        const checked = selectedIds.has(e.id);
        const material = Array.isArray(e.material_urls) ? e.material_urls : [];
        return (
          <label
            key={e.id}
            className={`flex items-start gap-2.5 rounded-md border bg-card px-3 py-2 cursor-pointer transition-colors ${
              checked ? 'border-primary/50 shadow-sm' : 'border-border opacity-70 hover:opacity-100'
            }`}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(e.id)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="min-w-0 text-sm">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {e.titel}
              </span>
              {e.beschreibung && (
                <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{e.beschreibung}</span>
              )}
              {material.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5" title={material.map((m) => m.name).join(', ')}>
                  <FileText className="w-3 h-3 text-primary" />
                  {material.length} Material{material.length !== 1 ? 'ien' : ''} wird berücksichtigt
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}