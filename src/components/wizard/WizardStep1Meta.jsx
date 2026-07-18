import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Loader2, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useRBAC } from '@/hooks/useRBAC';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

export default function WizardStep1Meta({ onDone, istBasismodul = false, defaultPrivat = false, initialForm = null }) {
  const { permissions, faecher: userFaecher } = useRBAC();
  // Privat-Modus: Einheit direkt im eigenen Privatbereich anlegen.
  const [privat, setPrivat] = useState(defaultPrivat);
  // initialForm: optionale Vorbefüllung (z. B. Handoff aus dem Einheiten-Coach).
  const [form, setForm] = useState({ 
    fach: '', 
    titel_der_einheit: '', 
    jahrgangsstufe: '', 
    zeit_phase_id: '',
    beschreibung: '',
    ...(initialForm || {}),
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

  // Basismodule decken die Klassenstufen 5–10 ab (hartcodiert), reguläre
  // Einheiten nutzen die Lookup-Jahrgänge (Schuljahr-Zuordnung).
  const basismodulJahrgaenge = ['5', '6', '7', '8', '9', '10'];

  // Basismodule haben keine Halbjahres-Phase. Da das Feld aber Pflicht im
  // Datenmodell ist, setzen wir automatisch die erste verfügbare Phase, sobald
  // die Phasen geladen sind – ohne dass die Lehrkraft etwas auswählen muss.
  useEffect(() => {
    if (istBasismodul && phasen.length > 0 && !form.zeit_phase_id) {
      setForm(f => ({ ...f, zeit_phase_id: phasen[0].id }));
    }
  }, [istBasismodul, phasen, form.zeit_phase_id]);

  const canSubmit = form.fach && form.titel_der_einheit.trim() && form.jahrgangsstufe && form.zeit_phase_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    await onDone({ ...form, privat });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {istBasismodul ? 'Schritt 1: Meta-Daten des Basismoduls' : 'Schritt 1: Meta-Daten der Einheit'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {istBasismodul
            ? 'Legen Sie die grundlegenden Informationen für das neue Basismodul fest.'
            : 'Legen Sie die grundlegenden Informationen für die neue Unterrichtseinheit fest.'}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>{istBasismodul ? 'Titel des Basismoduls (Unterrichtseinheit) *' : 'Titel der Einheit *'}</Label>
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
                {istBasismodul
                  ? basismodulJahrgaenge.map(j => <SelectItem key={j} value={j}>Jg. {j}</SelectItem>)
                  : jahrgaenge.map(j => <SelectItem key={j.id} value={j.bezeichnung}>Jg. {j.bezeichnung}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!istBasismodul && (
          <div className="space-y-2">
            <Label>Zeitraum / Phase (Halbjahr) *</Label>
            <Select value={form.zeit_phase_id} onValueChange={v => setForm({ ...form, zeit_phase_id: v })}>
              <SelectTrigger><SelectValue placeholder="Phase wählen" /></SelectTrigger>
              <SelectContent>
                {phasen.map(p => <SelectItem key={p.id} value={p.id}>{p.bezeichnung}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Optionales Briefing für die KI im Strukturentwurf (Schritt 2). Wird
            NICHT in der Einheit gespeichert (kein Schema-Feld), sondern nur
            durch den Wizard-State an generateUnitStructure weitergereicht. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Was soll in {istBasismodul ? 'diesem Basismodul' : 'dieser Einheit'} gelernt werden? <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <SpeechInputButton
              value={form.beschreibung}
              onResult={(text) => setForm({ ...form, beschreibung: text })}
              maxSeconds={60}
              label="Diktieren"
              listeningLabel="Stopp"
            />
          </div>
          <Textarea
            placeholder="Stichpunkte oder kurzer Fließtext – z. B. „Lineare Gleichungen lösen, Textaufgaben modellieren, grafisch interpretieren.“ Diese Beschreibung wird der KI im nächsten Schritt als zusätzlicher Kontext für den Strukturentwurf mitgegeben."
            value={form.beschreibung}
            onChange={e => setForm({ ...form, beschreibung: e.target.value })}
            rows={4}
            className="resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Hilft der KI, einen passenderen Strukturentwurf zu erzeugen. Du kannst es auch leer lassen.
          </p>
        </div>
        {!istBasismodul && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                Privat erstellen
              </Label>
              <p className="text-xs text-muted-foreground">
                Die Einheit landet nur in Ihrem Privatbereich — Sie können sie später jederzeit veröffentlichen.
              </p>
            </div>
            <Switch checked={privat} onCheckedChange={setPrivat} />
          </div>
        )}
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