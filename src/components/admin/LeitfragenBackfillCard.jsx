/**
 * LeitfragenBackfillCard.jsx
 *
 * Etappe 0 der Lernlandkarte: Die KI schlägt für alle Themenfelder ohne
 * Leitfrage eine vor und formuliert fehlende Schüler-Übersetzungen der
 * Lernziele als Fragen. Die Administration sichtet die Liste, kann jeden Text
 * überschreiben oder abwählen — erst dann wird nachgetragen.
 */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Check, Loader2, Map as MapIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VorschlagListe({ titel, eintraege, feld, kontextFeld, onChange }) {
  if (eintraege.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titel} ({eintraege.filter((e) => e._an).length}/{eintraege.length})
      </p>
      <div className="space-y-2">
        {eintraege.map((e, i) => (
          <div key={e.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={e._an}
              onChange={(ev) => onChange(i, { _an: ev.target.checked })}
              className="mt-2.5 cursor-pointer"
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate text-xs text-muted-foreground">{e[kontextFeld]}</p>
              <Input
                value={e[feld]}
                onChange={(ev) => onChange(i, { [feld]: ev.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeitfragenBackfillCard() {
  const [themenfelder, setThemenfelder] = useState(null);
  const [lernziele, setLernziele] = useState(null);

  const vorschlagMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateLeitfragenVorschlaege', {});
      return res?.data;
    },
    onSuccess: (data) => {
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setThemenfelder((data?.themenfelder || []).map((x) => ({ ...x, _an: true })));
      setLernziele((data?.lernziele || []).map((x) => ({ ...x, _an: true })));
      toast.success(
        `Vorschläge da: ${data?.themenfelder?.length || 0} Themenfelder, ${data?.lernziele?.length || 0} Lernziele.`
      );
    },
    onError: (err) => toast.error('Die Vorschläge kamen nicht: ' + (err.message || '')),
  });

  const uebernehmenMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('applyLeitfragen', {
        themenfelder: (themenfelder || [])
          .filter((x) => x._an && x.leitfrage.trim())
          .map((x) => ({ id: x.id, leitfrage: x.leitfrage })),
        lernziele: (lernziele || [])
          .filter((x) => x._an && x.schueler_uebersetzung.trim())
          .map((x) => ({ id: x.id, schueler_uebersetzung: x.schueler_uebersetzung })),
      });
      return res?.data;
    },
    onSuccess: (data) => {
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(
        `Nachgetragen: ${data?.themenfelder || 0} Leitfragen, ${data?.lernziele || 0} Lernziel-Fragen.`
      );
      setThemenfelder(null);
      setLernziele(null);
    },
    onError: (err) => toast.error('Übernehmen ging nicht: ' + (err.message || '')),
  });

  const hatVorschlaege = (themenfelder?.length || 0) + (lernziele?.length || 0) > 0;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapIcon className="h-4 w-4 text-primary" />
          Leitfragen für die Lernlandkarte
        </CardTitle>
        <CardDescription>
          Die Lernlandkarte zeigt an jedem Knoten eine Frage. Hier lässt du die KI
          alle fehlenden Leitfragen vorschlagen — du siehst sie durch, änderst was
          du möchtest und trägst sie dann nach. Vorhandene Texte bleiben unberührt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button
          onClick={() => vorschlagMutation.mutate()}
          disabled={vorschlagMutation.isPending}
          className="gap-2"
        >
          {vorschlagMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {vorschlagMutation.isPending ? 'Die KI überlegt …' : 'Vorschläge erzeugen'}
        </Button>

        {themenfelder !== null && !hatVorschlaege && (
          <p className="text-sm text-muted-foreground">
            Es fehlt nichts — alle Themenfelder und Lernziele haben schon eine Frage.
          </p>
        )}

        {hatVorschlaege && (
          <div className="space-y-5">
            <VorschlagListe
              titel="Themenfeld-Leitfragen"
              eintraege={themenfelder || []}
              feld="leitfrage"
              kontextFeld="titel"
              onChange={(i, patch) =>
                setThemenfelder((prev) =>
                  prev.map((x, xi) => (xi === i ? { ...x, ...patch } : x))
                )
              }
            />
            <VorschlagListe
              titel="Lernziel-Fragen"
              eintraege={lernziele || []}
              feld="schueler_uebersetzung"
              kontextFeld="fachsprache"
              onChange={(i, patch) =>
                setLernziele((prev) => prev.map((x, xi) => (xi === i ? { ...x, ...patch } : x)))
              }
            />

            <Button
              onClick={() => uebernehmenMutation.mutate()}
              disabled={uebernehmenMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {uebernehmenMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Ausgewählte übernehmen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}