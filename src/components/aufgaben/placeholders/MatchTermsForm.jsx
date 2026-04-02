/**
 * MatchTermsForm.jsx
 *
 * Vollständiges Formular für "Begriffe zuordnen"-Aufgaben.
 * Side-by-Side-Layout mit Distraktoren-Bereich.
 */

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Trash2, Plus, MinusCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Zod-Schema ────────────────────────────────────────────────────────────────

const MatchTermsSchema = z.object({
  instruction: z.string().min(1, 'Arbeitsanweisung ist erforderlich'),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1, 'Linkes Feld darf nicht leer sein'),
        right: z.string().min(1, 'Rechtes Feld darf nicht leer sein'),
      })
    )
    .min(2, 'Mindestens 2 Begriffspaare sind erforderlich'),
  distractors: z
    .array(z.object({ value: z.string().min(1) }))
    .optional()
    .default([]),
});

// ── Paar-Zeile ────────────────────────────────────────────────────────────────

function PairRow({ index, register, errors, onRemove, canRemove }) {
  return (
    <div className="flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
      {/* Nummer */}
      <span className="mt-2 text-xs font-bold text-muted-foreground/60 w-5 text-right shrink-0">
        {index + 1}
      </span>

      {/* Linkes Feld */}
      <div className="flex-1 space-y-1">
        <Input
          {...register(`pairs.${index}.left`)}
          placeholder="Z.B. Vokabel oder Begriff"
          className={cn(errors?.pairs?.[index]?.left && 'border-destructive')}
        />
        {errors?.pairs?.[index]?.left && (
          <p className="text-xs text-destructive">{errors.pairs[index].left.message}</p>
        )}
      </div>

      {/* Trennzeichen */}
      <div className="mt-2 shrink-0">
        <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
      </div>

      {/* Rechtes Feld */}
      <div className="flex-1 space-y-1">
        <Input
          {...register(`pairs.${index}.right`)}
          placeholder="Z.B. Übersetzung oder Definition"
          className={cn(errors?.pairs?.[index]?.right && 'border-destructive')}
        />
        {errors?.pairs?.[index]?.right && (
          <p className="text-xs text-destructive">{errors.pairs[index].right.message}</p>
        )}
      </div>

      {/* Löschen */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Distraktor-Zeile ──────────────────────────────────────────────────────────

function DistractorRow({ index, register, errors, onRemove }) {
  return (
    <div className="flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
      {/* Platzhalter links (Ausrichtung beibehalten) */}
      <span className="mt-2 text-xs font-bold text-muted-foreground/60 w-5 text-right shrink-0">
        {index + 1}
      </span>
      <div className="flex-1 flex items-center gap-1 mt-2">
        <MinusCircle className="w-3.5 h-3.5 text-muted-foreground/30" />
        <span className="text-xs text-muted-foreground/40 italic">kein linker Begriff</span>
      </div>
      {/* Pfeil-Platzhalter */}
      <div className="mt-2 shrink-0">
        <ArrowRight className="w-4 h-4 text-muted-foreground/20" />
      </div>
      {/* Rechtes Feld (Distraktor) */}
      <div className="flex-1 space-y-1">
        <Input
          {...register(`distractors.${index}.value`)}
          placeholder="Falsche Antwort / Distraktor"
          className={cn(
            'border-dashed',
            errors?.distractors?.[index]?.value && 'border-destructive'
          )}
        />
        {errors?.distractors?.[index]?.value && (
          <p className="text-xs text-destructive">{errors.distractors[index].value.message}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Haupt-Formular ────────────────────────────────────────────────────────────

export default function MatchTermsForm({ initialData = {}, onSave, onCancel }) {
  const defaultValues = {
    instruction: initialData.instruction || '',
    pairs: initialData.pairs?.length >= 2
      ? initialData.pairs
      : [
          { left: '', right: '' },
          { left: '', right: '' },
          { left: '', right: '' },
        ],
    distractors: initialData.distractors || [],
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(MatchTermsSchema),
    defaultValues,
    mode: 'onChange',
  });

  const {
    fields: pairFields,
    append: appendPair,
    remove: removePair,
  } = useFieldArray({ control, name: 'pairs' });

  const {
    fields: distractorFields,
    append: appendDistractor,
    remove: removeDistractor,
  } = useFieldArray({ control, name: 'distractors' });

  const onSubmit = (data) => {
    // Normalisiere Distraktoren zu einfachem String-Array
    const cleaned = {
      instruction: data.instruction,
      pairs: data.pairs,
      distractors: data.distractors.map((d) => d.value).filter(Boolean),
    };
    onSave?.(cleaned);
  };

  const pairCountError = errors?.pairs?.root?.message || errors?.pairs?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Arbeitsanweisung */}
      <div className="space-y-1.5">
        <Label htmlFor="instruction" className="font-semibold">
          Arbeitsanweisung <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="instruction"
          {...register('instruction')}
          placeholder="z.B. Ordne die Begriffe den richtigen Definitionen zu."
          className={cn('resize-none h-20', errors.instruction && 'border-destructive')}
        />
        {errors.instruction && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.instruction.message}
          </p>
        )}
      </div>

      {/* Begriffspaare */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">
            Begriffspaare <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs text-muted-foreground">
            {pairFields.length} Paar{pairFields.length !== 1 ? 'e' : ''}
          </span>
        </div>

        {/* Header-Row */}
        <div className="flex items-center gap-3 px-0">
          <span className="w-5 shrink-0" />
          <span className="flex-1 text-xs font-medium text-muted-foreground">Begriffe / Fragen</span>
          <span className="w-4 shrink-0" />
          <span className="flex-1 text-xs font-medium text-muted-foreground">Zuordnung / Antworten</span>
          <span className="w-9 shrink-0" />
        </div>

        <div className="bg-muted/40 rounded-xl p-4 space-y-3 border border-border/60">
          {pairFields.map((field, index) => (
            <PairRow
              key={field.id}
              index={index}
              register={register}
              errors={errors}
              onRemove={() => removePair(index)}
              canRemove={pairFields.length > 2}
            />
          ))}
        </div>

        {pairCountError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {pairCountError}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 w-full"
          onClick={() => appendPair({ left: '', right: '' })}
        >
          <Plus className="w-4 h-4" />
          Weiteres Paar hinzufügen
        </Button>
      </div>

      {/* Distraktoren */}
      <div className="space-y-3">
        <Separator />
        <div className="flex items-center justify-between pt-1">
          <div>
            <Label className="font-semibold text-muted-foreground">
              Zusätzliche falsche Antworten
              <span className="ml-1 text-xs font-normal">(Distraktoren, optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Diese Antworten erscheinen im Zuordnungsfeld, haben aber kein richtiges Gegenstück.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {distractorFields.length} Eintr{distractorFields.length !== 1 ? 'äge' : 'ag'}
          </span>
        </div>

        {distractorFields.length > 0 && (
          <div className="bg-muted/20 rounded-xl p-4 space-y-3 border border-dashed border-border/60">
            {distractorFields.map((field, index) => (
              <DistractorRow
                key={field.id}
                index={index}
                register={register}
                errors={errors}
                onRemove={() => removeDistractor(index)}
              />
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground w-full"
          onClick={() => appendDistractor({ value: '' })}
        >
          <Plus className="w-4 h-4" />
          Falschantwort hinzufügen
        </Button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {pairFields.length} Paar{pairFields.length !== 1 ? 'e' : ''} · {distractorFields.length} Distraktor{distractorFields.length !== 1 ? 'en' : ''}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!isValid || pairFields.length < 2}
            className="gap-2"
          >
            Speichern
          </Button>
        </div>
      </div>
    </form>
  );
}