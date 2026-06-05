/**
 * LernzielAnalysePanel.jsx
 *
 * Phase 1 der KI-gestützten Lernzielanalyse (vormals "Kompetenzzuordnung").
 *
 * Der Lehrer startet eine KI-Analyse der Aufgabe. Die KI liefert eine sortierte,
 * fachbezogene Liste von Lernzielen ("Um diese Aufgabe zu lösen, muss der Schüler
 * … können."). Der Lehrer kann die Liste kuratieren:
 *   - einzelne Vorschläge entfernen,
 *   - eigene Lernziele manuell ergänzen.
 * Die kuratierte Liste wird als strukturierte Notiz auf der Aufgabe gespeichert
 * (Feld `lernzielanalyse`). Sie ist NOCH NICHT mit echten Lernziel-Datensätzen
 * verknüpft — das ist Phase 2.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Plus, X, Info, Bot, PencilLine } from 'lucide-react';
import { toast } from 'sonner';

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `lz-${Date.now()}-${idCounter}`;
}

export default function LernzielAnalysePanel({ aufgabe, kannBearbeiten = false }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState([]);
  const [hinweis, setHinweis] = useState('');
  const [analysiertAm, setAnalysiertAm] = useState(null);
  const [neuerEintrag, setNeuerEintrag] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Bestehende Analyse aus der Aufgabe laden / bei Aufgabenwechsel neu setzen.
  useEffect(() => {
    const analyse = aufgabe?.lernzielanalyse || {};
    setItems(Array.isArray(analyse.items) ? analyse.items : []);
    setHinweis(analyse.fachuebergreifender_hinweis || '');
    setAnalysiertAm(analyse.analysiert_am || null);
    setNeuerEintrag('');
  }, [aufgabe?.id]);

  const saveMutation = useMutation({
    mutationFn: (analyse) =>
      updateAllgemeineAufgabe(aufgabe.id, { lernzielanalyse: analyse }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
    },
    onError: () => toast.error('Fehler beim Speichern der Lernzielanalyse'),
  });

  const persist = useCallback(
    (nextItems, nextHinweis, nextAnalysiertAm) => {
      saveMutation.mutate({
        items: nextItems,
        fachuebergreifender_hinweis: nextHinweis || '',
        analysiert_am: nextAnalysiertAm || null,
      });
    },
    [saveMutation]
  );

  const handleAnalyze = async () => {
    if (!kannBearbeiten || !aufgabe?.id) return;
    setAnalyzing(true);
    try {
      const res = await base44.functions.invoke('analyzeAufgabeLernziele', {
        aufgabeId: aufgabe.id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      const vorschlaege = Array.isArray(res?.data?.lernziele) ? res.data.lernziele : [];
      const neueItems = vorschlaege.map((text) => ({ id: makeId(), text, quelle: 'ki' }));
      // KI-Vorschläge ersetzen vorherige KI-Vorschläge, manuelle Einträge bleiben.
      const manuelle = items.filter((it) => it.quelle === 'manuell');
      const merged = [...neueItems, ...manuelle];
      const neuerHinweis = res?.data?.fachuebergreifender_hinweis || '';
      const ts = new Date().toISOString();
      setItems(merged);
      setHinweis(neuerHinweis);
      setAnalysiertAm(ts);
      persist(merged, neuerHinweis, ts);
      toast.success(`${neueItems.length} Lernziel-Vorschläge erstellt`);
    } catch (err) {
      toast.error(err?.message || 'KI-Analyse fehlgeschlagen');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemove = (id) => {
    if (!kannBearbeiten) return;
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    persist(next, hinweis, analysiertAm);
  };

  const handleAddManual = () => {
    if (!kannBearbeiten) return;
    const text = neuerEintrag.trim();
    if (!text) return;
    const next = [...items, { id: makeId(), text, quelle: 'manuell' }];
    setItems(next);
    setNeuerEintrag('');
    persist(next, hinweis, analysiertAm);
  };

  const hatAnalyse = items.length > 0 || !!hinweis;

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Kopf / Erklärung */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Lernzielanalyse
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Lass die KI analysieren, welche fachbezogenen Lernziele ein Schüler beherrschen muss,
          um diese Aufgabe lösen zu können. Du kannst die Vorschläge anschließend bearbeiten
          und eigene Lernziele ergänzen.
        </p>
      </div>

      {/* KI-Start-Button */}
      {kannBearbeiten && (
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || saveMutation.isPending}
          className="gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              KI analysiert die Aufgabe…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {hatAnalyse ? 'Lernzielanalyse erneut starten' : 'Lernzielanalyse mit KI starten'}
            </>
          )}
        </Button>
      )}

      {/* Ergebnis-Liste */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Benötigte Lernziele ({items.length})
          </p>
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li
                key={it.id}
                className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-card text-sm"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0 leading-snug">{it.text}</span>
                <span
                  className="shrink-0 mt-0.5"
                  title={it.quelle === 'ki' ? 'KI-Vorschlag' : 'Manuell ergänzt'}
                >
                  {it.quelle === 'ki' ? (
                    <Bot className="w-3.5 h-3.5 text-primary/70" />
                  ) : (
                    <PencilLine className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </span>
                {kannBearbeiten && (
                  <button
                    type="button"
                    onClick={() => handleRemove(it.id)}
                    title="Entfernen"
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Manuelle Ergänzung */}
      {kannBearbeiten && (
        <div className="flex items-center gap-2">
          <Input
            value={neuerEintrag}
            onChange={(e) => setNeuerEintrag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddManual();
              }
            }}
            placeholder="Eigenes Lernziel ergänzen…"
            className="text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddManual}
            disabled={!neuerEintrag.trim()}
            className="gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </Button>
        </div>
      )}

      {/* Fachübergreifender Hinweis */}
      {hinweis && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Hinweis: fachübergreifende Voraussetzungen</p>
            <p className="leading-relaxed">{hinweis}</p>
          </div>
        </div>
      )}

      {/* Leerer Zustand */}
      {!hatAnalyse && !analyzing && (
        <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
          Noch keine Lernzielanalyse vorhanden.
          {kannBearbeiten ? ' Starte die Analyse mit der KI oder ergänze Lernziele manuell.' : ''}
        </div>
      )}
    </div>
  );
}