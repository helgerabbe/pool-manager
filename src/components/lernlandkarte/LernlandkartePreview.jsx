import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Kompakte Lernziel-Anzeige ──
function LernzielCompact({ lernziel }) {
  const angezeigterText = lernziel.schueler_uebersetzung || lernziel.formulierung_fachsprache;
  
  return (
    <div className="flex items-start gap-2 py-1.5 px-2 hover:bg-muted/50 rounded text-xs">
      <span className="text-primary font-bold mt-0.5">•</span>
      <div className="flex-1">
        <p className="text-sm">{angezeigterText}</p>
        {lernziel.kategorie && (
          <Badge variant="secondary" className="text-[9px] mt-0.5">
            {lernziel.kategorie}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Kompaktes Lernpaket-Akkordeon ──
function LernpaketAccordion({ lernpaket, lernziele }) {
  const [isOpen, setIsOpen] = useState(false);
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === lernpaket.id);

  if (paketZiele.length === 0) return null;

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
        <Badge variant="secondary" className="text-[9px] ml-auto">
          {paketZiele.length}
        </Badge>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-2 bg-muted/20 space-y-1">
          {paketZiele.map(ziel => (
            <LernzielCompact key={ziel.id} lernziel={ziel} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kompaktes Themenfeld-Akkordeon ──
function ThemenfeldAccordion({ themenfeld, lernpakete, lernziele }) {
  const [isOpen, setIsOpen] = useState(true);
  const paketeFuerThemenfeld = lernpakete.filter(p => p.themenfeld_id === themenfeld.id);

  if (paketeFuerThemenfeld.length === 0) return null;

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
}) {
  const { data: mappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings'],
    queryFn: () => base44.entities.AllgemeineAufgabeLernzielMapping.list(),
  });

  const paketeFuerEinheit = lernpakete.filter(p => p.einheit_id === einheit?.id);
  const zieleFuerEinheit = lernziele.filter(lz => 
    paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  // Unzugeordnete Lernziele
  const unzugeordneteZiele = lernziele.filter(lz => 
    !paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  const themenfeldMitPaketen = themenfelder
    .filter(tf => paketeFuerEinheit.some(p => p.themenfeld_id === tf.id))
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

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
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Keine Inhalte vorhanden
            </p>
          )}
          
          {/* Unzugeordnete Lernziele */}
          {unzugeordneteZiele.length > 0 && (
            <div className="border rounded-lg border-border overflow-hidden">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/50 transition-colors text-left font-semibold text-sm">
                <BookOpen className="w-4 h-4 text-primary" />
                Nicht zugeordnete Lernziele
                <Badge variant="secondary" className="text-[9px] ml-auto">
                  {unzugeordneteZiele.length}
                </Badge>
              </button>
              <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1">
                {unzugeordneteZiele.map(ziel => (
                  <LernzielCompact key={ziel.id} lernziel={ziel} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}