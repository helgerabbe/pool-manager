/**
 * BildbeschriftungKIDialog.jsx
 *
 * Dialogischer KI-Assistent für die Bildbeschriftung (2026-08-13):
 * Die Lehrkraft lädt eine bereits beschriftete Vorlage hoch (z. B. eine Karte
 * mit Bundesstaaten), beschreibt, welche Begriffe zugeordnet werden sollen —
 * die KI schlägt Zielbegriffe mit Position und Distraktoren vor. Der Vorschlag
 * kann per Rückmeldung mehrfach nachgeschärft werden, bevor er übernommen wird.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Info, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function BildbeschriftungKIDialog({ open, onOpenChange, bildUrl, onUebernehmen }) {
  const [beschreibung, setBeschreibung] = useState('');
  const [bildBereinigen, setBildBereinigen] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [vorschlag, setVorschlag] = useState(null);
  const [laedt, setLaedt] = useState(false);
  const [bereinigtesUebernehmen, setBereinigtesUebernehmen] = useState(true);

  const generieren = async (istNachbesserung) => {
    setLaedt(true);
    try {
      const res = await base44.functions.invoke('generateBildbeschriftungVorschlag', {
        bildUrl,
        beschreibung,
        bildBereinigen,
        vorherigerVorschlag: istNachbesserung ? vorschlag : null,
        feedback: istNachbesserung ? feedback : '',
      });
      const d = res?.data;
      if (d?.error) throw new Error(d.error);
      if (!d?.dropZones?.length) throw new Error('Die KI konnte im Bild keine Begriffe erkennen. Bitte die Beschreibung präzisieren.');
      setVorschlag(d);
      setFeedback('');
      if (d.bereinigungsFehler) toast.warning('Bild konnte nicht bereinigt werden — das Originalbild bleibt erhalten.');
    } catch (err) {
      toast.error(err?.message || 'Vorschlag konnte nicht erstellt werden.');
    } finally {
      setLaedt(false);
    }
  };

  const uebernehmen = () => {
    onUebernehmen?.({
      aufgabenstellung: vorschlag.aufgabenstellung || '',
      dropZones: vorschlag.dropZones,
      distractors: vorschlag.distractors || [],
      backgroundImage: bereinigtesUebernehmen && vorschlag.bereinigtesBildUrl ? vorschlag.bereinigtesBildUrl : null,
    });
    setVorschlag(null);
    setBeschreibung('');
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Bildbeschriftung aus Vorlage erstellen
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Die KI liest die Begriffe aus dem Bild und setzt Zielfelder an die passenden Stellen.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {bildUrl && (
            <img src={bildUrl} alt="Vorlage" className="max-h-48 w-auto rounded-lg border border-border" />
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Was soll zugeordnet werden?</Label>
            <Textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              placeholder="z. B. Nur die Namen der Bundesstaaten. Die eingezeichneten Städte sollen im Bild bleiben."
              className="text-sm"
              disabled={laedt}
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox checked={bildBereinigen} onCheckedChange={(v) => setBildBereinigen(v === true)} disabled={laedt} />
            <span className="text-sm text-foreground leading-relaxed">
              Begriffe aus dem Bild entfernen lassen
              <span className="block text-xs text-muted-foreground">
                Die KI erzeugt zusätzlich eine Version des Bildes ohne die Beschriftungen. Das Ergebnis ist ein Vorschlag – bitte prüfen.
              </span>
            </span>
          </label>

          {!vorschlag && (
            <Button onClick={() => generieren(false)} disabled={laedt} className="gap-2 w-full">
              {laedt ? <><Loader2 className="w-4 h-4 animate-spin" /> KI arbeitet…</> : <><Sparkles className="w-4 h-4" /> Vorschlag erstellen</>}
            </Button>
          )}

          {vorschlag && (
            <div className="space-y-4 border-t pt-4">
              {vorschlag.bereinigtesBildUrl && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bereinigtes Bild (Vorschlag)</p>
                  <img src={vorschlag.bereinigtesBildUrl} alt="Bereinigt" className="max-h-48 w-auto rounded-lg border border-border" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={bereinigtesUebernehmen} onCheckedChange={(v) => setBereinigtesUebernehmen(v === true)} />
                    <span className="text-sm">Dieses Bild als Hintergrundbild verwenden</span>
                  </label>
                </div>
              )}

              {vorschlag.aufgabenstellung && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-900">
                  {vorschlag.aufgabenstellung}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Zielbegriffe ({vorschlag.dropZones.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {vorschlag.dropZones.map((z, i) => (
                    <span key={i} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {z.label} <span className="opacity-60">({Math.round(z.x_percent)}/{Math.round(z.y_percent)})</span>
                    </span>
                  ))}
                </div>
              </div>

              {vorschlag.distractors?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distraktoren</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vorschlag.distractors.map((d, i) => (
                      <span key={i} className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {vorschlag.hinweis && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{vorschlag.hinweis}</span>
                </div>
              )}

              <div className="space-y-1.5 border-t pt-4">
                <Label className="text-sm font-medium">Noch etwas nachbessern?</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  placeholder="z. B. Du hast Tasmanien vergessen, und Victoria sitzt zu weit nördlich."
                  className="text-sm"
                  disabled={laedt}
                />
                <Button
                  variant="outline"
                  onClick={() => generieren(true)}
                  disabled={laedt || !feedback.trim()}
                  className="gap-2"
                >
                  {laedt ? <><Loader2 className="w-4 h-4 animate-spin" /> KI arbeitet…</> : <><Sparkles className="w-4 h-4" /> Überarbeiten lassen</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={laedt}>Abbrechen</Button>
          <Button onClick={uebernehmen} disabled={!vorschlag || laedt} className="gap-2">
            <Check className="w-4 h-4" /> Vorschlag übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}