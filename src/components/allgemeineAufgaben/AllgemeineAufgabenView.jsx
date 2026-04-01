import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Search, Star, FileText, AlertTriangle, CheckCircle2, Grip } from 'lucide-react';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';

/**
 * Schwierigkeitsgrad-Anzeige (1-3 Sterne)
 */
function SternDisplay({ grad }) {
  const count = grad === 1 ? 1 : grad === 2 ? 2 : grad === 3 ? 3 : 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          className={cn('w-3.5 h-3.5', n <= count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
        />
      ))}
    </div>
  );
}

/**
 * Status-Badge (Vollständig/Unvollständig)
 */
function StatusBadge({ hatInhalt, hatTitel }) {
  const istVollstaendig = hatInhalt && hatTitel;
  return (
    <Badge
      className={cn(
        'text-[10px] px-2 py-0.5',
        istVollstaendig
          ? 'bg-green-100 text-green-700'
          : 'bg-amber-100 text-amber-700'
      )}
    >
      {istVollstaendig ? '✓ Fertig' : '⚠ Unvollständig'}
    </Badge>
  );
}

/**
 * Einzelne Aufgaben-Karte
 */
function AufgabeCard({ aufgabe, isSelected, onSelect, kannBearbeiten, onEdit }) {
  const hatTitel = !!aufgabe.titel?.trim();
  const hatInhalt = !!aufgabe.aufgabenstellung?.trim();
  const hatMaterialien = aufgabe.materialien && aufgabe.materialien.length > 0;
  const istVollstaendig = hatTitel && hatInhalt;

  return (
    <button
      onClick={() => onSelect(aufgabe)}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all space-y-3 hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
          : 'border-border bg-card hover:border-primary/40'
      )}
    >
      {/* Header: Schwierigkeit + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {aufgabe.schwierigkeitsgrad ? (
            <SternDisplay grad={aufgabe.schwierigkeitsgrad} />
          ) : (
            <span className="text-xs text-muted-foreground italic">Keine Schwierigkeit</span>
          )}
        </div>
        <StatusBadge hatInhalt={hatInhalt} hatTitel={hatTitel} />
      </div>

      {/* Titel */}
      <div>
        <p className="text-sm font-semibold line-clamp-2">
          {hatTitel ? aufgabe.titel : <span className="text-muted-foreground italic">Kein Titel</span>}
        </p>
      </div>

      {/* Aufgabenstellung (Preview) */}
      {hatInhalt && (
        <p className="text-xs text-muted-foreground line-clamp-2">{aufgabe.aufgabenstellung}</p>
      )}

      {/* Materialien Badge */}
      {hatMaterialien && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span>{aufgabe.materialien.length} Material(ien)</span>
        </div>
      )}

      {/* Sync-Status */}
      {aufgabe.sync_status && aufgabe.sync_status !== 'new' && (
        <div className="text-[10px] text-muted-foreground">
          Status: <span className="font-medium">{aufgabe.sync_status === 'exported' ? 'Exportiert' : 'Geändert'}</span>
        </div>
      )}
    </button>
  );
}

/**
 * Kategorien-Gruppe (z.B. Themenfelder)
 */
function AufgabenGruppe({ titel, aufgaben, selectedId, onSelect, kannBearbeiten }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{titel}</h3>
        <Badge variant="outline" className="text-xs">{aufgaben.length}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {aufgaben.map(aufgabe => (
          <AufgabeCard
            key={aufgabe.id}
            aufgabe={aufgabe}
            isSelected={selectedId === aufgabe.id}
            onSelect={onSelect}
            kannBearbeiten={kannBearbeiten}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Haupt-View für "Allgemeine Aufgaben"
 */
export default function AllgemeineAufgabenView({
  einheitId,
  kannBearbeiten = false,
}) {
  const queryClient = useQueryClient();
  const [selectedAufgabeId, setSelectedAufgabeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createFormOpen, setCreateFormOpen] = useState(false);

  // Daten abrufen
  const { data: einheit } = useQuery({
    queryKey: ['einheiten', einheitId],
    queryFn: () => base44.entities.Einheiten.filter({ id: einheitId }).then(r => r[0]),
  });

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () =>
      base44.entities.AllgemeineAufgabe.filter({
        einheit_id: einheitId,
      }),
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () =>
      base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
  });

  // Filterung & Gruppierung
  const gefiltert = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return allgemeineAufgaben.filter(a =>
      a.titel?.toLowerCase().includes(lower) ||
      a.aufgabenstellung?.toLowerCase().includes(lower)
    );
  }, [allgemeineAufgaben, searchTerm]);

  const gruppiertNachThemenfeld = useMemo(() => {
    const gruppen = {};

    // Themenfeld-Gruppen vorinitialisieren
    themenfelder.forEach(tf => {
      gruppen[tf.id] = { titel: tf.titel, aufgaben: [], themenfeld: tf };
    });

    // Ohne Themenfeld
    gruppen['_none'] = { titel: 'Ohne Themenfeld', aufgaben: [], themenfeld: null };

    // Aufgaben verteilen
    gefiltert.forEach(aufgabe => {
      const key = aufgabe.themenfeld_id || '_none';
      if (gruppen[key]) {
        gruppen[key].aufgaben.push(aufgabe);
      }
    });

    return Object.values(gruppen).filter(g => g.aufgaben.length > 0);
  }, [gefiltert, themenfelder]);

  const selectedAufgabe = allgemeineAufgaben.find(a => a.id === selectedAufgabeId);

  return (
    <div className="h-full flex flex-col gap-2 p-4 bg-background overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Allgemeine Aufgaben</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {einheit?.fach} • {einheit?.titel_der_einheit}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Suchfeld */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nach Aufgaben suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {gefiltert.length} Aufgabe(n)
        </Badge>

        {/* Neue Aufgabe Button */}
        {kannBearbeiten && (
          <Button
            size="sm"
            onClick={() => setCreateFormOpen(true)}
            className="gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Neue Aufgabe
          </Button>
        )}
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
        {gefiltert.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">
              {searchTerm ? 'Keine Aufgaben gefunden' : 'Noch keine Aufgaben'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {kannBearbeiten
                ? 'Erstellen Sie Ihre erste Aufgabe mit dem Button oben.'
                : 'Noch keine Aufgaben vorhanden.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {gruppiertNachThemenfeld.map(gruppe => (
              <AufgabenGruppe
                key={gruppe.titel}
                titel={gruppe.titel}
                aufgaben={gruppe.aufgaben}
                selectedId={selectedAufgabeId}
                onSelect={(a) => setSelectedAufgabeId(a.id)}
                kannBearbeiten={kannBearbeiten}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <AufgabeCreateView
        open={createFormOpen}
        onOpenChange={setCreateFormOpen}
        einheitId={einheitId}
        themenfelder={themenfelder}
        onSuccess={() => {
          setCreateFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
        }}
      />
    </div>
  );
}