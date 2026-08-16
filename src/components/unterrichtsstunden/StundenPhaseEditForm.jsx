/**
 * Inline-Arbeitsbereich einer Phase des Stunden-Regieblatts (MUG Paket 3):
 * Regieanweisung, Schüler-Anweisung, Dauer, Differenzierung, Materialien und —
 * bei digitalen Phasen — die verknüpfte Aufgabenart aus dem Aktivitäten-Katalog.
 * Wird als Akkordeon-Inhalt der Phasen-Karte gerendert (kein Dialog).
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PHASEN_TYP_META,
  istDigitalerTyp,
  normalisierterTyp,
  standardSchuelerAnweisung,
  istStandardSchuelerAnweisung,
} from '@/lib/stundenPhasen';
import StundenPhaseMaterialListe from './StundenPhaseMaterialListe';
import StundenPhaseAktivitaetWahl from './StundenPhaseAktivitaetWahl';
import PhaseAbschnitt from './PhaseAbschnitt';
import StundenAufgabeEditorButton from './StundenAufgabeEditorButton';
import { toast } from 'sonner';

export default function StundenPhaseEditForm({ phase, stundeId, onFertig }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    phasenname: phase.phasenname || '',
    typ: normalisierterTyp(phase.typ),
    dauer_minuten: phase.dauer_minuten ?? '',
    lehrer_hinweis: phase.lehrer_hinweis || '',
    methode_sozialform: phase.methode_sozialform || '',
    material_hinweis: phase.material_hinweis || '',
    schueler_anweisung: phase.schueler_anweisung || standardSchuelerAnweisung(phase.typ),
    folien_hinweis: phase.folien_hinweis || '',
    aktivitaet_id: phase.aktivitaet_id || '',
    material_urls: phase.material_urls || [],
    differenzierung: phase.differenzierung || { standard: '', stark: '', foerderung: '' },
  }));

  const set = (feld, wert) => setForm((f) => ({ ...f, [feld]: wert }));

  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalogAktiv'],
    queryFn: () => base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'phase', 200),
  });
  const gewaehlteAktivitaet = katalog.find((a) => a.id === form.aktivitaet_id);

  // Art wechseln: den Standardsatz mitziehen, solange die Lehrkraft ihn nicht
  // selbst umformuliert hat.
  const setTyp = (typ) =>
    setForm((f) => ({
      ...f,
      typ,
      schueler_anweisung: istStandardSchuelerAnweisung(f.schueler_anweisung)
        ? standardSchuelerAnweisung(typ)
        : f.schueler_anweisung,
    }));

  const speichern = useMutation({
    mutationFn: async () => {
      const istDigital = istDigitalerTyp(form.typ);
      // Analoge Phasen sind immer vollständig (Regieanweisung und Material sind
      // optional); digitale Phasen brauchen die verknüpfte Aufgabenart.
      const is_complete = istDigital ? !!form.aktivitaet_id : true;

      return base44.entities.StundenSequenz.update(phase.id, {
        ...form,
        dauer_minuten: form.dauer_minuten === '' ? null : Number(form.dauer_minuten),
        aktivitaet_id: istDigital ? form.aktivitaet_id : '',
        is_complete,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
      toast.success('Phase gespeichert.');
      onFertig?.();
    },
    onError: (err) => toast.error(err?.message || 'Die Phase konnte nicht gespeichert werden.'),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Phasenname</Label>
          <Input className="bg-card h-9" value={form.phasenname} onChange={(e) => set('phasenname', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Dauer (Min.)</Label>
          <Input
            className="bg-card h-9"
            type="number"
            min="0"
            value={form.dauer_minuten}
            onChange={(e) => set('dauer_minuten', e.target.value)}
          />
        </div>
        <div className="sm:col-span-3 space-y-1.5">
          <Label className="text-xs">Art der Phase</Label>
          <Select value={form.typ} onValueChange={setTyp}>
            <SelectTrigger className="bg-card h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PHASEN_TYP_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {istDigitalerTyp(form.typ) && (
        <>
          <StundenPhaseAktivitaetWahl
            value={form.aktivitaet_id}
            onChange={(v) => set('aktivitaet_id', v)}
          />
          {form.aktivitaet_id && (
            gewaehlteAktivitaet && form.aktivitaet_id === phase.aktivitaet_id ? (
              <StundenAufgabeEditorButton
                phase={phase}
                katalogEntry={gewaehlteAktivitaet}
                stundeId={stundeId}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Speichern Sie die Phase, um die Aufgabe inhaltlich auszuarbeiten.
              </p>
            )
          )}
        </>
      )}

      <PhaseAbschnitt
        titel="Regieanweisung"
        hinweis="nur für Sie · optional"
        gefuellt={!!(form.lehrer_hinweis.trim() || form.methode_sozialform.trim() || form.material_hinweis.trim())}
      >
        <div className="space-y-3">
          <Textarea className="bg-card" rows={3} value={form.lehrer_hinweis} onChange={(e) => set('lehrer_hinweis', e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Methode & Sozialform <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                className="bg-card h-9"
                value={form.methode_sozialform}
                onChange={(e) => set('methode_sozialform', e.target.value)}
                placeholder="z. B. Plenumsgespräch, Partnerarbeit"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Material <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                className="bg-card h-9"
                value={form.material_hinweis}
                onChange={(e) => set('material_hinweis', e.target.value)}
                placeholder="z. B. Tafel, Impulsbild"
              />
            </div>
          </div>
        </div>
      </PhaseAbschnitt>

      {!istDigitalerTyp(form.typ) && (
        <PhaseAbschnitt
          titel="Das sehen die Schüler auf ihrem Gerät"
          hinweis="Standardsatz, anpassbar"
          gefuellt={!!form.schueler_anweisung.trim()}
        >
          <Textarea
            className="bg-card"
            rows={2}
            value={form.schueler_anweisung}
            onChange={(e) => set('schueler_anweisung', e.target.value)}
            placeholder="Text, der in dieser Phase auf dem Digitalgerät der Schüler:innen erscheint"
          />
        </PhaseAbschnitt>
      )}

      <PhaseAbschnitt
        titel="Materialien dieser Phase"
        hinweis="optional · z. B. Folien, Arbeitsblatt"
        gefuellt
      >
        <StundenPhaseMaterialListe
          materialien={form.material_urls}
          onChange={(m) => set('material_urls', m)}
        />
      </PhaseAbschnitt>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={() => onFertig?.()}>Zuklappen</Button>
        <Button onClick={() => speichern.mutate()} disabled={speichern.isPending}>
          {speichern.isPending ? 'Wird gespeichert…' : 'Phase speichern'}
        </Button>
      </div>
    </div>
  );
}