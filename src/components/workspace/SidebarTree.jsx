import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, BookOpen, Layers, Puzzle, Lock, Edit, UserRound, FolderOpen, PenLine, Check } from 'lucide-react';
import {
  getLernpaketStatus,
  getEinheitFortschritt,
  isPaketLocked,
} from '@/lib/statusLogic';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const AMPEL = {
  green:  { dot: 'bg-green-500',  ring: 'ring-green-200',  label: 'Vollständig' },
  red:    { dot: 'bg-red-500',    ring: 'ring-red-200',    label: 'Unvollständig' },
};

function AmpelDot({ status, size = 'sm' }) {
  const cfg = AMPEL[status];
  if (!cfg) return null;
  const dim = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  return (
    <span
      title={cfg.label}
      className={`inline-block shrink-0 rounded-full ring-2 ${dim} ${cfg.dot} ${cfg.ring}`}
    />
  );
}

// Vollständigkeit einer MasterAufgabe bestimmen:
// 1. DB-Wert is_complete hat Vorrang (wenn gesetzt)
// 2. Fallback: live aus field_values berechnen
function computeMasterComplete(master, catalogName = '') {
  // DB-Wert ist die primäre Quelle der Wahrheit
  if (master.is_complete === true) return true;
  if (master.is_complete === false) return false;

  // Fallback: live aus field_values berechnen (für frisch erstellte Masters ohne DB-Wert)
  const fv = master.field_values || {};
  const name = catalogName.toLowerCase();

  if (name.includes('lückentext') || name.includes('lueckentext') || name.includes('cloze')) {
    const lt = fv.lueckentext;
    if (!lt) return false;
    if (typeof lt === 'object' && lt.text) {
      const gaps = Array.isArray(lt.gaps) ? lt.gaps : [];
      return String(lt.text).trim() !== '' && gaps.filter(g => g && g.correct && String(g.correct).trim() !== '').length >= 1;
    }
    if (typeof lt === 'string') return lt.trim().length > 10;
    return false;
  }
  if (name.includes('begriffe zuordnen') || name.includes('zuordnen') || name.includes('match')) {
    return (Array.isArray(fv.pairs) ? fv.pairs : []).filter(p => p && String(p.left || '').trim() && String(p.right || '').trim()).length >= 3;
  }
  if (name.includes('reihenfolge') || name.includes('sortierung') || name.includes('sorting')) {
    return (Array.isArray(fv.orderedItems) ? fv.orderedItems : []).filter(i => String(i || '').trim() !== '').length >= 2;
  }
  if (name.includes('quiz')) {
    return (Array.isArray(fv.questions) ? fv.questions : []).length >= 1;
  }
  if (name.includes('test')) {
    return (Array.isArray(fv.questions) ? fv.questions : []).some(q => {
      if (!q || String(q.question || q.text || '').trim() === '') return false;
      if (q.type === 'solution_word' || q.type === 'text') return String(q.expectedAnswer || q.antwort || '').trim() !== '';
      if (q.type === 'true_false') return typeof q.correctAnswer === 'boolean';
      const answers = Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
      return answers.some(a => (a?.isCorrect === true || a?.correct === true) && String(a.text || '').trim() !== '');
    });
  }
  if (name.includes('bildbeschriftung') || name.includes('image labeling')) {
    return !!(fv.backgroundImage && Array.isArray(fv.dropZones) && fv.dropZones.length >= 1);
  }
  if (name.includes('ki-tutor')) {
    return !!(fv.aufgabenstellung && String(fv.aufgabenstellung).trim() !== '');
  }
  return Object.values(fv).some(v => {
    if (!v) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

function computeActivityCompleteForTree(activity, catalogName = '', masterAufgabenList = [], supportsMaster = false) {
  if (activity.content_status === 'approved') return true;

  const isKiBriefed =
    activity.erstellungs_modus === 'ki' &&
    !!activity.ki_briefing &&
    typeof activity.ki_briefing === 'object' &&
    Object.keys(activity.ki_briefing).length > 0;

  if (isKiBriefed && activity.is_complete === true) return true;

  if (supportsMaster && masterAufgabenList.length > 0 && activity.erstellungs_modus !== 'ki') {
    return masterAufgabenList.every(m => computeMasterComplete(m, catalogName));
  }

  return activity.is_complete === true;
}

function AktivitaetSubNode({ activity, aktivitaetName, catalogName = '', isSelected, onSelect, paketId, masterAufgabenList = [], supportsMaster = false }) {
  const masterAufgabenCount = masterAufgabenList.length;
  const isReleased = activity.content_status === 'approved';
  const isKiBriefed =
    activity.erstellungs_modus === 'ki' &&
    !!activity.ki_briefing &&
    typeof activity.ki_briefing === 'object' &&
    Object.keys(activity.ki_briefing).length > 0;

  // Live-Berechnung der Master-Vollständigkeit aus field_values
  const showMasterStatus = supportsMaster && masterAufgabenCount > 0 && activity.erstellungs_modus !== 'ki';
  const masterCompleteStates = masterAufgabenList.map(m => computeMasterComplete(m, catalogName));
  const allMastersComplete = masterAufgabenCount === 0 || masterCompleteStates.every(Boolean);

  // Aktivität gilt im Menübaum live als vollständig, sobald die sichtbaren Inhalte vollständig sind.
  const showAsComplete = computeActivityCompleteForTree(activity, catalogName, masterAufgabenList, supportsMaster);

  const textColor = showAsComplete ? 'text-green-600' : 'text-orange-600';

  return (
    <div className={cn(
      'w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-md text-left',
    )}>
      <div className={cn('flex items-center gap-2 text-[11px]', textColor)}>
        <Puzzle className="w-3 h-3 shrink-0" />
        <span className="truncate flex-1">{aktivitaetName}</span>
        {isReleased && (
          <Lock
            className="w-3 h-3 shrink-0 text-green-600"
            title="Aktivität ist freigegeben und gesperrt"
          />
        )}
      </div>
      {/* MasterAufgaben als Sub-Items – is_complete aus DB als primäre Quelle,
          Fallback auf live-Berechnung aus field_values */}
      {showMasterStatus && (
        <div className="ml-5 space-y-0.5">
          {masterAufgabenList.map((master, idx) => {
            const isComplete = computeMasterComplete(master, catalogName);
            const isApproved = master.content_status === 'approved';
            return (
              <div key={master.id} className={cn(
                'flex items-center gap-1.5 text-[10px]',
                isApproved ? 'text-green-600' : isComplete ? 'text-green-600' : 'text-orange-500'
              )}>
                {isApproved ? (
                  <Lock className="w-2.5 h-2.5 shrink-0 text-green-600" title="Freigegeben und gesperrt" />
                ) : (
                  <span className="w-2 h-2 rounded-full shrink-0 mt-px" style={{ background: isComplete ? '#16a34a' : '#f97316' }} />
                )}
                <span className="truncate">{master.titel || `Master ${idx + 1}`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PHASES = [
  { key: 'Input', label: 'Input (Erarbeitung)' },
  { key: 'Übung', label: 'Übung' },
  { key: 'Abschluss', label: 'Abschluss' },
];

function PhaseNode({ phase, phaseLabel, paket, selectedId, onSelect, paketPhaseActivities, aktivitaetenMap, masterAufgabenMap = {}, aktivitaetSupportsMasterMap = {} }) {
  const [open, setOpen] = useState(false);

  // Phasen, die im Lernpaket-Editor explizit deaktiviert wurden, sollen
  // weder im Sidebar-Tree erscheinen noch beim Roll-up zählen.
  // Hinweis: Early-Return MUSS nach allen Hook-Calls erfolgen, sonst
  // verletzt das die Rules of Hooks.
  const phaseConfig = paket?.phasen_konfiguration?.[phase] || {};
  if (phaseConfig.disabled === true) return null;

  const activities = paketPhaseActivities.filter(a => a.phase === phase);

  // Einheitliche Count-Pille: grau=leer, grün=alle sichtbar vollständigen Aktivitäten, gelb=teilweise
  const completeCount = activities.filter(a => computeActivityCompleteForTree(
    a,
    aktivitaetenMap[a.aktivitaet_id] || '',
    masterAufgabenMap[a.id] || [],
    aktivitaetSupportsMasterMap[a.aktivitaet_id] || false
  )).length;
  const total = activities.length;
  const countPillClass =
    total === 0 ? 'bg-slate-200 text-slate-700'
    : completeCount === total ? 'bg-green-500 text-white'
    : 'bg-amber-400 text-white';

  // UX-Verbesserung 2026-05-14: Phase-Zeile ist jetzt klickbar und öffnet/
  // schließt den Baum. Das Chevron-Icon bleibt visuell, der Klick wird aber
  // von der gesamten Zeile getragen — vorher musste man pixelgenau auf den
  // kleinen Pfeil treffen, was umständlich war. Es gibt bewusst keine
  // separate Inhaltsansicht für Phasen rechts (Lernpaket-Panel zeigt bereits
  // alle Phasen).
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-0.5 text-left hover:bg-muted/50 rounded-md transition-colors"
      >
        <span className="p-0.5 text-muted-foreground shrink-0">
          <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
        </span>
        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 shrink-0">
            {phase === 'Input' && '📚'}{phase === 'Übung' && '✏️'}{phase === 'Abschluss' && '🎯'}
          </span>
          <span className="truncate flex-1">{phaseLabel}</span>
          <span className={cn('w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0', countPillClass)}>
            {total}
          </span>
        </div>
      </button>
      {open && (
        <div className="ml-6 mt-0.5 border-l border-border pl-2 space-y-0.5">
          {activities.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50 italic">Keine Aktivitäten</p>
          ) : (
            activities
            .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
            .map(activity => (
              <AktivitaetSubNode
                key={activity.id}
                activity={activity}
                aktivitaetName={aktivitaetenMap[activity.aktivitaet_id] || '…'}
                catalogName={aktivitaetenMap[activity.aktivitaet_id] || ''}
                isSelected={selectedId === activity.id}
                onSelect={onSelect}
                paketId={paket.id}
                supportsMaster={aktivitaetSupportsMasterMap[activity.aktivitaet_id] || false}
                masterAufgabenList={masterAufgabenMap[activity.id] || []}
              />
              ))
          )}
        </div>
      )}
    </div>
  );
}

function LernpaketNode({ paket, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings, isSequenzielleUndGesperrt, aktivitaetenMap, paketPhaseActivities, showNumber = false, phaseAktivitaeten = [], isEditingActive = false, masterAufgabenMap = {}, aktivitaetSupportsMasterMap = {}, openPaketId = null, onSetOpenPaketId }) {
  // Akkordeon-Verhalten (UX-Verbesserung 2026-05-14):
  // Der Auf/Zu-Zustand wird vom SidebarTree als single-value-State verwaltet,
  // damit immer nur genau ein Lernpaket im Baum aufgeklappt ist. Beim Klick
  // auf den Lernpaket-Namen (oder den Chevron) klappt das eigene Paket auf,
  // alle anderen automatisch zu.
  const open = openPaketId === paket.id;
  const setOpen = (next) => {
    if (typeof onSetOpenPaketId !== 'function') return;
    const shouldOpen = typeof next === 'function' ? next(open) : next;
    onSetOpenPaketId(shouldOpen ? paket.id : null);
  };
  const isSelected = selectedId === paket.id;
  const paketLockedBy = paket.locked_by_user || paket.locked_by;
  const lockedByOther = isPaketLocked(paket) && paketLockedBy !== userEmail;
  const lockedByMe = isPaketLocked(paket) && paketLockedBy === userEmail;
  const isActiveEditPaket = isEditingActive && lockedByMe;

  // Single Source of Truth (siehe Logbuch §17): das vom Backend
  // materialisierte Aggregat-Feld `paket.is_complete`.
  // Die Anzeige zählt jedoch nur Activities aus AKTIVEN Phasen — sonst
  // bleibt eine deaktivierte Phase mit Leichen-Activities ewig „gelb".
  const phasenConfig = paket?.phasen_konfiguration || {};
  const activeActivities = paketPhaseActivities.filter(
    a => phasenConfig[a.phase]?.disabled !== true
  );
  const completeCount = activeActivities.filter(a => computeActivityCompleteForTree(
    a,
    aktivitaetenMap[a.aktivitaet_id] || '',
    masterAufgabenMap[a.id] || [],
    aktivitaetSupportsMasterMap[a.aktivitaet_id] || false
  )).length;
  const totalCount = activeActivities.length;
  const isPaketLiveComplete = totalCount > 0 && completeCount === totalCount;
  // Freigegebenes Lernpaket: content_status='approved' UND released_at gesetzt
  // (siehe Lernpakete-Schema). Dann zeigt die Pille einen grünen Haken statt
  // der Aktivitätszahl.
  const isPaketReleased = paket.content_status === 'approved' && !!paket.released_at;
  // Farbige Pille: grau=leer, grün=alle sichtbar vollständigen Aktivitäten, gelb=teilweise
  const countPillClass =
    isPaketReleased ? 'bg-green-600 text-white'
    : totalCount === 0 ? 'bg-slate-200 text-slate-700'
    : isPaketLiveComplete ? 'bg-green-500 text-white'
    : 'bg-amber-400 text-white';

  return (
    <div className={cn(isActiveEditPaket && "rounded-lg ring-2 ring-orange-400 bg-orange-50/50 ml-1 mr-0.5")}>
      <div className="flex items-center gap-0.5">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => {
            // UX-Verbesserung 2026-05-14: Klick auf den Lernpaket-Namen
            // selektiert das Paket (Inhalt rechts) UND klappt es im Baum auf
            // (Akkordeon: alle anderen Pakete klappen automatisch zu).
            onSelect({ type: 'lernpaket', id: paket.id, data: paket });
            if (typeof onSetOpenPaketId === 'function') onSetOpenPaketId(paket.id);
          }}
          disabled={isSequenzielleUndGesperrt}
          title={isSequenzielleUndGesperrt ? 'Vorherige Pakete müssen vollständig sein' : undefined}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs font-medium transition-colors min-w-0 disabled:opacity-50 disabled:cursor-not-allowed',
            isSelected ? 'bg-primary text-primary-foreground'
              : isSequenzielleUndGesperrt ? 'text-muted-foreground/50 bg-muted/30'
              : lockedByOther ? 'text-foreground hover:bg-amber-50 bg-amber-50/50'
              : 'text-foreground hover:bg-muted'
          )}
        >
          {showNumber && (
            <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {paket.reihenfolge_nummer}
            </div>
          )}
          <span className="truncate flex-1">{paket.titel_des_pakets}</span>
          {!isSelected && lockedByOther && (
            <span title={`Bearbeitet von: ${paketLockedBy}`} className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
              <UserRound className="w-2.5 h-2.5" />
            </span>
          )}
          {!isSelected && lockedByMe && !isActiveEditPaket && (
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
          {isActiveEditPaket && (
            <PenLine className="w-3.5 h-3.5 text-orange-500 shrink-0 animate-pulse" />
          )}

          <div
            className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0', countPillClass)}
            title={isPaketReleased ? 'Lernpaket ist freigegeben' : undefined}
          >
            {isPaketReleased ? <Check className="w-3.5 h-3.5" /> : totalCount}
          </div>
          </button>
      </div>
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
          {PHASES.map(phase => (
            <PhaseNode
              key={phase.key}
              phase={phase.key}
              phaseLabel={phase.label}
              paket={paket}
              selectedId={selectedId}
              onSelect={onSelect}
              paketPhaseActivities={paketPhaseActivities}
              aktivitaetenMap={aktivitaetenMap}
              masterAufgabenMap={masterAufgabenMap}
              aktivitaetSupportsMasterMap={aktivitaetSupportsMasterMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemenfeldNode({ themenfeld, lernpakete, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings, isSequenziell, aktivitaetenMap, paketPhaseActivitiesMap, isSammelbecken = false, phaseAktivitaeten = [], isEditingActive = false, masterAufgabenMap = {}, aktivitaetSupportsMasterMap = {}, openPaketId = null, onSetOpenPaketId }) {
   const [open, setOpen] = useState(!isSammelbecken);
  const isSelected = selectedId === `themenfeld-${themenfeld.id}`;

  const paketStatuses = lernpakete.map(p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings, phaseAktivitaeten));
  const themenfeldStatus =
    paketStatuses.length === 0 ? 'red' :
    paketStatuses.every(s => s === 'green') ? 'green' :
    paketStatuses.some(s => s === 'red') ? 'red' : 'yellow';

  // Themenfeld-Farbe live aus den sichtbaren Aktivitäten berechnen, damit sie nicht auf verzögerte Aggregatwerte wartet.
  const hatUnvollstaendigeAktivitaet = lernpakete.some(paket => {
    const phasenConfig = paket?.phasen_konfiguration || {};
    const activeActivities = (paketPhaseActivitiesMap[paket.id] || []).filter(
      a => phasenConfig[a.phase]?.disabled !== true
    );
    return activeActivities.length === 0 || activeActivities.some(a => !computeActivityCompleteForTree(
      a,
      aktivitaetenMap[a.aktivitaet_id] || '',
      masterAufgabenMap[a.id] || [],
      aktivitaetSupportsMasterMap[a.aktivitaet_id] || false
    ));
  });

  const getPaketIsLocked = (paket) => {
    if (!isSequenziell) return false;
    const lowerPakete = lernpakete.filter(p => (p.reihenfolge_nummer || 0) < (paket.reihenfolge_nummer || 0));
    return !lowerPakete.every(p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings) === 'green');
  };

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => onSelect({ type: 'themenfeld', id: `themenfeld-${themenfeld.id}`, themenfeldId: themenfeld.id, data: themenfeld })}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[10px] font-bold uppercase tracking-wide transition-colors min-w-0',
            isSelected ? 'bg-primary text-primary-foreground' : isSammelbecken ? 'text-foreground hover:bg-slate-100' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <FolderOpen className={cn('w-3.5 h-3.5 shrink-0', isSammelbecken ? 'text-slate-500' : 'text-amber-500')} />
          <span
            className={cn(
              'truncate flex-1',
              !isSelected && !isSammelbecken && lernpakete.length > 0 && (
                hatUnvollstaendigeAktivitaet ? 'text-red-600' : 'text-green-600'
              )
            )}
          >
            {themenfeld.titel}
          </span>
        </button>
      </div>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
          {lernpakete.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50 italic">Keine Lernpakete</p>
          ) : (
            lernpakete.map(paket => (
              <LernpaketNode
                 key={paket.id}
                  paket={paket}
                  lernziele={lernziele}
                  aufgaben={aufgaben}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  kannBearbeiten={kannBearbeiten}
                  userEmail={userEmail}
                  mappings={mappings}
                  isSequenzielleUndGesperrt={getPaketIsLocked(paket)}
                  aktivitaetenMap={aktivitaetenMap}
                  paketPhaseActivities={paketPhaseActivitiesMap[paket.id] || []}
                  showNumber={isSequenziell}
                  phaseAktivitaeten={phaseAktivitaeten}
                  isEditingActive={isEditingActive}
                  masterAufgabenMap={masterAufgabenMap}
                  aktivitaetSupportsMasterMap={aktivitaetSupportsMasterMap}
                  openPaketId={openPaketId}
                  onSetOpenPaketId={onSetOpenPaketId}
                />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AmpelLegende() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 px-3 bg-muted/50 rounded-lg text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-green-500" />
        Vollständig
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-amber-400" />
        Teilweise
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-slate-200" />
        Leer
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-red-600">Themenfeld noch unvollständig</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-green-600">Themenfeld komplett fertig</span>
      </span>
    </div>
  );
}

export default function SidebarTree({
  einheit,
  lernpakete,
  lernziele,
  aufgaben,
  mappings = [],
  themenfelder = [],
  selectedNode,
  onSelect,
  kannBearbeiten,
  userEmail = '',
  highlightedAtomIds = new Set(),
  phaseAktivitaeten = [],
  isEditingActive = false,
}) {
  const selectedId = selectedNode?.id;
  const [mobileThemenfeldId, setMobileThemenfeldId] = useState(themenfelder[0]?.id || null);
  // Akkordeon-State: nur EIN Lernpaket darf im Baum offen sein.
  // Wenn das selektierte Item ein Lernpaket ist, übernehmen wir dessen ID
  // als initialen offenen Knoten — sonst null (= alle eingeklappt).
  const [openPaketId, setOpenPaketId] = useState(
    selectedNode?.type === 'lernpaket' ? selectedNode?.id : null
  );
  // Wenn sich das selektierte Lernpaket extern ändert (z.B. Navigation aus
  // einer anderen Quelle), klappen wir es automatisch auf.
  useEffect(() => {
    if (selectedNode?.type === 'lernpaket' && selectedNode?.id) {
      setOpenPaketId(selectedNode.id);
    }
  }, [selectedNode?.type, selectedNode?.id]);

  const { data: aktivitaetenList = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    staleTime: 0,
  });
  const aktivitaetenMap = Object.fromEntries(aktivitaetenList.map(a => [a.id, a.name]));

  const { data: phaseActivities = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    // Tombstones (sync_status='to_delete') hier ausblenden, sonst bleiben
    // gelöschte Aktivitäten im Sidebar-Baum sichtbar.
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      sync_status: { $ne: 'to_delete' },
    }),
  });

  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const effectivePhaseActivities = phaseAktivitaeten.length > 0 ? phaseAktivitaeten : phaseActivities;

  const paketPhaseActivitiesMap = Object.fromEntries(
    lernpakete.map(paket => [
      paket.id,
      effectivePhaseActivities.filter(pa => pa.lernpaket_id === paket.id),
    ])
  );

  // Masteraufgaben gruppiert nach LernpaketPhaseAktivitaet.id
  // (Masteraufgaben verwenden activity_id, das ist die FK zur LernpaketPhaseAktivitaet)
  const masterAufgabenMap = Object.fromEntries(
    effectivePhaseActivities.map(activity => [
      activity.id,
      masterAufgaben.filter(m => m.activity_id === activity.id),
    ])
  );

  // Katalog-Infos: Welche Aktivitäten haben supports_master = true?
  const aktivitaetSupportsMasterMap = Object.fromEntries(
    aktivitaetenList.map(a => [a.id, Boolean(a.supports_master)])
  );

  const { prozent, gruen, gesamt } = getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail, mappings, phaseAktivitaeten);
  const isSequenziell = einheit?.navigationslogik === 'Sequenziell';
  const einheitStatus = gesamt === 0 ? 'red' : prozent === 100 ? 'green' : 'yellow';

  const paketeOhneThemenfeld = lernpakete.filter(p => !p.themenfeld_id);
  const themenfeldMitPaketen = themenfelder
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
    .map(tf => ({
      themenfeld: tf,
      pakete: lernpakete
        .filter(p => p.themenfeld_id === tf.id)
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)),
    }));

  return (
    <nav className="h-full flex flex-col gap-2">
      {themenfelder.length > 0 && (
        <div className="lg:hidden px-1">
          <label className="text-[10px] text-muted-foreground mb-1 block">Themenfeld:</label>
          <select
            value={mobileThemenfeldId || ''}
            onChange={e => {
              setMobileThemenfeldId(e.target.value);
              const tf = themenfelder.find(t => t.id === e.target.value);
              if (tf) onSelect({ type: 'themenfeld', id: `themenfeld-${tf.id}`, themenfeldId: tf.id, data: tf });
            }}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background"
          >
            {themenfelder.map(tf => (
              <option key={tf.id} value={tf.id}>{tf.titel}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {paketeOhneThemenfeld.length > 0 && (
          <div className="hidden lg:block">
            <ThemenfeldNode
              themenfeld={{ id: '__unzugeordnet__', titel: 'Unzugeordnete Lernpakete', reihenfolge: -1 }}
              lernpakete={paketeOhneThemenfeld}
              lernziele={lernziele}
              aufgaben={aufgaben}
              selectedId={selectedId}
              onSelect={onSelect}
              kannBearbeiten={false}
              userEmail={userEmail}
              mappings={mappings}
              isSequenziell={false}
              aktivitaetenMap={aktivitaetenMap}
              paketPhaseActivitiesMap={paketPhaseActivitiesMap}
              isSammelbecken={true}
              phaseAktivitaeten={phaseAktivitaeten}
              isEditingActive={isEditingActive}
              masterAufgabenMap={masterAufgabenMap}
              aktivitaetSupportsMasterMap={aktivitaetSupportsMasterMap}
              openPaketId={openPaketId}
              onSetOpenPaketId={setOpenPaketId}
            />
          </div>
        )}

        {themenfelder.length > 0 ? (
          <div className="hidden lg:block space-y-1">
            {themenfeldMitPaketen.map(({ themenfeld, pakete }) => (
              <ThemenfeldNode
                key={themenfeld.id}
                themenfeld={themenfeld}
                lernpakete={pakete}
                lernziele={lernziele}
                aufgaben={aufgaben}
                selectedId={selectedId}
                onSelect={onSelect}
                kannBearbeiten={false}
                userEmail={userEmail}
                mappings={mappings}
                isSequenziell={isSequenziell}
                aktivitaetenMap={aktivitaetenMap}
                paketPhaseActivitiesMap={paketPhaseActivitiesMap}
                phaseAktivitaeten={phaseAktivitaeten}
                isEditingActive={isEditingActive}
                masterAufgabenMap={masterAufgabenMap}
                aktivitaetSupportsMasterMap={aktivitaetSupportsMasterMap}
                openPaketId={openPaketId}
                onSetOpenPaketId={setOpenPaketId}
              />
            ))}
          </div>
        ) : null}

        {themenfelder.length > 0 && mobileThemenfeldId && (
          <div className="lg:hidden space-y-1">
            {(() => {
              const entry = themenfeldMitPaketen.find(e => e.themenfeld.id === mobileThemenfeldId);
              if (!entry) return null;
              const tf = themenfelder.find(t => t.id === mobileThemenfeldId);
              return entry.pakete.map(paket => (
                <LernpaketNode
                   key={paket.id}
                   paket={paket}
                   lernziele={lernziele}
                   aufgaben={aufgaben}
                   selectedId={selectedId}
                   onSelect={onSelect}
                   kannBearbeiten={false}
                   userEmail={userEmail}
                   mappings={mappings}
                   isSequenzielleUndGesperrt={false}
                   aktivitaetenMap={aktivitaetenMap}
                   paketPhaseActivities={paketPhaseActivitiesMap[paket.id] || []}
                   showNumber={tf?.bearbeitungsmodus === 'sequenziell'}
                   phaseAktivitaeten={phaseAktivitaeten}
                   isEditingActive={isEditingActive}
                   masterAufgabenMap={masterAufgabenMap}
                   aktivitaetSupportsMasterMap={aktivitaetSupportsMasterMap}
                   openPaketId={openPaketId}
                   onSetOpenPaketId={setOpenPaketId}
                 />
              ));
            })()}
          </div>
        )}

        {themenfelder.length === 0 && lernpakete.length === 0 && (
          <div className="px-3 py-4 text-center">
            <Layers className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Noch keine Lernpakete. Erstellen Sie diese in der Struktur-Ansicht.</p>
          </div>
        )}
      </div>

      <AmpelLegende />
    </nav>
  );
}