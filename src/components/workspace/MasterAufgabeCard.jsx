/**
 * MasterAufgabeCard.jsx
 *
 * Eine einzelne Masteraufgaben-Karte innerhalb einer Aktivität.
 * Enthält: Titel-Editor, MatchTermsForm/ActivityDetailView, KlonGenerator, Löschen-Button.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Trash2, Sparkles, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import LockBanner from '@/components/workspace/LockBanner';
import MatchTermsForm from '@/components/aufgaben/placeholders/MatchTermsForm';
import LueckentextEditor, { LueckentextRenderer } from '@/components/workspace/LueckentextEditor';
import ApprovalActionButton from '@/components/workspace/ApprovalActionButton';
import ApprovalStatusBadge from '@/components/workspace/ApprovalStatusBadge';
import { isLockExpired } from '@/hooks/useActivityLock';
import { useSyncStatus, TASK_SYNC_STATUS } from '@/hooks/useSyncStatus';
import { TASK_STATUS_CONFIG } from '@/lib/stateMachine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function isLockedByOther(master, myEmail) {
  if (!master?.lock_status) return false;
  if (master.locked_by_user === myEmail) return false;
  if (isLockExpired(master.locked_at)) return false;
  return true;
}

const MATCH_TERMS_NAMES = ['begriffe zuordnen', 'zuordnen', 'match terms'];
const LUECKENTEXT_NAMES = ['lückentext', 'lücken', 'lueckentext', 'cloze', 'fill in'];

function isMatchTerms(name = '') {
  return MATCH_TERMS_NAMES.some(n => name.toLowerCase().includes(n));
}
function isLueckentext(name = '') {
  return LUECKENTEXT_NAMES.some(n => name.toLowerCase().includes(n));
}

// ── Klon-Generator ─────────────────────────────────────────────────────────────

function KlonGenerator({ master, onKlonesCreated }) {
  const queryClient = useQueryClient();
  const [hint, setHint] = useState('');
  const [klonCount, setKlonCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fv = master.field_values || {};
      const isLuecke = !!(fv.lueckentext);

      const prompt = isLuecke ? [
        `Erstelle ${klonCount} didaktisch gleichwertige Variationen (Klone) dieses Lückentexts.`,
        'Jeder Klon soll denselben Themenbereich abdecken, aber andere Begriffe/Sätze verwenden.',
        'Markiere Lücken zwingend mit eckigen Klammern: z.B. [Begriff].',
        `Original-Lückentext: "${fv.lueckentext}"`,
        hint ? `Zusätzliche Hinweise: ${hint}` : '',
        'Antworte als JSON mit einem "klone"-Array, jedes Element: { "lueckentext": string }',
      ].filter(Boolean).join('\n') : [
        `Erstelle ${klonCount} didaktisch gleichwertige Variationen (Klone) dieser Lernaufgabe.`,
        'Die Klone sollen die gleiche Struktur haben, aber unterschiedliche Begriffe/Inhalte verwenden.',
        fv.instruction ? `Original-Anweisung: "${fv.instruction}"` : '',
        fv.pairs ? `Original-Paare: ${JSON.stringify(fv.pairs)}` : '',
        hint ? `Zusätzliche Hinweise: ${hint}` : '',
        'Antworte als JSON mit einem "klone"-Array, jedes Element: { "instruction": string, "pairs": [{left, right}][], "distractors": string[] }',
      ].filter(Boolean).join('\n');

      const fv2 = master.field_values || {};
      const isLuecke2 = !!(fv2.lueckentext);

      const schema = isLuecke2
        ? {
            type: 'object',
            properties: {
              klone: { type: 'array', items: { type: 'object', properties: { lueckentext: { type: 'string' } }, required: ['lueckentext'] } },
            },
          }
        : {
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
          };

      const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });

      const klone = result?.klone || [];
      if (klone.length === 0) throw new Error('Keine Klone generiert.');

      for (let i = 0; i < klone.length; i++) {
        await base44.entities.Aufgabenbausteine.create({
          lernpaket_id: master.lernpaket_id,
          baustein_typ: 'Ebene-1-Übung',
          aufgabentext_inhalt: JSON.stringify(klone[i]),
          is_master: false,
          master_aufgabe_id: master.id,
          status: 'draft',
          klon_index: i + 1,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success(`${klone.length} Klone erstellt.`);
      onKlonesCreated?.();
    } catch (e) {
      setError(e.message);
      toast.error('Fehler beim Generieren.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border-t border-border/60 mt-4 pt-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Klone erzeugen
        <Badge variant="outline" className="text-[10px] ml-1">KI</Badge>
      </p>

      <div className="flex items-center gap-3">
        <Label htmlFor="klonCount" className="text-xs font-medium shrink-0">Anzahl Klone:</Label>
        <Input
          id="klonCount"
          type="number"
          min={1}
          max={10}
          value={klonCount}
          onChange={e => setKlonCount(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={generating}
          className="h-7 w-16 text-xs"
        />
      </div>

      <Textarea
        value={hint}
        onChange={e => setHint(e.target.value)}
        placeholder="Zusätzliche Hinweise (optional): z.B. 'Thema Biologie Kl. 7', 'schwierigere Begriffe'"
        className="resize-none h-16 text-xs"
        disabled={generating}
      />
      {error && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{error}
        </div>
      )}
      <Button size="sm" onClick={handleGenerate} disabled={generating} className="w-full gap-2">
        {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generiere…</> : <><Sparkles className="w-3.5 h-3.5" /> Klone erzeugen</>}
      </Button>
    </div>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────────

export default function MasterAufgabeCard({
  master,
  index,
  catalogName,
  klone,
  kannBearbeiten,
  userEmail,
  userRole,
  onDeleted,
  onKlonesCreated,
  autoExpand = false,
}) {
  const queryClient = useQueryClient();

  // State Machine für Moodle-Sync
  const syncStatus = useSyncStatus(
    master.id,
    master.sync_status || TASK_SYNC_STATUS.DRAFT,
    'MasterAufgabe',
    ['masterAufgaben']
  );

  // Neue Karte direkt im Bearbeitungsmodus öffnen
  const [editMode, setEditMode] = useState(autoExpand);
  const [collapsed, setCollapsed] = useState(false);
  const [fieldValues, setFieldValues] = useState(master.field_values || {});
  const [titel, setTitel] = useState(master.titel || '');
  const [editingTitel, setEditingTitel] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const locked = isLockedByOther(master, userEmail);
  const isMatch = isMatchTerms(catalogName);
  const isLuecke = isLueckentext(catalogName);

  const saveMutation = useMutation({
    mutationFn: ({ fv, closeEdit }) => {
      // State Machine: exported + edit → modified, approved + edit → draft
      const newSyncStatus = syncStatus.getSyncStatusForSave();
      return base44.entities.MasterAufgabe.update(master.id, {
        field_values: fv,
        titel,
        sync_status: newSyncStatus,
      });
    },
    onSuccess: (_, { closeEdit }) => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setHasPendingChanges(false);
      if (closeEdit) setEditMode(false);
      toast.success('Masteraufgabe gespeichert.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  // Zwischenspeichern ohne Edit-Modus zu verlassen
  const handleSaveIntermediate = () => {
    saveMutation.mutate({ fv: fieldValues, closeEdit: false });
  };

  // Speichern und Bearbeitung beenden
  const handleSaveAndClose = (fv) => {
    saveMutation.mutate({ fv: fv ?? fieldValues, closeEdit: true });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Klone zuerst löschen
      for (const k of klone) await base44.entities.Aufgabenbausteine.delete(k.id);
      return base44.entities.MasterAufgabe.delete(master.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success('Masteraufgabe gelöscht.');
      onDeleted?.();
    },
  });

  const saveTitel = async () => {
    // Kein Titel-Update wenn freigegeben
    if (master.content_status === 'approved') {
      toast.error('Freigabe zuerst aufheben um den Titel zu bearbeiten.');
      setEditingTitel(false);
      setTitel(master.titel || '');
      return;
    }
    await base44.entities.MasterAufgabe.update(master.id, { titel });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
    setEditingTitel(false);
  };

  return (
    <div className="rounded-xl border-2 border-primary bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
        <Crown className="w-4 h-4 text-primary shrink-0" />
        <Badge variant="default" className="text-[11px] font-bold tracking-wide shrink-0">
          MASTER {index}
        </Badge>
        {TASK_STATUS_CONFIG[syncStatus.currentStatus] && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${TASK_STATUS_CONFIG[syncStatus.currentStatus].color}`}>
            {TASK_STATUS_CONFIG[syncStatus.currentStatus].label}
          </Badge>
        )}

        {/* Titel inline editierbar */}
        {editingTitel ? (
          <Input
            value={titel}
            onChange={e => setTitel(e.target.value)}
            onBlur={saveTitel}
            onKeyDown={e => e.key === 'Enter' && saveTitel()}
            className="h-6 text-xs flex-1 min-w-0"
            autoFocus
          />
        ) : (
          <button
            onClick={() => kannBearbeiten && setEditingTitel(true)}
            className={cn('flex-1 text-xs text-left truncate', kannBearbeiten ? 'text-muted-foreground hover:text-foreground cursor-text' : 'text-muted-foreground cursor-default')}
            title={kannBearbeiten ? 'Klicken zum Bearbeiten' : undefined}
          >
            {master.titel || `Masteraufgabe ${index}`}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <ApprovalActionButton 
            entityId={master.id}
            entityType="master"
            contentStatus={master.content_status}
            missingFields={
              !master.field_values?.instruction && !master.field_values?.task_description && !master.field_values?.pairs?.length
                ? ['Aufgabeninhalt fehlt']
                : []
            }
            kannBearbeiten={kannBearbeiten}
            userRole={userRole}
          />
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            title={collapsed ? 'Aufklappen' : 'Einklappen'}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          {kannBearbeiten && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="p-1 text-muted-foreground hover:text-destructive rounded"
              title="Masteraufgabe löschen"
            >
              {deleteMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          <LockBanner lockedByUser={locked ? master.locked_by_user : null} />

          {/* Klon-Zähler */}
          {klone.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {klone.length} Klon{klone.length !== 1 ? 'e' : ''} vorhanden
              {klone.filter(k => k.status === 'approved').length > 0 && (
                <span className="text-green-600 ml-1">
                  ({klone.filter(k => k.status === 'approved').length} freigegeben)
                </span>
              )}
            </p>
          )}

          {/* Formular */}
          {isMatch ? (
            editMode ? (
              <>
                <MatchTermsForm
                  initialData={{
                    instruction: fieldValues.instruction || '',
                    pairs: fieldValues.pairs || [],
                    distractors: (fieldValues.distractors || []).map(v => typeof v === 'string' ? { value: v } : v),
                  }}
                  onSave={(data) => {
                    // Stelle sicher, dass Distraktoren als String-Array gespeichert werden
                    const cleanedData = {
                      instruction: data.instruction,
                      pairs: data.pairs,
                      distractors: (data.distractors || []).map(d => typeof d === 'string' ? d : d.value).filter(Boolean),
                    };
                    setFieldValues(cleanedData);
                    handleSaveAndClose(cleanedData);
                  }}
                  onCancel={() => { setEditMode(false); setHasPendingChanges(false); }}
                  onChange={() => setHasPendingChanges(true)}
                />
                {/* Zwischenspeichern-Banner */}
                {hasPendingChanges && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <span>Ungespeicherte Änderungen</span>
                    <Button size="sm" variant="outline" onClick={handleSaveIntermediate} disabled={saveMutation.isPending}
                      className="gap-1.5 border-amber-300 hover:bg-amber-100 text-amber-800 h-7 text-xs">
                      {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Jetzt zwischenspeichern
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {fieldValues.instruction && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Anweisung</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.instruction}</div>
                  </div>
                )}
                {fieldValues.pairs?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Begriffspaare ({fieldValues.pairs.length})
                    </p>
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
                {kannBearbeiten && !locked && master.content_status !== 'approved' && (
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                    Inhalt bearbeiten
                  </Button>
                )}
                {master.content_status === 'approved' && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                    🔒 Freigegeben – Freigabe aufheben um zu bearbeiten
                  </p>
                )}
                {!fieldValues.instruction && !fieldValues.pairs?.length && master.content_status !== 'approved' && (
                  <p className="text-sm text-muted-foreground italic">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</p>
                )}
              </div>
            )
          ) : isLuecke ? (
            /* ── Lückentext-Editor ── */
            <div className="space-y-3">
              {editMode ? (
                <>
                  <LueckentextEditor
                    value={fieldValues.lueckentext || ''}
                    onChange={(text) => {
                      setFieldValues(fv => ({ ...fv, lueckentext: text }));
                      setHasPendingChanges(true);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setHasPendingChanges(false); }}>Abbrechen</Button>
                    {hasPendingChanges && (
                      <Button size="sm" variant="outline" onClick={handleSaveIntermediate} disabled={saveMutation.isPending}
                        className="gap-1.5 border-amber-300 hover:bg-amber-100 text-amber-800">
                        {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Zwischenspeichern
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleSaveAndClose()} disabled={saveMutation.isPending} className="gap-1.5 ml-auto">
                      {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Speichern & schließen
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <LueckentextEditor value={fieldValues.lueckentext || ''} onChange={() => {}} readOnly />
                  {!fieldValues.lueckentext && (
                    <p className="text-sm text-muted-foreground italic">Noch kein Lückentext. Klicke „Inhalt bearbeiten".</p>
                  )}
                  {kannBearbeiten && !locked && master.content_status !== 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                      Inhalt bearbeiten
                    </Button>
                  )}
                  {master.content_status === 'approved' && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      🔒 Freigegeben – Freigabe aufheben um zu bearbeiten
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Generischer Fallback ── */
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notizen / Aufgabenstellung</p>
              {editMode ? (
                <div className="space-y-2">
                  <Textarea
                    value={fieldValues.task_description || ''}
                    onChange={e => {
                      setFieldValues(fv => ({ ...fv, task_description: e.target.value }));
                      setHasPendingChanges(true);
                    }}
                    placeholder="Aufgabenstellung..."
                    className="min-h-20 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setHasPendingChanges(false); }}>Abbrechen</Button>
                    {hasPendingChanges && (
                      <Button size="sm" variant="outline" onClick={handleSaveIntermediate} disabled={saveMutation.isPending}
                        className="gap-1.5 border-amber-300 hover:bg-amber-100 text-amber-800">
                        {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Zwischenspeichern
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleSaveAndClose()} disabled={saveMutation.isPending} className="gap-1.5 ml-auto">
                      {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Speichern & schließen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    {fieldValues.task_description || <span className="italic text-muted-foreground">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</span>}
                  </div>
                  {kannBearbeiten && !locked && master.content_status !== 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                      Inhalt bearbeiten
                    </Button>
                  )}
                  {master.content_status === 'approved' && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      🔒 Freigegeben – Freigabe aufheben um zu bearbeiten
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Klon-Generator */}
          <KlonGenerator master={master} onKlonesCreated={onKlonesCreated} />
        </div>
      )}
    </div>
  );
}