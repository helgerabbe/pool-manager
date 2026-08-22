import { useState } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import BildEinfuegenFeld from '@/components/workspace/BildEinfuegenFeld';

/**
 * Optionale Übersichtsgrafik zum Kompaktwissen: hochladen/einfügen ODER
 * per KI aus dem Kompaktwissen-Text erzeugen lassen.
 */
export default function KompaktwissenGrafikFeld({ value = '', kompaktwissenText = '', onChange, disabled = false }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (generating) return;
    if (!kompaktwissenText.trim()) {
      toast.error('Bitte zuerst den Kompaktwissen-Text ausfüllen.');
      return;
    }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateKompaktwissenGrafik', { text: kompaktwissenText });
      const data = res?.data ?? res;
      if (!data?.success) {
        toast.error(data?.error || 'Die Grafik konnte nicht erstellt werden.');
        return;
      }
      onChange?.(data.url);
      toast.success('Übersichtsgrafik erstellt — bitte prüfen, ob sie fachlich passt.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Fehler bei der Grafik-Erstellung.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label>
          Übersicht als Bild oder PDF <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || generating}
          className="gap-2 border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:text-blue-900"
          title="Erstellt aus dem Kompaktwissen-Text eine Übersichtsgrafik per KI"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Grafik wird erstellt…</>
            : <><Sparkles className="w-4 h-4" /> Grafik mit KI erstellen</>}
        </Button>
      </div>
      <BildEinfuegenFeld value={value} onChange={onChange} disabled={disabled || generating} erlaubtPdf />
      <p className="text-xs text-muted-foreground">
        Erlaubt sind Bilder (auch per Strg+V eingefügte Screenshots) und PDF-Dateien. Die Datei wird
        den Schüler:innen angezeigt und dient der KI als Grundlage. KI-Grafiken enthalten manchmal
        fehlerhafte Beschriftungen – prüfe das Ergebnis, bevor du es freigibst.
      </p>
    </div>
  );
}