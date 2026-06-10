import { NotebookPen } from 'lucide-react';

/**
 * Visuelle Zeitleiste: zeigt die geplanten Fach-Blöcke als farbige Segmente
 * relativ zur Gesamtzeit. Nicht verplante Zeit erscheint als heller Puffer.
 * Optional ist am Ende ein fester Block für das Lerntagebuch reserviert
 * (reserviertMinuten) – der kann nicht verplant werden.
 */
export default function Zeitleiste({ gesamtzeit, bloecke, reserviertMinuten = 0 }) {
  const verplant = bloecke.reduce((s, b) => s + b.minuten, 0);
  const puffer = Math.max(0, gesamtzeit - reserviertMinuten - verplant);

  return (
    <div className="w-full">
      <div className="flex h-10 w-full rounded-xl overflow-hidden border border-border bg-muted">
        {bloecke.map((b) => (
          <div
            key={b.fachId}
            className="flex items-center justify-center text-xs font-semibold text-white overflow-hidden"
            style={{ width: `${(b.minuten / gesamtzeit) * 100}%`, backgroundColor: b.farbe || '#64748b' }}
            title={`${b.name}: ${b.minuten} Min`}
          >
            {(b.minuten / gesamtzeit) > 0.12 && <span className="px-1 truncate">{b.minuten}′</span>}
          </div>
        ))}
        {puffer > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium text-muted-foreground"
            style={{ width: `${(puffer / gesamtzeit) * 100}%` }}
            title={`Puffer: ${puffer} Min`}
          >
            {(puffer / gesamtzeit) > 0.12 && <span className="px-1">Puffer</span>}
          </div>
        )}
        {reserviertMinuten > 0 && (
          <div
            className="flex items-center justify-center gap-1 text-xs font-semibold text-amber-800 bg-amber-200/80 border-l border-amber-300"
            style={{ width: `${(reserviertMinuten / gesamtzeit) * 100}%` }}
            title={`Lerntagebuch: ${reserviertMinuten} Min für Rückblick & Planung`}
          >
            <NotebookPen className="w-3 h-3 shrink-0" />
          </div>
        )}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Verplant: <strong className="text-foreground">{verplant} Min</strong></span>
        {reserviertMinuten > 0 && (
          <span className="text-amber-700 font-medium">{reserviertMinuten} Min Lerntagebuch</span>
        )}
        <span>Insgesamt: {gesamtzeit} Min</span>
      </div>
    </div>
  );
}