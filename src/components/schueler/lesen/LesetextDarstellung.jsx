import { cn } from '@/lib/utils';

/**
 * Zentrale, leseoptimierte Darstellung eines Lesetexts (Single Source of Truth
 * für das Lese-Layout in der Schüleransicht). Wiederverwendbar für jede
 * Aktivität, die längere Texte oder Hinweise anzeigt.
 *
 * Bewusste Lese-Regeln für (auch leseschwächere) Schüler:
 *  - Optimale Zeilenlänge: ~66 Zeichen (max-w über `prose`/measure begrenzt).
 *  - Großzügige, aber nicht zu weite Zeilenhöhe (leading-relaxed).
 *  - Klar erkennbare Überschriften und deutliche Absatz-Abstände.
 *  - Drei wählbare Schriftgrößen (klein/mittel/groß) über die `groesse`-Prop.
 *  - Serifenlose, ruhige Schrift; hoher Kontrast (foreground auf background).
 *
 * Heuristik für Struktur: Der reine Textinhalt wird an Leerzeilen in Absätze
 * gesplittet. Kurze Zeilen (< 60 Zeichen) ohne Satzende-Punkt werden als
 * Zwischenüberschrift erkannt und entsprechend hervorgehoben. So profitieren
 * auch ungegliederte „in ein Textfeld kopierte" Texte von klarer Struktur.
 */

const GROESSE_CLASS = {
  klein: { body: 'text-[15px] leading-[1.7]', h: 'text-lg' },
  mittel: { body: 'text-[17px] leading-[1.75]', h: 'text-xl' },
  gross: { body: 'text-[20px] leading-[1.8]', h: 'text-2xl' },
};

function istUeberschrift(zeile) {
  const t = zeile.trim();
  if (!t) return false;
  // Markdown-Überschrift
  if (/^#{1,6}\s+/.test(t)) return true;
  // Kurze Zeile ohne Satzende → vermutlich eine Überschrift
  const ohneSatzende = !/[.!?:;]$/.test(t);
  return t.length <= 60 && ohneSatzende && !t.includes('. ');
}

function reinige(zeile) {
  return zeile.replace(/^#{1,6}\s+/, '').trim();
}

export default function LesetextDarstellung({ text, groesse = 'mittel', className }) {
  const groessen = GROESSE_CLASS[groesse] || GROESSE_CLASS.mittel;
  const rohBloecke = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={cn('mx-auto w-full max-w-[42rem]', className)}>
      <div className={cn('space-y-5 text-foreground', groessen.body)}>
        {rohBloecke.map((block, i) => {
          const zeilen = block.split('\n');
          // Block ist eine einzelne Zeile, die wie eine Überschrift aussieht
          if (zeilen.length === 1 && istUeberschrift(zeilen[0])) {
            return (
              <h2
                key={i}
                className={cn('font-bold tracking-tight text-foreground mt-2', groessen.h)}
              >
                {reinige(zeilen[0])}
              </h2>
            );
          }
          // Mehrzeiliger Block: ggf. erste Zeile als Zwischenüberschrift
          const hatUeberschrift = istUeberschrift(zeilen[0]) && zeilen.length > 1;
          const restZeilen = hatUeberschrift ? zeilen.slice(1) : zeilen;
          return (
            <div key={i} className="space-y-2">
              {hatUeberschrift && (
                <h3 className={cn('font-bold tracking-tight text-foreground', groessen.h)}>
                  {reinige(zeilen[0])}
                </h3>
              )}
              <p className="whitespace-pre-line">{restZeilen.join('\n')}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}