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

import React from 'react';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

const MEDIEN_AKTIVITAETEN = ['video', 'audio', 'podcast', 'hörverstehen', 'hoerverstehen'];
const MAX_LEN = 50000;

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
}) {
  const len = (value || '').length;
  const tooLong = len > MAX_LEN;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          Transkript
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <span
          className={`text-[11px] tabular-nums ${
            tooLong ? 'text-destructive font-semibold' : 'text-muted-foreground'
          }`}
        >
          {len.toLocaleString('de-DE')} / {MAX_LEN.toLocaleString('de-DE')} Zeichen
        </span>
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
      <p className="text-[11px] text-muted-foreground/80">
        Tipp: Kopiere das Transkript aus YouTube („Transkript anzeigen") oder einer Audio-Software hierher.
        Auto-Erstellung per Spracherkennung folgt in einem späteren Schritt.
      </p>
    </div>
  );
}