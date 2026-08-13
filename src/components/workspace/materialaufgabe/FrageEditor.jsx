import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANTWORT_FORMATE } from '@/lib/materialaufgabe';

/**
 * Editor für EINE Frage einer Materialaufgabe.
 * frageOptional: Die Aufgabenstellung steht bereits im Material —
 * der Fragetext entfällt, Antwortformat & Lösungen bleiben.
 */
export default function FrageEditor({ frage, onChange, disabled = false, frageOptional = false }) {
  const set = (field, value) => onChange({ ...frage, [field]: value });
  const optionen = frage.optionen || [];
  const mehrfach = frage.format === 'mehrfach';

  const setOption = (idx, patch) => {
    const next = optionen.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    // Bei Einzelauswahl darf nur eine Option richtig sein.
    if (!mehrfach && patch.isCorrect === true) {
      next.forEach((o, i) => { o.isCorrect = i === idx; });
    }
    set('optionen', next);
  };

  return (
    <div className="space-y-4">
      {!frageOptional && (
        <div className="space-y-2">
          <Label>Frage</Label>
          <Textarea
            value={frage.frage || ''}
            onChange={(e) => set('frage', e.target.value)}
            placeholder="z. B. „Wo findet das Gespräch statt?“"
            className="min-h-[80px]"
            disabled={disabled}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Antwortformat</Label>
        <Select value={frage.format || 'auswahl'} onValueChange={(v) => set('format', v)} disabled={disabled}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ANTWORT_FORMATE.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(frage.format === 'auswahl' || mehrfach) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Antwortmöglichkeiten <span className="text-muted-foreground font-normal">(Häkchen = richtig)</span></Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => set('optionen', [...optionen, { text: '', isCorrect: false }])}
              disabled={disabled}
              className="gap-1 text-xs h-7"
            >
              <Plus className="w-3 h-3" /> Antwort
            </Button>
          </div>
          <div className="space-y-2">
            {optionen.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type={mehrfach ? 'checkbox' : 'radio'}
                  checked={opt.isCorrect === true}
                  onChange={(e) => setOption(idx, { isCorrect: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 cursor-pointer"
                  title="Als richtig markieren"
                />
                <Input
                  value={opt.text || ''}
                  onChange={(e) => setOption(idx, { text: e.target.value })}
                  placeholder={`Antwort ${idx + 1}`}
                  disabled={disabled}
                  className="flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => set('optionen', optionen.filter((_, i) => i !== idx))}
                  disabled={disabled}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  title="Antwort entfernen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {optionen.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Noch keine Antwortmöglichkeiten.</p>
            )}
          </div>
        </div>
      )}

      {frage.format === 'wahr_falsch' && (
        <div className="space-y-2">
          <Label>Richtige Antwort</Label>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => set('korrekt_bool', val)}
                disabled={disabled}
                className={cn(
                  'flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                  frage.korrekt_bool === val
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                )}
              >
                {val ? 'Richtig' : 'Falsch'}
              </button>
            ))}
          </div>
        </div>
      )}

      {frage.format === 'kurzantwort' && (
        <div className="space-y-2">
          <Label>Richtige Antwort(en)</Label>
          <Input
            value={frage.loesungen || ''}
            onChange={(e) => set('loesungen', e.target.value)}
            placeholder="z. B. Bahnhof; am Bahnhof"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Mehrere erlaubte Schreibweisen mit Semikolon trennen.
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={frage.gross_klein_ignorieren !== false}
              onChange={(e) => set('gross_klein_ignorieren', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4"
            />
            Groß- und Kleinschreibung ignorieren
          </label>
        </div>
      )}

      <div className="space-y-2">
        <Label>Rückmeldung nach dem Prüfen <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          value={frage.rueckmeldung || ''}
          onChange={(e) => set('rueckmeldung', e.target.value)}
          placeholder="Kurze Erklärung, die den Schüler:innen nach dem Prüfen angezeigt wird."
          className="min-h-[70px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}