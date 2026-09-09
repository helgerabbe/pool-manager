/**
 * EinheitExportAktivCard.jsx
 *
 * Kurs-Schalter im Export-Center: setzt eine Einheit vom Export aus oder
 * schaltet sie wieder frei. Die Einheit bleibt im Pool-Manager erhalten — nur
 * der ausgelieferte Kurs wird für Schüler unsichtbar.
 *
 * Der Zustand reist über die Statusdatei `kurse/<slug>/kurs-status.json` zum
 * Kursbau (Format 'kurs-status-1', siehe src/docs/mbk-kurs-status-format.md).
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EyeOff, Eye, Loader2, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAirGapPayloads } from '@/hooks/useAirGapPayloads';

export default function EinheitExportAktivCard({ einheit }) {
  const queryClient = useQueryClient();
  const { ordnerSlug } = useAirGapPayloads(einheit?.id);
  const aktiv = einheit?.export_aktiv !== false;
  const [formOffen, setFormOffen] = useState(false);
  const [grund, setGrund] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [warnung, setWarnung] = useState(null);

  const schalten = async (neuAktiv) => {
    setLaeuft(true);
    setFehler(null);
    setWarnung(null);
    try {
      const res = await base44.functions.invoke('setEinheitExportAktivSecure', {
        einheitId: einheit.id,
        aktiv: neuAktiv,
        grund: neuAktiv ? '' : grund.trim(),
        slug: ordnerSlug,
      });
      setWarnung(res?.data?.warnung || null);
      setFormOffen(false);
      setGrund('');
      await queryClient.invalidateQueries({ queryKey: ['einheit', einheit.id] });
      await queryClient.invalidateQueries({ queryKey: ['einheiten', 'all'] });
    } catch (e) {
      setFehler(e?.response?.data?.error || e?.message || 'Umschalten fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/5 text-slate-800 shrink-0">
          {aktiv ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Für Schüler freigeschaltet</h3>
            {aktiv ? (
              <Badge className="text-[10px] border bg-emerald-100 text-emerald-800 border-emerald-300">
                Aktiv
              </Badge>
            ) : (
              <Badge className="text-[10px] border bg-slate-200 text-slate-800 border-slate-300">
                Ausgesetzt
              </Badge>
            )}
          </div>

          {aktiv ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Der Kurs dieser Einheit ist im Moodle sichtbar. Wenn die Einheit veraltet ist oder
              gerade nicht benutzt werden soll, kannst du sie aussetzen: Sie bleibt hier vollständig
              erhalten, der Kurs wird für die Schüler nur unsichtbar geschaltet — und du kannst ihn
              jederzeit wieder freischalten.
            </p>
          ) : (
            <div className="text-xs text-muted-foreground mt-0.5 space-y-1">
              <p>
                Diese Einheit ist vom Export ausgesetzt. Das Moodle-Team schaltet den Kurs unsichtbar
                und baut ihn <strong>nicht</strong> ab — ein Wiederfreischalten ist jederzeit
                möglich.
              </p>
              {einheit.export_deaktiviert_grund && (
                <p>Begründung: „{einheit.export_deaktiviert_grund}"</p>
              )}
              {einheit.export_deaktiviert_am && (
                <p>
                  Ausgesetzt am{' '}
                  {format(new Date(einheit.export_deaktiviert_am), 'dd.MM.yyyy', { locale: de })}
                  {einheit.export_deaktiviert_von ? ` von ${einheit.export_deaktiviert_von}` : ''}.
                </p>
              )}
            </div>
          )}

          {formOffen && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={grund}
                onChange={(e) => setGrund(e.target.value)}
                placeholder="Warum soll der Kurs vorerst nicht mehr benutzt werden? Ein Satz reicht – das Moodle-Team liest ihn mit."
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!grund.trim() || laeuft || !ordnerSlug}
                  onClick={() => schalten(false)}
                >
                  {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                  Kurs aussetzen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFormOffen(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {warnung && (
            <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {warnung}
            </div>
          )}
          {fehler && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 break-words">
              {fehler}
            </div>
          )}
        </div>

        {aktiv ? (
          !formOffen && (
            <Button
              variant="outline"
              className="gap-2 shrink-0"
              disabled={laeuft || !ordnerSlug}
              onClick={() => setFormOffen(true)}
            >
              <EyeOff className="w-4 h-4" /> Kurs aussetzen
            </Button>
          )
        ) : (
          <Button
            className="gap-2 shrink-0"
            disabled={laeuft || !ordnerSlug}
            onClick={() => schalten(true)}
          >
            {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Wieder freischalten
          </Button>
        )}
      </div>
    </div>
  );
}