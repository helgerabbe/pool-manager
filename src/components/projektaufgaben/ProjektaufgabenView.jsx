import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEinheitById } from '@/services/EinheitenService';
import { getAllLernpakete } from '@/services/LernpaketService';
import { getAllLernziele } from '@/services/LernzielService';
import { getAllAufgabenbausteine } from '@/services/AufgabenbausteinService';
import { getThemenfelderByEinheit } from '@/services/ThemenfeldService';
import { getAufgabenByEinheit, updateAllgemeineAufgabe, deleteAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Plus, Star, FileText, ChevronRight, Edit, Trash2, Copy, CheckCircle2, PenLine } from 'lucide-react';
import ProjektCreateView from './ProjektCreateView';
import PublishProjektaufgabeButton from './PublishProjektaufgabeButton';
import LernlandkartePreview from '@/components/lernlandkarte/LernlandkartePreview';
import { generateInteractiveProjectCoach } from '@/utils/generateInteractiveProjectCoach';
import { toast } from 'sonner';


// ── Sterne-Anzeige (1-3, mit Reset) ──
function SternRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(star => (
        <button
          key={star}
          onClick={() => onChange(value === star ? null : star)}
          className={`text-2xl transition-transform hover:scale-110 ${
            value && value >= star ? 'text-amber-400' : 'text-gray-300'
          }`}
          title={`${star} Stern${star > 1 ? 'e' : ''}`}
        >
          ★
        </button>
      ))}
      {value && (
        <button
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-foreground ml-2"
        >
          Zurücksetzen
        </button>
      )}
    </div>
  );
}

// ── Baumstruktur-Node für Themenfeld ──
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

// ── Einzelner Aufgaben-Node im Baum ──
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
        <div className="flex gap-0.5">
          {[1, 2, 3].map(n => (
            <Star
              key={n}
              className={cn('w-3 h-3', n <= aufgabe.schwierigkeitsgrad ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// ── Detail-Panel: Allgemeine Angaben (Tab 1) ──
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
              <div className="flex gap-0.5">
                {[1, 2, 3].map(n => (
                  <Star
                    key={n}
                    className={cn('w-3 h-3', n <= aufgabe.schwierigkeitsgrad ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
                  />
                ))}
              </div>
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
          <PublishProjektaufgabeButton 
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

// ── Projekt-Coach Prompt Panel ──
function ProjektCoachPanel({ aufgabe, einheit, lernpakete, lernziele }) {
  const [copied, setCopied] = React.useState(false);

  const prompt = useMemo(
    () => generateInteractiveProjectCoach(aufgabe, einheit, lernpakete, lernziele),
    [aufgabe, einheit, lernpakete, lernziele]
  );

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Prompt in Zwischenablage kopiert');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Fehler beim Kopieren');
    }
  };

  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Keine Daten verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Projekt-Coach Prompt</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyPrompt}
          className="gap-2"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Kopiert
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Kopieren
            </>
          )}
        </Button>
      </div>

      <pre className="bg-slate-50 p-4 rounded-md text-sm whitespace-pre-wrap text-foreground border border-border overflow-auto max-h-96">
        {prompt}
      </pre>

      <p className="text-xs text-muted-foreground">
        Dieser Prompt wird für das interaktive Coaching dieser Projektaufgabe verwendet. Er beinhaltet den Socratic-Dialog und die komplette Lernlandkarte als Kontext.
      </p>
    </div>
  );
}

// ── Haupt-View für "Anwendungs- und Projektaufgaben" ──
export default function ProjektaufgabenView({
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
    queryFn: () => getEinheitById(einheitId),
  });

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => getAufgabenByEinheit(einheitId),
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => getThemenfelderByEinheit(einheitId),
  });

  const { data: allLernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => getAllLernpakete(),
  });

  // Filtere nur Pakete für diese Einheit
  const lernpakete = allLernpakete.filter(p => p.einheit_id === einheitId);

  const { data: allLernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => getAllLernziele(),
  });

  // Filtere nur Ziele für die Pakete dieser Einheit
  const lernziele = allLernziele.filter(lz => lernpakete.some(p => p.id === lz.lernpaket_id));

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => getAllAufgabenbausteine(),
  });

  // Delete-Mutation
  const deleteAufgabe = useMutation({
    mutationFn: (id) => deleteAllgemeineAufgabe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setSelectedAufgabeId(null);
    },
  });

  // Filtere nur Projektaufgaben (anforderungsebene: "3 - Projekt")
  const projektaufgaben = allgemeineAufgaben.filter(a => a.anforderungsebene === '3 - Projekt');

  // Gruppierung nach Aufgabentyp
  const gruppiertNachTyp = useMemo(() => {
    const gruppen = {
      'Anwendungsaufgabe': { titel: 'Anwendungsaufgaben', aufgaben: [] },
      'Projektaufgabe': { titel: 'Projektaufgaben', aufgaben: [] },
      '_none': { titel: 'Ohne Aufgabentyp', aufgaben: [] }
    };

    projektaufgaben.forEach(aufgabe => {
      const key = aufgabe.aufgabentyp_projekt || '_none';
      if (gruppen[key]) {
        gruppen[key].aufgaben.push(aufgabe);
      }
    });

    return Object.values(gruppen).filter(g => g.aufgaben.length > 0);
  }, [projektaufgaben]);

  const selectedAufgabe = projektaufgaben.find(a => a.id === selectedAufgabeId);



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

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {projektaufgaben.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Noch keine Aufgaben
              </p>
            ) : (
              gruppiertNachTyp.map(gruppe => (
                <div key={gruppe.titel} className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {gruppe.titel}
                  </div>
                  <div className="pl-2 space-y-0.5">
                    {gruppe.aufgaben.map(aufgabe => (
                      <AufgabeNode
                        key={aufgabe.id}
                        aufgabe={aufgabe}
                        isSelected={selectedAufgabeId === aufgabe.id}
                        onSelect={(a) => setSelectedAufgabeId(a.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Rechte Spalte: Detail-Panel */}
        {selectedAufgabe ? (
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs für Angaben, Lernlandkarte & KI-Prompt */}
            <Tabs defaultValue="angaben" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 bg-muted">
                <TabsTrigger value="angaben" className="text-xs">Angaben</TabsTrigger>
                <TabsTrigger value="lernlandkarte" className="text-xs">Lernlandkarte</TabsTrigger>
                <TabsTrigger value="ki-prompt" className="text-xs">KI-Tutor Prompt</TabsTrigger>
              </TabsList>

              {/* Tab 1: Allgemeine Angaben */}
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

              {/* Tab 2: Lernlandkarte */}
               <TabsContent value="lernlandkarte" className="flex-1 overflow-hidden m-0">
                <LernlandkartePreview
                  einheit={einheit}
                  lernpakete={lernpakete}
                  lernziele={lernziele}
                  themenfelder={themenfelder}
                  aufgabe={selectedAufgabe}
                  kannBearbeiten={kannBearbeiten}
                  onPriorityChange={(neu) => {
                   updateAllgemeineAufgabe(selectedAufgabe.id, { prioritaete_lernziele: neu });
                    queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
                  }}
                />
               </TabsContent>

               {/* Tab 3: Projekt-Coach Prompt */}
               <TabsContent value="ki-prompt" className="flex-1 overflow-y-auto m-0">
                <ProjektCoachPanel
                  aufgabe={selectedAufgabe}
                  einheit={einheit}
                  lernpakete={lernpakete}
                  lernziele={lernziele}
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
      <ProjektCreateView
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