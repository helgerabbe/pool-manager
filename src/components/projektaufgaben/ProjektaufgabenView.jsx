import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Layers } from 'lucide-react';
import ProjektCreateView from './ProjektCreateView';
import { toast } from 'sonner';

// ── Sterne-Anzeige ──
function SternDisplay({ value }) {
  if (!value) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= value ? 'text-amber-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </div>
  );
}

// ── Aufgaben-Card ──
function ProjektCard({ aufgabe, onEdit }) {
  const materialCount = aufgabe.materialien?.length || 0;

  return (
    <button
      onClick={onEdit}
      className="w-full p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {aufgabe.titel && (
            <p className="font-semibold text-foreground truncate">{aufgabe.titel}</p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {aufgabe.aufgabenstellung}
          </p>
        </div>
        {aufgabe.schwierigkeitsgrad && (
          <SternDisplay value={aufgabe.schwierigkeitsgrad} />
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {materialCount > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            📦 {materialCount} Material{materialCount > 1 ? 'ien' : ''}
          </Badge>
        )}
      </div>
    </button>
  );
}

// ── Haupt-Ansicht ──
export default function ProjektaufgabenView({ einheitId, kannBearbeiten }) {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch alle AllgemeineAufgaben (Level 3)
  const { data: allAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben'],
    queryFn: () => base44.entities.AllgemeineAufgabe.list(),
    enabled: !!einheitId,
  });

  const aufgaben = allAufgaben.filter(a => a.einheit_id === einheitId);

  // Suchfilter
  const gefiltert = useMemo(() => {
    if (!search.trim()) return aufgaben;
    const q = search.toLowerCase();
    return aufgaben.filter(a => 
      (a.titel?.toLowerCase() || '').includes(q) ||
      (a.aufgabenstellung?.toLowerCase() || '').includes(q)
    );
  }, [aufgaben, search]);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Anwendungs- und Projektaufgaben</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Komplexe Aufgaben für die Anwendung und Integration von Gelerntem
            </p>
          </div>
          {kannBearbeiten && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Neue Aufgabe
            </Button>
          )}
        </div>

        {/* Suchfeld */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nach Titel oder Inhalt suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {gefiltert.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <Layers className="w-8 h-8 text-muted-foreground/40" />
            <div>
              <p className="font-semibold text-foreground">
                {search ? 'Keine Aufgaben gefunden' : 'Noch keine Aufgaben'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search 
                  ? 'Versuchen Sie eine andere Suchanfrage.' 
                  : kannBearbeiten
                    ? 'Erstellen Sie jetzt die erste Anwendungs- und Projektaufgabe.'
                    : 'Es wurden noch keine Aufgaben erstellt.'
                }
              </p>
            </div>
            {kannBearbeiten && !search && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 mt-2">
                <Plus className="w-4 h-4" /> Erste Aufgabe erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 max-w-4xl">
            {gefiltert.map(aufgabe => (
              <ProjektCard
                key={aufgabe.id}
                aufgabe={aufgabe}
                onEdit={() => {
                  toast.info('Bearbeitungsfunktion folgt…');
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <ProjektCreateView
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        einheitId={einheitId}
        onSuccess={() => {
          setSearch('');
        }}
      />
    </div>
  );
}