import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, BookOpen, Layers, Puzzle, Lock, Plus, Edit, UserRound, FolderOpen } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import {
  getLernpaketStatus,
  getEinheitFortschritt,
  getAufgabeStatus,
  ebene2FehltMapping,
  isPaketLocked,
} from '@/lib/statusLogic';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ── Ampel-Dot ──────────────────────────────────────────────────────────────────

const AMPEL = {
  green:  { dot: 'bg-green-500',  ring: 'ring-green-200',  label: 'Vollständig' },
  yellow: { dot: 'bg-amber-400',  ring: 'ring-amber-200',  label: 'In Bearbeitung' },
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

// ── Aktivitäts-Sub-Node ───────────────────────────────────────────────────────

const PHASE_KEY_MAP = { input: 'Input', uebung: 'Übung', abschluss: 'Abschluss' };

function AktivitaetSubNode({ phasenConfig, aktivitaetId, aktivitaetName, isAktivitaetSelected, onSelect, phase, paketId }) {
  const isIncomplete = phasenConfig.is_complete === false && !phasenConfig.field_values?.fill_in_moodle_later;
  return (
    <button
      onClick={() => onSelect({
        type: 'aktivitaet-edit',
        id: aktivitaetId,
        phase,
        paketId,
        aktivitaetId: phasenConfig.selected_aktivitaet_id,
      })}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[11px] transition-colors',
        isAktivitaetSelected
          ? 'bg-primary text-primary-foreground'
          : isIncomplete
            ? 'text-amber-700 bg-amber-50/60 hover:bg-amber-100'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Puzzle className="w-3 h-3 shrink-0" />
      <span className="truncate flex-1">{aktivitaetName}</span>
      {isIncomplete && (
        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" title="Inhalt unvollständig: Bitte alle Pflichtfelder ausfüllen" />
      )}
      <Edit className="w-3 h-3 shrink-0 opacity-50" />
    </button>
  );
}

// ── Phase-Node ────────────────────────────────────────────────────────────────

function PhaseNode({ phase, phaseLabel, paket, selectedId, onSelect, aktivitaetenMap }) {
  const isSelected           = selectedId === `phase-${paket.id}-${phase}`;
  const configKey            = PHASE_KEY_MAP[phase] || phase;
  const phasenConfig         = paket.phasen_konfiguration?.[configKey] || {};
  const isDisabled           = phasenConfig.disabled === true;
  const hasAktivitaet        = !!phasenConfig.selected_aktivitaet_id;
  const aktivitaetName       = hasAktivitaet ? (aktivitaetenMap?.[phasenConfig.selected_aktivitaet_id] || '…') : null;
  const aktivitaetId         = `aktivitaet-${paket.id}-${phase}`;
  const isAktivitaetSelected = selectedId === aktivitaetId;
  const [open, setOpen]      = useState(false);

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => !isDisabled && onSelect({ type: 'phase', id: `phase-${paket.id}-${phase}`, phase, paketId: paket.id, data: paket })}
          disabled={isDisabled}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
            isSelected ? 'bg-primary text-primary-foreground'
              : isDisabled ? 'text-muted-foreground/50 opacity-60 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <span className="w-3 h-3 shrink-0">
            {phase === 'input' && '📚'}{phase === 'uebung' && '✏️'}{phase === 'abschluss' && '🎯'}
          </span>
          <span className="truncate flex-1">{phaseLabel}</span>
          {!isSelected && hasAktivitaet && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">OK</span>
          )}
        </button>
      </div>
      {open && (
        <div className="ml-6 mt-0.5 border-l border-border pl-2">
          {hasAktivitaet ? (
            <AktivitaetSubNode
              phasenConfig={phasenConfig}
              aktivitaetId={aktivitaetId}
              aktivitaetName={aktivitaetName}
              isAktivitaetSelected={isAktivitaetSelected}
              onSelect={onSelect}
              phase={phase}
              paketId={paket.id}
            />
          ) : (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50 italic">
              {isDisabled ? 'Phase deaktiviert' : 'Keine Aktivität zugeordnet'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lernpaket-Node ────────────────────────────────────────────────────────────

const PHASES = [
  { key: 'input', label: 'Input (Erarbeitung)' },
  { key: 'uebung', label: 'Übung' },
  { key: 'abschluss', label: 'Abschluss' },
];

function LernpaketNode({ paket, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings, isSequenzielleUndGesperrt, aktivitaetenMap, showNumber = false }) {
   const [open, setOpen] = useState(false);
   const isSelected      = selectedId === paket.id;
   const status          = getLernpaketStatus(paket, lernziele, aufgaben, userEmail, mappings);
   const lockedByOther   = isPaketLocked(paket) && paket.locked_by !== userEmail;
   const lockedByMe      = isPaketLocked(paket) && paket.locked_by === userEmail;

  const hatUnvollstaendigeAktivitaet = PHASES.some(ph => {
    const configKey = PHASE_KEY_MAP[ph.key] || ph.key;
    const phaseData = paket.phasen_konfiguration?.[configKey];
    if (!phaseData || phaseData.disabled || !phaseData.selected_aktivitaet_id) return false;
    return phaseData.is_complete === false && !phaseData.field_values?.fill_in_moodle_later;
  });

  return (
    <div>
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
            <span title={`Bearbeitet von: ${paket.locked_by}`} className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
              <UserRound className="w-2.5 h-2.5" />
            </span>
          )}
          {!isSelected && lockedByMe && (
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
          {!isSelected && !lockedByOther && !lockedByMe && <AmpelDot status={status} size="md" />}
          {!isSelected && hatUnvollstaendigeAktivitaet && (
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" title="Aktivitäten mit unvollständigem Inhalt" />
          )}
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
              aktivitaetenMap={aktivitaetenMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Themenfeld-Node ───────────────────────────────────────────────────────────

function ThemenfeldNode({ themenfeld, lernpakete, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings, isSequenziell, aktivitaetenMap }) {
  const [open, setOpen] = useState(true);
  const isSelected      = selectedId === `themenfeld-${themenfeld.id}`;

  // Aggregierter Ampelstatus des Themenfelds
  const paketStatuses = lernpakete.map(p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings));
  const themenfeldStatus =
    paketStatuses.length === 0 ? 'red' :
    paketStatuses.every(s => s === 'green') ? 'green' :
    paketStatuses.some(s => s === 'red') ? 'red' : 'yellow';

  const hatUnvollstaendigeAktivitaet = lernpakete.some(paket =>
    PHASES.some(ph => {
      const configKey = PHASE_KEY_MAP[ph.key] || ph.key;
      const phaseData = paket.phasen_konfiguration?.[configKey];
      if (!phaseData || phaseData.disabled || !phaseData.selected_aktivitaet_id) return false;
      return phaseData.is_complete === false && !phaseData.field_values?.fill_in_moodle_later;
    })
  );

  // Sequenziell-Logik innerhalb eines Themenfelds
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
            isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
          )}
        >
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span className="truncate flex-1">{themenfeld.titel}</span>
          {!isSelected && <AmpelDot status={themenfeldStatus} size="md" />}
          {!isSelected && hatUnvollstaendigeAktivitaet && (
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
          )}
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
                showNumber={isSequenziell}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Ampel-Legende ──────────────────────────────────────────────────────────────

function AmpelLegende() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 px-3 bg-muted/50 rounded-lg text-[10px] text-muted-foreground">
      {Object.entries(AMPEL).map(([key, cfg]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      ))}
    </div>
  );
}

// ── SidebarTree (Haupt-Export) ────────────────────────────────────────────────

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
}) {
  const selectedId = selectedNode?.id;

  // Responsive: Auf kleinen Screens Dropdown für Themenfeld-Auswahl
  const [mobileThemenfeldId, setMobileThemenfeldId] = useState(themenfelder[0]?.id || null);

  const { data: aktivitaetenList = [] } = useQuery({
    queryKey: ['aktivitaeten'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });
  const aktivitaetenMap = Object.fromEntries(aktivitaetenList.map(a => [a.id, a.name]));

  const { prozent, gruen, gesamt } = getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail, mappings);
  const isSequenziell = einheit?.navigationslogik === 'Sequenziell';

  const einheitStatus = gesamt === 0 ? 'red' : prozent === 100 ? 'green' : 'yellow';

  // Pakete ohne Themenfeld (Rückwärtskompatibilität)
  const paketeOhneThemenfeld = lernpakete.filter(p => !p.themenfeld_id);

  // Themenfelder mit ihren Paketen
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
      {/* Einheit-Root */}
      <button
        onClick={() => onSelect({ type: 'einheit', id: einheit?.id, data: einheit })}
        className={cn(
          'w-full flex items-start gap-2.5 px-3 py-3 rounded-lg text-left transition-colors',
          selectedNode?.type === 'einheit'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/60 hover:bg-muted text-foreground'
        )}
      >
        <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold truncate flex-1">{einheit?.titel_der_einheit}</p>
            {selectedNode?.type !== 'einheit' && <AmpelDot status={einheitStatus} />}
          </div>
          <p className="text-[10px] opacity-70">{einheit?.fach} · Jg. {einheit?.jahrgangsstufe}</p>
          {gesamt > 0 && (
            <div className="mt-2">
              <div className="w-full bg-black/10 rounded-full h-1.5">
                <div
                  className={cn('h-1.5 rounded-full transition-all', prozent === 100 ? 'bg-green-400' : prozent > 50 ? 'bg-amber-400' : 'bg-red-400')}
                  style={{ width: `${prozent}%` }}
                />
              </div>
              <p className="text-[10px] opacity-60 mt-0.5">{gruen}/{gesamt} Pakete fertig</p>
            </div>
          )}
        </div>
      </button>

      {/* ── Responsive Themenfeld-Auswahl (nur auf kleinen Screens) ── */}
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

      {/* ── Baum-Inhalt ── */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">

        {/* Desktop: Alle Themenfelder als Baum */}
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
              />
            ))}
          </div>
        ) : null}

        {/* Mobile: nur das gewählte Themenfeld */}
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
                  showNumber={tf?.bearbeitungsmodus === 'sequenziell'}
                />
              ));
            })()}
          </div>
        )}

        {/* Unzugeordnete Pakete */}
        {paketeOhneThemenfeld.length > 0 && (
          <div className="space-y-1 mt-2 pt-2 border-t border-border">
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">Unzugeordnete Lernpakete</p>
            {paketeOhneThemenfeld
              .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
              .map(paket => (
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
                  showNumber={false}
                />
              ))}
          </div>
        )}

        {/* Fallback: Keine Themenfelder und keine Pakete */}
        {themenfelder.length === 0 && lernpakete.length === 0 && (
          <div className="px-3 py-4 text-center">
            <Layers className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Noch keine Lernpakete. Erstellen Sie diese in der Struktur-Ansicht.</p>
          </div>
        )}
      </div>

      {/* Legende */}
      <AmpelLegende />
    </nav>
  );
}