import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Star, Target, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Ebene2MappingView from '@/components/aufgaben/Ebene2MappingView';
import AufgabenbausteinForm from '@/components/aufgaben/AufgabenbausteintForm';

function SternAnzeige({ wert }) {
  const count = wert === '1-Stern' ? 1 : wert === '2-Sterne' ? 2 : wert === '3-Sterne' ? 3 : 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          className={cn('w-3 h-3', n <= count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
        />
      ))}
    </div>
  );
}

function AufgabeKarte({ aufgabe, lernziele, mappings, isHighlighted, onSelect, isSelected }) {
  const gemappteAtome = mappings
    .filter(m => m.aufgabe_id === aufgabe.id)
    .map(m => lernziele.find(lz => lz.id === m.basisziel_id))
    .filter(Boolean);

  const hatInhalt = !!aufgabe.aufgabentext_inhalt?.trim();
  const hatMapping = gemappteAtome.length > 0;
  const istGruen = hatInhalt && hatMapping;

  return (
    <button
      onClick={() => onSelect(aufgabe)}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-all space-y-2',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : isHighlighted
            ? 'border-amber-400 bg-amber-50/60'
            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SternAnzeige wert={aufgabe.schwierigkeitsgrad} />
          {istGruen
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          }
        </div>
      </div>

      {hatInhalt && (
        <p className="text-xs text-muted-foreground line-clamp-2">{aufgabe.aufgabentext_inhalt}</p>
      )}
      {!hatInhalt && (
        <p className="text-xs text-muted-foreground/50 italic">Kein Inhalt</p>
      )}

      {/* Gemappte Atom-Badges */}
      {gemappteAtome.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {gemappteAtome.slice(0, 3).map(lz => (
            <span key={lz.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] max-w-[120px]">
              <Target className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{lz.formulierung_fachsprache}</span>
            </span>
          ))}
          {gemappteAtome.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{gemappteAtome.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

export default function TransferSaeule({
  ebene,
  lernpakete,
  lernziele,
  aufgaben,
  mappings,
  einheitId,
  kannBearbeiten,
  onAtomHighlight,
  highlightedAufgabeId,
}) {
  const queryClient = useQueryClient();
  const [selectedAufgabe, setSelectedAufgabe] = useState(null);
  const [neuFormOpen, setNeuFormOpen] = useState(null); // paketId

  const paketIds = lernpakete.map(p => p.id);
  const aufgabenEbene = aufgaben.filter(
    a => paketIds.includes(a.lernpaket_id) && a.anforderungsebene === ebene
  );

  const isTransfer = ebene === '2 - Transfer';
  const farbe = isTransfer ? 'text-blue-700' : 'text-purple-700';
  const bg    = isTransfer ? 'bg-blue-50'    : 'bg-purple-50';
  const border = isTransfer ? 'border-blue-200' : 'border-purple-200';

  const createAufgabe = useMutation({
    mutationFn: (data) => {
      const clean = { ...data, anforderungsebene: ebene };
      if (clean.lernziel_id === 'none') delete clean.lernziel_id;
      return base44.entities.Aufgabenbausteine.create(clean);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
  });

  const handleSelect = (aufgabe) => {
    const isSame = selectedAufgabe?.id === aufgabe.id;
    const next = isSame ? null : aufgabe;
    setSelectedAufgabe(next);
    // Cross-Highlight: zeige zugehörige Atome in Säule 1
    if (next) {
      const atomIds = mappings
        .filter(m => m.aufgabe_id === next.id)
        .map(m => m.basisziel_id);
      onAtomHighlight(atomIds);
    } else {
      onAtomHighlight([]);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Säulen-Header */}
      <div className={cn('px-4 py-3 border-b shrink-0', bg, border)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn('text-sm font-bold', farbe)}>
              {isTransfer ? '⚡ Transfer-Übungen' : '🏗️ Anwendungs-Projekte'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isTransfer
                ? 'Differenzierte Übungsaufgaben mit Atom-Mapping'
                : 'Komplexe Langzeitprojekte und Anwendungsaufgaben'}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">{aufgabenEbene.length}</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {aufgabenEbene.length === 0 && !selectedAufgabe && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bg)}>
              {isTransfer ? <Star className={cn('w-6 h-6', farbe)} /> : <Target className={cn('w-6 h-6', farbe)} />}
            </div>
            <div>
              <p className="text-sm font-medium">Noch keine {isTransfer ? 'Übungsaufgaben' : 'Projekte'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {kannBearbeiten ? 'Erstellen Sie die erste Aufgabe.' : 'Noch keine Aufgaben vorhanden.'}
              </p>
            </div>
          </div>
        )}

        {aufgabenEbene.map(aufgabe => (
          <AufgabeKarte
            key={aufgabe.id}
            aufgabe={aufgabe}
            lernziele={lernziele}
            mappings={mappings}
            isHighlighted={highlightedAufgabeId === aufgabe.id}
            isSelected={selectedAufgabe?.id === aufgabe.id}
            onSelect={handleSelect}
          />
        ))}

        {/* Mapping-Panel für ausgewählte Aufgabe */}
        {selectedAufgabe && (
          <div className="mt-2 rounded-xl border-2 border-primary/20 bg-primary/5 overflow-hidden">
            <div className="px-3 py-2 bg-primary/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">Mapping-Editor</span>
              <button
                onClick={() => { setSelectedAufgabe(null); onAtomHighlight([]); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕ Schließen
              </button>
            </div>
            <div className="p-3">
              <Ebene2MappingView
                aufgabe={selectedAufgabe}
                lernpaketId={selectedAufgabe.lernpaket_id}
                einheitId={einheitId}
                kannBearbeiten={kannBearbeiten}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Neue Aufgabe */}
      {kannBearbeiten && lernpakete.length > 0 && !selectedAufgabe && (
        <div className="shrink-0 p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
            onClick={() => setNeuFormOpen(lernpakete[0].id)}
          >
            <Plus className="w-3.5 h-3.5" />
            {isTransfer ? 'Neue Übungsaufgabe' : 'Neues Projekt'}
          </Button>
        </div>
      )}

      <AufgabenbausteinForm
        open={!!neuFormOpen}
        onOpenChange={(open) => { if (!open) setNeuFormOpen(null); }}
        onSubmit={(data) => createAufgabe.mutate({ ...data, lernpaket_id: neuFormOpen })}
        lernziele={lernziele}
      />
    </div>
  );
}