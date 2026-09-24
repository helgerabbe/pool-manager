/**
 * LernplanDauerFeld.jsx
 *
 * Erster Bereich in Tab 7: geschätzte Bearbeitungsdauer des aktiven Lernplans
 * in Zeitstunden (konzentrierte Arbeitsweise ohne lange Unterbrechungen).
 * Gespeichert in Einheiten.lernplan_dauer_stunden[lerntyp].
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Clock, Loader2, Check } from 'lucide-react';

export default function LernplanDauerFeld({ einheitId, lerntyp, lerntypLabel, readOnly }) {
  const queryClient = useQueryClient();
  const { data: einheit } = useQuery({
    queryKey: ['einheit-lernplan-dauer', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });
  const gespeichert = einheit?.lernplan_dauer_stunden?.[lerntyp];
  const [wert, setWert] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setWert(gespeichert != null ? String(gespeichert).replace('.', ',') : '');
    setStatus(null);
  }, [gespeichert, lerntyp]);

  const speichern = async () => {
    const text = wert.trim().replace(',', '.');
    const zahl = text === '' ? null : Number(text);
    if (zahl !== null && (!Number.isFinite(zahl) || zahl < 0)) {
      setStatus('fehler');
      return;
    }
    if (zahl === (gespeichert ?? null)) return;
    setStatus('speichert');
    const neu = { ...(einheit?.lernplan_dauer_stunden || {}) };
    if (zahl === null) delete neu[lerntyp];
    else neu[lerntyp] = zahl;
    await base44.functions.invoke('updateEinheitSecure', {
      einheit_id: einheitId,
      lernplan_dauer_stunden: neu,
    });
    await queryClient.invalidateQueries({ queryKey: ['einheit-lernplan-dauer', einheitId] });
    setStatus('ok');
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Clock className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-[220px]">
        <p className="text-sm font-semibold text-foreground">Geschätzte Bearbeitungsdauer · {lerntypLabel}</p>
        <p className="text-xs text-muted-foreground">
          Schätzwert bei konzentrierter Arbeit ohne übermäßig lange Unterbrechungen.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={wert}
          disabled={readOnly}
          onChange={(e) => { setWert(e.target.value); setStatus(null); }}
          onBlur={speichern}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="z. B. 6"
          className="w-24 text-right"
        />
        <span className="text-sm text-muted-foreground">Zeitstunden</span>
        <span className="w-4">
          {status === 'speichert' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {status === 'ok' && <Check className="w-4 h-4 text-emerald-600" />}
        </span>
      </div>
      {status === 'fehler' && (
        <p className="w-full text-xs text-destructive">Bitte eine Zahl ab 0 eingeben (z. B. 4 oder 7,5).</p>
      )}
    </div>
  );
}