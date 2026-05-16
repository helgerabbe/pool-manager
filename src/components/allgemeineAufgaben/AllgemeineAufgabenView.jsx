import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getThemenfelderByEinheit } from '@/services/ThemenfeldService';
import { getEinheitById } from '@/services/EinheitenService';
import { getAllLernpakete } from '@/services/LernpaketService';
import { getAllLernziele } from '@/services/LernzielService';
import { getAufgabenByEinheit, getMappingsByAufgabe, deleteAllgemeineAufgabe, lockTask, unlockTask, createAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { getAllBasisLernziele, getAllBasismodule } from '@/services/BasisLernzielService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Plus, Star, FileText, ChevronRight, Edit, Trash2, CheckCircle2, PenLine, Lock, Wand2, Lightbulb, Image as ImageIcon, Package, Tag, Folder, FileType2 } from 'lucide-react';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';
import TaskStatusBadge from '@/components/ui/TaskStatusBadge';
import TaskLockBar from '@/components/ui/TaskLockBar';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';
import AufgabenTypPicker from '@/components/allgemeineAufgaben/AufgabenTypPicker';
import AufgabeKompetenzMapping from '@/components/allgemeineAufgaben/AufgabeKompetenzMapping';
import AITutorPromptPanel from '@/components/allgemeineAufgaben/AITutorPromptPanel';
import InlineBasisLernzielSelector from '@/components/allgemeineAufgaben/InlineBasisLernzielSelector';
import PublishAllgemeineAufgabeButton from '@/components/allgemeineAufgaben/PublishAllgemeineAufgabeButton';
import { AufgabeExportStatusInline } from '@/components/allgemeineAufgaben/AufgabeExportStatusRow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ErwartungshorizontTab from '@/components/allgemeineAufgaben/ErwartungshorizontTab';
import { useTaskLock } from '@/hooks/useLocks';
import { base44 } from '@/api/base44Client';
import AiTaskWizardModal from '@/components/ui/AiTaskWizardModal';
import ThemenfeldIdeenModal from '@/components/missionen/ThemenfeldIdeenModal';
import HelpBadge from '@/components/ui/HelpBadge';
import MissionBadge from '@/components/missionen/MissionBadge';
import MissionStripe from '@/components/missionen/MissionStripe';
import MissionFilterSelect, { FILTER_ALL, FILTER_NONE } from '@/components/missionen/MissionFilterSelect';
import { isMissionApplicable, getMission } from '@/lib/missionen';

/**
 * Schwierigkeitsgrad-Anzeige (1-3 Sterne)
 */
function SternDisplay({ grad }) {
  const count = grad === 1 ? 1 : grad === 2 ? 2 : grad === 3 ? 3 : 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          className={cn('w-3 h-3', n <= count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
        />
      ))}
    </div>
  );
}

/**
 * Baumstruktur-Node für Themenfeld
 */
function ThemenfeldNode({ themenfeld, aufgaben, selectedId, onSelect }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className={cn('w-4 h-4 transition-transform shrink-0', isOpen && 'rotate-90')} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
          {themenfeld.titel}
        </span>
        <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
          {aufgaben.length}
        </Badge>
      </button>

      {isOpen && (
        <div className="pl-4 space-y-0.5">
          {aufgaben.map(aufgabe => (
            <AufgabeNode
              key={aufgabe.id}
              aufgabe={aufgabe}
              isSelected={selectedId === aufgabe.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Einzelner Aufgaben-Node im Baum.
 *
 * Kompakte einzeilige Karte: Status-Icon · Titel · ggf. Lock-Icon.
 * Mission wird über die Hintergrundfarbe der Karte signalisiert
 * (gleiche Farbpalette wie das Detail-Badge), damit kein zusätzliches
 * Mission-Badge nötig ist und die Sidebar bei vielen Aufgaben übersichtlich
 * bleibt. Tooltip am ganzen Eintrag erklärt Status + Mission im Klartext.
 */
function AufgabeNode({ aufgabe, isSelected, onSelect }) {
  const hatTitel = !!aufgabe.titel?.trim();
  const isPending = aufgabe.sync_status === 'pending';
  const isApproved = aufgabe.content_status === 'approved';
  const showMission = isMissionApplicable(aufgabe);
  const mission = showMission ? getMission(aufgabe.mission_type) : null;

  // Mission-Farbe als Karten-Hintergrund. Fällt auf neutrale Optik zurück,
  // wenn die Aufgabe (noch) keine Mission hat oder der Mission-Scope nicht
  // greift. Im selektierten Zustand übersteuert Primary-Tinting die Farbe,
  // damit die Auswahl klar erkennbar bleibt.
  const baseBg = mission
    ? mission.classes.badge // bg-*-50 text-*-800 border-*-200
    : 'bg-muted/40 text-foreground border-transparent';

  const statusIcon = isApproved
    ? <Lock className="w-3 h-3 text-green-600 shrink-0" />
    : <PenLine className="w-3 h-3 text-amber-500 shrink-0" />;

  const tooltipParts = [
    isApproved ? 'Freigegeben' : 'In Bearbeitung',
    mission ? `Mission: ${mission.label}` : null,
    isPending ? 'Wartet auf Export' : null,
  ].filter(Boolean).join(' · ');

  return (
    <button
      onClick={() => onSelect(aufgabe)}
      title={tooltipParts}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1 rounded border text-left text-xs transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
          : cn(baseBg, 'hover:brightness-95')
      )}
    >
      {statusIcon}
      <span className={cn('truncate flex-1', !hatTitel && 'italic opacity-70')}>
        {hatTitel ? aufgabe.titel : 'Kein Titel'}
      </span>
      {!isApproved && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
          Entwurf
        </span>
      )}
      {isPending && <Lock className="w-3 h-3 text-orange-500 shrink-0" />}
    </button>
  );
}

/**
 * Detail-Panel: Allgemeine Angaben (Tab 1)
 */
function AllgemeineAngabenPanel({ aufgabe, themenfelder, kannBearbeiten, onEdit, onDelete }) {
  const hatTitel = !!aufgabe.titel?.trim();
  const showMission = isMissionApplicable(aufgabe);
  const themenfeld = themenfelder.find((tf) => tf.id === aufgabe.themenfeld_id);
  const typMeta = getAufgabenTyp(aufgabe.aufgaben_typ);
  const TypIcon = typMeta.icon;
  const hatBild = !!aufgabe.aufgaben_bild_url;
  const materialienCount = Array.isArray(aufgabe.materialien) ? aufgabe.materialien.length : 0;
  const hatMaterialHinweise = !!aufgabe.hinweise_zum_material?.trim();
  const isApproved = aufgabe.content_status === 'approved';

  // Tooltip-Text für das Schwierigkeits-Badge (1-3 Sterne).
  const schwierigkeitTooltip = aufgabe.schwierigkeitsgrad
    ? `Schwierigkeit: ${aufgabe.schwierigkeitsgrad} von 3 Sternen`
    : 'Schwierigkeit ist noch nicht definiert.';

  return (
    <TooltipProvider>
    <div className="space-y-3 p-4">

      {/* ── Zeile 1: Status-Header ──
          Links das Themenfeld (Wo gehört die Aufgabe hin?), rechtsbündig
          die Zustands-Badges: Freigabe-Status + Moodle/Brian-Export.
          Alle Badges teilen die gleiche Pillen-Optik. */}
      <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 min-w-0">
          <Folder className="w-3.5 h-3.5 shrink-0" />
          <span className={cn('truncate', !themenfeld && 'italic')}>
            {themenfeld?.titel || 'Ohne Themenfeld'}
          </span>
        </span>
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <span className={cn(
            'inline-flex items-center gap-1 h-5 px-2 rounded-full border text-[11px] font-semibold',
            isApproved
              ? 'bg-green-100 text-green-700 border-green-300'
              : 'bg-amber-100 text-amber-700 border-amber-300'
          )}>
            {isApproved
              ? <><CheckCircle2 className="w-3 h-3" /> Freigegeben</>
              : <><PenLine className="w-3 h-3" /> In Bearbeitung</>
            }
          </span>
          <AufgabeExportStatusInline aufgabe={aufgabe} />
        </div>
      </div>

      {/* ── Zeile 2: Titel ── */}
      <h2 className={cn(
        'text-base font-semibold leading-snug',
        !hatTitel && 'italic text-muted-foreground font-normal'
      )}>
        {hatTitel ? aufgabe.titel : 'Kein Titel vergeben'}
      </h2>

      {/* ── Zeile 3: Didaktische Klassifikation ──
          Drei gleich hohe Badges (Aufgabentyp · Mission · Schwierigkeit).
          Jedes hat einen Tooltip mit Klartext-Erklärung. */}
      <div className="flex items-center gap-1.5 flex-wrap -mt-1">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center gap-1 h-5 px-2 rounded-full border text-[11px] font-semibold cursor-help',
                typMeta.color.bg, typMeta.color.text, typMeta.color.border
              )}
            >
              <TypIcon className="w-3 h-3" />
              {typMeta.label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-left leading-snug">
            {typMeta.description}
          </TooltipContent>
        </Tooltip>

        {showMission && (
          <MissionBadge missionId={aufgabe.mission_type} size="sm" showFallback />
        )}

        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full border border-amber-200 bg-amber-50 cursor-help">
              <SternDisplay grad={aufgabe.schwierigkeitsgrad || 0} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-left leading-snug">
            {schwierigkeitTooltip}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Aufgabenstellung */}
      <div className="pt-1">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Aufgabenstellung</p>
        <div className="p-3 rounded-lg bg-muted/20 border border-border text-sm whitespace-pre-wrap">
          {aufgabe.aufgabenstellung || <span className="text-muted-foreground italic">Nicht vorhanden</span>}
        </div>
      </div>

      {/* Aufgaben-Bild (kompakter) */}
      {hatBild && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" />
            Aufgaben-Bild
          </p>
          <img
            src={aufgabe.aufgaben_bild_url}
            alt="Aufgaben-Bild"
            className="max-h-48 rounded-lg border border-border object-contain bg-muted/20"
          />
        </div>
      )}

      {/* Erwartetes Ergebnis: Inline-Zeile mit explizitem "nicht definiert" */}
      <div className="flex items-start gap-x-4 gap-y-1 flex-wrap text-xs px-3 py-2 rounded-lg bg-muted/20 border border-border">
        <span className="inline-flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Ergebnisform:</span>
          <span className={cn('font-medium', !aufgabe.ergebnis_form && 'italic text-muted-foreground font-normal')}>
            {aufgabe.ergebnis_form || 'nicht definiert'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileType2 className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Dateiformat:</span>
          <span className={cn('font-medium', !aufgabe.ergebnis_dateiformat && 'italic text-muted-foreground font-normal')}>
            {aufgabe.ergebnis_dateiformat || 'nicht definiert'}
          </span>
        </span>
      </div>

      {/* Material-Hinweise (nur bei Handlungsaufgaben) */}
      {hatMaterialHinweise && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1.5">
            <Package className="w-3 h-3" />
            Hinweise zum physischen Material
          </p>
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 whitespace-pre-wrap">
            {aufgabe.hinweise_zum_material}
          </div>
        </div>
      )}

      {/* Zusätzliche Materialien — Status-Zeile, expandiert nur bei Vorhandensein */}
      {materialienCount > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1.5">
            <Package className="w-3 h-3" />
            Zusätzliche Materialien ({materialienCount})
          </p>
          <div className="space-y-2">
            {aufgabe.materialien.map((mat, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-muted/20 border border-border text-xs">
                {mat.type === 'image' && mat.url && (
                  <img src={mat.url} alt={mat.label || 'Bild'} className="max-h-40 rounded border border-border object-contain mb-2" />
                )}
                {mat.type === 'pdf' && mat.url && (
                  <iframe src={mat.url} className="w-full h-48 rounded border border-border mb-2" title={mat.label || 'PDF'} />
                )}
                <p className="font-medium mb-0.5">
                  {mat.type === 'freitext' && '📝'} {mat.type === 'pdf' && !mat.url && '📄'} {mat.type === 'image' && !mat.url && '🖼️'} {mat.type === 'book_ref' && '📚'}
                  {' '}{mat.label || mat.content || (mat.type === 'image' || mat.type === 'pdf' ? '' : mat.url) || '…'}
                </p>
                {mat.content && <p className="text-muted-foreground line-clamp-2">{mat.content}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic px-3 py-1.5 rounded-lg bg-muted/10 border border-dashed border-border">
          <Package className="w-3 h-3" />
          Keine zusätzlichen Materialien hochgeladen
        </div>
      )}

      {/* Aktionen */}
      {kannBearbeiten && (
        <div className="flex gap-2 pt-3 border-t border-border flex-wrap">
          {aufgabe.sync_status === 'pending' ? (
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 flex items-center gap-1">
              🔒 Im Export – schreibgeschützt bis Moodle-Upload bestätigt
            </p>
          ) : isApproved ? (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
              🔒 Freigegeben – Freigabe aufheben um zu bearbeiten
            </p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(aufgabe)}
              disabled={aufgabe.sync_status === 'pending'}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </Button>
          )}
          <PublishAllgemeineAufgabeButton
            aufgabe={aufgabe}
            kannBearbeiten={kannBearbeiten}
          />
          {!isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(aufgabe.id)}
              disabled={aufgabe.sync_status === 'pending'}
              className="gap-2 text-destructive hover:text-destructive ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </Button>
          )}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

/**
 * Haupt-View für "Allgemeine Aufgaben"
 */
export default function AllgemeineAufgabenView({
  einheitId,
  kannBearbeiten = false,
  anforderungsebene = '2 - Transfer',
}) {
  const queryClient = useQueryClient();
  const [selectedAufgabeId, setSelectedAufgabeId] = useState(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingAufgabe, setEditingAufgabe] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [ideenboxOpen, setIdeenboxOpen] = useState(false);
  // Phase-1 Lernpfad-Architekt: Picker für Aufgaben-Typ vor dem Editor (nur in Ebene 2).
  const [typPickerOpen, setTypPickerOpen] = useState(false);
  const [pendingAufgabenTyp, setPendingAufgabenTyp] = useState('inhalt');
  const isEbene3 = anforderungsebene === '3 - Projekt';
  // Mission-Filter für die Sidebar (nur in Ebene 2 sinnvoll). FILTER_ALL = alle.
  const [missionFilter, setMissionFilter] = useState(FILTER_ALL);

  // Aktuellen Nutzer laden
  React.useEffect(() => {
    base44.auth.me().then(u => setCurrentUserEmail(u?.email ?? null)).catch(() => {});
  }, []);

  // Daten abrufen
  const { data: einheit } = useQuery({
    queryKey: ['einheiten', einheitId],
    queryFn: () => getEinheitById(einheitId),
  });

  const { data: allAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => getAufgabenByEinheit(einheitId),
  });

  // Filtere Aufgaben nach der übergebenen Anforderungsebene
  const allgemeineAufgaben = allAufgaben.filter(a => 
    a.anforderungsebene === anforderungsebene || (!a.anforderungsebene && anforderungsebene === '2 - Transfer')
  );

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => getThemenfelderByEinheit(einheitId),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => getAllLernpakete(),
  });

  const { data: mappedLernziele = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings', selectedAufgabeId],
    queryFn: () => selectedAufgabeId ? getMappingsByAufgabe(selectedAufgabeId) : Promise.resolve([]),
    enabled: !!selectedAufgabeId,
  });

  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => getAllLernziele(),
  });

  const { data: mappedBasisLernziele = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings', selectedAufgabeId],
    queryFn: () => selectedAufgabeId ? getMappingsByAufgabe(selectedAufgabeId) : Promise.resolve([]),
    enabled: !!selectedAufgabeId,
  });

  const { data: basisLernziele = [] } = useQuery({
    queryKey: ['basisLernziele'],
    queryFn: () => getAllBasisLernziele(),
  });

  const { data: basismodule = [] } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => getAllBasismodule(),
  });

  // Effektive Basis-Lernziele aus Mappings
  const effectiveMappedBasisLernziele = useMemo(() => {
    if (!selectedAufgabeId || mappedBasisLernziele.length === 0) return [];
    return mappedBasisLernziele
      .map((m) => basisLernziele.find((lz) => lz.id === m.basislernziel_id))
      .filter(Boolean);
  }, [selectedAufgabeId, mappedBasisLernziele, basisLernziele]);

  // Memoized: Gefilterte Lernziele basierend auf aktueller Mapping-Query
  const effectiveMappedLernziele = useMemo(() => {
    if (!selectedAufgabeId || mappedLernziele.length === 0) return [];
    return mappedLernziele
      .map((m) => alleLernziele.find((lz) => lz.id === m.lernziel_id))
      .filter(Boolean);
  }, [selectedAufgabeId, mappedLernziele, alleLernziele]);

  // Delete-Mutation
  const deleteAufgabe = useMutation({
    mutationFn: (id) => deleteAllgemeineAufgabe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setSelectedAufgabeId(null);
    },
  });

  // Lock-Hook
  const lock = useTaskLock({
    aufgabe: allgemeineAufgaben.find(a => a.id === selectedAufgabeId),
    userEmail: currentUserEmail,
    lockFn: lockTask,
    unlockFn: unlockTask,
    invalidateKeys: [['allgemeineAufgaben', einheitId]],
  });

  // Mission-Counts für die Filter-Chips (Anzahl-Badges).
  // Wird über die UNGEFILTERTE Liste berechnet, damit die Zahlen stabil bleiben,
  // egal welcher Filter gerade aktiv ist.
  const missionCounts = useMemo(() => {
    const counts = { all: 0, none: 0 };
    allgemeineAufgaben.forEach((a) => {
      if (!isMissionApplicable(a)) return;
      counts.all += 1;
      if (!a.mission_type) {
        counts.none += 1;
        return;
      }
      counts[a.mission_type] = (counts[a.mission_type] || 0) + 1;
    });
    return counts;
  }, [allgemeineAufgaben]);

  const handleSaveIdee = async (idea) => {
    const materialHinweis = idea.required_materials
      ? `Materialaufwand: ${idea.required_materials}`
      : '';

    await createAllgemeineAufgabe({
      einheit_id: einheitId,
      anforderungsebene,
      aufgaben_typ: 'inhalt',
      themenfeld_id: idea.themenfeld_id || null,
      titel: idea.titel,
      aufgabenstellung: idea.aufgabenstellung,
      mission_type: anforderungsebene === '3 - Projekt' ? null : (idea.mission_type || null),
      schwierigkeitsgrad: idea.schwierigkeitsgrad || null,
      hinweise_zum_material: materialHinweis,
      erwartungshorizont: idea.didaktischer_hinweis
        ? `Ideen-Notiz der KI: ${idea.didaktischer_hinweis}`
        : null,
      content_status: 'draft',
      sync_status: 'new',
    });
    queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheitId] });
  };

  // Aufgaben nach Mission-Filter einschränken (vor der Themenfeld-Gruppierung).
  const aufgabenNachFilter = useMemo(() => {
    if (missionFilter === FILTER_ALL) return allgemeineAufgaben;
    if (missionFilter === FILTER_NONE) {
      return allgemeineAufgaben.filter((a) => isMissionApplicable(a) && !a.mission_type);
    }
    return allgemeineAufgaben.filter((a) => a.mission_type === missionFilter);
  }, [allgemeineAufgaben, missionFilter]);

  // Gruppierung nach Themenfeld
  const gruppiertNachThemenfeld = useMemo(() => {
    const gruppen = {};

    // Themenfeld-Gruppen vorinitialisieren
    themenfelder.forEach(tf => {
      gruppen[tf.id] = { titel: tf.titel, aufgaben: [], themenfeld: tf };
    });

    // Ohne Themenfeld
    gruppen['_none'] = { titel: 'Ohne Themenfeld', aufgaben: [], themenfeld: null };

    // Aufgaben verteilen (auf der gefilterten Liste)
    aufgabenNachFilter.forEach(aufgabe => {
      const key = aufgabe.themenfeld_id || '_none';
      if (gruppen[key]) {
        gruppen[key].aufgaben.push(aufgabe);
      }
    });

    return Object.values(gruppen).filter(g => g.aufgaben.length > 0);
  }, [aufgabenNachFilter, themenfelder]);

  const selectedAufgabe = allgemeineAufgaben.find(a => a.id === selectedAufgabeId);

  return (
    <div className="flex flex-col flex-1 h-full bg-background overflow-hidden">
      {/* Two-Column Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        {/* Linke Spalte: Sidebar mit Baumstruktur */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-card/50 flex flex-col shrink-0 lg:shrink-0 overflow-hidden max-h-64 lg:max-h-full h-full lg:h-auto min-h-0">
          {/* Button für neue Aufgabe */}
          {kannBearbeiten && (
            <div className="shrink-0 px-4 py-3 border-b border-border space-y-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditingAufgabe(null);
                  if (isEbene3) {
                    // Ebene 3: Picker überspringen, Typ zwingend 'inhalt'.
                    setPendingAufgabenTyp('inhalt');
                    setCreateFormOpen(true);
                  } else {
                    // Ebene 2: 4-Kacheln-Picker vorschalten.
                    setTypPickerOpen(true);
                  }
                }}
                className="gap-2 w-full"
              >
                <Plus className="w-4 h-4" />
                Neue Aufgabe
              </Button>
              {!isEbene3 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIdeenboxOpen(true)}
                  className="gap-2 w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-slate-950"
                >
                  <Lightbulb className="w-4 h-4" />
                  KI-Ideenbox öffnen
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWizardOpen(true)}
                className="gap-2 w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-slate-950"
              >
                <Wand2 className="w-4 h-4" />
                Mit KI entwerfen
              </Button>
            </div>
          )}

          {/* Mission-Filter (nur sinnvoll in Ebene 2 — in Ebene 3 ausgeblendet,
              weil Projekte keine Mission haben). Kompaktes Dropdown, damit die
              Sidebar in der Höhe nicht überläuft. */}
          {!isEbene3 && allgemeineAufgaben.length > 0 && (
            <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/30">
              <MissionFilterSelect
                value={missionFilter}
                onChange={setMissionFilter}
                counts={missionCounts}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {allgemeineAufgaben.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Noch keine Aufgaben
              </p>
            ) : aufgabenNachFilter.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Keine Aufgaben mit diesem Filter.
              </p>
            ) : (
              gruppiertNachThemenfeld.map(gruppe => (
                <ThemenfeldNode
                  key={gruppe.titel}
                  themenfeld={gruppe.themenfeld || { id: '_none', titel: gruppe.titel }}
                  aufgaben={gruppe.aufgaben}
                  selectedId={selectedAufgabeId}
                  onSelect={(a) => setSelectedAufgabeId(a.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Rechte Spalte: Detail-Panel */}
        {selectedAufgabe ? (
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Lock-Bar */}
            {kannBearbeiten && (
              <TaskLockBar
                isEditMode={lock.isEditMode}
                isLocking={lock.isLocking}
                isLockedByOther={lock.isLockedByOther}
                lockedByEmail={lock.lockedByEmail}
                onEdit={lock.enterEditMode}
                onCancel={lock.exitEditMode}
                editButtonLabel="In den Bearbeitungsmodus wechseln"
              />
            )}

            {/* Tabs für Angaben & Kompetenzen */}
            <Tabs defaultValue="angaben" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 bg-muted">
                <TabsTrigger value="angaben" className="text-xs">Kernangaben</TabsTrigger>
                <TabsTrigger value="kompetenzen" className="text-xs flex items-center gap-1">
                  Kompetenzzuordnung
                  <HelpBadge text="Verknüpfe Lernziele per Drag & Drop mit dieser Aufgabe. Der KI-Tutor nutzt sie für gezieltes Feedback." docsSlug="lernziele" />
                </TabsTrigger>
                <TabsTrigger value="erwartungshorizont" className="text-xs flex items-center gap-1">
                  Erwartungshorizont
                  <HelpBadge text="Beschreibt, welche Inhalte eine gute Schülerantwort aufweisen soll. Wird vom KI-Tutor als Leitplanke verwendet." docsSlug="ebene-2-allgemeine-aufgaben" />
                </TabsTrigger>
                <TabsTrigger value="ki-prompt" className="text-xs flex items-center gap-1">
                  KI-Tutor Prompt
                  <HelpBadge text="Die 5 Segmente, die Brian.study benötigt. Per Klick auf 'Alle Felder generieren' vollautomatisch erstellt." docsSlug="ki-tutor-brian" />
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Kernangaben */}
              <TabsContent value="angaben" className="flex-1 overflow-y-auto m-0">
                <AllgemeineAngabenPanel
                  aufgabe={selectedAufgabe}
                  themenfelder={themenfelder}
                  kannBearbeiten={kannBearbeiten && lock.isEditMode}
                  onEdit={(a) => {
                    setEditingAufgabe(a);
                    setCreateFormOpen(true);
                  }}
                  onDelete={(id) => deleteAufgabe.mutate(id)}
                />
              </TabsContent>

              {/* Tab 2: Kompetenzzuordnung */}
              <TabsContent value="kompetenzen" className="flex-1 overflow-hidden m-0">
               <AufgabeKompetenzMapping
                 aufgabe={selectedAufgabe}
                 einheit={einheit}
                 einheitId={einheitId}
                 kannBearbeiten={kannBearbeiten && lock.isEditMode}
                 onComplete={() => {}}
               />
              </TabsContent>

              {/* Tab 3: Erwartungshorizont */}
              <TabsContent value="erwartungshorizont" className="flex-1 overflow-hidden m-0">
                <ErwartungshorizontTab
                  aufgabe={selectedAufgabe}
                  einheit={einheit}
                  mappedLernziele={effectiveMappedLernziele}
                  mappedBasisLernziele={effectiveMappedBasisLernziele}
                  kannBearbeiten={kannBearbeiten && lock.isEditMode}
                />
              </TabsContent>

              {/* Tab 4: KI-Tutor Prompt */}
              <TabsContent value="ki-prompt" className="flex-1 overflow-y-auto m-0">
                <AITutorPromptPanel
                  aufgabe={selectedAufgabe}
                  mappedLernziele={effectiveMappedLernziele}
                  mappedBasisLernziele={effectiveMappedBasisLernziele}
                  lernpakete={lernpakete}
                  basismodule={basismodule}
                  einheit={einheit}
                  kannBearbeiten={kannBearbeiten && lock.isEditMode}
                />
              </TabsContent>
              </Tabs>
          </main>
        ) : (
          <main className="flex-1 flex items-center justify-center text-center">
            <div>
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Wählen Sie eine Aufgabe aus, um Details zu sehen
              </p>
            </div>
          </main>
        )}
      </div>

      <ThemenfeldIdeenModal
        open={ideenboxOpen}
        onOpenChange={setIdeenboxOpen}
        einheitId={einheitId}
        themenfelder={themenfelder}
        anforderungsebene={anforderungsebene}
        onSaveIdea={handleSaveIdee}
      />

      {/* KI-Wizard – erstellt immer Inhalts-Aktivitäten (aufgaben_typ='inhalt'). */}
      <AiTaskWizardModal
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        taskType={anforderungsebene === '3 - Projekt' ? 'Projektaufgabe' : 'Allgemeine Aufgabe (Transfer)'}
        onSave={async ({ titel, aufgabenstellung, ki_kompetenz_tags, mission_type }) => {
          await createAllgemeineAufgabe({
            einheit_id: einheitId,
            anforderungsebene,
            aufgaben_typ: 'inhalt',
            titel,
            aufgabenstellung,
            ki_kompetenz_tags,
            // Mission nur für Ebene 2 sinnvoll — bei Ebene 3 (Projekt) wird das
            // Feld vom Schema ohnehin nicht gepflegt.
            mission_type: anforderungsebene === '3 - Projekt' ? null : (mission_type || null),
          });
          queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheitId] });
        }}
      />

      {/* Aufgaben-Typ-Picker (nur in Ebene 2) */}
      <AufgabenTypPicker
        open={typPickerOpen}
        onOpenChange={setTypPickerOpen}
        onSelect={(typ) => {
          setPendingAufgabenTyp(typ);
          setCreateFormOpen(true);
        }}
      />

      {/* Create/Edit Dialog */}
      <AufgabeCreateView
        open={createFormOpen}
        onOpenChange={setCreateFormOpen}
        einheitId={einheitId}
        themenfelder={themenfelder}
        initialData={editingAufgabe}
        defaultAnforderungsebene={anforderungsebene}
        defaultAufgabenTyp={pendingAufgabenTyp}
        onSuccess={() => {
          setCreateFormOpen(false);
          setEditingAufgabe(null);
          setPendingAufgabenTyp('inhalt');
          queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
        }}
      />
    </div>
  );
}