/**
 * TaskCreationView.jsx
 *
 * Ebene 3: Aufgaben erstellen — Two-Pane Layout
 *
 * LINKS:  Sidebar mit allen Aktivitäten der Einheit (gruppiert nach Lernpaket/Phase)
 * RECHTS: Masteraufgaben + Replikate der gewählten Aktivität
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Plus, Repeat2, ChevronRight, BookOpen, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import MasterTaskModal from '@/components/aufgaben/MasterTaskModal';
import { secureApi } from '@/api/secureApi';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar: Aktivitäten-Liste
// ─────────────────────────────────────────────────────────────────────────────

function ActivitySidebar({ einheitId, selectedActivityId, onSelect }) {
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId,
  });

  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    enabled: !!einheitId,
  });

  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const paketeFuerEinheit = lernpakete.filter(p => p.einheit_id === einheitId);

  return (
    <aside className="w-80 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">Aktivitäten</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Wähle eine Aktivität aus</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {paketeFuerEinheit.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">Keine Lernpakete vorhanden.</p>
        )}
        {paketeFuerEinheit.map(paket => {
          const aktivitaetenDesPakets = phaseAktivitaeten.filter(a => a.lernpaket_id === paket.id);
          if (aktivitaetenDesPakets.length === 0) return null;

          return (
            <div key={paket.id}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                {paket.titel_des_pakets}
              </p>
              <div className="space-y-1">
                {aktivitaetenDesPakets.map(activity => {
                  const kat = katalog.find(k => k.id === activity.aktivitaet_id);
                  const isSelected = selectedActivityId === activity.id;
                  return (
                    <button
                      key={activity.id}
                      onClick={() => onSelect(activity.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      )}>
                        {activity.phase}
                      </span>
                      <span className="truncate flex-1">{kat?.name || '…'}</span>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aufgaben-Karte (Master oder Replikat)
// ─────────────────────────────────────────────────────────────────────────────

function AufgabeCard({ aufgabe, isMaster, onGenerateReplicas, einheit }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await secureApi.generateReplicas(aufgabe.id, 5);
      // Replicas speichern
      await Promise.all(result.replicas.map(r =>
        base44.entities.Aufgabenbausteine.create({
          lernpaket_id: aufgabe.lernpaket_id,
          lernziel_id: aufgabe.lernziel_id || null,
          baustein_typ: aufgabe.baustein_typ,
          aufgabentext_inhalt: r.aufgabentext,
          erwartungshorizont_ki_prompt: r.loesung,
          master_id: aufgabe.id,
          is_master: false,
          activity_type: aufgabe.activity_type,
        })
      ));
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      toast.success(`${result.replicas.length} Replikate erstellt`);
    } catch (e) {
      toast.error(`Replikation fehlgeschlagen: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-all',
      isMaster
        ? 'border-primary/40 bg-primary/5 shadow-sm'
        : 'border-border bg-card hover:border-primary/20'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isMaster ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                ⭐ Master
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <Copy className="w-2.5 h-2.5 mr-1" />
                Replikat
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{aufgabe.baustein_typ}</Badge>
          </div>
          <p className="text-sm text-foreground">
            {aufgabe.aufgabentext_inhalt || <span className="italic text-muted-foreground">Kein Aufgabentext</span>}
          </p>
          {aufgabe.erwartungshorizont_ki_prompt && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              💡 {aufgabe.erwartungshorizont_ki_prompt}
            </p>
          )}
        </div>
        {isMaster && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Repeat2 className="w-3.5 h-3.5" />
            {generating ? 'Generiert…' : '5 Replikate'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Inhalt: Aufgaben einer gewählten Aktivität
// ─────────────────────────────────────────────────────────────────────────────

function ActivityTaskPane({ activityId, einheit, kannBearbeiten }) {
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
  });

  const activity = phaseAktivitaeten.find(a => a.id === activityId);
  const kat = katalog.find(k => k.id === activity?.aktivitaet_id);

  // Alle Aufgaben für dieses Lernpaket + activity_type Matching
  const masterAufgaben = aufgaben.filter(
    a => a.lernpaket_id === activity?.lernpaket_id && a.is_master === true
  );
  const replikate = aufgaben.filter(
    a => a.lernpaket_id === activity?.lernpaket_id && a.is_master === false && a.master_id
  );

  // Replikate nach master_id gruppieren
  const replikateByMaster = {};
  replikate.forEach(r => {
    if (!replikateByMaster[r.master_id]) replikateByMaster[r.master_id] = [];
    replikateByMaster[r.master_id].push(r);
  });

  if (!activity) return null;

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{activity.phase}</Badge>
            </div>
            <h2 className="text-xl font-bold">{kat?.name || 'Aktivität'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {masterAufgaben.length} Masteraufgabe{masterAufgaben.length !== 1 ? 'n' : ''} ·{' '}
              {replikate.length} Replikat{replikate.length !== 1 ? 'e' : ''}
            </p>
          </div>
          {kannBearbeiten && (
            <Button onClick={() => setMasterModalOpen(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Masteraufgabe erstellen
            </Button>
          )}
        </div>

        {/* Masteraufgaben + zugehörige Replikate */}
        {masterAufgaben.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold">Noch keine Masteraufgaben</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Erstelle eine Masteraufgabe als Vorlage für KI-generierte Varianten.
              </p>
            </div>
            {kannBearbeiten && (
              <Button onClick={() => setMasterModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Erste Masteraufgabe erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {masterAufgaben.map(master => (
              <div key={master.id} className="space-y-2">
                <AufgabeCard
                  aufgabe={master}
                  isMaster={true}
                  einheit={einheit}
                />
                {/* Replikate dieses Masters */}
                {(replikateByMaster[master.id] || []).length > 0 && (
                  <div className="ml-6 space-y-2 border-l-2 border-primary/20 pl-4">
                    {replikateByMaster[master.id].map(rep => (
                      <AufgabeCard key={rep.id} aufgabe={rep} isMaster={false} einheit={einheit} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Task Modal */}
      <MasterTaskModal
        open={masterModalOpen}
        onOpenChange={setMasterModalOpen}
        lernpaketId={activity?.lernpaket_id}
        lernzielId={null}
        activityType="free_text"
        contextData={{ activity: kat?.name }}
        onSuccess={() => {
          setMasterModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Export
// ─────────────────────────────────────────────────────────────────────────────

export default function TaskCreationView({ einheitId, einheit, initialActivityId = null, kannBearbeiten }) {
  const [selectedActivityId, setSelectedActivityId] = useState(initialActivityId);

  // Wenn initialActivityId sich von außen ändert (z.B. via "Zur Aufgaben-Werkstatt")
  useEffect(() => {
    if (initialActivityId) setSelectedActivityId(initialActivityId);
  }, [initialActivityId]);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Sidebar */}
      <ActivitySidebar
        einheitId={einheitId}
        selectedActivityId={selectedActivityId}
        onSelect={setSelectedActivityId}
      />

      {/* Hauptbereich */}
      {selectedActivityId ? (
        <ActivityTaskPane
          activityId={selectedActivityId}
          einheit={einheit}
          kannBearbeiten={kannBearbeiten}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold">Aktivität auswählen</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Wähle links eine Aktivität aus, um Masteraufgaben und Replikate zu verwalten.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}