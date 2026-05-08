/**
 * TranskriptField.jsx
 *
 * AP2 / MBK-Integration §1.4: Manuelles Transkript-Feld für Medien-Aktivitäten
 * (Video, Audio, Podcast, Hörverstehen).
 *
 * Dient der MBK als Textbasis für KI-Fragegenerierung. Auto-Fill
 * (`generateMediaTranscript`) folgt in Schritt 8 — dieses Feld bleibt
 * bewusst manuell.
 *
 * Sichtbarkeitsregel: nur bei Aktivitäten, deren `katalog.name` einer der
 * vier Medien-Typen entspricht. Die Match-Logik liegt unten als Helper, damit
 * sie im Caller (Modal) wiederverwendet werden kann.
 *
 * Persistenz: `transkript` ist ein Top-Level-Feld auf `LernpaketPhaseAktivitaet`,
 * NICHT in `field_values`. Save-Path muss es daher explizit aus den
 * field_values extrahieren — siehe TextLesenModal.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MEDIEN_AKTIVITAETEN = ['video', 'audio', 'podcast', 'hörverstehen', 'hoerverstehen'];
const MAX_LEN = 50000;

// Regex-Check: aktiv nur, wenn die URL eine Studyflix-Domain ist.
function isStudyflixUrl(url = '') {
  try {
    const u = new URL(url);
    return u.hostname === 'studyflix.de' || u.hostname === 'www.studyflix.de';
  } catch {
    return false;
  }
}

/**
 * Prüft, ob für eine Aktivität ein Transkript-Feld angeboten werden soll.
 * @param {string} aktivitaetName — AktivitaetenKatalog.name
 */
export function shouldShowTranskript(aktivitaetName = '') {
  const n = aktivitaetName.toLowerCase();
  return MEDIEN_AKTIVITAETEN.some((m) => n.includes(m));
}

export default function TranskriptField({
  value = '',
  onChange,
  disabled = false,
  sourceUrl = '',         // wird aus field_values.url des Modals durchgereicht
}) {
  const len = (value || '').length;
  const tooLong = len > MAX_LEN;

  // Studyflix-Auto-Import-State
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const canImport = isStudyflixUrl(sourceUrl) && !disabled && !importing;

  const handleStudyflixImport = async () => {
    setImportError(null);
    setImporting(true);
    try {
      const res = await base44.functions.invoke('extractStudyflixText', { url: sourceUrl });
      const data = res?.data || {};
      if (data.error) {
        setImportError(data.error);
        return;
      }
      if (data.text) {
        onChange?.(data.text);
      } else {
        setImportError('Keine Textdaten zurückerhalten.');
      }
    } catch (err) {
      setImportError(err?.message || 'Import fehlgeschlagen.');
    } finally {
      setImporting(false);
    }
  };

  // Tooltip-Text je nach Zustand
  const buttonTooltip = importing
    ? 'Lade Text von Studyflix…'
    : isStudyflixUrl(sourceUrl)
    ? 'Text aus der Studyflix-URL automatisch laden'
    : 'Automatischer Text-Import aktuell nur für Studyflix verfügbar.';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          Transkript
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] tabular-nums ${
              tooLong ? 'text-destructive font-semibold' : 'text-muted-foreground'
            }`}
          >
            {len.toLocaleString('de-DE')} / {MAX_LEN.toLocaleString('de-DE')} Zeichen
          </span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span-Wrapper, damit Tooltip auch bei disabled-Button funktioniert */}
                <span>
                  <button
                    type="button"
                    onClick={handleStudyflixImport}
                    disabled={!canImport}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      canImport
                        ? 'border-accent/40 bg-accent/10 text-accent-foreground hover:bg-accent/20'
                        : 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                    }`}
                  >
                    {importing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Text aus Studyflix laden
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {buttonTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <textarea
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Füge hier das Transkript des Medieninhalts ein. Die KI nutzt es als Basis, um Fragen, Lückentexte oder Zusammenfassungen zu generieren."
        rows={6}
        maxLength={MAX_LEN}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {importError && (
        <p className="text-[11px] text-destructive">⚠️ {importError}</p>
      )}
      <p className="text-[11px] text-muted-foreground/80">
        Tipp: Bei Studyflix-URLs lädt der Sparkles-Button den Artikeltext automatisch. Bei anderen Quellen bitte manuell einfügen.
      </p>
    </div>
  );
}