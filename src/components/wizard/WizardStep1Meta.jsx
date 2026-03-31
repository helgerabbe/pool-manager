import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Loader2 } from 'lucide-react';

const NAVLOGIK = ["Sequenziell","Offen"];

export default function WizardStep1Meta({ onDone }) {
  const [form, setForm] = useState({ fach: '', titel_der_einheit: '', jahrgangsstufe: '', navigationslogik: 'Sequenziell' });
  const [saving, setSaving] = useState(false);

  // Lade Fächer aus der Datenbank
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: async () => {
      const results = await base44.entities.LookupFaecher.list();
      return results.filter(f => f.ist_aktiv).sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999));
    },
  });

  // Lade Jahrgänge aus der Datenbank
  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookupJahrgaenge'],
    queryFn: async () => {
      const results = await base44.entities.LookupJahrgaenge.list();
      return results.filter(j => j.ist_aktiv).sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999));
    },
  });

  const canSubmit = form.fach && form.titel_der_einheit.trim() && form.jahrgangsstufe;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    await onDone(form);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schritt 1: Meta-Daten der Einheit</h2>
        <p className="text-sm text-muted-foreground mt-1">Legen Sie die grundlegenden Informationen für die neue Unterrichtseinheit fest.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Titel der Einheit *</Label>
          <Input
            placeholder="z. B. Lineare Gleichungen"
            value={form.titel_der_einheit}
            onChange={e => setForm({ ...form, titel_der_einheit: e.target.value })}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fach *</Label>
            <Select value={form.fach} onValueChange={v => setForm({ ...form, fach: v })}>
              <SelectTrigger><SelectValue placeholder="Fach wählen" /></SelectTrigger>
              <SelectContent>
                {faecher.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jahrgangsstufe *</Label>
            <Select value={form.jahrgangsstufe} onValueChange={v => setForm({ ...form, jahrgangsstufe: v })}>
              <SelectTrigger><SelectValue placeholder="Jahrgang" /></SelectTrigger>
              <SelectContent>
                {jahrgaenge.map(j => <SelectItem key={j.id} value={j.bezeichnung}>Jg. {j.bezeichnung}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Navigationslogik</Label>
          <Select value={form.navigationslogik} onValueChange={v => setForm({ ...form, navigationslogik: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NAVLOGIK.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Weiter: Didaktik-Coach
          </Button>
        </div>
      </form>
    </div>
  );
}