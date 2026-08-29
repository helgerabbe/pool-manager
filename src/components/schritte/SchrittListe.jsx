import React from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp, ChevronDown, Trash2, GripVertical, Plus,
  FileText, ListChecks, LayoutGrid, PencilRuler, Bot, Hand, MonitorPlay, Circle, CircleDot, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SCHRITT_TYPEN, SCHRITT_TYPEN_NEU, getSchrittTyp, schrittStatus,
  istSchrittVollstaendig, SCHRITT_STATUS,
} from '@/lib/schrittTypen';

const TYP_ICONS = {
  [SCHRITT_TYPEN.MATERIAL]: FileText,
  [SCHRITT_TYPEN.AUFGABE]: ListChecks,
  [SCHRITT_TYPEN.KATALOG]: LayoutGrid,
  [SCHRITT_TYPEN.OFFEN]: PencilRuler,
  [SCHRITT_TYPEN.BRIAN]: Bot,
  [SCHRITT_TYPEN.HANDLUNG]: Hand,
  [SCHRITT_TYPEN.EXTERN]: MonitorPlay,
};

const STATUS_ICONS = {
  [SCHRITT_STATUS.GEPLANT]: Circle,
  [SCHRITT_STATUS.GEBAUT]: CircleDot,
  [SCHRITT_STATUS.UEBERNOMMEN]: CheckCircle2,
};

const STATUS_FARBE = {
  [SCHRITT_STATUS.GEPLANT]: 'text-muted-foreground',
  [SCHRITT_STATUS.GEBAUT]: 'text-amber-600',
  [SCHRITT_STATUS.UEBERNOMMEN]: 'text-emerald-600',
};

const STATUS_TITEL = {
  [SCHRITT_STATUS.GEPLANT]: 'Geplant – noch nicht gebaut',
  [SCHRITT_STATUS.GEBAUT]: 'Gebaut – noch nicht übernommen',
  [SCHRITT_STATUS.UEBERNOMMEN]: 'Übernommen',
};

/**
 * Eine Kachel in der Schrittleiste.
 *
 * Ein Klick WÄHLT den Schritt aus (die Vorschau daneben springt mit). Der
 * Inhalt wird über den Bearbeiten-Knopf geöffnet — bewusst getrennt, damit
 * das Umsortieren nicht ständig ein Fenster aufreißt.
 */
function SchrittKachel({ schritt, index, total, isSelected, onSelect, onOpen, onDelete, onMoveUp, onMoveDown }) {
  const typInfo = getSchrittTyp(schritt.typ);
  const Icon = TYP_ICONS[schritt.typ] || FileText;
  const status = schrittStatus(schritt);
  const StatusIcon = STATUS_ICONS[status] || Circle;
  const unvollstaendig = status !== SCHRITT_STATUS.GEPLANT && !istSchrittVollstaendig(schritt);

  const beschriftung = schritt.titel?.trim() || typInfo?.label || 'Schritt';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-card hover:bg-muted/50',
      )}
      onClick={() => onSelect(index)}
      onDoubleClick={() => onOpen?.(index)}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span
        className={cn('shrink-0', STATUS_FARBE[status])}
        title={unvollstaendig ? 'Es fehlt noch etwas' : STATUS_TITEL[status]}
      >
        <StatusIcon className="w-3.5 h-3.5" />
      </span>
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{index + 1}. {beschriftung}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {typInfo?.label || schritt.typ}
          {unvollstaendig && ' · unvollständig'}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen?.(index); }}
          className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-border bg-background hover:bg-muted mr-0.5"
          title="Inhalt dieses Schritts bearbeiten"
        >
          Bearbeiten
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(index); }}
          disabled={index === 0}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
          title="Nach oben"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(index); }}
          disabled={index === total - 1}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
          title="Nach unten"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
          title="Entfernen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * SchrittListe
 * ────────────
 * Linke Spalte der Werkstatt: die Schrittfolge mit Status, Umsortieren und
 * einem Menü zum Anlegen neuer Schritte.
 *
 * Alt-Typen (derzeit die Freitextfrage) erscheinen im Anlege-Menü nicht mehr,
 * bleiben in der Liste aber ganz normal sichtbar und bearbeitbar.
 */
export default function SchrittListe({
  schritte = [],
  selectedIndex,
  onSelect,
  onOpen,
  onAdd,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {schritte.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1 py-6 text-center leading-relaxed">
            Noch keine Schritte. Legen Sie unten einen an — oder lassen Sie sich unten im Gespräch
            eine Schrittfolge vorschlagen.
          </p>
        ) : (
          schritte.map((s, i) => (
            <SchrittKachel
              key={s.id || i}
              schritt={s}
              index={i}
              total={schritte.length}
              isSelected={i === selectedIndex}
              onSelect={onSelect}
              onOpen={onOpen}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))
        )}
      </div>

      <div className="pt-3 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Plus className="w-4 h-4" /> Schritt hinzufügen
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {SCHRITT_TYPEN_NEU.map((t) => {
              const Icon = TYP_ICONS[t.id] || FileText;
              return (
                <DropdownMenuItem key={t.id} onSelect={() => onAdd(t.id)} className="gap-2 items-start py-2">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug whitespace-normal">
                      {t.beschreibung}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
