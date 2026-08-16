import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bot, Sparkles, Check, RotateCcw } from 'lucide-react';
import StundenPhaseCard from './StundenPhaseCard';
import { eindeutigeCodes } from '@/lib/stundenPhasen';

/**
 * KI-Stunden-Coach (MUG Paket 2): Die Lehrkraft beschreibt ihre Stunde,
 * die KI schlägt einen linearen Phasen-Ablauf vor. Erst beim Übernehmen
 * werden Phasen (StundenSequenz) samt Freischalt-Codes gespeichert.
 */
export default function StundenCoachPanel({ stunde, onUebernommen }) {
  const [beschreibung, setBeschreibung] = useState('');
  const [dauer, setDauer] = useState('45');
  const [vorschlag, setVorschlag] = useState(null);
  const queryClient = useQueryClient();

  const generieren = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateStundenAblauf', {
        stunde_id: stunde.id,
        beschreibung,
        dauer_gesamt: Number(dauer) || 45,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.vorschlag;
    },
    onSuccess: (v) => setVorschlag(v),
  });

  const uebernehmen = useMutation({
    mutationFn: async () => {
      const phasen = vorschlag?.phasen || [];
      const codes = eindeutigeCodes(phasen.length, [stunde.notfall_code]);
      await base44.entities.StundenSequenz.bulkCreate(
        phasen.map((p, idx) => ({
          stunde_id: stunde.id,
          reihenfolge: idx,
          phasenname: p.phasenname || `Phase ${idx + 1}`,
          typ: p.typ || 'lehrer_input',
          dauer_minuten: p.dauer_minuten || undefined,
          lehrer_hinweis: p.lehrer_hinweis || '',
          schueler_anweisung: p.schueler_anweisung || '',
          differenzierung: p.differenzierung || {},
          freischalt_code: codes[idx],
          is_complete: false,
        }))
      );
      await base44.entities.Unterrichtsstunde.update(stunde.id, {
        arbeitstitel: stunde.arbeitstitel || vorschlag?.arbeitstitel || 'Neue Unterrichtsstunde',
        stundenziel: vorschlag?.stundenziel || stunde.stundenziel || '',
        teilziele: vorschlag?.teilziele || stunde.teilziele || [],
      });
    },
    onSuccess: () => {
      setVorschlag(null);
      setBeschreibung('');
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stunde.id] });
      queryClient.invalidateQueries({ queryKey: ['unterrichtsstunde', stunde.id] });
      onUebernommen?.();
    },
  });

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-amber-700" />
        <h2 className="text-sm font-bold text-foreground">KI-Stunden-Coach</h2>
      </div>

      {!vorschlag && (
        <>
          <div className="space-y-2">
            <Label>Was soll in dieser Stunde passieren?</Label>
            <Textarea
              rows={5}
              placeholder="z.B. Einstieg über eine Statistik zur Ausbildungswahl, dann erarbeiten die Schüler:innen in Partnerarbeit typische Berufsfelder, Sicherung im Plenum..."
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ein paar Sätze reichen — die KI schlägt daraus Phasen, Regieanweisungen und Differenzierung vor.
            </p>
          </div>
          <div className="space-y-2 max-w-[180px]">
            <Label>Stundenlänge (Minuten)</Label>
            <Input type="number" min="15" max="180" value={dauer} onChange={(e) => setDauer(e.target.value)} />
          </div>
          {generieren.isError && (
            <p className="text-sm text-destructive">{generieren.error?.message || 'Vorschlag fehlgeschlagen.'}</p>
          )}
          <Button
            onClick={() => generieren.mutate()}
            disabled={!beschreibung.trim() || generieren.isPending}
            className="gap-2"
          >
            {generieren.isPending
              ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Sparkles className="w-4 h-4" />}
            Ablauf vorschlagen
          </Button>
        </>
      )}

      {vorschlag && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            {vorschlag.arbeitstitel && <p className="text-sm font-bold">{vorschlag.arbeitstitel}</p>}
            {vorschlag.stundenziel && (
              <p className="text-sm text-foreground"><span className="text-muted-foreground">Stundenziel: </span>{vorschlag.stundenziel}</p>
            )}
            {(vorschlag.teilziele || []).length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-5">
                {vorschlag.teilziele.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            {(vorschlag.phasen || []).map((p, i) => (
              <StundenPhaseCard key={i} phase={p} nummer={i + 1} />
            ))}
          </div>

          {uebernehmen.isError && (
            <p className="text-sm text-destructive">{uebernehmen.error?.message || 'Übernehmen fehlgeschlagen.'}</p>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={() => uebernehmen.mutate()} disabled={uebernehmen.isPending} className="gap-2">
              {uebernehmen.isPending
                ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Check className="w-4 h-4" />}
              Ablauf übernehmen
            </Button>
            <Button variant="outline" onClick={() => setVorschlag(null)} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Neu beschreiben
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}