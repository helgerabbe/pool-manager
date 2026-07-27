import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * KI-Button für die Kompaktwissen-Aktivität: erstellt die Wissensübersicht
 * per KI — auf Grundlage der Lernziele, Inhalte und Aufgaben des Lernpakets.
 */
export default function KompaktwissenKIPanel({ activityId, disabled = false, onGenerated }) {
  const [generating, setGenerating] = useState(false);

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
      toast.success('Kompaktwissen erstellt — bitte prüfen und bei Bedarf anpassen.');
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
      title="Erstellt die Wissensübersicht per KI — auf Grundlage der Lernziele, Inhalte und Aufgaben dieses Lernpakets"
    >
      {generating
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle Übersicht…</>
        : <><Sparkles className="w-4 h-4" /> Mit KI erstellen</>}
    </Button>
  );
}