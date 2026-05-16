import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { invokeFunction } from '@/utils/functionsHelper';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';

function analysisToText(analysis) {
  if (!analysis) return '';
  const sections = [
    ['Thema / Gegenstand', analysis.thema],
    ['Lernziele', analysis.lernziele?.join('\n- ')],
    ['Zentrale Begriffe', analysis.zentrale_begriffe?.join(', ')],
    ['Software / Materialien', analysis.software_materialien?.join('\n- ')],
    ['Nicht-Gegenstand / Grenzen', analysis.grenzen],
    ['Offene Punkte', analysis.offene_punkte?.join('\n- ')],
  ];

  return sections
    .filter(([, value]) => value && String(value).trim())
    .map(([label, value]) => {
      const text = Array.isArray(value) ? value.join('\n- ') : String(value);
      return `## ${label}\n${text.startsWith('- ') ? text : text}`;
    })
    .join('\n\n');
}

export default function GrundgeruestAnalyseDialog({ open, onOpenChange, einheit, initialText, onApply }) {
  const [sandboxText, setSandboxText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [structuredText, setStructuredText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (open) {
      setSandboxText(initialText || '');
      setAnalysis(null);
      setStructuredText('');
    }
  }, [open, initialText]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const res = await invokeFunction('analyzeEinheitGrundgeruest', {
      einheitId: einheit.id,
      rohtext: sandboxText,
    });
    const nextAnalysis = res.data?.analysis;
    setAnalysis(nextAnalysis);
    setStructuredText(analysisToText(nextAnalysis));
    setIsAnalyzing(false);
  };

  const handleApply = () => {
    onApply(structuredText || sandboxText, analysis);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            KI-Sandbox: Grundgerüst strukturieren
          </DialogTitle>
          <DialogDescription>
            Hier kannst du ausprobieren, analysieren und überarbeiten. Gespeichert wird erst, wenn du den Zustand übernimmst und danach im Tab speicherst.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ausgangstext / Sandbox</label>
            <Textarea
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              className="min-h-[360px] text-sm"
              placeholder="Beschreibe hier die Einheit, Materialien, Ziele, Grenzen und Besonderheiten…"
            />
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !sandboxText.trim()} className="gap-2">
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              KI-Analyse starten
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Überarbeiteter Zustand</label>
              {analysis?.status && (
                <Badge variant="outline" className="gap-1">
                  {analysis.status === 'gut' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {analysis.status}
                </Badge>
              )}
            </div>
            <Textarea
              value={structuredText}
              onChange={(e) => setStructuredText(e.target.value)}
              className="min-h-[360px] text-sm"
              placeholder="Nach der Analyse erscheint hier eine strukturierte Fassung, die du vor dem Übernehmen frei bearbeiten kannst."
            />
            {analysis?.kurzfeedback && (
              <p className="text-xs text-muted-foreground rounded-lg border bg-muted/40 p-3">
                {analysis.kurzfeedback}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Verwerfen</Button>
          <Button onClick={handleApply} disabled={!structuredText.trim() && !sandboxText.trim()}>
            Zustand übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}