import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Kompakte Lernziel-Anzeige mit Priorisierung ──
function LernzielCompact({ lernziel, isPrioritized = false, onTogglePriority, kannBearbeiten = false }) {
  const angezeigterText = lernziel.schueler_uebersetzung || lernziel.formulierung_fachsprache;
  
  return (
    <div className={cn('flex items-start gap-2 py-1.5 px-2 rounded text-xs', kannBearbeiten ? 'hover:bg-muted/50' : '')}>
      <span className={cn('font-bold mt-0.5', isPrioritized ? 'text-amber-500 text-lg' : 'text-primary')}>
        {isPrioritized ? '★' : '•'}
      </span>
      <div className="flex-1">
        <p className="text-sm">{angezeigterText}</p>
        {lernziel.kategorie && (
          <Badge variant="secondary" className="text-[9px] mt-0.5">
            {lernziel.kategorie}
          </Badge>
        )}
      </div>
      {kannBearbeiten && onTogglePriority && (
        <input
          type="checkbox"
          checked={isPrioritized}
          onChange={() => onTogglePriority(lernziel.id)}
          className="mt-1 w-4 h-4 cursor-pointer"
          title="Hohe Priorität für diese Aufgabe"
        />
      )}
    </div>
  );
}

// ── Kompaktes Lernpaket-Akkordeon ──
function LernpaketAccordion({ lernpaket, lernziele, prioritaeteZiele = [], onTogglePriority, kannBearbeiten = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === lernpaket.id);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', !isOpen && '-rotate-90')} />
        <span className="text-xs font-semibold text-muted-foreground">
          {lernpaket.reihenfolge_nummer}. {lernpaket.titel_des_pakets}
        </span>
        {paketZiele.length > 0 && (
          <Badge variant="secondary" className="text-[9px] ml-auto">
            {paketZiele.length}
          </Badge>
        )}
      </button>
      
      {isOpen && paketZiele.length > 0 && (
        <div className="px-3 pb-2 bg-muted/20 space-y-1">
          {paketZiele.map(ziel => (
            <LernzielCompact
              key={ziel.id}
              lernziel={ziel}
              isPrioritized={prioritaeteZiele.includes(ziel.id)}
              onTogglePriority={onTogglePriority}
              kannBearbeiten={kannBearbeiten}
            />
          ))}
        </div>
      )}
      
      {isOpen && paketZiele.length === 0 && (
        <div className="px-3 pb-2 bg-muted/20 text-xs text-muted-foreground italic">
          Keine Lernziele zugeordnet
        </div>
      )}
    </div>
  );
}

// ── Kompaktes Themenfeld-Akkordeon ──
function ThemenfeldAccordion({ themenfeld, lernpakete, lernziele, prioritaeteZiele = [], onTogglePriority, kannBearbeiten = false }) {
  const [isOpen, setIsOpen] = useState(true);
  const paketeFuerThemenfeld = lernpakete.filter(p => p.themenfeld_id === themenfeld.id);

  return (
    <div className="border rounded-lg border-border overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/50 transition-colors text-left font-semibold text-sm"
      >
        <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', !isOpen && '-rotate-90')} />
        <BookOpen className="w-4 h-4 text-primary" />
        {themenfeld.titel}
        <Badge variant="secondary" className="text-[9px] ml-auto">
          {paketeFuerThemenfeld.length}
        </Badge>
      </button>

      {isOpen && (
        <div className="border-t border-border bg-muted/30">
          {paketeFuerThemenfeld
            .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
            .map(paket => (
              <LernpaketAccordion
                key={paket.id}
                lernpaket={paket}
                lernziele={lernziele}
                prioritaeteZiele={prioritaeteZiele}
                onTogglePriority={onTogglePriority}
                kannBearbeiten={kannBearbeiten}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ── Hauptkomponente: Kompakte Lernlandkarte ──
export default function LernlandkartePreview({
  einheit,
  lernpakete,
  lernziele,
  themenfelder,
  aufgabe,
  kannBearbeiten = false,
  onPriorityChange,
}) {
  const { data: mappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings'],
    queryFn: () => base44.entities.AllgemeineAufgabeLernzielMapping.list(),
  });

  const paketeFuerEinheit = lernpakete.filter(p => p.einheit_id === einheit?.id);
  const zieleFuerEinheit = lernziele.filter(lz => 
    paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  const prioritaeteZiele = aufgabe?.prioritaete_lernziele || [];
  
  const handleTogglePriority = (zielId) => {
    const neu = prioritaeteZiele.includes(zielId)
      ? prioritaeteZiele.filter(id => id !== zielId)
      : [...prioritaeteZiele, zielId];
    onPriorityChange?.(neu);
  };

  // Unzugeordnete Lernziele (Lernziele, deren Pakete kein Themenfeld haben)
  const unzugeordneteZiele = lernziele.filter(lz => {
    const paket = paketeFuerEinheit.find(p => p.id === lz.lernpaket_id);
    return paket && !paket.themenfeld_id;
  });

  // Alle Themenfelder für diese Einheit, die Pakete enthalten
  const themenfeldMitPaketen = themenfelder
    .filter(tf => paketeFuerEinheit.some(p => p.themenfeld_id === tf.id))
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

  // Pakete ohne Themenfeld-Zuordnung
  const unzugeordnetePakete = paketeFuerEinheit.filter(p => !p.themenfeld_id);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Kompakter Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="max-w-4xl space-y-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {einheit?.fach} • Klasse {einheit?.jahrgangsstufe}
            </p>
            <h2 className="text-sm font-bold">{einheit?.titel_der_einheit}</h2>
          </div>
          {einheit?.gesamtziel && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {einheit.gesamtziel}
            </p>
          )}
        </div>
      </div>

      {/* Info-Banner für editierbar */}
      {kannBearbeiten && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          ☆ Aktiviere die Checkbox neben einem Lernziel, um es als höchste Priorität zu markieren
        </div>
      )}

      {/* Scroll-Bereich mit Akkordeons */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-4xl space-y-3">
          {themenfeldMitPaketen.length > 0 ? (
            themenfeldMitPaketen.map(themenfeld => (
              <ThemenfeldAccordion
                key={themenfeld.id}
                themenfeld={themenfeld}
                lernpakete={paketeFuerEinheit}
                lernziele={zieleFuerEinheit}
                prioritaeteZiele={prioritaeteZiele}
                onTogglePriority={handleTogglePriority}
                kannBearbeiten={kannBearbeiten}
              />
            ))
          ) : null}
          
          {/* Pseudo-Themenfeld für Nicht-Zugeordnete Lernpakete */}
          {unzugeordnetePakete.length > 0 && (
            <div className="border rounded-lg border-border overflow-hidden mb-3">
              <div className="border-t border-border bg-muted/30">
                <div className="px-3 py-2 space-y-1">
                  {unzugeordnetePakete
                    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
                    .map(paket => (
                      <LernpaketAccordion
                        key={paket.id}
                        lernpaket={paket}
                        lernziele={zieleFuerEinheit}
                        prioritaeteZiele={prioritaeteZiele}
                        onTogglePriority={handleTogglePriority}
                        kannBearbeiten={kannBearbeiten}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Pseudo-Themenfeld für Nicht-Zugeordnete Lernziele */}
          {unzugeordneteZiele.length > 0 && (
            <div className="border rounded-lg border-border overflow-hidden mb-3">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/50 transition-colors text-left font-semibold text-sm">
                <ChevronDown className="w-4 h-4 shrink-0" />
                <BookOpen className="w-4 h-4 text-primary" />
                Nicht zugeordnete Lernziele
                <Badge variant="secondary" className="text-[9px] ml-auto">
                  {unzugeordneteZiele.length}
                </Badge>
              </button>
              <div className="border-t border-border bg-muted/30">
                <div className="px-3 py-2 space-y-1">
                  {unzugeordneteZiele.map(ziel => (
                    <LernzielCompact
                      key={ziel.id}
                      lernziel={ziel}
                      isPrioritized={prioritaeteZiele.includes(ziel.id)}
                      onTogglePriority={handleTogglePriority}
                      kannBearbeiten={kannBearbeiten}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {themenfeldMitPaketen.length === 0 && unzugeordnetePakete.length === 0 && unzugeordneteZiele.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Keine Inhalte vorhanden
            </p>
          )}
        </div>
      </div>
    </div>
  );
}