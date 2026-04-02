/**
 * MasterActivityPanel.jsx
 *
 * Wrapper für eine Master-Aktivität in Ebene 4.
 * - MASTERAUFGABE-Badge + border-primary Container
 * - MatchTermsForm für "Begriffe zuordnen", sonst ActivityDetailView
 * - Pessimistic Locking via useActivityLock
 * - Klon-Generator darunter
 */

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Sparkles, Loader2, AlertCircle, Edit, Save, X, Lock } from 'lucide-react';
import MatchTermsForm from '@/components/aufgaben/placeholders/MatchTermsForm';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import LockBanner from '@/components/workspace/LockBanner';
import { useActivityLock, isActivityLockedByOther } from '@/hooks/useActivityLock';
import { toast } from 'sonner';

const MATCH_TERMS_NAMES = ['begriffe zuordnen', 'zuordnen', 'match terms'];
function isMatchTermsActivity(name = '') {
  return MATCH_TERMS_NAMES.some(n => name.toLowerCase().includes(n));
}

// ── Klon-Generator ────────────────────────────────────────────────────────────

function KlonGenerator({ activityRecord, onKlonesCreated }) {
  const queryClient = useQueryClient();
  const [hint, setHint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fv = activityRecord.field_values || {};
      const prompt = [
        'Erstelle 3 didaktisch gleichwertige Variationen (Klone) dieser Lernaufgabe.',
        'Die Klone sollen die gleiche Struktur haben, aber unterschiedliche Begriffe/Inhalte verwenden.',
        fv.instruction ? `Original-Anweisung: "${fv.instruction}"` : '',
        fv.pairs       ? `Original-Paare: ${JSON.stringify(fv.pairs)}` : '',
        hint           ? `Zusätzliche Hinweise: ${hint}` : '',
        'Antworte als JSON mit einem "klone"-Array, jedes Element: { "instruction": string, "pairs": [{left, right}][], "distractors": string[] }',
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
          Best practices: Kontext angeben (z.B. „Biologie Kl. 7"), Schwierigkeitsgrad steuern, Themenvorgabe machen.
        </p>
      </div>
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
        {generating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Klone werden generiert…</>
          : <><Sparkles className="w-4 h-4" /> Klone erzeugen</>}
      </Button>
    </div>
  );
}

// ── MatchTerms mit Edit-Mode + Lock ──────────────────────────────────────────

function MatchTermsWithLock({ activityRecord, kannBearbeiten, userEmail }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pessimistic lock: aktiv wenn editMode=true
  useActivityLock(activityRecord.id, userEmail, editMode);

  const lockedByOther = isActivityLockedByOther(activityRecord, userEmail);
  const fieldValues = activityRecord.field_values || {};

  const handleSave = async (data) => {
    setSaving(true);
    await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, {
      field_values: data,
      is_complete: true,
    });
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    setSaving(false);
    setEditMode(false); // → Lock wird via useActivityLock freigegeben
    toast.success('Masteraufgabe gespeichert.');
  };

  const handleCancel = () => setEditMode(false); // → Lock freigegeben

  return (
    <div className="space-y-3">
      {lockedByOther && <LockBanner lockedByUser={activityRecord.locked_by_user} />}

      {!editMode ? (
        <div className="space-y-4">
          {/* Read-only Vorschau */}
          {fieldValues.instruction && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Arbeitsanweisung</label>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.instruction}</div>
            </div>
          )}
          {fieldValues.pairs && fieldValues.pairs.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Begriffspaare ({fieldValues.pairs.length})
              </label>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                {fieldValues.pairs.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 font-medium">{p.left}</span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="flex-1 text-muted-foreground">{p.right}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {kannBearbeiten && !lockedByOther && (
            <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-2 mt-2">
              <Edit className="w-3.5 h-3.5" /> Bearbeiten
            </Button>
          )}
          {lockedByOther && (
            <Button size="sm" variant="outline" disabled className="gap-2 mt-2 opacity-50">
              <Lock className="w-3.5 h-3.5" /> Bearbeiten (gesperrt)
            </Button>
          )}
        </div>
      ) : (
        <MatchTermsForm
          initialData={{
            instruction: fieldValues.instruction || '',
            pairs: fieldValues.pairs || [],
            distractors: (fieldValues.distractors || []).map(v => ({ value: v })),
          }}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function MasterActivityPanel({
  activityRecord,
  catalogEntry,
  supportsMaster,   // aus AktivitaetenKatalog.supports_master
  kannBearbeiten,
  userEmail,
  onKlonesCreated,
}) {
  const queryClient = useQueryClient();
  const isMatchTerms = isMatchTermsActivity(catalogEntry?.name || '');

  // is_master: Opt-in-Flag auf dem Record selbst (persistiert in DB)
  const isMaster = activityRecord.is_master === true;
  const [promotingToMaster, setPromotingToMaster] = useState(false);

  // Realtime-Subscription: sofortiges Update wenn Lock oder is_master sich ändert
  useEffect(() => {
    const unsub = base44.entities.LernpaketPhaseAktivitaet.subscribe((event) => {
      if (event.id === activityRecord.id || event.data?.id === activityRecord.id) {
        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      }
    });
    return unsub;
  }, [activityRecord.id]);

  const handlePromoteToMaster = async () => {
    setPromotingToMaster(true);
    await base44.entities.LernpaketPhaseAktivitaet.update(activityRecord.id, { is_master: true });
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    setPromotingToMaster(false);
    toast.success('Zur Masteraufgabe gemacht.');
  };

  // ── Fall 1: supports_master === false → nur normales Formular ──────────────
  if (!supportsMaster) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold">{catalogEntry?.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Phase: {activityRecord.phase}
          </span>
        </div>
        <div className="p-1">
          <ActivityDetailView
            activityRecord={activityRecord}
            kannBearbeiten={kannBearbeiten}
            queryClient={queryClient}
          />
        </div>
      </div>
    );
  }

  // ── Fall 2: supports_master === true, aber is_master noch false → Opt-in ──
  if (!isMaster) {
    return (
      <div className="space-y-4">
        {/* Normales Formular */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
            <span className="text-sm font-semibold">{catalogEntry?.name}</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Phase: {activityRecord.phase}
            </span>
          </div>
          <div className="p-1">
            <ActivityDetailView
              activityRecord={activityRecord}
              kannBearbeiten={kannBearbeiten}
              queryClient={queryClient}
            />
          </div>
        </div>

        {/* Opt-in Button */}
        {kannBearbeiten && (
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">Masteraufgabe aktivieren</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wandle diese Aktivität in eine Mastervorlage um und erstelle KI-generierte Klone daraus.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePromoteToMaster}
              disabled={promotingToMaster}
              className="gap-2 shrink-0 border-primary/40 text-primary hover:bg-primary/10"
            >
              {promotingToMaster
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />}
              Zur Masteraufgabe machen
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Fall 3: supports_master === true UND is_master === true → Master-UI ───
  return (
    <div className="space-y-0">
      {/* MASTERAUFGABE-Container */}
      <div className="rounded-xl border-2 border-primary bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
          <Crown className="w-4 h-4 text-primary" />
          <Badge variant="default" className="text-[11px] font-bold tracking-wide">
            MASTERAUFGABE (VORLAGE)
          </Badge>
          <span className="text-xs text-muted-foreground ml-1">{catalogEntry?.name}</span>
          {activityRecord.lock_status && !isActivityLockedByOther(activityRecord, userEmail) && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">
              <Lock className="w-3 h-3" /> In Bearbeitung
            </span>
          )}
          {!activityRecord.lock_status && (
            <span className="ml-auto text-[10px] text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
              Phase: {activityRecord.phase}
            </span>
          )}
        </div>

        <div className="p-5">
          {isMatchTerms ? (
            <MatchTermsWithLock
              activityRecord={activityRecord}
              kannBearbeiten={kannBearbeiten}
              userEmail={userEmail}
            />
          ) : (
            <ActivityDetailView
              activityRecord={activityRecord}
              kannBearbeiten={kannBearbeiten && !isActivityLockedByOther(activityRecord, userEmail)}
              queryClient={queryClient}
            />
          )}
        </div>
      </div>

      {/* Klon-Generator */}
      <KlonGenerator activityRecord={activityRecord} onKlonesCreated={onKlonesCreated} />
    </div>
  );
}