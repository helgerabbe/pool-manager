import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, BookOpen, Layers, Target, Puzzle, Lock, Plus } from 'lucide-react';
import {
  getLernzielStatus,
  getLernpaketStatus,
  getEinheitFortschritt,
  getAufgabeStatus,
  ebene2FehltMapping,
} from '@/lib/statusLogic';
import { AlertTriangle } from 'lucide-react';

// ── Ampel-Dot ──────────────────────────────────────────────────────────────────
// Kompakte farbige Kreisanzeige für den Status-Überblick im Baum.

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

// ── Tree-Node: Aufgabenbaustein (Level 3) ─────────────────────────────────────

function BausteinNode({ aufgabe, selectedId, onSelect, userEmail, mappings }) {
  const isSelected   = selectedId === aufgabe.id;
  const isLocked     = aufgabe.lock_status && aufgabe.locked_by_user !== userEmail;
  const isOptOut     = aufgabe.is_opt_out === true;
  const isEbene2     = aufgabe.baustein_typ === 'Ebene-2-Aufgabe';
  const ampelStatus  = getAufgabeStatus(aufgabe, userEmail, mappings);
  const warnMapping  = !isSelected && ebene2FehltMapping(aufgabe, mappings);

  return (
    <button
      onClick={() => onSelect({ type: 'aufgabe', id: aufgabe.id, data: aufgabe })}
      title={warnMapping ? 'Kein Basiskompetenz-Mapping vorhanden' : undefined}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : isOptOut
            ? 'text-muted-foreground/50 line-through hover:bg-muted/50'
            : isLocked
              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
              : warnMapping
                ? 'text-amber-700 bg-amber-50/60 hover:bg-amber-100'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Puzzle className={cn('w-3 h-3 shrink-0', isOptOut && 'opacity-40', isEbene2 && !isSelected && 'text-cyan-600')} />
      {isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
      {warnMapping && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
      <span className="truncate flex-1">{aufgabe.baustein_typ}</span>
      {isOptOut && !isSelected && (
        <span className="text-[9px] bg-muted text-muted-foreground px-1 rounded no-underline" style={{ textDecoration: 'none' }}>
          out
        </span>
      )}
      {!isSelected && <AmpelDot status={ampelStatus} />}
    </button>
  );
}

// ── Tree-Node: Lernziel (Level 2) ─────────────────────────────────────────────

function LernzielNode({ lernziel, aufgaben, paketId, selectedId, onSelect, kannBearbeiten, userEmail, mappings }) {
  const [open, setOpen]  = useState(false);
  const isSelected       = selectedId === lernziel.id;
  const status           = getLernzielStatus(lernziel, aufgaben, paketId, userEmail, mappings);
  const bausteine        = aufgaben.filter(a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id);

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
        >
          <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => onSelect({ type: 'lernziel', id: lernziel.id, data: lernziel, paketId })}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors min-w-0',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : status === 'red'
                ? 'text-red-700 bg-red-50 hover:bg-red-100'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Target className="w-3 h-3 shrink-0" />
          <span className="truncate flex-1">{lernziel.formulierung_fachsprache || 'Lernziel'}</span>
          {!isSelected && <AmpelDot status={status} />}
        </button>
      </div>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {bausteine.map(a => (
            <BausteinNode
              key={a.id}
              aufgabe={a}
              selectedId={selectedId}
              onSelect={onSelect}
              userEmail={userEmail}
              mappings={mappings}
            />
          ))}
          {kannBearbeiten && (
            <button
              onClick={() => onSelect({ type: 'new-aufgabe', paketId, lernzielId: lernziel.id })}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3 h-3" /> Baustein hinzufügen
            </button>
          )}
          {bausteine.length === 0 && !kannBearbeiten && (
            <p className="px-2 py-1 text-[11px] text-red-400 italic">Keine Bausteine</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tree-Node: Lernpaket (Level 1) ────────────────────────────────────────────

function LernpaketNode({ paket, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten, userEmail, mappings }) {
  const [open, setOpen]  = useState(true);
  const isSelected       = selectedId === paket.id;
  const paketZiele       = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  const status           = getLernpaketStatus(paket, lernziele, aufgaben, userEmail, mappings);

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
        >
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => onSelect({ type: 'lernpaket', id: paket.id, data: paket })}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm font-medium transition-colors min-w-0',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          )}
        >
          <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {paket.reihenfolge_nummer}
          </div>
          <span className="truncate flex-1">{paket.titel_des_pakets}</span>
          {!isSelected && <AmpelDot status={status} size="md" />}
        </button>
      </div>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
          {paketZiele.map(lz => (
            <LernzielNode
              key={lz.id}
              lernziel={lz}
              aufgaben={aufgaben}
              paketId={paket.id}
              selectedId={selectedId}
              onSelect={onSelect}
              kannBearbeiten={kannBearbeiten}
              userEmail={userEmail}
              mappings={mappings}
            />
          ))}
          {kannBearbeiten && (
            <button
              onClick={() => onSelect({ type: 'new-lernziel', paketId: paket.id })}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3 h-3" /> Lernziel hinzufügen
            </button>
          )}
          {paketZiele.length === 0 && (
            <p className="px-2 py-1 text-[11px] text-red-400 italic flex items-center gap-1">
              <AmpelDot status="red" /> Noch kein Lernziel
            </p>
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
  selectedNode,
  onSelect,
  kannBearbeiten,
  userEmail = '',
}) {
  const selectedId = selectedNode?.id;
  const { prozent, gruen, gesamt } = getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail, mappings);

  // Gesamtstatus der Einheit für den Root-Node
  const einheitStatus =
    gesamt === 0 ? 'red' :
    prozent === 100 ? 'green' : 'yellow';

  return (
    <nav className="h-full flex flex-col gap-2">

      {/* Einheit-Root mit Mini-Fortschrittsbalken */}
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
          {/* Mini-Fortschrittsbalken */}
          {gesamt > 0 && (
            <div className="mt-2">
              <div className="w-full bg-black/10 rounded-full h-1.5">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    prozent === 100 ? 'bg-green-400' : prozent > 50 ? 'bg-amber-400' : 'bg-red-400'
                  )}
                  style={{ width: `${prozent}%` }}
                />
              </div>
              <p className="text-[10px] opacity-60 mt-0.5">{gruen}/{gesamt} Pakete fertig</p>
            </div>
          )}
        </div>
      </button>

      {/* Lernpakete */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {lernpakete.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <Layers className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Noch keine Lernpakete.</p>
            {kannBearbeiten && (
              <button
                onClick={() => onSelect({ type: 'new-lernpaket' })}
                className="mt-2 text-xs text-primary hover:underline"
              >
                + Lernpaket anlegen
              </button>
            )}
          </div>
        ) : (
          <>
            {lernpakete.map(paket => (
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
              />
            ))}
            {kannBearbeiten && (
              <button
                onClick={() => onSelect({ type: 'new-lernpaket' })}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border border-dashed border-border mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Neues Lernpaket
              </button>
            )}
          </>
        )}
      </div>

      {/* Legende */}
      <AmpelLegende />
    </nav>
  );
}