/**
 * TaskCreationView.jsx
 *
 * Tab 4: Aufgaben erstellen – Master → Replikator Workflow
 * Zeigt Sidebar mit Lernpaketen/Aktivitäten und Hauptbereich für
 * Masteraufgaben-Erstellung und Replikat-Generierung.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Plus, CheckCircle2, Clock, ChevronRight, Package, Target } from 'lucide-react';
import { MasterReplicatorWorkflow } from '@/components/aufgaben/ReplicatorIntegration';
import { cn } from '@/lib/utils';

// ── Sidebar-Item ──────────────────────────────────────────────────────────────

function SidebarLernpaketItem({ lernpaket, lernziele, aufgaben, isSelected, onSelect, selectedActivityId }) {
  const [expanded, setExpanded] = useState(false);

  const paketAufgaben = aufgaben.filter(a => a.lernpaket_id === lernpaket.id);
  const masterAufgaben = paketAufgaben.filter(a => a.is_master);
  const kloне = paketAufgaben.filter(a => !a.is_master && a.master_id);

  const approvedCount = kloне.filter(a => a.status === 'approved').length;
  const draftCount = kloне.filter(a => a.status === 'draft').length;

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => { setExpanded(!expanded); onSelect({ type: 'lernpaket', lernpaket }); }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
        )}
      >
        <Package className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{lernpaket.titel_des_pakets}</span>
        {(approvedCount > 0 || draftCount > 0) && (
          <span className="text-xs text-muted-foreground shrink-0">
            {approvedCount > 0 && <span className="text-green-600">{approvedCount}✓</span>}
            {draftCount > 0 && <span className="text-amber-500 ml-1">{draftCount}⏳</span>}
          </span>
        )}
        <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 transition-transform text-muted-foreground', expanded && 'rotate-90')} />
      </button>

      {expanded && masterAufgaben.map(master => {
        const replicas = paketAufgaben.filter(a => a.master_id === master.id);
        return (
          <div key={master.id} className="ml-4 space-y-0.5">
            <button
              onClick={() => onSelect({ type: 'master', lernpaket, master })}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-colors',
                selectedActivityId === master.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              )}
            >
              <Target className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span className="flex-1 truncate">{master.aufgabentext_inhalt?.slice(0, 40) || 'Masteraufgabe'}</span>
            </button>
            {replicas.map(r => (
              <div key={r.id} className="ml-4 flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
                {r.status === 'approved'
                  ? <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                  : <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                <span className="truncate">{r.aufgabentext_inhalt?.slice(0, 35) || 'Entwurf'}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Hauptbereich: Lernpaket-Detail mit Replicator ────────────────────────────

function LernpaketReplicatorView({ lernpaket, lernziele, aufgaben, kannBearbeiten, queryClient }) {
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === lernpaket.id);
  const paketAufgaben = aufgaben.filter(a => a.lernpaket_id === lernpaket.id);
  const masterAufgaben = paketAufgaben.filter(a => a.is_master);

  const handleApprove = async (aufgabeId) => {
    await base44.entities.Aufgabenbausteine.update(aufgabeId, {
      status: 'approved',
      export_to_moodle: true,
    });
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{lernpaket.titel_des_pakets}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {paketZiele.length} Lernziel{paketZiele.length !== 1 ? 'e' : ''} · {masterAufgaben.length} Masteraufgabe{masterAufgaben.length !== 1 ? 'n' : ''}
        </p>
      </div>

      {kannBearbeiten && (
        <MasterReplicatorWorkflow
          masterAufgabe={masterAufgaben[0] || null}
          lernpaketId={lernpaket.id}
          lernzielId={paketZiele[0]?.id || null}
          contextData={{ lernpaket, lernziele: paketZiele }}
          onMasterCreated={() => queryClient.invalidateQueries({ queryKey: ['aufgaben'] })}
          onReplicaSaved={() => queryClient.invalidateQueries({ queryKey: ['aufgaben'] })}
        />
      )}

      {/* Entwürfe zur Freigabe */}
      {paketAufgaben.filter(a => a.status === 'draft').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Entwürfe – zur Freigabe</h3>
          {paketAufgaben.filter(a => a.status === 'draft').map(aufgabe => (
            <div key={aufgabe.id} className="p-4 rounded-xl border bg-card space-y-2">
              <p className="text-sm">{aufgabe.aufgabentext_inhalt}</p>
              {aufgabe.erwartungshorizont_ki_prompt && (
                <p className="text-xs text-muted-foreground italic">💡 {aufgabe.erwartungshorizont_ki_prompt}</p>
              )}
              {kannBearbeiten && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                  onClick={() => handleApprove(aufgabe.id)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Für Export freigeben
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Freigegebene Aufgaben */}
      {paketAufgaben.filter(a => a.status === 'approved').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Freigegeben – bereit für Export</h3>
          {paketAufgaben.filter(a => a.status === 'approved').map(aufgabe => (
            <div key={aufgabe.id} className="p-4 rounded-xl border border-green-200 bg-green-50 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">{aufgabe.aufgabentext_inhalt}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {masterAufgaben.length === 0 && paketAufgaben.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Wand2 className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-semibold">Noch keine Aufgaben</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Erstelle eine Masteraufgabe, um dann KI-gestützte Varianten zu generieren.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function TaskCreationView({ einheitId, einheit, initialActivityId, kannBearbeiten }) {
  const queryClient = useQueryClient();
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId,
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!einheitId,
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Auto-select first Lernpaket
  useEffect(() => {
    if (paketeFuerEinheit.length > 0 && !selectedNode) {
      setSelectedNode({ type: 'lernpaket', lernpaket: paketeFuerEinheit[0] });
    }
  }, [paketeFuerEinheit.length]);

  // Group by Themenfeld
  const groupedPakete = themenfelder.length > 0
    ? themenfelder.map(tf => ({
        themenfeld: tf,
        pakete: paketeFuerEinheit.filter(p => p.themenfeld_id === tf.id),
      })).filter(g => g.pakete.length > 0)
    : [{ themenfeld: null, pakete: paketeFuerEinheit }];

  return (
    <div className="flex flex-row flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lernpakete</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {groupedPakete.map(({ themenfeld, pakete }) => (
            <div key={themenfeld?.id || 'ungrouped'}>
              {themenfeld && (
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide px-3 py-1">
                  {themenfeld.titel}
                </p>
              )}
              {pakete.map(lernpaket => (
                <SidebarLernpaketItem
                  key={lernpaket.id}
                  lernpaket={lernpaket}
                  lernziele={lernziele}
                  aufgaben={aufgaben}
                  isSelected={selectedNode?.lernpaket?.id === lernpaket.id}
                  selectedActivityId={selectedNode?.master?.id}
                  onSelect={setSelectedNode}
                />
              ))}
            </div>
          ))}
          {paketeFuerEinheit.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              Noch keine Lernpakete. Lege zuerst eine Struktur im Struktur-Tab an.
            </p>
          )}
        </div>
      </aside>

      {/* Hauptbereich */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {selectedNode?.type === 'lernpaket' || selectedNode?.type === 'master' ? (
            <LernpaketReplicatorView
              lernpaket={selectedNode.lernpaket}
              lernziele={lernziele}
              aufgaben={aufgaben}
              kannBearbeiten={kannBearbeiten}
              queryClient={queryClient}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Wand2 className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">Lernpaket auswählen</p>
              <p className="text-sm text-muted-foreground/70">Wähle links ein Lernpaket, um Aufgaben zu erstellen.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}