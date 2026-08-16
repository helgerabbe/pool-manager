/**
 * Inline-Arbeitsbereich einer Phase des Stunden-Regieblatts (MUG Paket 3):
 * Regieanweisung, Schüler-Anweisung, Dauer, Differenzierung, Materialien und —
 * bei digitalen Phasen — die verknüpfte Aufgabenart aus dem Aktivitäten-Katalog.
 * Wird als Akkordeon-Inhalt der Phasen-Karte gerendert (kein Dialog).
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PHASEN_TYP_META, istDigitalerTyp, normalisierterTyp } from '@/lib/stundenPhasen';
import StundenPhaseMaterialListe from './StundenPhaseMaterialListe';
import StundenPhaseAktivitaetWahl from './StundenPhaseAktivitaetWahl';
import { toast } from 'sonner';

export default function StundenPhaseEditForm({ phase, stundeId, onFertig }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    phasenname: phase.phasenname || '',
    typ: normalisierterTyp(phase.typ),
    dauer_minuten: phase.dauer_minuten ?? '',
    lehrer_hinweis: phase.lehrer_hinweis || '',
    schueler_anweisung: phase.schueler_anweisung || '',
    folien_hinweis: phase.folien_hinweis || '',
    aktivitaet_id: phase.aktivitaet_id || '',
    material_urls: phase.material_urls || [],
    differenzierung: phase.differenzierung || { standard: '', stark: '', foerderung: '' },
  }));

  const set = (feld, wert) => setForm((f) => ({ ...f, [feld]: wert }));
  const setDiff = (feld, wert) => setForm((f) => ({ ...f, differenzierung: { ...f.differenzierung, [feld]: wert } }));

  const speichern = useMutation({
    mutationFn: async () => {
      const istDigital = istDigitalerTyp(form.typ);
      const is_complete = istDigital
        ? !!form.aktivitaet_id
        : !!(form.lehrer_hinweis || '').trim();

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
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2 space-y-2">
          <Label>Phasenname</Label>
          <Input className="bg-card" value={form.phasenname} onChange={(e) => set('phasenname', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Dauer (Min.)</Label>
          <Input
            className="bg-card"
            type="number"
            min="0"
            value={form.dauer_minuten}
            onChange={(e) => set('dauer_minuten', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Art der Phase</Label>
        <Select value={form.typ} onValueChange={(v) => set('typ', v)}>
          <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PHASEN_TYP_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {istDigitalerTyp(form.typ) && (
        <StundenPhaseAktivitaetWahl
          value={form.aktivitaet_id}
          onChange={(v) => set('aktivitaet_id', v)}
        />
      )}

      <div className="space-y-2">
        <Label>Regieanweisung (nur für Sie)</Label>
        <Textarea className="bg-card" rows={3} value={form.lehrer_hinweis} onChange={(e) => set('lehrer_hinweis', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Anweisung für Schüler:innen</Label>
        <Textarea
          className="bg-card"
          rows={2}
          value={form.schueler_anweisung}
          onChange={(e) => set('schueler_anweisung', e.target.value)}
          placeholder="Was die Klasse in dieser Phase auf dem Gerät liest"
        />
      </div>

      <div className="space-y-2">
        <Label>Folien-/Präsentationshinweis</Label>
        <Input
          className="bg-card"
          value={form.folien_hinweis}
          onChange={(e) => set('folien_hinweis', e.target.value)}
          placeholder="z. B. Folie 2–4"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Standard</Label>
          <Textarea className="bg-card" rows={2} value={form.differenzierung.standard || ''} onChange={(e) => setDiff('standard', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>★★ Leistungsstark</Label>
          <Textarea className="bg-card" rows={2} value={form.differenzierung.stark || ''} onChange={(e) => setDiff('stark', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Förderung</Label>
          <Textarea className="bg-card" rows={2} value={form.differenzierung.foerderung || ''} onChange={(e) => setDiff('foerderung', e.target.value)} />
        </div>
      </div>

      <StundenPhaseMaterialListe
        materialien={form.material_urls}
        onChange={(m) => set('material_urls', m)}
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={() => onFertig?.()}>Zuklappen</Button>
        <Button onClick={() => speichern.mutate()} disabled={speichern.isPending}>
          {speichern.isPending ? 'Wird gespeichert…' : 'Phase speichern'}
        </Button>
      </div>
    </div>
  );
}