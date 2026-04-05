import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Plus, Star, FileText, ChevronRight, Edit, Trash2, CheckCircle2, PenLine } from 'lucide-react';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';
import AufgabeKompetenzMapping from '@/components/allgemeineAufgaben/AufgabeKompetenzMapping';
import AITutorPromptPanel from '@/components/allgemeineAufgaben/AITutorPromptPanel';
import InlineBasisLernzielSelector from '@/components/allgemeineAufgaben/InlineBasisLernzielSelector';
import PublishAllgemeineAufgabeButton from '@/components/allgemeineAufgaben/PublishAllgemeineAufgabeButton';
import ErwartungshorizontTab from '@/components/allgemeineAufgaben/ErwartungshorizontTab';

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
          className={cn('w-3 h-3', n <= count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
        />
      ))}
    </div>
  );
}

/**
 * Baumstruktur-Node für Themenfeld
 */
function ThemenfeldNode({ themenfeld, aufgaben, selectedId, onSelect }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className={cn('w-4 h-4 transition-transform shrink-0', isOpen && 'rotate-90')} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
          {themenfeld.titel}
        </span>
        <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
          {aufgaben.length}
        </Badge>
      </button>

      {isOpen && (
        <div className="pl-4 space-y-0.5">
          {aufgaben.map(aufgabe => (
            <AufgabeNode
              key={aufgabe.id}
              aufgabe={aufgabe}
              isSelected={selectedId === aufgabe.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Einzelner Aufgaben-Node im Baum
 */
function AufgabeNode({ aufgabe, isSelected, onSelect }) {
  const hatTitel = !!aufgabe.titel?.trim();
  const isApproved = aufgabe.content_status === 'approved';
  return (
    <button
      onClick={() => onSelect(aufgabe)}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/50'
      )}
    >
      {isApproved
        ? <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
        : <PenLine className="w-3 h-3 text-amber-500 shrink-0" />
      }
      <span className={cn('truncate flex-1', !hatTitel && 'italic text-muted-foreground')}>
        {hatTitel ? aufgabe.titel : 'Kein Titel'}
      </span>
      {aufgabe.schwierigkeitsgrad && (
        <SternDisplay grad={aufgabe.schwierigkeitsgrad} />
      )}
    </button>
  );
}

/**
 * Detail-Panel: Allgemeine Angaben (Tab 1)
 */
function AllgemeineAngabenPanel({ aufgabe, themenfelder, kannBearbeiten, onEdit, onDelete }) {
  const hatTitel = !!aufgabe.titel?.trim();
  const hatInhalt = !!aufgabe.aufgabenstellung?.trim();

  return (
    <div className="space-y-6 p-6">

      {/* Metadaten */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border">
        <div>
          <p className="text-xs text-muted-foreground">Schwierigkeitsgrad</p>
          <div className="mt-1">
            {aufgabe.schwierigkeitsgrad ? (
              <SternDisplay grad={aufgabe.schwierigkeitsgrad} />
            ) : (
              <span className="text-xs text-muted-foreground">Nicht gesetzt</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Freigabe-Status</p>
          <Badge className={cn('mt-1 flex items-center gap-1 w-fit',
            aufgabe.content_status === 'approved'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-amber-100 text-amber-700 border border-amber-300'
          )}>
            {aufgabe.content_status === 'approved'
              ? <><CheckCircle2 className="w-3 h-3" /> Freigegeben</>
              : <><PenLine className="w-3 h-3" /> In Bearbeitung</>
            }
          </Badge>
        </div>
      </div>

      {/* Aufgabenstellung */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Aufgabenstellung</p>
        <div className="p-3 rounded-lg bg-muted/20 border border-border text-sm whitespace-pre-wrap">
          {aufgabe.aufgabenstellung || <span className="text-muted-foreground italic">Nicht vorhanden</span>}
        </div>
      </div>

      {/* Materialien */}
      {aufgabe.materialien && aufgabe.materialien.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Materialien ({aufgabe.materialien.length})</p>
          <div className="space-y-2">
            {aufgabe.materialien.map((mat, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <p className="font-medium mb-0.5">
                  {mat.type === 'freitext' && '📝'} {mat.type === 'pdf' && '📄'} {mat.type === 'image' && '🖼️'} {mat.type === 'book_ref' && '📚'}
                  {' '}{mat.label || mat.content || mat.url || '…'}
                </p>
                {mat.content && <p className="text-muted-foreground line-clamp-2">{mat.content}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktionen */}
      {kannBearbeiten && (
        <div className="flex gap-2 pt-4 border-t border-border flex-wrap">
          {aufgabe.content_status === 'approved' ? (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
              🔒 Freigegeben – Freigabe aufheben um zu bearbeiten
            </p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(aufgabe)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </Button>
          )}
          <PublishAllgemeineAufgabeButton 
            aufgabe={aufgabe} 
            kannBearbeiten={kannBearbeiten}
          />
          {aufgabe.content_status !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(aufgabe.id)}
              className="gap-2 text-destructive hover:text-destructive ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </Button>
          )}
        </div>
      )}
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
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingAufgabe, setEditingAufgabe] = useState(null);

  // Daten abrufen
  const { data: einheit } = useQuery({
    queryKey: ['einheiten', einheitId],
    queryFn: () => base44.entities.Einheiten.filter({ id: einheitId }).then(r => r[0]),
  });

  const { data: allAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () =>
      base44.entities.AllgemeineAufgabe.filter({
        einheit_id: einheitId,
      }),
  });

  // Filtere nur Basis- und Transfer-Aufgaben (nicht Projekt-Aufgaben)
  const allgemeineAufgaben = allAufgaben.filter(a => 
    !a.anforderungsebene || ['1 - Basis', '2 - Transfer'].includes(a.anforderungsebene)
  );

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () =>
      base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const { data: mappedLernziele = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings', selectedAufgabeId],
    queryFn: () =>
      selectedAufgabeId
        ? base44.entities.AllgemeineAufgabeLernzielMapping.filter({
            aufgabe_id: selectedAufgabeId,
          })
        : Promise.resolve([]),
    enabled: !!selectedAufgabeId,
  });

  const { data: alleLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });

  const { data: mappedBasisLernziele = [] } = useQuery({
    queryKey: ['allgemeineAufgabeBasisMappings', selectedAufgabeId],
    queryFn: () =>
      selectedAufgabeId
        ? base44.entities.AllgemeineAufgabeBasisLernzielMapping.filter({
            aufgabe_id: selectedAufgabeId,
          })
        : Promise.resolve([]),
    enabled: !!selectedAufgabeId,
  });

  const { data: basisLernziele = [] } = useQuery({
    queryKey: ['basisLernziele'],
    queryFn: () => base44.entities.BasisLernziel.list(),
  });

  const { data: basismodule = [] } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => base44.entities.Basismodul.list(),
  });

  // Effektive Basis-Lernziele aus Mappings
  const effectiveMappedBasisLernziele = useMemo(() => {
    if (!selectedAufgabeId || mappedBasisLernziele.length === 0) return [];
    return mappedBasisLernziele
      .map((m) => basisLernziele.find((lz) => lz.id === m.basislernziel_id))
      .filter(Boolean);
  }, [selectedAufgabeId, mappedBasisLernziele, basisLernziele]);

  // Memoized: Gefilterte Lernziele basierend auf aktueller Mapping-Query
  const effectiveMappedLernziele = useMemo(() => {
    if (!selectedAufgabeId || mappedLernziele.length === 0) return [];
    return mappedLernziele
      .map((m) => alleLernziele.find((lz) => lz.id === m.lernziel_id))
      .filter(Boolean);
  }, [selectedAufgabeId, mappedLernziele, alleLernziele]);

  // Delete-Mutation
  const deleteAufgabe = useMutation({
    mutationFn: (id) => base44.entities.AllgemeineAufgabe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setSelectedAufgabeId(null);
    },
  });

  // Gruppierung nach Themenfeld
  const gruppiertNachThemenfeld = useMemo(() => {
    const gruppen = {};

    // Themenfeld-Gruppen vorinitialisieren
    themenfelder.forEach(tf => {
      gruppen[tf.id] = { titel: tf.titel, aufgaben: [], themenfeld: tf };
    });

    // Ohne Themenfeld
    gruppen['_none'] = { titel: 'Ohne Themenfeld', aufgaben: [], themenfeld: null };

    // Aufgaben verteilen
    allgemeineAufgaben.forEach(aufgabe => {
      const key = aufgabe.themenfeld_id || '_none';
      if (gruppen[key]) {
        gruppen[key].aufgaben.push(aufgabe);
      }
    });

    return Object.values(gruppen).filter(g => g.aufgaben.length > 0);
  }, [allgemeineAufgaben, themenfelder]);

  const selectedAufgabe = allgemeineAufgaben.find(a => a.id === selectedAufgabeId);

  return (
    <div className="flex flex-col flex-1 h-full bg-background overflow-hidden">
      {/* Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Linke Spalte: Sidebar mit Baumstruktur */}
        <aside className="w-80 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
          {/* Button für neue Aufgabe */}
          {kannBearbeiten && (
            <div className="shrink-0 px-4 py-3 border-b border-border">
              <Button
                size="sm"
                onClick={() => {
                  setEditingAufgabe(null);
                  setCreateFormOpen(true);
                }}
                className="gap-2 w-full"
              >
                <Plus className="w-4 h-4" />
                Neue Aufgabe
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {allgemeineAufgaben.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Noch keine Aufgaben
              </p>
            ) : (
              gruppiertNachThemenfeld.map(gruppe => (
                <ThemenfeldNode
                  key={gruppe.titel}
                  themenfeld={gruppe.themenfeld || { id: '_none', titel: gruppe.titel }}
                  aufgaben={gruppe.aufgaben}
                  selectedId={selectedAufgabeId}
                  onSelect={(a) => setSelectedAufgabeId(a.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Rechte Spalte: Detail-Panel */}
        {selectedAufgabe ? (
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs für Angaben & Kompetenzen */}
            <Tabs defaultValue="angaben" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 bg-muted">
                <TabsTrigger value="angaben" className="text-xs">Kernangaben</TabsTrigger>
                <TabsTrigger value="kompetenzen" className="text-xs">Kompetenzzuordnung</TabsTrigger>
                <TabsTrigger value="erwartungshorizont" className="text-xs">Erwartungshorizont</TabsTrigger>
                <TabsTrigger value="ki-prompt" className="text-xs">KI-Tutor Prompt</TabsTrigger>
              </TabsList>

              {/* Tab 1: Kernangaben */}
              <TabsContent value="angaben" className="flex-1 overflow-y-auto m-0">
                <AllgemeineAngabenPanel
                  aufgabe={selectedAufgabe}
                  themenfelder={themenfelder}
                  kannBearbeiten={kannBearbeiten}
                  onEdit={(a) => {
                    setEditingAufgabe(a);
                    setCreateFormOpen(true);
                  }}
                  onDelete={(id) => deleteAufgabe.mutate(id)}
                />
              </TabsContent>

              {/* Tab 2: Kompetenzzuordnung */}
              <TabsContent value="kompetenzen" className="flex-1 overflow-hidden m-0">
               <AufgabeKompetenzMapping
                 aufgabe={selectedAufgabe}
                 einheit={einheit}
                 einheitId={einheitId}
                 onComplete={() => {}}
               />
              </TabsContent>

              {/* Tab 3: Erwartungshorizont */}
              <TabsContent value="erwartungshorizont" className="flex-1 overflow-hidden m-0">
                <ErwartungshorizontTab
                  aufgabe={selectedAufgabe}
                  einheit={einheit}
                  mappedLernziele={effectiveMappedLernziele}
                  mappedBasisLernziele={effectiveMappedBasisLernziele}
                  kannBearbeiten={kannBearbeiten}
                />
              </TabsContent>

              {/* Tab 4: KI-Tutor Prompt */}
              <TabsContent value="ki-prompt" className="flex-1 overflow-y-auto m-0">
                <AITutorPromptPanel
                  aufgabe={selectedAufgabe}
                  mappedLernziele={effectiveMappedLernziele}
                  mappedBasisLernziele={effectiveMappedBasisLernziele}
                  lernpakete={lernpakete}
                  basismodule={basismodule}
                  einheit={einheit}
                />
              </TabsContent>
              </Tabs>
          </main>
        ) : (
          <main className="flex-1 flex items-center justify-center text-center">
            <div>
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Wählen Sie eine Aufgabe aus, um Details zu sehen
              </p>
            </div>
          </main>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <AufgabeCreateView
        open={createFormOpen}
        onOpenChange={setCreateFormOpen}
        einheitId={einheitId}
        themenfelder={themenfelder}
        initialData={editingAufgabe}
        onSuccess={() => {
          setCreateFormOpen(false);
          setEditingAufgabe(null);
          queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
        }}
      />
    </div>
  );
}