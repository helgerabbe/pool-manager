/**
 * KlonDetailView.jsx
 *
 * Bearbeitungsbereich für einen einzelnen gespeicherten Klon.
 * - Pessimistic Locking via useKlonLock
 * - Lock-Banner für andere Nutzer
 * - Realtime-Subscription für sofortige Lock-Updates
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Check, X, Edit, ArrowRight, Plus, Trash2, Lock } from 'lucide-react';
import LockBanner from '@/components/workspace/LockBanner';
import { useKlonLock, isLockExpired } from '@/hooks/useActivityLock';
import { toast } from 'sonner';

function isKlonLockedByOther(klon, myEmail) {
  if (!klon?.lock_status) return false;
  if (klon.locked_by_user === myEmail) return false;
  if (isLockExpired(klon.locked_at)) return false;
  return true;
}

export default function KlonDetailView({ klon, kannBearbeiten, userEmail }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState(() => {
    try {
      return typeof klon.aufgabentext_inhalt === 'string'
        ? JSON.parse(klon.aufgabentext_inhalt)
        : klon.aufgabentext_inhalt || {};
    } catch {
      return { instruction: klon.aufgabentext_inhalt || '', pairs: [], distractors: [] };
    }
  });

  // Pessimistic Lock
  useKlonLock(klon.id, userEmail, editMode);

  const lockedByOther = isKlonLockedByOther(klon, userEmail);

  // Realtime-Subscription: Lock-Änderungen sofort spiegeln
  useEffect(() => {
    const unsub = base44.entities.Aufgabenbausteine.subscribe((event) => {
      if (event.id === klon.id || event.data?.id === klon.id) {
        queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', 'klone'] });
        queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      }
    });
    return unsub;
  }, [klon.id]);

  const saveMutation = useMutation({
    mutationFn: (updated) =>
      base44.entities.Aufgabenbausteine.update(klon.id, {
        aufgabentext_inhalt: JSON.stringify(updated),
        status: klon.status || 'draft',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', 'klone'] });
      setEditMode(false); // → Lock freigegeben via useKlonLock
      toast.success('Klon gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const approveMutation = useMutation({
    mutationFn: () => base44.entities.Aufgabenbausteine.update(klon.id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', 'klone'] });
      toast.success('Klon freigegeben.');
    },
  });

  const pairs = data.pairs || [];
  const distractors = data.distractors || [];

  const updatePair = (idx, side, val) =>
    setData(d => ({ ...d, pairs: d.pairs.map((p, i) => i === idx ? { ...p, [side]: val } : p) }));
  const addPair = () => setData(d => ({ ...d, pairs: [...(d.pairs || []), { left: '', right: '' }] }));
  const removePair = (idx) => setData(d => ({ ...d, pairs: d.pairs.filter((_, i) => i !== idx) }));
  const updateDistractor = (idx, val) =>
    setData(d => ({ ...d, distractors: d.distractors.map((v, i) => i === idx ? val : v) }));
  const addDistractor = () => setData(d => ({ ...d, distractors: [...(d.distractors || []), ''] }));
  const removeDistractor = (idx) => setData(d => ({ ...d, distractors: d.distractors.filter((_, i) => i !== idx) }));

  const statusBadge = klon.status === 'approved'
    ? <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">✓ Freigegeben</Badge>
    : <Badge variant="secondary">Entwurf {klon.klon_index || '?'}</Badge>;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border">
        {statusBadge}
        <span className="text-xs text-muted-foreground flex-1">Klon-Aufgabe</span>
        {kannBearbeiten && !lockedByOther && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending} className="gap-1.5">
                  {saveMutation.isPending
                    ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save className="w-3.5 h-3.5" />}
                  Speichern
                </Button>
              </>
            ) : (
              <>
                {klon.status !== 'approved' && (
                  <Button size="sm" variant="outline" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
                    className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                    <Check className="w-3.5 h-3.5" /> Freigeben
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                  <Edit className="w-3.5 h-3.5" /> Bearbeiten
                </Button>
              </>
            )}
          </div>
        )}
        {lockedByOther && (
          <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-50">
            <Lock className="w-3.5 h-3.5" /> Gesperrt
          </Button>
        )}
      </div>

      {/* Inhalt */}
      <div className="p-5 space-y-5">
        <LockBanner lockedByUser={lockedByOther ? klon.locked_by_user : null} />

        {/* Arbeitsanweisung */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Arbeitsanweisung</Label>
          {editMode ? (
            <Textarea value={data.instruction || ''} onChange={e => setData(d => ({ ...d, instruction: e.target.value }))}
              className="resize-none h-20 text-sm" />
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              {data.instruction || <span className="italic text-muted-foreground">Nicht ausgefüllt</span>}
            </div>
          )}
        </div>

        {/* Begriffspaare */}
        {pairs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Begriffspaare</Label>
              {editMode && (
                <Button type="button" size="sm" variant="ghost" onClick={addPair} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Paar
                </Button>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              {pairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {editMode ? (
                    <>
                      <Input value={pair.left} onChange={e => updatePair(idx, 'left', e.target.value)} className="flex-1 h-8 text-xs" />
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <Input value={pair.right} onChange={e => updatePair(idx, 'right', e.target.value)} className="flex-1 h-8 text-xs" />
                      <button onClick={() => removePair(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{pair.left}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-muted-foreground">{pair.right}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distraktoren */}
        {(distractors.length > 0 || editMode) && (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distraktoren</Label>
              {editMode && (
                <Button type="button" size="sm" variant="ghost" onClick={addDistractor} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Distraktor
                </Button>
              )}
            </div>
            {distractors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {distractors.map((d, idx) => (
                  editMode ? (
                    <div key={idx} className="flex items-center gap-1">
                      <Input value={d} onChange={e => updateDistractor(idx, e.target.value)} className="h-7 text-xs w-32" />
                      <button onClick={() => removeDistractor(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-muted text-xs border border-dashed border-border">{d}</span>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}