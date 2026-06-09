import { Lock, CheckCircle2, Circle, X } from 'lucide-react';
import { ITEM_GATE, annotateSektorForSchueler, deriveSektorFreischaltung } from '@/lib/schuelerPfadGating';
import { getItemMeta } from '@/lib/schuelerItemMeta';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { getSektorTypLabel } from '@/lib/sektorTypen';
import { cn } from '@/lib/utils';

/**
 * Overlay-Navigation (Burger-Menü) für die Schüleransicht. Zeigt die gesamte
 * Einheit als Liste aus Sektoren mit ihren Items. Gesperrte Sektoren tragen
 * ein Schloss, erledigte Items einen grünen Haken. Klick auf ein
 * (freigeschaltetes) Item navigiert dorthin.
 */
export default function PfadNavigation({
  open,
  onClose,
  einheitTitel,
  sektoren,
  fortschrittByInstance,
  bausteinById,
  aufgabenById,
  activeInstanceId,
  onSelectItem,
}) {
  const sektorFrei = deriveSektorFreischaltung(sektoren, fortschrittByInstance);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[85%] max-w-sm bg-card border-r border-border shadow-xl flex flex-col transition-transform',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <header className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <p className="text-sm font-bold text-foreground truncate pr-2">{einheitTitel}</p>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {sektoren.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Für dieses Dashboard wurde noch kein Lernpfad eingerichtet.
            </p>
          )}
          {sektoren.map((sektor) => {
            const frei = sektorFrei.get(sektor.sektor_id);
            const annotated = annotateSektorForSchueler(sektor, fortschrittByInstance, bausteinById);
            const rootItems = annotated.filter((it) => !it.parent_instance_id);

            return (
              <div key={sektor.sektor_id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {getSektorTypLabel(sektor.sektor_typ)}
                  </span>
                  {!frei?.freigeschaltet && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
                <p className="text-sm font-semibold text-foreground mb-2">{sektor.titel}</p>

                {!frei?.freigeschaltet ? (
                  <p className="text-xs text-muted-foreground italic pl-1">
                    Erst verfügbar, wenn „{frei?.voraussetzungTitel || 'der vorige Abschnitt'}“ abgeschlossen ist.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {rootItems.map((item) => {
                      const meta = getItemMeta(item, aufgabenById, bausteinById);
                      const Icon = item.type === 'system'
                        ? getSystemBausteinIcon(meta.iconKey)
                        : getSystemBausteinIcon('file-text');
                      const gesperrt = item.gate === ITEM_GATE.GESPERRT;
                      const erledigt = item.gate === ITEM_GATE.ERLEDIGT;
                      const aktiv = activeInstanceId === item.instance_id;

                      return (
                        <li key={item.instance_id}>
                          <button
                            disabled={gesperrt}
                            onClick={() => { onSelectItem(item.instance_id); onClose(); }}
                            className={cn(
                              'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors',
                              gesperrt && 'opacity-50 cursor-not-allowed',
                              !gesperrt && 'hover:bg-muted',
                              aktiv && 'bg-primary/10 ring-1 ring-primary/30'
                            )}
                          >
                            {erledigt ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : gesperrt ? (
                              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className={cn('truncate', erledigt && 'text-muted-foreground line-through')}>
                              {meta.titel}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}