/**
 * MasterActivityPanel.jsx
 *
 * Wrapper für eine Master-Aktivität in Ebene 4.
 * - Hervorgehobener Container mit MASTERAUFGABE-Badge
 * - Für "Begriffe zuordnen": MatchTermsForm
 * - Für andere Typen: generisches ActivityDetailView
 * - Darunter: Klon-Generator (KI-Hinweis + Button)
 */

import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Crown, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import MatchTermsForm from '@/components/aufgaben/placeholders/MatchTermsForm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Aktivitätsnamen, die das MatchTerms-Formular verwenden
const MATCH_TERMS_NAMES = ['begriffe zuordnen', 'zuordnen', 'match terms'];

function isMatchTermsActivity(catalogName = '') {
  return MATCH_TERMS_NAMES.some(n => catalogName.toLowerCase().includes(n));
}

// ── Klon-Generator-Sektion ────────────────────────────────────────────────────

function KlonGenerator({ activityRecord, onKlonesCreated }) {
  const queryClient = useQueryClient();
  const [hint, setHint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fieldValues = activityRecord.field_values || {};
      const prompt = [
        'Erstelle 3 didaktisch gleichwertige Variationen (Klone) dieser Lernaufgabe.',
        'Die Klone sollen die gleiche Struktur haben, aber unterschiedliche Begriffe/Inhalte verwenden.',
        fieldValues.instruction ? `Original-Anweisung: "${fieldValues.instruction}"` : '',
        fieldValues.pairs ? `Original-Paare: ${JSON.stringify(fieldValues.pairs)}` : '',
        hint ? `Zusätzliche Hinweise: ${hint}` : '',
        'Antworte als JSON-Array mit Objekten: { "instruction": string, "pairs": [{left, right}][], "distractors": string[] }',
      ].filter(Boolean).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            klone: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  instruction: { type: 'string' },
                  pairs: { type: 'array', items: { type: 'object', properties: { left: { type: 'string' }, right: { type: 'string' } }, required: ['left', 'right'] } },
                  distractors: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      });

      const klone = result?.klone || [];
      if (klone.length === 0) throw new Error('Keine Klone generiert.');

      // Klone als Aufgabenbausteine speichern
      for (let i = 0; i < klone.length; i++) {
        await base44.entities.Aufgabenbausteine.create({
          lernpaket_id: activityRecord.lernpaket_id,
          baustein_typ: 'Ebene-1-Übung',
          aufgabentext_inhalt: JSON.stringify(klone[i]),
          is_master: false,
          master_activity_id: activityRecord.id,
          status: 'draft',
          klon_index: i + 1,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', activityRecord.id] });
      toast.success(`${klone.length} Klone erfolgreich erstellt.`);
      onKlonesCreated?.();
    } catch (e) {
      setError(e.message);
      toast.error('Fehler beim Generieren.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 mt-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Klone erzeugen</h3>
        <Badge variant="outline" className="text-[10px]">KI</Badge>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Zusätzliche Hinweise für die KI <span className="font-normal">(optional)</span>
        </label>
        <Textarea
          value={hint}
          onChange={e => setHint(e.target.value)}
          placeholder="z.B. Verwende nur Tiere · Nutze schwierigere Begriffe · Behalte den gleichen Kontext"
          className="resize-none h-20 text-sm"
          disabled={generating}
        />
        <p className="text-[11px] text-muted-foreground/70">
          Best practices: Kontext angeben (z.B. „Biologie Kl. 7"), Schwierigkeitsgrad steuern,
          Themenvorgabe machen.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full gap-2"
      >
        {generating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Klone werden generiert…</>
          : <><Sparkles className="w-4 h-4" /> Klone erzeugen</>
        }
      </Button>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function MasterActivityPanel({ activityRecord, catalogEntry, kannBearbeiten, onKlonesCreated }) {
  const queryClient = useQueryClient();

  const isMatchTerms = isMatchTermsActivity(catalogEntry?.name || '');
  const fieldValues = activityRecord?.field_values || {};

  const handleMatchTermsSave = async (data) => {
    await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
      field_values: data,
      is_complete: true,
    });
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    toast.success('Masteraufgabe gespeichert.');
  };

  return (
    <div className="space-y-0">
      {/* ── MASTERAUFGABE-Container ────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-primary bg-card overflow-hidden">
        {/* Badge-Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
          <Crown className="w-4 h-4 text-primary" />
          <Badge variant="default" className="text-[11px] font-bold tracking-wide">
            MASTERAUFGABE (VORLAGE)
          </Badge>
          <span className="text-xs text-muted-foreground ml-1">
            {catalogEntry?.name}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
            Phase: {activityRecord.phase}
          </span>
        </div>

        {/* Formular-Inhalt */}
        <div className="p-5">
          {isMatchTerms ? (
            <MatchTermsForm
              initialData={{
                instruction: fieldValues.instruction || '',
                pairs: fieldValues.pairs || [],
                distractors: (fieldValues.distractors || []).map(v => ({ value: v })),
              }}
              onSave={handleMatchTermsSave}
            />
          ) : (
            <ActivityDetailView
              activityRecord={activityRecord}
              kannBearbeiten={kannBearbeiten}
              queryClient={queryClient}
            />
          )}
        </div>
      </div>

      {/* ── Klon-Generator ────────────────────────────────────────────────── */}
      <KlonGenerator
        activityRecord={activityRecord}
        onKlonesCreated={onKlonesCreated}
      />
    </div>
  );
}