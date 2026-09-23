/**
 * KursBauenCard.jsx
 *
 * Bauauftrag an den Kursbau: „Für diese Einheit gibt es in Moodle noch keinen
 * Kurs — bitte baue ihn." Anders als der Kurs-Schalter (sichtbar/unsichtbar)
 * verlangt das eine Handlung, deshalb geht der Auftrag als Nachricht in den
 * gemeinsamen Briefkasten `austausch/`.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Hammer, Loader2, CheckCircle2 } from 'lucide-react';
import { useAirGapPayloads } from '@/hooks/useAirGapPayloads';

const HINWEIS_PLATZHALTER =
  'Optionaler Hinweis für das Moodle-Team, z. B. wird ab nächster Woche im Unterricht gebraucht.';

export default function KursBauenCard({ einheit }) {
  const { ordnerSlug } = useAirGapPayloads(einheit?.id);
  const [offen, setOffen] = useState(false);
  const [hinweis, setHinweis] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [gesendet, setGesendet] = useState(null);

  const senden = async () => {
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await base44.functions.invoke('bitteKursBauen', {
        einheitId: einheit.id,
        slug: ordnerSlug,
        hinweis: hinweis.trim(),
      });
      setGesendet(res?.data?.datei || 'gesendet');
      setOffen(false);
      setHinweis('');
    } catch (e) {
      setFehler(e?.response?.data?.error || e?.message || 'Senden fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/5 text-slate-800 shrink-0">
          <Hammer className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Kurs bauen lassen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wenn es für diese Einheit in Moodle noch <strong>gar keinen Kurs</strong> gibt, schickst
            du hier einen Bauauftrag an das Moodle-Team. Es bekommt Titel, Fach, Jahrgang und den
            Kursordner mitgeteilt und legt den Kurs an. Für einen Kurs, der schon existiert und nur
            wieder sichtbar werden soll, nimm stattdessen „Wieder freischalten" darüber.
          </p>

          {offen && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={hinweis}
                onChange={(e) => setHinweis(e.target.value)}
                placeholder={HINWEIS_PLATZHALTER}
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={laeuft || !ordnerSlug} onClick={senden}>
                  {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
                  Bauauftrag senden
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {gesendet && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Der Bauauftrag liegt im Briefkasten des Moodle-Teams ({gesendet}). Die Antwort
                erscheint im Austausch-Posteingang.
              </span>
            </div>
          )}
          {fehler && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 break-words">
              {fehler}
            </div>
          )}
        </div>

        {!offen && (
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            disabled={laeuft || !ordnerSlug}
            onClick={() => setOffen(true)}
          >
            <Hammer className="w-4 h-4" /> Kurs bauen lassen
          </Button>
        )}
      </div>
    </div>
  );
}