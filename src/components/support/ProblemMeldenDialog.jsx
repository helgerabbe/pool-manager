/**
 * ProblemMeldenDialog.jsx
 *
 * Lehrkräfte melden Fehler / Änderungswünsche direkt aus dem PoolManager.
 * Legt per Backend-Function `createTicketIssue` ein GitHub-Issue im Repo
 * IGS-Seevetal/Poolzeit an (Spec 2026-07-03). Kontext (gemeldet von,
 * einheit_id) wird automatisch befüllt.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';

const ART_OPTIONEN = ['Fehler', 'Änderungswunsch'];
const BEREICH_OPTIONEN = [
  'Portal',
  'Einheit / Lernmodul',
  'Coach-Dashboard',
  'Aufgabengalerie / PoolManager-Connector',
  'Sonstiges',
];
const PRIO_OPTIONEN = ['hoch', 'mittel', 'niedrig'];

const LEERES_FORMULAR = {
  art: 'Fehler',
  betrifft: 'Portal',
  titel: '',
  wo_genau: '',
  was_ist: '',
  was_soll: '',
  prioritaet: 'mittel',
};

export default function ProblemMeldenDialog({ open, onOpenChange, einheit = null }) {
  const [form, setForm] = useState(LEERES_FORMULAR);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null); // { number, html_url }
  const [error, setError] = useState(null);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    onOpenChange(false);
    // Nach dem Schließen zurücksetzen (kurz verzögert, damit die
    // Schließ-Animation nicht das leere Formular zeigt)
    setTimeout(() => {
      setForm(LEERES_FORMULAR);
      setResult(null);
      setError(null);
    }, 300);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.titel.trim() || !form.was_ist.trim()) {
      setError('Bitte mindestens Titel und „Was ist jetzt?" ausfüllen.');
      return;
    }
    setIsSending(true);
    try {
      const response = await base44.functions.invoke('createTicketIssue', {
        ...form,
        einheit_id: einheit?.id || null,
        einheit_titel: einheit?.titel_der_einheit || null,
      });
      setResult(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Das Ticket konnte nicht angelegt werden. Bitte später erneut versuchen.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>Problem melden</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deine Meldung wird als Ticket an das Entwicklungsteam übermittelt.
          </p>
        </DialogHeader>

        {result ? (
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <p className="text-sm font-semibold">Ticket #{result.number} wurde angelegt.</p>
            <p className="text-xs text-muted-foreground">Vielen Dank für deine Meldung!</p>
            <DialogFooter className="mt-4">
              <Button onClick={handleClose}>Schließen</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Art</Label>
                  <Select value={form.art} onValueChange={(v) => set('art', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ART_OPTIONEN.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorität</Label>
                  <Select value={form.prioritaet} onValueChange={(v) => set('prioritaet', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIO_OPTIONEN.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Betrifft</Label>
                <Select value={form.betrifft} onValueChange={(v) => set('betrifft', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BEREICH_OPTIONEN.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Titel <span className="text-destructive">*</span></Label>
                <Input
                  value={form.titel}
                  onChange={(e) => set('titel', e.target.value)}
                  placeholder='z. B. Zeitplaner: 5-Minuten-Schritte zu grob'
                />
              </div>

              <div className="space-y-1.5">
                <Label>Wo genau?</Label>
                <Input
                  value={form.wo_genau}
                  onChange={(e) => set('wo_genau', e.target.value)}
                  placeholder={einheit ? `z. B. Einheit "${einheit.titel_der_einheit}", Lernpaket 2` : 'z. B. Einheit, Lernpaket, Aktivität'}
                />
                {einheit && (
                  <p className="text-xs text-muted-foreground">
                    Aktuelle Einheit „{einheit.titel_der_einheit}" wird automatisch mitgeschickt.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Was ist jetzt? <span className="text-destructive">*</span></Label>
                <textarea
                  value={form.was_ist}
                  onChange={(e) => set('was_ist', e.target.value)}
                  rows={3}
                  placeholder="Beschreibe das aktuelle Verhalten / Problem…"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Was soll stattdessen sein?</Label>
                <textarea
                  value={form.was_soll}
                  onChange={(e) => set('was_soll', e.target.value)}
                  rows={3}
                  placeholder="Beschreibe das gewünschte Verhalten…"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Hinweis: Screenshots können hier nicht angehängt werden. Beschreibe das Problem bitte so genau wie möglich.
              </p>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSending}>Abbrechen</Button>
              <Button onClick={handleSubmit} disabled={isSending} className="gap-2">
                {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet…</> : 'Ticket absenden'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}