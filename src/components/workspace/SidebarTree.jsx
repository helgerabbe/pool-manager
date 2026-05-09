import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, BookOpen, Layers, Puzzle, Lock, Edit, UserRound, FolderOpen, PenLine } from 'lucide-react';
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

function AktivitaetSubNode({ activity, aktivitaetName, isSelected, onSelect, paketId, masterAufgabenList = [], supportsMaster = false }) {
  // Single Source of Truth: Vertraue dem is_complete Flag aus der Datenbank
  // supportsMaster wird nur für die Anzeige (z.B. "1M") genutzt
  const masterAufgabenCount = masterAufgabenList.length;
  const isReleased = activity.content_status === 'approved';
  // KI-Modus mit gespeichertem Briefing → Aktivität ist fertig zur Übergabe
  // an die MBK; es gibt KEINEN manuellen Approve-Schritt. Damit die Sidebar
  // nicht dauerhaft rot bleibt, behandeln wir „KI-Briefing vorhanden" wie
  // einen Approve. Single Source of Truth für „inhaltlich fertig" bleibt
  // weiterhin `is_complete` (vom Guardian gesetzt).
  const isKiBriefed =
    activity.erstellungs_modus === 'ki' &&
    !!activity.ki_briefing &&
    typeof activity.ki_briefing === 'object' &&
    Object.keys(activity.ki_briefing).length > 0;
  const showAsComplete = isReleased || (isKiBriefed && activity.is_complete === true);

  // Farben nach Status:
  // - Freigegeben (approved) ODER KI-Briefing fertig → Grün
  // - Sonst → Orange/Gelb
  const textColor = showAsComplete ? 'text-green-600' : 'text-orange-600';
  
  // Debug: Zeige Masteraufgaben-Status wenn supportsMaster
  const masterInfo = supportsMaster && masterAufgabenCount > 0 ? `${masterAufgabenCount}M` : null;
  
  return (
    <div className={cn(
      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[11px]',
      textColor
    )}>
      <Puzzle className="w-3 h-3 shrink-0" />
      <span className="truncate flex-1">{aktivitaetName}</span>
      {masterInfo && (
        <span className="text-[10px] font-semibold text-muted-foreground shrink-0" title={`${masterAufgabenCount} Masteraufgaben vorhanden`}>
          {masterInfo}
        </span>
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

  // Einheitliche Count-Pille: grau=leer, grün=alle vollständig, gelb=teilweise
  const completeCount = activities.filter(a => a.is_complete).length;
  const total = activities.length;
  const countPillClass =
    total === 0 ? 'bg-slate-200 text-slate-700'
    : completeCount === total ? 'bg-green-500 text-white'
    : 'bg-amber-400 text-white';

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
        </button>
        {/* Phase-Header: Nur visuell, keine Klick-Navigation */}
        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left text-xs text-muted-foreground">
          <span className="w-3 h-3 shrink-0">
            {phase === 'Input' && '📚'}{phase === 'Übung' && '✏️'}{phase === 'Abschluss' && '🎯'}
          </span>
          <span className="truncate flex-1">{phaseLabel}</span>
          <span className={cn('w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0', countPillClass)}>
            {total}
          </span>
        </div>
      </div>
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

function LernpaketNode({ paket, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings, isSequenzielleUndGesperrt, aktivitaetenMap, paketPhaseActivities, showNumber = false, phaseAktivitaeten = [], isEditingActive = false, masterAufgabenMap = {}, aktivitaetSupportsMasterMap = {} }) {
   const [open, setOpen] = useState(false); // Geschlossen am Anfang
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
  const completeCount = activeActivities.filter(a => a.is_complete).length;
  const totalCount = activeActivities.length;
  // Farbige Pille: grau=leer, grün=alle vollständig, gelb=teilweise
  const countPillClass =
    totalCount === 0 ? 'bg-slate-200 text-slate-700'
    : paket.is_complete === true ? 'bg-green-500 text-white'
    : 'bg-amber-400 text-white';

  return (
    <div className={cn(isActiveEditPaket && "rounded-lg ring-2 ring-orange-400 bg-orange-50/50 ml-1 mr-0.5")}>
      <div className="flex items-center gap-0.5">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => onSelect({ type: 'lernpaket', id: paket.id, data: paket })}
          disabled={isSequenzielleUndGesperrt}
          title={isSequenzielleUndGesperrt ? 'Vorherige Pakete müssen vollständig sein' : undefined}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm font-medium transition-colors min-w-0 disabled:opacity-50 disabled:cursor-not-allowed',
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

          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0', countPillClass)}>
            {totalCount}
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

function ThemenfeldNode({ themenfeld, lernpakete, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings, isSequenziell, aktivitaetenMap, paketPhaseActivitiesMap, isSammelbecken = false, phaseAktivitaeten = [], isEditingActive = false, masterAufgabenMap = {}, aktivitaetSupportsMasterMap = {} }) {
   const [open, setOpen] = useState(!isSammelbecken);
  const isSelected = selectedId === `themenfeld-${themenfeld.id}`;

  const paketStatuses = lernpakete.map(p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings, phaseAktivitaeten));
  const themenfeldStatus =
    paketStatuses.length === 0 ? 'red' :
    paketStatuses.every(s => s === 'green') ? 'green' :
    paketStatuses.some(s => s === 'red') ? 'red' : 'yellow';

  // Single Source of Truth: Warn-Icon nur wenn Datenbank is_complete === false
  const hatUnvollstaendigeAktivitaet = lernpakete.some(paket =>
    (paketPhaseActivitiesMap[paket.id] || []).some(a => !a.is_complete)
  );

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
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm font-semibold transition-colors min-w-0',
            isSelected ? 'bg-primary text-primary-foreground' : isSammelbecken ? 'text-foreground hover:bg-slate-100' : 'text-foreground hover:bg-muted'
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
        <span className="font-semibold text-red-600">Themenfeld</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-green-600">Themenfeld</span>
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

  const { data: aktivitaetenList = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
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
  });

  const paketPhaseActivitiesMap = Object.fromEntries(
    lernpakete.map(paket => [
      paket.id,
      phaseActivities.filter(pa => pa.lernpaket_id === paket.id),
    ])
  );

  // Masteraufgaben gruppiert nach LernpaketPhaseAktivitaet.id
  // (Masteraufgaben verwenden activity_id, das ist die FK zur LernpaketPhaseAktivitaet)
  const masterAufgabenMap = Object.fromEntries(
    phaseActivities.map(activity => [
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