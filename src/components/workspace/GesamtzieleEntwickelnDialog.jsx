/**
 * GesamtzieleEntwickelnDialog
 * ───────────────────────────
 * Scannt die fertige Einheit und schlägt höchstens fünf Gesamtziele vor —
 * Formulierungen, wie sie in einem Lernentwicklungsbericht stehen könnten.
 *
 * Die Lehrkraft wählt aus, bearbeitet die Sätze bei Bedarf und entscheidet,
 * ob die Vorschläge die bestehenden Ziele ergänzen oder ersetzen. Übernommen
 * wird ausschließlich, was hier bewusst angehakt ist.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Check, RotateCcw } from 'lucide-react';

export default function GesamtzieleEntwickelnDialog({ open, onOpenChange, einheitId, bestehende = [], onUebernehmen }) {
  const [loading, setLoading] = useState(false);
  const [vorschlaege, setVorschlaege] = useState(null);
  const [auswahl, setAuswahl] = useState({});
  const [ersetzen, setErsetzen] = useState(bestehende.length > 0);
  const [saving, setSaving] = useState(false);

  const analysieren = async () => {
    setLoading(true);
    setVorschlaege(null);
    try {
      const { data } = await base44.functions.invoke('generateGesamtziele', { einheit_id: einheitId });
      if (data?.error) throw new Error(data.error);
      const liste = (data?.vorschlaege || []).map((v, i) => ({ ...v, _key: `v${i}` }));
      setVorschlaege(liste);
      setAuswahl(Object.fromEntries(liste.map((v) => [v._key, true])));
      if (liste.length === 0) toast.info(data?.hinweis || 'Es konnten keine Gesamtziele abgeleitet werden.');
    } catch (err) {
      toast.error(`Analyse fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const gewaehlt = (vorschlaege || []).filter((v) => auswahl[v._key] && v.ziel.trim());

  const uebernehmen = async () => {
    setSaving(true);
    try {
      const neu = gewaehlt.map((v) => v.ziel.trim());
      await onUebernehmen(ersetzen ? neu : [...bestehende, ...neu]);
      onOpenChange(false);
      setVorschlaege(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Gesamtziele aus der fertigen Einheit entwickeln
          </DialogTitle>
          <DialogDescription>
            Die Einheit wird mit ihren Themenfeldern, Lernpaketen und Lernzielen durchgesehen. Daraus entstehen
            höchstens fünf Gesamtziele — so knapp, dass sie in einem Lernentwicklungsbericht stehen könnten.
          </DialogDescription>
        </DialogHeader>

        {!vorschlaege && (
          <div className="py-2">
            <Button onClick={analysieren} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Einheit wird durchgesehen…' : 'Einheit durchsehen'}
            </Button>
          </div>
        )}

        {vorschlaege && vorschlaege.length > 0 && (
          <div className="space-y-3">
            {vorschlaege.map((v) => (
              <div key={v._key} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <Checkbox
                  checked={!!auswahl[v._key]}
                  onCheckedChange={(c) => setAuswahl((a) => ({ ...a, [v._key]: !!c }))}
                  className="mt-1.5"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Textarea
                    value={v.ziel}
                    rows={2}
                    onChange={(e) =>
                      setVorschlaege((prev) => prev.map((p) => (p._key === v._key ? { ...p, ziel: e.target.value } : p)))
                    }
                    className="text-sm leading-snug min-h-[44px] resize-y"
                  />
                  {v.deckt_ab?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">Deckt ab: {v.deckt_ab.join(' · ')}</p>
                  )}
                </div>
              </div>
            ))}

            {bestehende.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={ersetzen} onCheckedChange={(c) => setErsetzen(!!c)} />
                Bestehende {bestehende.length} Gesamtziele ersetzen (sonst werden die neuen ergänzt)
              </label>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={uebernehmen} disabled={gewaehlt.length === 0 || saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {gewaehlt.length} übernehmen
              </Button>
              <Button variant="ghost" onClick={analysieren} disabled={loading} className="gap-2 text-muted-foreground">
                <RotateCcw className="w-4 h-4" /> Neu vorschlagen
              </Button>
            </div>
          </div>
        )}

        {vorschlaege && vorschlaege.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">
            Es konnten keine Gesamtziele abgeleitet werden — die Einheit enthält dafür noch zu wenig Inhalt.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}