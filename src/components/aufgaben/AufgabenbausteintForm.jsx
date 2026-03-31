import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Ban, FileEdit } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export default function AufgabenbausteinForm({ open, onOpenChange, onSubmit, initialData, lernziele, isEdit }) {
  const { bausteinTypen } = useSystemSettings();
  const [formData, setFormData] = useState(initialData || {
    baustein_typ: '',
    lernziel_id: '',
    aufgabentext_inhalt: '',
    erwartungshorizont_ki_prompt: '',
    is_opt_out: false,
    opt_out_begruendung: '',
  });

  const isOptOut = !!formData.is_opt_out;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Wenn Opt-Out aktiv, Inhaltsfelder leeren
    const payload = isOptOut
      ? { ...formData, aufgabentext_inhalt: '', erwartungshorizont_ki_prompt: '' }
      : { ...formData, opt_out_begruendung: '' };
    onSubmit(payload);
    onOpenChange(false);
  };

  const submitDisabled =
    !formData.baustein_typ ||
    (isOptOut && !formData.opt_out_begruendung?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOptOut
              ? <><Ban className="w-4 h-4 text-muted-foreground" /> Baustein ausgelassen</>
              : <><FileEdit className="w-4 h-4 text-primary" /> {initialData ? 'Aufgabenbaustein bearbeiten' : 'Neuer Aufgabenbaustein'}</>
            }
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Baustein-Typ + Lernziel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Baustein-Typ *</Label>
              <Select value={formData.baustein_typ} onValueChange={v => setFormData({ ...formData, baustein_typ: v })}>
                <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                <SelectContent>
                  {bausteinTypen.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zugeordnetes Lernziel</Label>
              <Select value={formData.lernziel_id} onValueChange={v => setFormData({ ...formData, lernziel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional zuordnen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Lernziel</SelectItem>
                  {lernziele?.map(lz => (
                    <SelectItem key={lz.id} value={lz.id}>
                      {lz.formulierung_fachsprache?.substring(0, 60)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Opt-Out Toggle ── */}
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
            isOptOut ? 'border-amber-300 bg-amber-50' : 'border-border bg-muted/30'
          }`}>
            <div className="flex items-start gap-3">
              <Ban className={`w-5 h-5 mt-0.5 shrink-0 ${isOptOut ? 'text-amber-600' : 'text-muted-foreground'}`} />
              <div>
                <p className={`text-sm font-semibold ${isOptOut ? 'text-amber-800' : 'text-foreground'}`}>
                  Diesen Baustein bewusst auslassen (Opt-Out)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Der Baustein wird als vollständig gewertet, ohne Inhalt zu erfordern.
                </p>
              </div>
            </div>
            <Switch
              checked={isOptOut}
              onCheckedChange={v => setFormData({ ...formData, is_opt_out: v })}
            />
          </div>

          {/* ── Opt-Out aktiv: nur Begründung ── */}
          {isOptOut && (
            <div className="space-y-2">
              <Label className="text-amber-800">
                Begründung für das Auslassen *
              </Label>
              <Textarea
                value={formData.opt_out_begruendung}
                onChange={e => setFormData({ ...formData, opt_out_begruendung: e.target.value })}
                placeholder="Warum wird dieser Baustein bewusst weggelassen? (z.B. 'Wird durch externes Material abgedeckt')"
                rows={4}
                className="border-amber-300 focus-visible:ring-amber-400"
              />
              <p className="text-xs text-amber-700">
                Dieses Feld ist Pflicht, damit das Opt-Out nachvollziehbar dokumentiert ist.
              </p>
            </div>
          )}

          {/* ── Normaler Inhalt (nur wenn kein Opt-Out) ── */}
          {!isOptOut && (
            <>
              <div className="space-y-2">
                <Label>Aufgabentext / Inhalt</Label>
                <Textarea
                  value={formData.aufgabentext_inhalt}
                  onChange={e => setFormData({ ...formData, aufgabentext_inhalt: e.target.value })}
                  placeholder="Detaillierter Aufgabentext..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Erwartungshorizont / KI-Prompt</Label>
                <Textarea
                  value={formData.erwartungshorizont_ki_prompt}
                  onChange={e => setFormData({ ...formData, erwartungshorizont_ki_prompt: e.target.value })}
                  placeholder="Vorgaben für den KI-Tutor..."
                  rows={4}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={submitDisabled}
              className={isOptOut ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
            >
              {isOptOut ? 'Opt-Out speichern' : initialData ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}