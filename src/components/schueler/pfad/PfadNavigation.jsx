import { Lock, CheckCircle2, X, ArrowLeft, NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ITEM_GATE,
  annotateSektorForSchueler,
  deriveSektorFreischaltung,
  istSektorErledigt,
} from '@/lib/schuelerPfadGating';
import { buildSichtbarePfadItems } from '@/lib/schuelerPfadView';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { getSektorTypLabel } from '@/lib/sektorTypen';
import { cn } from '@/lib/utils';

/**
 * Overlay-Navigation (Burger-Menü) für die Schüleransicht. Zeigt die gesamte
 * Einheit als Liste aus Sektoren mit ihren Items. WICHTIG: Bündel-Container
 * (Lernpaket-/Aufgaben-/Projektbündel) erscheinen NICHT als eigene Punkte –
 * nur die darin enthaltenen Lernpakete/Aufgaben werden gleichrangig gezeigt.
 * Gesperrte Items tragen ein Schloss mit Tooltip-Begründung.
 */
export default function PfadNavigation({
  open,
  onClose,
  einheitId,
  einheitTitel,
  sektoren,
  fortschrittByInstance,
  bausteinById,
  aufgabenById,
  activeInstanceId,
  onSelectItem,
  onOpenMerkheft,
}) {
  const sektorFrei = deriveSektorFreischaltung(sektoren, fortschrittByInstance);

  return (
    <TooltipProvider delayDuration={150}>
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
            const sichtbar = buildSichtbarePfadItems(
              sektor,
              annotated,
              aufgabenById,
              bausteinById,
              !!frei?.freigeschaltet,
              frei?.voraussetzungTitel
            );
            const sektorFertig = istSektorErledigt(sektor, fortschrittByInstance);

            return (
              <div key={sektor.sektor_id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {getSektorTypLabel(sektor.sektor_typ)}
                  </span>
                  {!frei?.freigeschaltet && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
                <p className={cn(
                  'text-sm font-semibold mb-2 flex items-center gap-1.5',
                  sektorFertig ? 'text-emerald-700' : 'text-foreground'
                )}>
                  {sektor.titel}
                  {sektorFertig && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                </p>

                {sichtbar.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-1">Keine Inhalte.</p>
                ) : (
                  <ul className="space-y-1">
                    {sichtbar.map((item) => {
                      const Icon = getSystemBausteinIcon(item.meta.iconKey);
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
                              gesperrt && 'opacity-60 cursor-not-allowed',
                              !gesperrt && 'hover:bg-muted',
                              aktiv && 'bg-primary/10 ring-1 ring-primary/30'
                            )}
                          >
                            <span className="relative shrink-0">
                              <Icon className={cn('w-4 h-4', erledigt ? 'text-emerald-600' : 'text-muted-foreground')} />
                              {erledigt && (
                                <CheckCircle2 className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-emerald-600 bg-card rounded-full" />
                              )}
                            </span>
                            <span className={cn('truncate flex-1', erledigt && 'text-emerald-700 font-medium')}>
                              {item.meta.titel}
                            </span>
                            {gesperrt && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 p-0.5 rounded hover:bg-muted-foreground/10 pointer-events-auto"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[220px]">
                                  {item.lockReason}
                                </TooltipContent>
                              </Tooltip>
                            )}
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

        <footer className="border-t border-border p-3 shrink-0 space-y-1">
          {onOpenMerkheft && (
            <button
              onClick={() => { onOpenMerkheft(); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <NotebookPen className="w-4 h-4" /> Mein Merkheft
            </button>
          )}
          <Link
            to={`/lernen/einheit?id=${einheitId}`}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Einheit verlassen
          </Link>
        </footer>
      </aside>
    </TooltipProvider>
  );
}