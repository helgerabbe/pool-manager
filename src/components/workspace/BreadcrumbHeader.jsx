import React from 'react';
import { ChevronRight, BookOpen, Layers, Target, Puzzle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getEinheitFortschritt, getLernpaketStatus, getLernzielStatus } from '@/lib/statusLogic';

const NODE_CONFIG = {
  einheit:   { icon: BookOpen, color: 'text-primary' },
  lernpaket: { icon: Layers,   color: 'text-accent' },
  lernziel:  { icon: Target,   color: 'text-green-600' },
  aufgabe:   { icon: Puzzle,   color: 'text-purple-600' },
};

const AMPEL_BAR = {
  green:  { bar: 'bg-green-500', label: 'Vollständig',     text: 'text-green-700' },
  yellow: { bar: 'bg-amber-400', label: 'In Bearbeitung',  text: 'text-amber-700' },
  red:    { bar: 'bg-red-500',   label: 'Unvollständig',   text: 'text-red-600' },
};

function Crumb({ icon: Icon, label, color, isLast, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={isLast}
      className={cn(
        'flex items-center gap-1.5 text-sm transition-colors shrink-0',
        isLast
          ? 'text-foreground font-semibold cursor-default'
          : 'text-muted-foreground hover:text-foreground cursor-pointer'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', color)} />
      <span className="truncate max-w-[160px]">{label}</span>
    </button>
  );
}

/**
 * BreadcrumbHeader
 *
 * Props:
 *  einheit      — Einheit-Datensatz
 *  lernpakete   — alle Lernpakete der Einheit
 *  lernziele    — alle Lernziele der Einheit
 *  aufgaben     — alle Aufgaben der Einheit
 *  selectedNode — { type, id, data?, paketId?, lernzielId? }
 *  onNavigate   — Callback
 *  userEmail    — für Ampel-Berechnung (Lock-Status)
 */
export default function BreadcrumbHeader({
  einheit, lernpakete, lernziele, aufgaben = [],
  selectedNode, onNavigate, userEmail = '',
}) {
  if (!einheit) return null;

  const { prozent, gruen, gesamt } = getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail);

  // ── Breadcrumb-Pfad aufbauen ──
  const crumbs = [];
  crumbs.push({
    type: 'einheit', id: einheit.id,
    label: einheit.titel_der_einheit,
    ...NODE_CONFIG.einheit,
  });

  const type = selectedNode?.type;

  // Paket-Kontext
  let paketId = selectedNode?.paketId || (type === 'lernpaket' ? selectedNode?.id : null);
  let paket   = paketId ? lernpakete.find(p => p.id === paketId) : null;

  // Lernziel-Kontext
  let lernzielId = selectedNode?.lernzielId || (type === 'lernziel' ? selectedNode?.id : null);
  let lernziel   = lernzielId ? lernziele.find(lz => lz.id === lernzielId) : null;

  // Paket aus Lernziel ableiten wenn nötig
  if (!paket && lernziel) {
    paket = lernpakete.find(p => p.id === lernziel.lernpaket_id);
    paketId = paket?.id;
  }

  if (paket) {
    crumbs.push({
      type: 'lernpaket', id: paket.id,
      label: paket.titel_des_pakets,
      ...NODE_CONFIG.lernpaket,
    });
  }

  if (lernziel) {
    crumbs.push({
      type: 'lernziel', id: lernziel.id,
      label: lernziel.formulierung_fachsprache || 'Lernziel',
      ...NODE_CONFIG.lernziel,
    });
  }

  if (type === 'aufgabe' && selectedNode?.data) {
    crumbs.push({
      type: 'aufgabe', id: selectedNode.id,
      label: selectedNode.data.baustein_typ,
      ...NODE_CONFIG.aufgabe,
    });
  }

  const newLabels = {
    'new-lernpaket': { label: 'Neues Lernpaket', ...NODE_CONFIG.lernpaket },
    'new-lernziel':  { label: 'Neues Lernziel',  ...NODE_CONFIG.lernziel },
    'new-aufgabe':   { label: 'Neuer Baustein',   ...NODE_CONFIG.aufgabe },
  };
  if (newLabels[type]) crumbs.push({ ...newLabels[type], type, id: 'new' });

  // ── Kontext-Status für die aktuelle Ebene ──
  let kontextStatus = null;
  if (type === 'lernpaket' && paket) {
    kontextStatus = getLernpaketStatus(paket, lernziele, aufgaben, userEmail);
  }
  if (type === 'lernziel' && lernziel && paketId) {
    kontextStatus = getLernzielStatus(lernziel, aufgaben, paketId, userEmail);
  }

  const barColor =
    prozent === 100 ? 'bg-green-500' :
    prozent > 50    ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
      {/* Zeile 1: Breadcrumb-Pfad */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 overflow-x-auto">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Home className="w-3.5 h-3.5" />
        </Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.type}-${crumb.id}`}>
              <Crumb
                icon={crumb.icon}
                label={crumb.label}
                color={crumb.color}
                isLast={isLast}
                onClick={() => !isLast && onNavigate({ type: crumb.type, id: crumb.id })}
              />
              {!isLast && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
            </React.Fragment>
          );
        })}

        {/* Kontext-Ampel für aktuelle Ebene */}
        {kontextStatus && (
          <span className={cn(
            'ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
            kontextStatus === 'green'  ? 'bg-green-100 text-green-700' :
            kontextStatus === 'yellow' ? 'bg-amber-100 text-amber-700' :
                                         'bg-red-100 text-red-600'
          )}>
            {AMPEL_BAR[kontextStatus]?.label}
          </span>
        )}
      </div>

      {/* Zeile 2: Globaler Fortschrittsbalken der Einheit */}
      {gesamt > 0 && (
        <div className="px-5 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${prozent}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
              {gruen}/{gesamt} Pakete ·{' '}
              <span className={cn(
                'font-semibold',
                prozent === 100 ? 'text-green-600' : prozent > 50 ? 'text-amber-600' : 'text-red-500'
              )}>
                {prozent} %
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}