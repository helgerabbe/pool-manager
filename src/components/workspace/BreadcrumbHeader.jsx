import React from 'react';
import { ChevronRight, BookOpen, Layers, Target, Puzzle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NODE_CONFIG = {
  einheit:    { icon: BookOpen, color: 'text-primary' },
  lernpaket:  { icon: Layers,   color: 'text-accent' },
  lernziel:   { icon: Target,   color: 'text-green-600' },
  aufgabe:    { icon: Puzzle,   color: 'text-purple-600' },
};

function Crumb({ icon: Icon, label, color, isLast, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={isLast}
      className={cn(
        'flex items-center gap-1.5 text-sm transition-colors',
        isLast
          ? 'text-foreground font-semibold cursor-default'
          : 'text-muted-foreground hover:text-foreground cursor-pointer'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', color)} />
      <span className="truncate max-w-[180px]">{label}</span>
    </button>
  );
}

/**
 * BreadcrumbHeader — zeigt den aktuellen Navigations-Pfad basierend auf selectedNode.
 *
 * Props:
 *  einheit      — Einheit-Datensatz
 *  lernpakete   — alle Lernpakete der Einheit
 *  lernziele    — alle Lernziele der Einheit
 *  selectedNode — { type, id, data?, paketId?, lernzielId? }
 *  onNavigate   — Callback um einen übergeordneten Node zu selektieren
 */
export default function BreadcrumbHeader({ einheit, lernpakete, lernziele, selectedNode, onNavigate }) {
  if (!einheit) return null;

  // Breadcrumb-Pfad aus selectedNode ableiten
  const crumbs = [];

  // Ebene 0: immer Einheit
  crumbs.push({
    type: 'einheit',
    id: einheit.id,
    label: einheit.titel_der_einheit,
    sublabel: `${einheit.fach} · Jg. ${einheit.jahrgangsstufe}`,
    ...NODE_CONFIG.einheit,
  });

  const type = selectedNode?.type;

  // Lernpaket-Kontext bestimmen
  let paketId = selectedNode?.paketId || (type === 'lernpaket' ? selectedNode?.id : null);
  const paket = paketId ? lernpakete.find(p => p.id === paketId) : null;

  // Lernziel-Kontext bestimmen
  let lernzielId = selectedNode?.lernzielId || (type === 'lernziel' ? selectedNode?.id : null);
  const lernziel = lernzielId ? lernziele.find(lz => lz.id === lernzielId) : null;

  // Wenn Lernpaket im Pfad, aus Lernziel ableiten
  if (!paket && lernziel) {
    const lp = lernpakete.find(p => p.id === lernziel.lernpaket_id);
    if (lp) {
      paketId = lp.id;
      crumbs.push({
        type: 'lernpaket', id: lp.id,
        label: lp.titel_des_pakets,
        sublabel: `Paket ${lp.reihenfolge_nummer}`,
        ...NODE_CONFIG.lernpaket,
      });
    }
  } else if (paket) {
    crumbs.push({
      type: 'lernpaket', id: paket.id,
      label: paket.titel_des_pakets,
      sublabel: `Paket ${paket.reihenfolge_nummer}`,
      ...NODE_CONFIG.lernpaket,
    });
  }

  if (lernziel) {
    crumbs.push({
      type: 'lernziel', id: lernziel.id,
      label: lernziel.formulierung_fachsprache || 'Lernziel',
      sublabel: lernziel.anforderungsebene,
      ...NODE_CONFIG.lernziel,
    });
  }

  if (type === 'aufgabe' && selectedNode?.data) {
    crumbs.push({
      type: 'aufgabe', id: selectedNode.id,
      label: selectedNode.data.baustein_typ,
      sublabel: 'Aufgabenbaustein',
      ...NODE_CONFIG.aufgabe,
    });
  }

  // "Neu"-Typen: Label generieren
  const newTypeLabels = {
    'new-lernpaket': { label: '+ Neues Lernpaket', icon: Layers, color: 'text-accent' },
    'new-lernziel':  { label: '+ Neues Lernziel',  icon: Target,  color: 'text-green-600' },
    'new-aufgabe':   { label: '+ Neuer Baustein',  icon: Puzzle,  color: 'text-purple-600' },
  };
  if (newTypeLabels[type]) {
    crumbs.push({ ...newTypeLabels[type], id: 'new', type, sublabel: '' });
  }

  const lastCrumb = crumbs[crumbs.length - 1];

  return (
    <div className="sticky top-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border">
      {/* Pfad-Zeile */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 overflow-x-auto">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Home className="w-3.5 h-3.5" />
        </Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
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
              {!isLast && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Detail-Zeile: Sublabel + Kontext des aktiven Nodes */}
      {lastCrumb?.sublabel && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{lastCrumb.sublabel}</span>
          {selectedNode?.data?.freigabe_status && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {selectedNode.data.freigabe_status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}