/**
 * LernpfadeSektor.jsx
 *
 * Eine Sektor-Karte im Lernpfad-Architekt.
 * - Bearbeitbarer Titel.
 * - Toggle für Modus ("sequenziell" ↔ "frei").
 * - Droppable-Bereich für Items (per @hello-pangea/dnd).
 * - Item-Rendering ist typgesteuert:
 *     • type === 'aufgabe' → AufgabePill
 *     • type === 'system'  → SystemBausteinPill
 *
 * Hinweis (Phase 2): Der Legacy-Fallback auf `sektor.aufgaben_ids` wurde
 * planmäßig entfernt — die Lazy-Migration in `lernpfadeUtils` stellt sicher,
 * dass beim Lesen UND Schreiben ausschließlich das `items`-Array verwendet
 * wird. Falls in der DB noch alte Datensätze liegen, werden sie beim ersten
 * Zugriff durch `normalizeSektor` transparent migriert, bevor sie hier
 * ankommen.
 */

import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, X, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAufgabenTyp, ITEM_TYPE } from '@/lib/aufgabenTypen';
import SystemBausteinPill from '@/components/lernpfade/SystemBausteinPill';
import BundleAutoFillButton from '@/components/lernpfade/BundleAutoFillButton';
import AmpelBadge from '@/components/lernpfade/AmpelBadge';
import { isExportFreigegeben, isContentApproved } from '@/lib/ampelLogic';
import { groupItemsByParent } from '@/lib/lernpfadeUtils';
import { getSektorTypLabel, SEKTOR_TYP } from '@/lib/sektorTypen';
import SektorDriftBadge from '@/components/lernpfade/SektorDriftBadge';

// Dynamische Lernpaket-Variante je nach Lerntyp ("Chamäleon-Logik").
// Nur reguläre Lernpakete (buendel) zeigen ein Varianten-Label;
// Zwischentests (test_only) sind statisch und bekommen keines.
const LERNTYP_VARIANTE = {
  minimalist: { label: 'Standard', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  pragmatiker: { label: 'Fast-Track', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  ehrgeizig: { label: 'Fast-Track', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  passioniert: { label: 'Wissensspeicher', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
};

function AufgabePill({ aufgabe, refId, sektorId, index, instanceId, indent = false, onRemove, onSelect, isSelected, disabled, ampelStatus, exportReady, contentApproved, onOpenEditor, onOpenLernpaket, activeLernTyp, fremdesThemenfeldTitel }) {
  // Fallback, falls die Aufgabe (noch) nicht im Cache ist.
  const titel = aufgabe?.titel || 'Aufgabe';
  // Lernpakete sind keine Aufgaben: Sie tragen den Adapter-Marker _isLernpaket.
  // Für sie blenden wir (1) den fehleranfälligen Vollständigkeits-Punkt aus und
  // (2) führt der Klick auf das rote Ausrufezeichen zum Lernpaket (Tab 4),
  // NICHT in den Aufgaben-Editor.
  const istLernpaket = aufgabe?._isLernpaket === true;
  const typMeta = getAufgabenTyp(aufgabe?.aufgaben_typ);
  const Icon = typMeta.icon;
  // Phase 3: Draggable-IDs müssen über Sektor- und Bündel-Droppables eindeutig
  // sein. Wir nehmen die instance_id als stabilen Anker (vorhanden seit Phase 1).
  const draggableId = `pfaditem-aufgabe-${instanceId || `${sektorId}-${index}-${refId}`}`;

  const isBuendel = aufgabe?.aufgaben_typ === 'buendel';
  const isZwischentest = isBuendel && aufgabe?.lernpaket_logik === 'test_only';
  const variante = isBuendel && !isZwischentest ? LERNTYP_VARIANTE[activeLernTyp] : null;

  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect?.(refId)}
          className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
            isSelected
              ? `${typMeta.color.border} ${typMeta.color.bg} shadow-sm`
              : 'border-border bg-card hover:border-primary/30'
          } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40' : ''} ${indent ? 'ml-5 border-l-2 border-l-bundle/40' : ''}`}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <div className={`w-5 h-5 rounded ${typMeta.color.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3 h-3 ${typMeta.color.iconText}`} />
          </div>
          <span className="flex-1 min-w-0 truncate">
            {aufgabe ? titel : <span className="italic text-muted-foreground">Unbekannte Aufgabe</span>}
          </span>
          {fremdesThemenfeldTitel && (
            <span
              className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-300"
              title={`Diese Aufgabe gehört eigentlich zum Themenfeld „${fremdesThemenfeldTitel}". Du kannst sie hier liegen lassen, falls das beabsichtigt ist.`}
            >
              ⚠ Anderes Themenfeld
            </span>
          )}
          {variante && (
            <span
              className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${variante.cls}`}
              title={`Variante: ${variante.label}`}
            >
              {variante.label}
            </span>
          )}
          {isZwischentest && (
            <span
              className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-rose-500 text-white border-rose-600"
              title="Statischer Zwischentest"
            >
              Zwischentest
            </span>
          )}
          {ampelStatus && (
            <AmpelBadge
              status={ampelStatus}
              exportReady={exportReady}
              contentApproved={istLernpaket ? undefined : contentApproved}
              onFix={
                istLernpaket
                  ? (onOpenLernpaket ? () => onOpenLernpaket(aufgabe) : undefined)
                  : (onOpenEditor && aufgabe ? () => onOpenEditor(aufgabe) : undefined)
              }
            />
          )}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove?.(refId); }}
              title="Aus Pfad entfernen"
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function LernpfadeSektor({
  sektor,
  index,
  totalSektoren,
  aufgabenById,
  systemBausteineById,
  readOnly,
  activeLernTyp,
  onPatch,
  onRemove,
  onMove,
  onRemoveAufgabe,
  onRemoveSystemItem,
  onRemoveBundle,
  onSetBundleConfig,
  onSetBundleModus,
  onAutoFillBundle,
  getIsDropDisabled,
  onSelectAufgabe,
  onSelectSystemBaustein,
  selectedAufgabeId,
  selectedSystemBausteinId,
  getAmpelStatusForItem,
  onOpenAufgabeEditor,
  onOpenLernpaket,
  themenfeldTitelById,
  driftStatus,
  onPreviewEinfuehrung,
  onPreviewQblock,
  }) {
  const items = Array.isArray(sektor.items) ? sektor.items : [];

  // Phase 2 (Logbuch §18): Hierarchisches Rendering.
  // Wir gruppieren die Items nach parent_instance_id, behalten aber die
  // Original-Indizes von sektor.items bei – die @hello-pangea/dnd-Engine
  // rechnet weiterhin gegen die flache Liste, sodass DnD bis Phase 3
  // unverändert funktioniert.
  const isBundleRefId = (refId) =>
    systemBausteineById?.get?.(refId)?.baustein_modus === 'bundle_1ton';
  const grouped = groupItemsByParent(items, isBundleRefId);

  // Phase 3: DnD-Index ist jetzt LOKAL pro Droppable.
  //   - Roots → Index innerhalb des Sektor-Droppables
  //   - Children → Index innerhalb des jeweiligen Bündel-Droppables
  // originalIndex (Position in sektor.items) wird weiterhin für die bestehenden
  // Remove-Callbacks gebraucht, damit die Cockpit-Logik unverändert bleibt.
  const renderItem = ({ item, originalIndex, children }, dndIndex, indent = false) => {
    if (item.type === ITEM_TYPE.SYSTEM) {
      // Bündel werden über onRemoveBundle (Cascade-Delete mit optionalem
      // Confirm-Modal) gelöscht, alle anderen System-Items über
      // onRemoveSystemItem (positions-genau, ohne Cascade).
      const baustein = systemBausteineById?.get(item.ref_id);
      const isBundle = baustein?.baustein_modus === 'bundle_1ton';
      const handleRemove = isBundle && onRemoveBundle
        ? () => onRemoveBundle(sektor.sektor_id, item.instance_id)
        : () => onRemoveSystemItem?.(sektor.sektor_id, originalIndex);
      return (
        <SystemBausteinPill
          key={`sys-${item.instance_id || originalIndex}-${item.ref_id}`}
          baustein={baustein}
          refId={item.ref_id}
          sektorId={sektor.sektor_id}
          index={dndIndex}
          instanceId={item.instance_id}
          indent={indent}
          isSelected={selectedSystemBausteinId === item.ref_id}
          disabled={readOnly}
          onSelect={onSelectSystemBaustein}
          onRemove={handleRemove}
          onPreview={
            item.ref_id === 'sys_sec0_overview' && onPreviewEinfuehrung
              ? onPreviewEinfuehrung
              : item.ref_id === 'sys_sec0_qblock' && onPreviewQblock
              ? onPreviewQblock
              : undefined
          }
          bundleConfig={item.bundle_config}
          bundleChildCount={Array.isArray(children) ? children.length : 0}
          onSetBundleConfig={
            onSetBundleConfig
              ? (val) => onSetBundleConfig(sektor.sektor_id, item.instance_id, val)
              : undefined
          }
          onSetBundleModus={
            onSetBundleModus
              ? (val) => onSetBundleModus(sektor.sektor_id, item.instance_id, val)
              : undefined
          }
        />
      );
    }
    const ctx = { aufgabenById };
    // Themenfeld-Mismatch-Hinweis: Nur in Arbeitsphase-Sektoren prüfen.
    // Wenn die Aufgabe einer anderen themenfeld_id zugeordnet ist als der
    // umgebende Sektor, zeigen wir am Pill ein dezentes "⚠ Anderes Themenfeld"-
    // Badge. Verbieten tun wir das Drop NICHT — Lehrkräfte wissen manchmal,
    // warum sie eine Aufgabe themenfeld-fremd platzieren.
    const aufgabeForBadge = aufgabenById?.get(item.ref_id);
    let fremdesThemenfeldTitel = null;
    if (
      aufgabeForBadge?.themenfeld_id &&
      sektor.sektor_typ === 'arbeitsphase_themenfeld' &&
      sektor.themenfeld_id &&
      aufgabeForBadge.themenfeld_id !== sektor.themenfeld_id
    ) {
      fremdesThemenfeldTitel =
        themenfeldTitelById?.get?.(aufgabeForBadge.themenfeld_id) || 'anderes Themenfeld';
    }
    return (
      <AufgabePill
        key={`auf-${item.instance_id || originalIndex}-${item.ref_id}`}
        aufgabe={aufgabenById?.get(item.ref_id)}
        refId={item.ref_id}
        sektorId={sektor.sektor_id}
        index={dndIndex}
        instanceId={item.instance_id}
        indent={indent}
        onRemove={onRemoveAufgabe}
        onSelect={onSelectAufgabe}
        isSelected={selectedAufgabeId === item.ref_id}
        disabled={readOnly}
        ampelStatus={getAmpelStatusForItem ? getAmpelStatusForItem(item) : undefined}
        exportReady={isExportFreigegeben(item, ctx)}
        contentApproved={isContentApproved(item, ctx)}
        onOpenEditor={onOpenAufgabeEditor}
        onOpenLernpaket={onOpenLernpaket}
        activeLernTyp={activeLernTyp}
        fremdesThemenfeldTitel={fremdesThemenfeldTitel}
      />
    );
  };

  // Sektor-Header (Phase E):
  //   - Statt „SEKTOR n" zeigen wir das Typ-Label („Onboarding", „Überblick" …).
  //   - Bei Arbeitsphase Themenfeld hängen wir den (live-gebundenen oder
  //     gelockten) Themenfeld-Titel als Suffix an: „Arbeitsphase · <Titel>".
  //   - Der Modus-Toggle (sequenziell/frei) ist auf Sektor-Ebene weggefallen
  //     (siehe Phase A des Epic „Semantische Sektoren") — Modus wandert ans
  //     Bündel.
  //   - Das Title-Input bleibt als Override (z. B. für Onboarding/Individuell).
  const typLabel = getSektorTypLabel(sektor.sektor_typ);
  const isArbeitsphase = sektor.sektor_typ === SEKTOR_TYP.ARBEITSPHASE;
  const themenfeldTitel = sektor.titel_snapshot || sektor.titel;
  const headerLabel = isArbeitsphase && themenfeldTitel
    ? `${typLabel} · ${themenfeldTitel}`
    : typLabel;

  return (
    <div
      data-sektor-id={sektor.sektor_id}
      className="rounded-lg border border-border bg-card/80 p-3 space-y-2 transition-shadow"
    >
      {/* Header — Sektor-Titel wird automatisch aus Einheit/Lerntyp/Typ
          abgeleitet und nicht mehr per Input editiert. Bei Arbeitsphasen
          steht der Themenfeld-Titel bereits im headerLabel. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide text-foreground bg-secondary px-2 py-0.5 rounded shrink-0"
          title={typLabel}
        >
          {headerLabel}
        </span>
        {/* Phase E.4: Drift-Badge — zeigt nur bei 'drifted' bzw. 'loading'
            etwas an. Bei clean/never_locked/unknown bleibt der Header ruhig. */}
        <SektorDriftBadge status={driftStatus} />
        <div className="flex-1" />
        {!readOnly && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove?.(sektor.sektor_id, -1)}
              disabled={index === 0}
              className="h-7 w-7 p-0"
              title="Sektor nach oben verschieben"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove?.(sektor.sektor_id, 1)}
              disabled={typeof totalSektoren === 'number' && index >= totalSektoren - 1}
              className="h-7 w-7 p-0"
              title="Sektor nach unten verschieben"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove?.(sektor.sektor_id)}
              className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Sektor löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Droppable Item-Liste */}
      <Droppable
        droppableId={`sektor-${sektor.sektor_id}`}
        type="LERNPFAD_ITEM"
        isDropDisabled={readOnly || (getIsDropDisabled?.(`sektor-${sektor.sektor_id}`) ?? false)}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[48px] rounded-md border border-dashed p-2 space-y-1.5 transition-colors ${
              snapshot.isDraggingOver
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30'
            }`}
          >
            {items.length === 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1 px-1">
                <Plus className="w-3 h-3" />
                Aufgaben oder Standard-Elemente hierher ziehen.
              </div>
            )}
            {grouped.map((entry) => {
              // Bündel: Header + eingerückte Kinder als FLACHE Geschwister im
              // selben Sektor-Droppable (keine verschachtelten Droppables mehr).
              // Die Bündel-Zugehörigkeit wird beim Drop aus der Position
              // abgeleitet (siehe useDashboardDragAndDrop).
              if (entry.children) {
                const bundleBaustein = systemBausteineById?.get(entry.item.ref_id);
                return (
                  <React.Fragment key={`bundle-${entry.item.instance_id || entry.originalIndex}`}>
                    {renderItem(entry, entry.originalIndex)}
                    {entry.children.map((child) =>
                      renderItem(child, child.originalIndex, true)
                    )}
                    {entry.children.length === 0 && (
                      <div className="ml-5 border-l-2 border-bundle/40 pl-3 py-0.5 space-y-1">
                        <div className="text-[10px] italic text-muted-foreground/70 py-0.5">
                          Bündel ist leer – passende Aufgaben hierher ziehen.
                        </div>
                        {!readOnly && onAutoFillBundle && (
                          <BundleAutoFillButton
                            onAutoFill={() =>
                              onAutoFillBundle(
                                sektor.sektor_id,
                                entry.item.instance_id,
                                bundleBaustein
                              )
                            }
                            disabled={readOnly}
                          />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              }
              // Reguläres Root-Item (Aufgabe oder Nicht-Bündel-System-Baustein).
              return renderItem(entry, entry.originalIndex);
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}