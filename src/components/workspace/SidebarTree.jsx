import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronRight, BookOpen, Layers, Target, Puzzle,
  CheckCircle2, AlertCircle, Lock, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Hilfsfunktionen für Status-Berechnung ─────────────────────────────────────

function getPaketStatus(paket, lernziele, aufgaben) {
  const ziele = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  if (ziele.length === 0) return 'empty';      // Noch keine Lernziele
  const alleHabenAufgaben = ziele.every(lz =>
    aufgaben.some(a => a.lernpaket_id === paket.id && a.lernziel_id === lz.id)
  );
  return alleHabenAufgaben ? 'complete' : 'incomplete';
}

function getLernzielStatus(lernziel, aufgaben, paketId) {
  const hat = aufgaben.some(a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id);
  return hat ? 'complete' : 'missing';
}

// ── Status-Icons ──────────────────────────────────────────────────────────────

function StatusIcon({ status }) {
  if (status === 'complete')   return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />;
  if (status === 'incomplete') return <AlertCircle  className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (status === 'missing')    return <AlertCircle  className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  return null;
}

// ── Tree-Node: Aufgabenbaustein (Level 3) ─────────────────────────────────────

function BausteinNode({ aufgabe, selectedId, onSelect }) {
  const isSelected = selectedId === aufgabe.id;
  return (
    <button
      onClick={() => onSelect({ type: 'aufgabe', id: aufgabe.id, data: aufgabe })}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Puzzle className="w-3 h-3 shrink-0" />
      {aufgabe.lock_status && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
      <span className="truncate">{aufgabe.baustein_typ}</span>
    </button>
  );
}

// ── Tree-Node: Lernziel (Level 2) ─────────────────────────────────────────────

function LernzielNode({ lernziel, aufgaben, paketId, selectedId, onSelect, kannBearbeiten }) {
  const [open, setOpen] = useState(false);
  const isSelected = selectedId === lernziel.id;
  const status = getLernzielStatus(lernziel, aufgaben, paketId);
  const bausteine = aufgaben.filter(a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-0.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => onSelect({ type: 'lernziel', id: lernziel.id, data: lernziel, paketId })}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Target className="w-3 h-3 shrink-0" />
          <span className="truncate flex-1">{lernziel.formulierung_fachsprache || 'Lernziel'}</span>
          <StatusIcon status={status} />
        </button>
      </div>

      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {bausteine.map(a => (
            <BausteinNode
              key={a.id}
              aufgabe={a}
              selectedId={selectedId}
              onSelect={onSelect}
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

function LernpaketNode({ paket, lernziele, aufgaben, selectedId, onSelect, kannBearbeiten }) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === paket.id;
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  const status = getPaketStatus(paket, lernziele, aufgaben);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-0.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <button
          onClick={() => onSelect({ type: 'lernpaket', id: paket.id, data: paket })}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm font-medium transition-colors',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          )}
        >
          <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {paket.reihenfolge_nummer}
          </div>
          <span className="truncate flex-1">{paket.titel_des_pakets}</span>
          <StatusIcon status={status} />
        </button>
      </div>

      {open && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-border pl-2">
          {paketZiele.map(lz => (
            <LernzielNode
              key={lz.id}
              lernziel={lz}
              aufgaben={aufgaben}
              paketId={paket.id}
              selectedId={selectedId}
              onSelect={onSelect}
              kannBearbeiten={kannBearbeiten}
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
            <p className="px-2 py-1 text-[11px] text-amber-500 italic">Lernziel benötigt</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── SidebarTree (Haupt-Export) ────────────────────────────────────────────────

/**
 * Props:
 *  einheit         — Einheit-Datensatz
 *  lernpakete      — gefiltert für diese Einheit
 *  lernziele       — gefiltert für diese Einheit
 *  aufgaben        — gefiltert für diese Einheit
 *  selectedNode    — { type, id, ... }
 *  onSelect        — Callback wenn Node geklickt
 *  kannBearbeiten  — RBAC
 */
export default function SidebarTree({
  einheit,
  lernpakete,
  lernziele,
  aufgaben,
  selectedNode,
  onSelect,
  kannBearbeiten,
}) {
  const selectedId = selectedNode?.id;

  return (
    <nav className="h-full flex flex-col">
      {/* Einheit-Root */}
      <button
        onClick={() => onSelect({ type: 'einheit', id: einheit?.id, data: einheit })}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors mb-3',
          selectedNode?.type === 'einheit'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 hover:bg-muted text-foreground'
        )}
      >
        <BookOpen className="w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{einheit?.titel_der_einheit}</p>
          <p className="text-[10px] opacity-70">{einheit?.fach} · Jg. {einheit?.jahrgangsstufe}</p>
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
    </nav>
  );
}