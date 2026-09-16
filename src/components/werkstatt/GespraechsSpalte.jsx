import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, AlertTriangle, RotateCcw, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { storageService } from '@/services/storageService';
import BauFortschritt from '@/components/werkstatt/BauFortschritt';
import GespraechsBildAnhaenge from '@/components/werkstatt/GespraechsBildAnhaenge';

/**
 * GespraechsSpalte
 * ────────────────
 * Das Gespräch mit dem Assistenten: Verlauf, Streaming-Antwort, Fehler,
 * Warnungen und das Eingabefeld.
 *
 * Herausgelöst aus AufgabenWerkstattModal (2026-08-29), damit die alte
 * Werkstatt (einzelne offene Aufgabe) und die neue dreispaltige Werkstatt
 * dieselbe Spalte benutzen. Zustandslos bis auf das Scrollen — Verlauf und
 * Eingabe liegen beim Aufrufer.
 *
 * Props:
 *   - gen         Rückgabe von useAufgabenGenerator
 *   - eingabe / onEingabe   kontrolliertes Eingabefeld
 *   - onAbschicken(bilder)  Absenden (auch per Strg/Cmd + Enter); bekommt die
 *                           per Zwischenablage eingefügten Bilder [{url,name}]
 *   - disabled              Eingabe gesperrt (z. B. freigegebene Aufgabe)
 *   - platzhalter, leerText Beschriftungen je Einsatzort
 *
 * BILDER (2026-09-16): Ein Screenshot im Zwischenspeicher lässt sich mit
 * Strg+V direkt ins Eingabefeld einfügen. Er wird hochgeladen, als Vorschau
 * gezeigt und geht mit der nächsten Nachricht an den Assistenten — der kann
 * sich daran orientieren oder das Bild in der Aufgabe verwenden.
 */
export default function GespraechsSpalte({
  gen,
  eingabe,
  onEingabe,
  onAbschicken,
  disabled = false,
  platzhalter = 'Was sollen die Schüler:innen sehen und tun?',
  leerText = 'Sag einfach, was die Schüler:innen üben sollen. Wenn etwas fehlt, frage ich nach — sonst baue ich eine erste Fassung, an der wir weiterarbeiten.',
  className = '',
}) {
  const verlaufRef = useRef(null);
  const [bilder, setBilder] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    verlaufRef.current?.scrollTo({ top: verlaufRef.current.scrollHeight, behavior: 'smooth' });
  }, [gen.verlauf.length, gen.teilAntwort]);

  const bildHochladen = async (file) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const antwort = await storageService.upload(file);
      const url = typeof antwort === 'string' ? antwort : antwort?.file_url;
      if (!url) throw new Error('Das Bild konnte nicht gespeichert werden.');
      setBilder((alt) => [...alt, { url, name: file.name || `Bild ${alt.length + 1}` }]);
    } catch (err) {
      toast.error(err?.message || 'Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e) => {
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); bildHochladen(file); return; }
      }
    }
  };

  const abschicken = () => {
    if (!eingabe.trim() || gen.busy || disabled || uploading) return;
    onAbschicken(bilder);
    setBilder([]);
  };

  return (
    <div className={`flex flex-col min-h-0 rounded-xl border border-slate-200 bg-white ${className}`}>
      <div ref={verlaufRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {gen.verlauf.length === 0 && !gen.busy && !!leerText && (
          <p className="text-sm text-slate-500 py-8 px-2 text-center leading-relaxed">
            {leerText}
          </p>
        )}

        {gen.verlauf.map((m, i) => (
          <div
            key={i}
            className={m.rolle === 'lehrkraft'
              ? 'ml-8 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-sm whitespace-pre-wrap'
              : 'mr-8 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm whitespace-pre-wrap'}
          >
            {m.bilder?.length > 0 && (
              <div className="mb-2">
                <GespraechsBildAnhaenge bilder={m.bilder} />
              </div>
            )}
            {m.text}
          </div>
        ))}

        {gen.busy && (
          <div className="mr-8 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm whitespace-pre-wrap">
            {gen.teilAntwort || (
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> denkt nach…
              </span>
            )}
            <BauFortschritt fortschritt={gen.fortschritt} />
          </div>
        )}

        {gen.fehler && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
            <p className="text-sm text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gen.fehler}</span>
            </p>
            {/* Der getippte Text ist nicht verloren — er steht hier und geht
                auf einen Klick erneut raus. Ohne das müsste die Lehrkraft
                alles neu formulieren, und genau daran scheitert Geduld. */}
            {gen.fehlgeschlagen && (
              <>
                <p className="rounded border border-amber-200 bg-white/70 px-2 py-1.5 text-xs text-slate-700 line-clamp-3">
                  {gen.fehlgeschlagen}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={gen.nochmalVersuchen}
                    disabled={gen.busy || disabled}
                    className="gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Nochmal versuchen
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-600"
                    onClick={() => onEingabe(gen.fehlgeschlagen)}
                    disabled={gen.busy || disabled}
                  >
                    Text zum Bearbeiten zurückholen
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {gen.warnungen.map((w, i) => (
          <div key={`w${i}`} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            {w} — sag mir am besten noch einmal in anderen Worten, was geändert werden soll.
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3 space-y-2 shrink-0">
        <GespraechsBildAnhaenge
          bilder={bilder}
          uploading={uploading}
          onEntfernen={(i) => setBilder((alt) => alt.filter((_, idx) => idx !== i))}
          disabled={disabled || gen.busy}
        />
        <Textarea
          value={eingabe}
          onChange={(e) => onEingabe(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) abschicken();
          }}
          placeholder={platzhalter}
          className="min-h-[120px] resize-none text-sm bg-card border-2 border-violet-200 focus-visible:ring-violet-400"
          disabled={disabled}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={abschicken}
            disabled={!eingabe.trim() || gen.busy || disabled || uploading}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {gen.busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Arbeitet…</>
              : <><Send className="w-4 h-4" /> Abschicken</>}
          </Button>
          {gen.busy && (
            <Button variant="ghost" onClick={gen.abbrechen} className="text-slate-500">
              Abbrechen
            </Button>
          )}
          <span className="text-[11px] text-slate-400 ml-auto inline-flex items-center gap-1.5">
            <ImagePlus className="w-3 h-3" /> Bild mit Strg + V einfügen · Strg + Enter sendet
          </span>
        </div>
      </div>
    </div>
  );
}