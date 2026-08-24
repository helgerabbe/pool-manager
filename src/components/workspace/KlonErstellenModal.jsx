/**
 * KlonErstellenModal.jsx
 *
 * Modal für die Klon-Erstellung mit zwei Methoden:
 * - Option A: Exakte Kopie (1:1-Duplikat der Masteraufgabe)
 * - Option B: KI-generierte Variationen (mit optionalem thematischem Fokus)
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildKlonPromptSchema } from '@/lib/klonPromptSchema';

export default function KlonErstellenModal({ open, onClose, master, klone, onKlonesCreated }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState('copy'); // 'copy' | 'ai'
  const [count, setCount] = useState(1);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (loading) return;
    setMethod('copy');
    setCount(1);
    setHint('');
    setError(null);
    onClose();
  };

  // ── Option A: Exakte Kopien ────────────────────────────────────────────────
   const createExactCopies = async () => {
     const fv = master.field_values || {};

     // Bestimme die nächste Klon-Nummer
     const maxIndex = klone.length > 0
       ? Math.max(...klone.map(k => k.klon_index || 0))
       : 0;

     for (let i = 0; i < count; i++) {
       await base44.entities.Aufgabenbausteine.create({
         lernpaket_id: master.lernpaket_id,
         aktivitaet_id: master.aktivitaet_id,
         baustein_typ: 'Ebene-1-Übung',
         aufgabentext_inhalt: JSON.stringify(fv),
         is_master: false,
         master_aufgabe_id: master.id,
         content_status: 'draft',
         sync_status: 'new',
         klon_index: maxIndex + i + 1,
       });
     }
   };

  // ── Option B: KI-Variationen ───────────────────────────────────────────────
  // Prompt & Schema werden aus dem Format der Masteraufgabe abgeleitet, damit
  // ein Klon immer dieselbe Struktur wie der Master hat (nur andere Inhalte).
  const createAIVariations = async () => {
    const fv = master.field_values || {};
    const konfiguration = buildKlonPromptSchema(fv, count, hint);
    if (!konfiguration) {
      throw new Error('Für dieses Aufgabenformat sind KI-Variationen nicht möglich. Bitte exakte Kopien erstellen und manuell anpassen.');
    }
    const { prompt, schema } = konfiguration;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });
    const klone = result?.klone || [];
    if (klone.length === 0) throw new Error('Die KI hat keine Variationen generiert. Bitte erneut versuchen.');

    // Bestimme die nächste Klon-Nummer (aus den BESTEHENDEN Klonen, nicht den KI-generierten)
    const maxIndex = (master?.klone && master.klone.length > 0)
      ? Math.max(...master.klone.map(k => k.klon_index || 0))
      : 0;

    for (let i = 0; i < result.klone.length; i++) {
       await base44.entities.Aufgabenbausteine.create({
         lernpaket_id: master.lernpaket_id,
         aktivitaet_id: master.aktivitaet_id,
         baustein_typ: 'Ebene-1-Übung',
         aufgabentext_inhalt: JSON.stringify(result.klone[i]),
         is_master: false,
         master_aufgabe_id: master.id,
         content_status: 'draft',
         sync_status: 'new',
         klon_index: maxIndex + i + 1,
       });
     }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (method === 'copy') {
        await createExactCopies();
        toast.success(`${count} exakte Kopie${count !== 1 ? 'n' : ''} erstellt.`);
      } else {
        await createAIVariations();
        toast.success(`${count} KI-Variation${count !== 1 ? 'en' : ''} erstellt.`);
      }
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['klone', 'einheit'] });
      onKlonesCreated?.();
      handleClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] max-w-md flex flex-col max-h-[90dvh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Klone erstellen</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-5">
          {/* Methoden-Auswahl */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod('copy')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors',
                method === 'copy'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', method === 'copy' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Exakte Kopien</p>
                <p className="text-xs text-muted-foreground mt-0.5">Identischer Inhalt, sofort bearbeitbar</p>
              </div>
            </button>

            <button
              onClick={() => setMethod('ai')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors',
                method === 'ai'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', method === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">KI-Variationen</p>
                <p className="text-xs text-muted-foreground mt-0.5">Neue Varianten mit gleichem Niveau</p>
              </div>
            </button>
          </div>

          {/* Anzahl */}
          <div className="flex items-center gap-3">
            <Label htmlFor="klon-count" className="text-sm font-medium shrink-0 w-36">Anzahl der Klone</Label>
            <Input
              id="klon-count"
              type="number"
              min={1}
              max={5}
              value={count}
              onChange={e => setCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              disabled={loading}
              className="h-8 w-20 text-sm"
            />
          </div>

          {/* Optionaler KI-Fokus (nur bei Option B) */}
          {method === 'ai' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Thematischer Fokus <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                value={hint}
                onChange={e => setHint(e.target.value)}
                placeholder="z.B. 'Thema Biologie Klasse 7', 'andere Tierarten verwenden', 'schwierigere Fachbegriffe'"
                className="resize-none h-20 text-sm"
                disabled={loading}
              />

              {/* Hinweistext für Lückentext */}
              {master?.field_values?.lueckentext && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs leading-relaxed">
                  <p className="font-medium mb-1">Hinweis:</p>
                  <p>Die KI formuliert den Text inhaltlich passend um. Die von Ihnen definierten Lückenwörter bleiben dabei exakt erhalten und werden in den neuen Text integriert.</p>
                </div>
              )}

              {/* Hinweistext für Sortierungs-Aufgaben */}
              {master?.field_values?.orderedItems && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs leading-relaxed">
                  <p className="font-medium mb-1">Hinweis:</p>
                  <p>Die KI generiert neue Sortierlisten mit verschiedenen Themen, aber derselben Struktur und Schwierigkeit. Alle Elemente werden bereits in der korrekten Reihenfolge zurückgegeben.</p>
                </div>
              )}
            </div>
          )}

          {/* Fehleranzeige */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle…</>
              : method === 'ai'
                ? <><Sparkles className="w-4 h-4" /> KI-Variationen erstellen</>
                : <><Copy className="w-4 h-4" /> Kopien erstellen</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}