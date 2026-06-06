/**
 * LernzielRow
 * ───────────
 * Kompakte, platzsparende Eingabezeile für ein einzelnes Lernziel im
 * Lernpaket-Dialog (Strukturboard). Enthält:
 *  - Offizielle Formulierung (Fachsprache)
 *  - Schülergerechte Formulierung (optional)
 *  - Kategorie-Auswahl (Fachwissen / Fähigkeit-Fertigkeit)
 *  - KI-Assistent: prüft die Eingabe und schlägt beide Varianten vor.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Check, RotateCcw, GraduationCap, Link2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const KATEGORIEN = [
  { value: 'Fachwissen', kurz: 'W' },
  { value: 'Fähigkeit/Fertigkeit', kurz: 'F' },
];

export default function LernzielRow({ lz, idx, onUpdate, onRemove, kontext }) {
  const [loading, setLoading] = useState(false);
  const [vorschlag, setVorschlag] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Anzahl der Aufgaben, denen dieses Lernziel bereits zugeordnet ist.
  const verknuepftCount = lz.verknuepfte_aufgaben_count || 0;
  const verknuepftTitel = lz.verknuepfte_aufgaben_titel || [];
  const istVerknuepft = verknuepftCount > 0;

  // Aktuelle Kategorie als kompaktes Kürzel (W / F) – ein Feld statt zwei.
  const aktuelleKat = KATEGORIEN.find(k => k.value === lz.kategorie);
  const toggleKategorie = () => {
    // Durchschalten: keine → W → F → keine
    const idx = KATEGORIEN.findIndex(k => k.value === lz.kategorie);
    const next = idx === -1 ? KATEGORIEN[0].value : (idx + 1 < KATEGORIEN.length ? KATEGORIEN[idx + 1].value : '');
    onUpdate(lz.id, 'kategorie', next);
  };

  const handleRemoveClick = () => {
    if (istVerknuepft) {
      setConfirmDelete(true);
    } else {
      onRemove(lz.id);
    }
  };

  const handleKICheck = async () => {
    const eingabe = (lz.formulierung_fachsprache || lz.schueler_uebersetzung || '').trim();
    if (!eingabe) {
      toast.error('Bitte zuerst eine Formulierung eingeben.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('refineLernziel', {
        eingabe,
        kategorie: lz.kategorie,
        ...kontext,
      });
      if (data?.error) throw new Error(data.error);
      setVorschlag(data);
    } catch (err) {
      toast.error(`KI-Prüfung fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const uebernehmen = () => {
    if (!vorschlag) return;
    onUpdate(lz.id, 'formulierung_fachsprache', vorschlag.formulierung_fachsprache);
    onUpdate(lz.id, 'schueler_uebersetzung', vorschlag.schueler_uebersetzung);
    setVorschlag(null);
    toast.success('KI-Vorschlag übernommen.');
  };

  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5">
      <div className="flex items-start gap-2">
        {/* Aktionsspalte: Nummer + EIN Kategorie-Toggle (W/F) + Verknüpfungs-Badge + KI-Symbol */}
        <TooltipProvider>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">{idx + 1}</span>
          {/* Ein einziges Kategorie-Feld: zeigt W oder F, durchschalten per Klick */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleKategorie}
                className={cn(
                  'flex items-center justify-center w-8 h-5 rounded border text-[10px] font-bold transition-all',
                  aktuelleKat
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-dashed border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                {aktuelleKat ? aktuelleKat.kurz : '–'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[11px]">
              {aktuelleKat ? aktuelleKat.value : 'Kategorie wählen'} · klicken zum Wechseln
            </TooltipContent>
          </Tooltip>

          {/* Verknüpfungs-Badge: zeigt, ob das Lernziel schon Aufgaben zugeordnet ist */}
          {istVerknuepft && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center justify-center gap-0.5 w-8 h-5 rounded border border-blue-300 bg-blue-50 text-blue-700 text-[10px] font-bold cursor-help">
                  <Link2 className="w-2.5 h-2.5" />{verknuepftCount}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[240px] text-[11px]">
                <p className="font-semibold mb-0.5">Mit {verknuepftCount} Aufgabe{verknuepftCount === 1 ? '' : 'n'} verknüpft:</p>
                <ul className="list-disc pl-3.5 space-y-0.5">
                  {verknuepftTitel.slice(0, 6).map((t, i) => <li key={i}>{t}</li>)}
                  {verknuepftTitel.length > 6 && <li>… und {verknuepftTitel.length - 6} weitere</li>}
                </ul>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleKICheck}
                disabled={loading}
                className="flex items-center justify-center w-8 h-5 rounded border border-violet-300 text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-50"
              >
                {loading
                  ? <div className="w-2 h-2 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  : <Sparkles className="w-2.5 h-2.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[11px]">KI prüfen</TooltipContent>
          </Tooltip>
        </div>
        </TooltipProvider>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Fachsprache – zwei Zeilen lesbar */}
          <Textarea
            placeholder="Offizielle Formulierung (Fachsprache) – z.B. „Ich kann…"
            value={lz.formulierung_fachsprache}
            onChange={e => onUpdate(lz.id, 'formulierung_fachsprache', e.target.value)}
            rows={2}
            className="text-xs min-h-[42px] resize-y leading-snug py-1"
          />
          {/* Schülergerecht – grafisch klar als Schüler-Variante markiert:
              Schüler-Icon, kursiv, deutlich kleiner, eigene amber/orange Tönung. */}
          <div className="flex items-start gap-1 pl-1 border-l-2 border-amber-300">
            <GraduationCap className="w-2.5 h-2.5 text-amber-500 shrink-0 mt-1.5" />
            <Textarea
              placeholder="Schülergerechte Formulierung (optional)"
              value={lz.schueler_uebersetzung || ''}
              onChange={e => onUpdate(lz.id, 'schueler_uebersetzung', e.target.value)}
              rows={1}
              style={{ fontSize: '10px', lineHeight: '1.3' }}
              className="italic min-h-[20px] resize-y py-0.5 bg-amber-50/50 border-amber-200 text-amber-900 placeholder:text-amber-400/70 placeholder:not-italic"
            />
          </div>

          {/* KI-Vorschlag */}
          {vorschlag && (
            <div className="mt-1 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-violet-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> KI-Vorschlag
              </p>
              <div className="space-y-1.5 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-violet-500 font-medium">Fachsprache</p>
                  <p className="text-foreground">{vorschlag.formulierung_fachsprache}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-violet-500 font-medium">Schülergerecht</p>
                  <p className="text-foreground">{vorschlag.schueler_uebersetzung}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <Button type="button" size="sm" onClick={uebernehmen} className="h-6 gap-1 text-[11px] px-2 bg-violet-600 hover:bg-violet-700">
                  <Check className="w-3 h-3" /> Übernehmen
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setVorschlag(null)} className="h-6 gap-1 text-[11px] px-2 text-muted-foreground">
                  <RotateCcw className="w-3 h-3" /> Verwerfen
                </Button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleRemoveClick}
          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Lernziel entfernen"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Sicherheits-Dialog: Warnung beim Löschen eines bereits verknüpften Lernziels */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              Lernziel ist mit Aufgaben verknüpft
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Dieses Lernziel ist aktuell <strong>{verknuepftCount} Aufgabe{verknuepftCount === 1 ? '' : 'n'}</strong> zugeordnet.
                  Es bildet die Brücke, über die der KI-Tutor passende Lernpakete empfehlen kann.
                </p>
                {verknuepftTitel.length > 0 && (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {verknuepftTitel.slice(0, 6).map((t, i) => <li key={i}>{t}</li>)}
                    {verknuepftTitel.length > 6 && <li>… und {verknuepftTitel.length - 6} weitere</li>}
                  </ul>
                )}
                <p className="font-medium text-destructive">
                  Wenn du es löschst, geht diese Verknüpfung verloren. Trotzdem löschen?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmDelete(false); onRemove(lz.id); }}
            >
              Trotzdem löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}