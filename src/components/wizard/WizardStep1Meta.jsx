import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';

export default function WizardStep1Meta({ onDone }) {
  const { permissions, faecher: userFaecher } = useRBAC();
  const [form, setForm] = useState({ 
    fach: '', 
    titel_der_einheit: '', 
    jahrgangsstufe: '', 
    zeit_phase_id: ''
  });
  const [saving, setSaving] = useState(false);

  // ✅ SCHRITT 3: Lade NUR die Fächer des Users (Security-Fix)
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: async () => {
      const results = await base44.entities.LookupFaecher.list();
      const activeFaecher = results.filter(f => f.ist_aktiv).sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999));
      
      // Admin/Fachschaft sieht alle Fächer, Lehrkraft nur ihre eigenen
      if (permissions.istAdmin) {
        return activeFaecher;
      }
      // Filtere auf User-Fächer (fallback: alle wenn keine Fächer zugewiesen)
      return userFaecher.length > 0 
        ? activeFaecher.filter(f => userFaecher.includes(f.name))
        : activeFaecher;
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

  // Lade Phasen aus der Datenbank
  const { data: phasen = [] } = useQuery({
    queryKey: ['lookupPhasen'],
    queryFn: async () => {
      const results = await base44.entities.LookupPhasen.list();
      return results.filter(p => p.ist_aktiv).sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung));
    },
  });

  const canSubmit = form.fach && form.titel_der_einheit.trim() && form.jahrgangsstufe && form.zeit_phase_id;

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
          <Label>Zeitraum / Phase (Halbjahr) *</Label>
          <Select value={form.zeit_phase_id} onValueChange={v => setForm({ ...form, zeit_phase_id: v })}>
            <SelectTrigger><SelectValue placeholder="Phase wählen" /></SelectTrigger>
            <SelectContent>
              {phasen.map(p => <SelectItem key={p.id} value={p.id}>{p.bezeichnung}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Weiter: Strukturentwurf
          </Button>
        </div>
      </form>
    </div>
  );
}