/**
 * SprechaufgabeModal.jsx
 *
 * Editor der Aktivität „Sprechaufgabe": Aufgabenstellung, Aufnahmedauer,
 * Sprache, Erwartungshorizont, Pflichtelemente und Bewertungsschwerpunkt.
 */
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Mic, Plus, X, Info } from 'lucide-react';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';
import MaterialDateiFeld from '@/components/allgemeineAufgaben/MaterialDateiFeld';
import {
  SPRACHEN, DAUER_OPTIONEN, SCHWERPUNKTE, VERSUCHE_OPTIONEN, SPRECHAUFGABE_DEFAULTS,
} from '@/lib/sprechaufgabe';

export default function SprechaufgabeModal({
  open,
  onOpenChange,
  initialFieldValues = {},
  onSave,
  onCancel,
  onReset,
  isSaving = false,
  parentLernpaketName = '',
}) {
  const [data, setData] = useState(SPRECHAUFGABE_DEFAULTS);
  const [neuesElement, setNeuesElement] = useState('');
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setData({ ...SPRECHAUFGABE_DEFAULTS, ...(initialFieldValues || {}) });
      setNeuesElement('');
    }
    prevOpenRef.current = open;
  }, [open]);

  const set = (field, value) => setData((prev) => ({ ...prev, [field]: value }));
  const pflicht = Array.isArray(data.pflichtelemente) ? data.pflichtelemente : [];

  const addElement = () => {
    const wert = neuesElement.trim();
    if (!wert) return;
    set('pflichtelemente', [...pflicht, wert]);
    setNeuesElement('');
  };

  const handleSave = () => {
    const payload = { ...initialFieldValues, ...data };
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }
    onSave?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Sprechaufgabe bearbeiten
          </DialogTitle>
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Lernpaket: <span className="font-medium text-foreground/80">{parentLernpaketName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          <div className="space-y-2">
            <Label>Aufgabenstellung</Label>
            <Textarea
              value={data.aufgabentext || ''}
              onChange={(e) => set('aufgabentext', e.target.value)}
              placeholder="z. B. „Nenne sechs englische Tiernamen und sprich sie deutlich aus.“"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sprache der Aufnahme</Label>
              <Select value={data.sprache || 'de'} onValueChange={(v) => set('sprache', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPRACHEN.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maximale Aufnahmedauer</Label>
              <Select value={String(data.max_dauer_sekunden || 60)} onValueChange={(v) => set('max_dauer_sekunden', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAUER_OPTIONEN.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bewertungsschwerpunkt</Label>
              <Select value={data.schwerpunkt || 'inhalt'} onValueChange={(v) => set('schwerpunkt', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHWERPUNKTE.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Erlaubte Versuche</Label>
              <Select value={String(data.versuche ?? 3)} onValueChange={(v) => set('versuche', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERSUCHE_OPTIONEN.map((v) => <SelectItem key={v.value} value={String(v.value)}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Erwartungshorizont</Label>
            <Textarea
              value={data.erwartungshorizont || ''}
              onChange={(e) => set('erwartungshorizont', e.target.value)}
              placeholder="Was soll gesagt werden? z. B. „Es werden sechs englische Tiernamen genannt, verständlich und einzeln.“"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Pflichtelemente <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                value={neuesElement}
                onChange={(e) => setNeuesElement(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addElement(); } }}
                placeholder="z. B. Simple Past oder ein bestimmtes Wort"
              />
              <Button variant="outline" onClick={addElement} className="gap-1 shrink-0">
                <Plus className="w-4 h-4" /> Hinzufügen
              </Button>
            </div>
            {pflicht.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pflicht.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {p}
                    <button type="button" onClick={() => set('pflichtelemente', pflicht.filter((_, idx) => idx !== i))} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Einzelne Elemente, die vorkommen müssen. Die KI zählt sie beim Auswerten ab.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Bild als Sprechanlass <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <MaterialDateiFeld
              value={data.bild_url || ''}
              onChange={(url) => set('bild_url', url)}
              materialTyp="bild"
              maxMB={10}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Die Aufnahme wird automatisch verschriftet und gegen den Erwartungshorizont geprüft.
              Inhalt, Vollständigkeit und Satzbau sind zuverlässig prüfbar – Betonung und Klang nicht.
              Die Rückmeldung sehen ausschließlich die Schüler:innen.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t shrink-0">
          <div className="flex items-center gap-2 mr-auto">
            {onReset && <ActivityResetButton onReset={onReset} disabled={isSaving} />}
          </div>
          <Button variant="outline" onClick={() => onCancel?.()} disabled={isSaving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : <><Save className="w-4 h-4" /> Speichern</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}