/**
 * BrianExportCockpitView.jsx
 *
 * Export-Cockpit für Brian.study.
 * Zeigt alle freigegebenen Aufgaben (Ebene 2 + 3), generiert
 * Brian-Prompts und markiert Aufgaben als "In Brian integriert".
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Copy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Segment-Status Checker ──
function isPromptReady(aufgabe) {
  return !!(
    aufgabe.brian_dialog_name?.trim() &&
    aufgabe.brian_learner_instruction?.trim() &&
    aufgabe.brian_system_instruction?.trim() &&
    aufgabe.brian_completion_rule?.trim()
  );
}

// ── Segment-Copy-Button ──
function SegmentCopyButton({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`"${label}" kopiert.`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!value}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40"
    >
      {copied
        ? <><CheckCircle2 className="w-3 h-3 text-green-600" /> Kopiert</>
        : <><Copy className="w-3 h-3" /> Kopieren</>
      }
    </button>
  );
}

// ── Einzelne Aufgaben-Karte ──
function AufgabeCard({ aufgabe, onMarkAsSynced }) {
  const [expanded, setExpanded] = useState(false);
  const isSynced = aufgabe.brian_sync_status === 'synced';
  const isReady = isPromptReady(aufgabe);

  const ebeneLabel = aufgabe.anforderungsebene === '3 - Projekt' ? '🎯 Ebene 3' : '📝 Ebene 2';

  return (
    <div className={cn(
      'rounded-xl border bg-card shadow-sm transition-all',
      isSynced ? 'border-green-200 bg-green-50/20' : 'border-border'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{aufgabe.titel || 'Aufgabe ohne Titel'}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">{ebeneLabel}</Badge>
            {aufgabe.aufgabentyp_projekt && (
              <Badge variant="secondary" className="text-[10px] shrink-0">{aufgabe.aufgabentyp_projekt}</Badge>
            )}
            {isSynced && (
              <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] shrink-0 gap-1">
                <CheckCircle2 className="w-3 h-3" /> In Brian
              </Badge>
            )}
          </div>
          {aufgabe.aufgabenstellung && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{aufgabe.aufgabenstellung}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isReady && (
            <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] shrink-0 gap-1">
              ✓ Bereit
            </Badge>
          )}
          {!isSynced && (
            <Button
              size="sm"
              onClick={() => onMarkAsSynced(aufgabe.id)}
              className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700"
              disabled={!isReady}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Übertragen
            </Button>
          )}
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandierter Bereich mit Segmenten */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {!isReady && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Nicht alle Felder sind gefüllt. Bitte im KI-Tutor-Prompt-Tab generieren oder ausfüllen.</span>
            </div>
          )}

          {/* Fünf Segmente */}
          <div className="space-y-3">
            {[
              { label: '1. Dialogname', value: aufgabe.brian_dialog_name },
              { label: '2. Anweisung für Lernende', value: aufgabe.brian_learner_instruction },
              { label: '3. System-Anweisung (Tutor-Persona)', value: aufgabe.brian_system_instruction },
              { label: '4. Completion-Rule', value: aufgabe.brian_completion_rule },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                  <SegmentCopyButton label={label} value={value} />
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/10 text-xs leading-relaxed text-foreground">
                  {value ? (
                    <p className="whitespace-pre-wrap max-h-24 overflow-y-auto">{value}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Nicht definiert</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Rubriken */}
          {Array.isArray(aufgabe.rubric_criteria) && aufgabe.rubric_criteria.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  5. Bewertungsrubriken ({aufgabe.rubric_criteria.reduce((s, r) => s + (r.points || 0), 0)} Punkte)
                </p>
              </div>
              <div className="space-y-1.5">
                {aufgabe.rubric_criteria.map((r, i) => (
                  <div key={i} className="p-2 rounded-lg border border-border bg-muted/10 text-xs">
                    <p className="font-medium">{r.title} ({r.points} Punkte)</p>
                    <p className="text-muted-foreground mt-0.5">{r.criteria_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──
export default function BrianExportCockpitView() {
  const queryClient = useQueryClient();
  const [strenge, setStrenge]       = useState('normal');
  const [sprache, setSprache]       = useState('normal');
  const [kursniveau, setKursniveau] = useState('');
  const [filterSynced, setFilterSynced] = useState(false);

  const { data: allAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben'],
    queryFn: () => base44.entities.AllgemeineAufgabe.list(),
  });

  // Nur Ebene 2 und 3, nur approved
  const aufgaben = useMemo(() => {
    return allAufgaben.filter(a =>
      a.content_status === 'approved' &&
      (a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt') &&
      (filterSynced ? true : a.brian_sync_status !== 'synced')
    );
  }, [allAufgaben, filterSynced]);

  const synced   = allAufgaben.filter(a => a.brian_sync_status === 'synced').length;
  const pending  = allAufgaben.filter(a => a.content_status === 'approved' && a.brian_sync_status !== 'synced' && (a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt')).length;

  const handleMarkAsSynced = async (aufgabeId) => {
    const aufgabe = allAufgaben.find(a => a.id === aufgabeId);
    const now = new Date().toISOString();

    // Dual-Lock: Bearbeitungssperre erst aufheben wenn BEIDE Exporte synced sind
    const moodleSynced = aufgabe?.moodle_sync_status === 'synced' || aufgabe?.sync_status === 'synced';
    const updateData = {
      brian_sync_status: 'synced',
      brian_synced_at: now,
    };
    // Wenn auch Moodle synced → Bearbeitungssperre aufheben
    if (moodleSynced) {
      updateData.locked_by = null;
      updateData.locked_at = null;
    }

    await base44.entities.AllgemeineAufgabe.update(aufgabeId, updateData);
    queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
    toast.success(
      moodleSynced
        ? 'Als "In Brian" markiert – Dual-Lock aufgehoben (Moodle + Brian beide synced).'
        : 'Als "In Brian" markiert. Bearbeitungssperre bleibt bis Moodle-Export bestätigt.'
    );
  };

  const params = { strenge, sprache, kursniveau };

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Brian.study Export</h2>
          <p className="text-muted-foreground mt-2">
            Generiere Prompts für Brian.study und markiere Aufgaben als exportiert.
          </p>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Bereit für Brian', value: pending, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'In Brian exportiert', value: synced, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Gesamt freigegeben', value: pending + synced, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs mt-1 opacity-80">{label}</p>
            </div>
          ))}
        </div>

        {/* Globale Parameter */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Globale Export-Parameter</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Antwortstrenge</label>
              <Select value={strenge} onValueChange={setStrenge}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="locker">Locker</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="streng">Streng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sprachschwierigkeit</label>
              <Select value={sprache} onValueChange={setSprache}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="einfach">Einfach</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fortgeschritten">Fortgeschritten</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kursniveau</label>
              <input
                value={kursniveau}
                onChange={e => setKursniveau(e.target.value)}
                placeholder="z.B. Sek 1, Sek 2, Q1…"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Aufgaben-Liste */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Aufgaben ({aufgaben.length})
            </h3>
            <button
              onClick={() => setFilterSynced(p => !p)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {filterSynced ? 'Nur offene anzeigen' : 'Bereits exportierte auch anzeigen'}
            </button>
          </div>

          {aufgaben.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              {filterSynced
                ? 'Keine freigegebenen Aufgaben (Ebene 2 & 3) vorhanden.'
                : 'Alle Aufgaben sind bereits in Brian exportiert.'}
            </div>
          ) : (
            aufgaben.map(aufgabe => (
              <AufgabeCard
                key={aufgabe.id}
                aufgabe={aufgabe}
                onMarkAsSynced={handleMarkAsSynced}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}