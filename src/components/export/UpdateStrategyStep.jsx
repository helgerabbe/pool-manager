/**
 * UpdateStrategyStep.jsx
 *
 * Schritt 2 im Freigabe-Dialog: Zeigt die Delta-Analyse und lässt die
 * Fachschaftsleitung die Update-Strategie wählen.
 *
 * Wird NUR angezeigt, wenn die Einheit bereits veröffentlicht war (Update).
 * Bei Erst-Freigabe wird dieser Schritt übersprungen.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, PencilLine, Trash2, LayoutDashboard, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const STRATEGY_LABELS = {
  no_reset: 'Update ohne Reset',
  full_reset: 'Mit Reset (Schüler müssen neu starten)',
};

export default function UpdateStrategyStep({ einheitId, onStrategyChosen, busy = false, initialStrategy = null }) {
  const [selected, setSelected] = useState(initialStrategy);

  const { data: delta, isLoading, error } = useQuery({
    queryKey: ['updateDelta', einheitId],
    queryFn: async () => {
      const res = await base44.functions.invoke('analyzeUpdateDelta', { einheitId });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    enabled: !!einheitId,
  });

  useEffect(() => {
    if (delta && !selected) {
      setSelected(delta.empfehlung);
    }
  }, [delta, selected]);

  useEffect(() => {
    if (onStrategyChosen && selected) {
      onStrategyChosen(selected);
    }
  }, [selected, onStrategyChosen]);

  // Kein Update → Erst-Freigabe, kein Delta-Dialog nötig
  if (!isLoading && delta && !delta.isUpdate && !delta.hasNewItems && !delta.hasDeletedItems && !delta.hasDashboardChanges && delta.modifiedCount === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Erst-Freigabe</strong> – keine vorherige Version vorhanden.
          Es werden alle Inhalte neu exportiert.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Delta wird analysiert …</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-700">Delta-Analyse fehlgeschlagen: {error.message}</p>
      </div>
    );
  }

  if (!delta) return null;

  const { hasNewItems, hasDeletedItems, hasDashboardChanges, deletedCount, newCount, modifiedCount, dashboardChangedLerntypen, empfehlung, empfehlungBegruendung } = delta;

  return (
    <div className="space-y-4">
      {/* ── Analyse-Ergebnis ──────────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
        <p className="text-xs text-blue-900 leading-relaxed font-medium">
          Das System hat folgende Änderungen erkannt:
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {newCount > 0 && (
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-blue-300 bg-blue-100 text-blue-800 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" />
              {newCount} {newCount === 1 ? 'neues Element' : 'neue Elemente'}
            </span>
          )}
          {modifiedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-amber-300 bg-amber-100 text-amber-800 text-[11px] font-semibold">
              <PencilLine className="w-3 h-3" />
              {modifiedCount} {modifiedCount === 1 ? 'geändertes Element' : 'geänderte Elemente'}
            </span>
          )}
          {deletedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-red-300 bg-red-100 text-red-800 text-[11px] font-semibold">
              <Trash2 className="w-3 h-3" />
              {deletedCount} {deletedCount === 1 ? 'gelöschtes Element' : 'gelöschte Elemente'}
            </span>
          )}
          {hasDashboardChanges && (
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-purple-300 bg-purple-100 text-purple-800 text-[11px] font-semibold">
              <LayoutDashboard className="w-3 h-3" />
              Dashboard geändert
              {dashboardChangedLerntypen?.length > 0 && ` (${dashboardChangedLerntypen.length} Lerntyp${dashboardChangedLerntypen.length !== 1 ? 'en' : ''})`}
            </span>
          )}
        </div>
      </div>

      {/* ── Empfehlung ────────────────────────────────────────── */}
      <div className={`rounded-lg border p-3 flex items-start gap-2.5 ${
        empfehlung === 'full_reset'
          ? 'border-amber-300 bg-amber-50'
          : 'border-emerald-200 bg-emerald-50'
      }`}>
        {empfehlung === 'full_reset' ? (
          <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-xs font-semibold leading-relaxed">
            Empfehlung: <strong>{STRATEGY_LABELS[empfehlung]}</strong>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {empfehlungBegruendung}
          </p>
        </div>
      </div>

      {/* ── Strategie-Auswahl ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Update-Strategie wählen:</Label>
        <div className="grid gap-2">
          <label
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
              selected === 'no_reset'
                ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="update_strategy"
              value="no_reset"
              checked={selected === 'no_reset'}
              onChange={() => setSelected('no_reset')}
              className="mt-0.5 accent-emerald-600"
              disabled={busy}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">Update ohne Reset</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Schüler behalten ihren Fortschritt. Neue und geänderte Inhalte werden
                eingeblendet. Gelöschte Elemente verschwinden aus dem Pfad.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
              selected === 'full_reset'
                ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="update_strategy"
              value="full_reset"
              checked={selected === 'full_reset'}
              onChange={() => setSelected('full_reset')}
              className="mt-0.5 accent-amber-600"
              disabled={busy}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">Mit Reset – alle Schüler müssen neu starten</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Alle Schüler-Fortschritte zu dieser Einheit werden zurückgesetzt.
                Die Einheit erscheint für alle wie neu. Nur bei massiven strukturellen
                Änderungen empfohlen.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}