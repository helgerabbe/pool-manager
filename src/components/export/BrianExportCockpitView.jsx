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
import { CheckCircle2, Copy, ChevronDown, ChevronUp, BookOpen, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Prompt-Generator (rein im Frontend) ──
function generateBrianPrompt(aufgabe, params) {
  const materialienText = (aufgabe.materialien || [])
    .map(m => {
      if (m.type === 'free_text' || m.type === 'freitext') return `[Text] ${m.content || ''}`;
      if (m.type === 'book_ref') return `[Buchverweis] ${m.content || m.label || ''}`;
      if (m.type === 'pdf' && m.url) return `[PDF] ${m.label || m.url}`;
      if (m.type === 'image' && m.url) return `[Bild] ${m.label || m.url}`;
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const rubrikenText = Array.isArray(aufgabe.rubric_criteria) && aufgabe.rubric_criteria.length > 0
    ? aufgabe.rubric_criteria
        .map(r => `• ${r.title} (${r.points} Punkte)\n  ${r.criteria_text}`)
        .join('\n\n')
    : 'Keine Rubriken definiert.';

  const totalPunkte = Array.isArray(aufgabe.rubric_criteria)
    ? aufgabe.rubric_criteria.reduce((sum, r) => sum + (r.points || 0), 0)
    : 0;

  return `=== BRIAN.STUDY AUFGABEN-EXPORT ===

GLOBALE PARAMETER:
- Antwortstrenge: ${params.strenge}
- Sprachschwierigkeit: ${params.sprache}
- Kursniveau: ${params.kursniveau || 'Nicht angegeben'}

AUFGABE:
Titel: ${aufgabe.titel || 'Kein Titel'}
Typ: ${aufgabe.anforderungsebene || ''} ${aufgabe.aufgabentyp_projekt ? `(${aufgabe.aufgabentyp_projekt})` : ''}

AUFGABENSTELLUNG:
${aufgabe.aufgabenstellung || 'Nicht definiert'}

MATERIALIEN:
${materialienText || 'Keine Materialien'}

BEWERTUNGSRUBRIKEN (Gesamt: ${totalPunkte} Punkte):
${rubrikenText}

===================================`;
}

// ── Einzelne Aufgaben-Karte ──
function AufgabeCard({ aufgabe, params, onMarkAsSynced }) {
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const isSynced = aufgabe.brian_sync_status === 'synced';

  const handleGeneratePrompt = () => {
    const generated = generateBrianPrompt(aufgabe, params);
    setPrompt(generated);
    setExpanded(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success('In Zwischenablage kopiert');
    setTimeout(() => setCopied(false), 2000);
  };

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
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePrompt}
            className="gap-1.5 text-xs h-8"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Brian-Prompt
          </Button>
          {!isSynced && (
            <Button
              size="sm"
              onClick={() => onMarkAsSynced(aufgabe.id)}
              className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              In Brian markieren
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

      {/* Expandierter Bereich mit Prompt */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {prompt ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Generierter Brian-Prompt
                </p>
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs h-7">
                  {copied ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Kopiert</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> In Zwischenablage</>
                  )}
                </Button>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={14}
                className="w-full p-3 text-xs font-mono bg-muted/20 border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </>
          ) : (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Klicke "Brian-Prompt" um einen formatierten Export-Text zu generieren.
              </p>
            </div>
          )}

          {/* Rubriken-Vorschau */}
          {Array.isArray(aufgabe.rubric_criteria) && aufgabe.rubric_criteria.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Rubriken ({aufgabe.rubric_criteria.reduce((s, r) => s + (r.points || 0), 0)} Punkte gesamt):
              </p>
              <div className="flex flex-wrap gap-2">
                {aufgabe.rubric_criteria.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-xs gap-1">
                    {r.title} · {r.points} Pkt.
                  </Badge>
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
                params={params}
                onMarkAsSynced={handleMarkAsSynced}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}