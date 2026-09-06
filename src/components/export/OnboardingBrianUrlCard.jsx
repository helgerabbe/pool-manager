/**
 * OnboardingBrianUrlCard.jsx
 *
 * Übersehener Brian-Dialog (2026-09-06): Die KI-Intensitätsstufen-Diagnose der
 * Orientierungsphase IST eine Brian-Aufgabe — sie steckt aber nicht in einer
 * AllgemeineAufgabe, sondern in der Einheit selbst
 * (`onboarding_konfiguration.lerntyp_diagnose`). Deshalb tauchte sie im
 * Brian-Cockpit nie auf und es gab keinen Ort für die Brian-URL, mit der die
 * Lehrkraft nachweist, dass das Gespräch in Brian.study tatsächlich angelegt
 * ist. Diese Karte schließt genau diese Lücke; die URL reist über den
 * Onboarding-Payload mit zur MBK.
 */

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingBrianUrlCard({ einheitId }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });

  const diagnose = einheit?.onboarding_konfiguration?.lerntyp_diagnose || null;
  const gespeicherteUrl = (diagnose?.brian_url || '').trim();

  useEffect(() => {
    setUrl(gespeicherteUrl);
  }, [gespeicherteUrl]);

  if (!einheitId || !einheit) return null;

  const speichern = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Bitte die Brian-URL des Gesprächs eintragen.');
      return;
    }
    setSaving(true);
    try {
      const konfig = einheit.onboarding_konfiguration || {};
      await base44.functions.invoke('updateEinheitSecure', {
        einheit_id: einheitId,
        version: einheit.version,
        onboarding_konfiguration: {
          ...konfig,
          lerntyp_diagnose: {
            ...(konfig.lerntyp_diagnose || {}),
            brian_url: trimmed,
            brian_synced_at: new Date().toISOString(),
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['einheit', einheitId] });
      toast.success('Brian-URL der Intensitätsstufen-Diagnose gespeichert.');
    } catch (error) {
      toast.error('Fehler: ' + (error?.response?.data?.message || error?.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MessageCircle className="w-4 h-4 text-sky-600 shrink-0" />
        <span className="font-medium text-sm">KI-Intensitätsstufen-Diagnose (Onboarding)</span>
        <Badge variant="outline" className="text-[10px] shrink-0">🚀 Orientierungsphase</Badge>
        {gespeicherteUrl ? (
          <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> In Brian
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] gap-1 shrink-0">
            <AlertTriangle className="w-3 h-3" /> URL fehlt
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Das Brian-Gespräch, mit dem die Schüler am Ende der Orientierungsphase ihre
        Intensitätsstufe finden. Trage hier die URL des Gesprächs aus Brian.study ein –
        sie ist der Nachweis, dass der Dialog dort angelegt ist, und geht mit dem
        Onboarding-Payload an den Moodle-Bau.
      </p>

      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://brian.study/…"
          className="text-xs h-8"
        />
        <Button
          size="sm"
          onClick={speichern}
          disabled={saving || !url.trim() || url.trim() === gespeicherteUrl}
          className="h-8 text-xs shrink-0"
        >
          {saving ? 'Speichern …' : 'Speichern'}
        </Button>
      </div>

      {gespeicherteUrl && (
        <a
          href={gespeicherteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary underline"
        >
          {gespeicherteUrl} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}