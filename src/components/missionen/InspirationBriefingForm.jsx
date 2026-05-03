/**
 * InspirationBriefingForm — Phase 2 / PR5.
 *
 * Das "Briefing"-Interface der Inspiration-Engine. Drei Eingaben:
 *   - Mission (Single-Choice-Kacheln, exakt die 6 aus lib/missionen.js)
 *   - Material-Level (Slider 0–3, Default 1)
 *   - Fokus (optionales Freitextfeld)
 *
 * Stateless presentational component: erhält Werte + onChange-Handler
 * vom InspirationModal. Keine eigene Logik.
 */
import React from 'react';
import { MISSIONEN } from '@/lib/missionen';
import { MATERIAL_LEVELS, getMaterialLevel } from '@/lib/inspirationConstants';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Sparkles, Check, Target, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InspirationBriefingForm({
  mission,
  onMissionChange,
  materialLevel,
  onMaterialLevelChange,
  fokus,
  onFokusChange,
  disabled = false,
}) {
  const matMeta = getMaterialLevel(materialLevel);

  return (
    <div className="space-y-6">
      {/* ── Mission (Single-Choice) ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Welche Mission soll die Aufgabe haben?
          <span className="text-destructive">*</span>
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Wähle EINE didaktische Stoßrichtung. Die KI optimiert den Vorschlag exakt darauf.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MISSIONEN.map((m) => {
            const isActive = mission === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !disabled && onMissionChange(m.id)}
                disabled={disabled}
                aria-pressed={isActive}
                className={cn(
                  'relative flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 text-left transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isActive ? m.classes.tileActive : m.classes.tile
                )}
              >
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white border flex items-center justify-center shadow-sm">
                    <Check className="w-2.5 h-2.5 text-foreground" />
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-base leading-none">
                  <span aria-hidden="true">{m.emoji}</span>
                </div>
                <div className="text-xs font-semibold leading-snug">{m.label}</div>
                <div className="text-[10px] text-muted-foreground leading-snug">{m.kern}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Material-Level (Slider 0–3) ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <PackageOpen className="w-3.5 h-3.5 text-slate-500" />
            Wie viel Material darf die Aufgabe brauchen?
          </Label>
          <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
            {matMeta.emoji} {matMeta.label}
          </span>
        </div>
        <div className="px-1">
          <Slider
            min={0}
            max={3}
            step={1}
            value={[materialLevel]}
            onValueChange={(v) => !disabled && onMaterialLevelChange(v[0])}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground select-none">
            {MATERIAL_LEVELS.map((m) => (
              <span
                key={m.value}
                className={cn(
                  'flex flex-col items-center gap-0.5 w-1/4',
                  m.value === materialLevel && 'text-foreground font-semibold'
                )}
              >
                <span>{m.value}</span>
                <span className="hidden sm:inline">{m.short}</span>
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground italic">{matMeta.hint}</p>
      </div>

      {/* ── Fokus (Freitext, optional) ──────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="inspiration-fokus" className="text-sm font-medium flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-slate-500" />
          Was soll unbedingt vorkommen?
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="inspiration-fokus"
          value={fokus}
          onChange={(e) => onFokusChange(e.target.value)}
          placeholder="z. B. 'Kondensation im Alltag', 'Bruchrechnung mit Pizza', 'Quellenkritik bei Wikipedia'…"
          rows={2}
          disabled={disabled}
          className="resize-y min-h-[56px]"
        />
      </div>
    </div>
  );
}