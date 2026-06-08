/**
 * Visuelle Zeitleiste: zeigt die geplanten Fach-Blöcke als farbige Segmente
 * relativ zur Gesamtzeit. Nicht verplante Zeit erscheint als heller Puffer.
 */
export default function Zeitleiste({ gesamtzeit, bloecke }) {
  const verplant = bloecke.reduce((s, b) => s + b.minuten, 0);
  const puffer = Math.max(0, gesamtzeit - verplant);

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
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Verplant: <strong className="text-foreground">{verplant} Min</strong></span>
        <span>Insgesamt: {gesamtzeit} Min</span>
      </div>
    </div>
  );
}