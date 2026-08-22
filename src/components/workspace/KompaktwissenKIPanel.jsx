import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * KI-Button für die Kompaktwissen-Aktivität.
 *
 * Zwei Betriebsarten (2026-08-22) — kein Entweder-oder mehr:
 *  • Ohne eigene Vorarbeit: die Übersicht entsteht aus Lernzielen,
 *    Inhalten und Aufgaben des Lernpakets.
 *  • Mit eigener Vorarbeit (Text und/oder hochgeladene Grafik/PDF): die KI
 *    bereitet GENAU dieses Material schülergerecht auf; der fachliche Gehalt
 *    bleibt vollständig erhalten. Beschriftung und Hinweis wechseln
 *    entsprechend, damit die Lehrkraft weiß, worauf die KI aufsetzt.
 */
export default function KompaktwissenKIPanel({ activityId, fieldValues = {}, disabled = false, onGenerated }) {
  const [generating, setGenerating] = useState(false);

  const hatEigenenText = typeof fieldValues?.text === 'string' && fieldValues.text.trim().length > 0;
  const hatDatei = typeof fieldValues?.bild_url === 'string' && fieldValues.bild_url.trim().length > 0;
  const hatVorarbeit = hatEigenenText || hatDatei;

  const quellen = [hatEigenenText && 'deinem Text', hatDatei && 'der hochgeladenen Datei'].filter(Boolean).join(' und ');

  const handleGenerate = async () => {
    if (generating || disabled) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateKompaktwissen', { activityId });
      const data = res?.data ?? res;
      if (!data?.success) {
        toast.error(data?.error || 'Die KI-Erstellung ist fehlgeschlagen.');
        return;
      }
      toast.success(
        hatVorarbeit
          ? 'Kompaktwissen aus deinen Eingaben aufbereitet — bitte prüfen, ob nichts Wichtiges fehlt.'
          : 'Kompaktwissen erstellt — bitte prüfen und bei Bedarf anpassen.'
      );
      await onGenerated?.(data.field_values);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Fehler bei der KI-Erstellung.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      disabled={disabled || generating}
      className="gap-2 border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:text-blue-900"
      title={
        hatVorarbeit
          ? `Bereitet ${quellen} zu einer gut lesbaren Schüler-Übersicht auf — alle fachlichen Punkte bleiben erhalten, ergänzt um Lernziele und Inhalte des Lernpakets.`
          : 'Erstellt die Wissensübersicht per KI — auf Grundlage der Lernziele, Inhalte und Aufgaben dieses Lernpakets'
      }
    >
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> {hatVorarbeit ? 'Bereite auf…' : 'Erstelle Übersicht…'}</>
        : <><Sparkles className="w-4 h-4" /> {hatVorarbeit ? 'Mit KI aufbereiten' : 'Mit KI erstellen'}</>}
    </Button>
  );
}