/**
 * KiBriefingForm.jsx
 *
 * AP2 / MBK-Schema v1.1.0 §4 — Dynamisches Formular für KI-Briefings im
 * Standard-Variant (typabhängige Mini-Fragenkataloge).
 *
 * Die konkreten Felder pro Aktivitätstyp kommen aus `lib/kiBriefingKatalog.js`
 * (Single Source of Truth). Wir rendern hier nur, was der Katalog vorgibt —
 * Erweiterung neuer Aktivitätstypen bedeutet ausschließlich Pflegen des
 * Katalogs, nicht Anfassen dieser Komponente.
 *
 * Persistenzformat (entspricht 1:1 dem Schema, kein Mapping nötig):
 *   {
 *     variant: 'standard',
 *     standard: {
 *       schwerpunkt: '...',
 *       parameter: { anzahl_fragen: 5, schwierigkeit: 'mittel', ... }
 *     }
 *   }
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Sparkles, X } from 'lucide-react';
import {
  getBriefingKatalog,
  validateKiBriefing,
} from '@/lib/kiBriefingKatalog';

// ── Tag-Eingabe (für parameter-Felder vom Typ 'tags') ─────────────────────
function TagInput({ value = [], onChange, placeholder, disabled }) {
  const [draft, setDraft] = useState('');
  const list = Array.isArray(value) ? value : [];

  const commit = () => {
    const t = draft.trim();
    if (!t) return;
    if (!list.includes(t)) onChange([...list, t]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {list.map((tag, i) => (
          <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 text-xs">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(list.filter((_, idx) => idx !== i))}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
  );
}

// ── Einzelnes Parameter-Feld rendern ──────────────────────────────────────
function ParameterField({ field, value, onChange, disabled }) {
  const id = `kibrief-${field.name}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {field.label}
      </Label>

      {field.type === 'number' && (
        <Input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          value={value ?? ''}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : Number(v));
          }}
          className="text-sm"
        />
      )}

      {field.type === 'text' && (
        <Input
          id={id}
          value={value ?? ''}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value || null)}
          className="text-sm"
        />
      )}

      {field.type === 'select' && (
        <Select
          value={value ?? ''}
          disabled={disabled}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger id={id} className="text-sm">
            <SelectValue placeholder="— bitte wählen —" />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === 'tags' && (
        <TagInput
          value={value || []}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )}

      {field.hint && (
        <p className="text-[11px] text-muted-foreground/80">{field.hint}</p>
      )}
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────
export default function KiBriefingForm({
  aktivitaetName = '',
  initialBriefing = null,
  onSave,
  onCancel,
  isSaving = false,
  readOnly = false,
}) {
  const katalog = useMemo(() => getBriefingKatalog(aktivitaetName), [aktivitaetName]);

  // Lokaler Draft-State. Wir bleiben strikt im Schema-Format, damit der
  // Save-Path direkt das Briefing persistieren kann (keine Transformation).
  const [briefing, setBriefing] = useState(() => ({
    variant: 'standard',
    standard: {
      schwerpunkt: initialBriefing?.standard?.schwerpunkt || '',
      parameter: { ...(initialBriefing?.standard?.parameter || {}) },
    },
  }));

  const setSchwerpunkt = (val) =>
    setBriefing((b) => ({ ...b, standard: { ...b.standard, schwerpunkt: val } }));

  const setParameter = (name, val) =>
    setBriefing((b) => {
      const next = { ...(b.standard.parameter || {}) };
      if (val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        delete next[name];
      } else {
        next[name] = val;
      }
      return { ...b, standard: { ...b.standard, parameter: next } };
    });

  const errors = useMemo(() => validateKiBriefing(briefing, aktivitaetName), [
    briefing,
    aktivitaetName,
  ]);
  const isValid = errors.length === 0;

  return (
    <div className="rounded-xl border-2 border-accent/30 bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent-foreground" />
        <h3 className="text-sm font-semibold">KI-Briefing</h3>
        <Badge variant="outline" className="text-[10px]">
          {aktivitaetName || 'Standard'}
        </Badge>
      </div>

      {/* Pflichtfeld: Schwerpunkt */}
      <div className="space-y-1.5">
        <Label htmlFor="kibrief-schwerpunkt" className="text-sm font-medium">
          {katalog.schwerpunkt_label}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Textarea
          id="kibrief-schwerpunkt"
          value={briefing.standard.schwerpunkt}
          disabled={readOnly || isSaving}
          onChange={(e) => setSchwerpunkt(e.target.value)}
          placeholder={katalog.schwerpunkt_placeholder}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {/* Optionale Parameter-Felder */}
      {katalog.parameter_fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
          {katalog.parameter_fields.map((field) => (
            <ParameterField
              key={field.name}
              field={field}
              value={briefing.standard.parameter[field.name]}
              onChange={(val) => setParameter(field.name, val)}
              disabled={readOnly || isSaving}
            />
          ))}
        </div>
      )}

      {/* Aktionen */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Lerntyp-Vorgaben (z. B. „Minimalist: nur Schwierigkeit 1") gehen
            beim Export immer vor diesen Parametern.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Abbrechen
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => onSave?.(briefing)}
              disabled={!isValid || isSaving}
              className="gap-2"
              title={!isValid ? errors.join(' · ') : ''}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichern…
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Briefing speichern
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}