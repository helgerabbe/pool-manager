import { useState } from 'react';
import { Mic, Square, RotateCcw, Send, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import AufgabenstellungBox from './AufgabenstellungBox';
import SprechaufgabeFeedback from './SprechaufgabeFeedback';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import { formatDauer } from '@/lib/sprechaufgabe';

/**
 * Schüler-Aktivität „Sprechaufgabe": Die Schüler:innen nehmen eine kurze
 * Sprachaufnahme auf. Die Aufnahme wird automatisch verschriftet und gegen den
 * Erwartungshorizont geprüft; die Rückmeldung sehen nur die Schüler:innen.
 */
export default function SprechaufgabeSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const maxDauer = Number(fv.max_dauer_sekunden) || 60;
  const maxVersuche = Number(fv.versuche) || 0; // 0 = unbegrenzt
  const { aufnahmeLaeuft, sekunden, blob, blobUrl, fehler, start, stop, reset } = useAudioRecorder(maxDauer);

  const [pruefen, setPruefen] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [fehlerText, setFehlerText] = useState('');
  const [versuche, setVersuche] = useState(0);

  const versucheAufgebraucht = maxVersuche > 0 && versuche >= maxVersuche;

  const abschicken = async () => {
    if (!blob) return;
    setPruefen(true);
    setFehlerText('');
    try {
      const datei = new File([blob], 'aufnahme.webm', { type: blob.type || 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: datei });
      const res = await base44.functions.invoke('evaluateSprechaufgabe', {
        audio_url: file_url,
        aufgabentext: fv.aufgabentext || '',
        erwartungshorizont: fv.erwartungshorizont || '',
        pflichtelemente: Array.isArray(fv.pflichtelemente) ? fv.pflichtelemente : [],
        sprache: fv.sprache || 'de',
        schwerpunkt: fv.schwerpunkt || 'inhalt',
      });
      const data = res?.data || res;
      if (!data?.success) {
        setFehlerText(data?.error || 'Die Auswertung hat nicht funktioniert. Versuche es bitte noch einmal.');
      } else {
        setErgebnis(data);
        setVersuche((v) => v + 1);
      }
    } catch (err) {
      setFehlerText(err?.message || 'Die Auswertung hat nicht funktioniert. Versuche es bitte noch einmal.');
    } finally {
      setPruefen(false);
    }
  };

  const nochmal = () => { setErgebnis(null); setFehlerText(''); reset(); };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.aufgabentext || 'Nimm deine Antwort als Sprachaufnahme auf.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">
        {fv.bild_url && (
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
            <img src={fv.bild_url} alt="Material zur Sprechaufgabe" className="w-full h-auto object-contain max-h-64" />
          </div>
        )}

        {/* Aufnahme-Bereich */}
        <div className="rounded-xl border border-border bg-card p-5 text-center space-y-4">
          <p className="text-sm font-semibold">Deine Sprachaufnahme</p>

          <div className={cn(
            'mx-auto flex items-center justify-center w-20 h-20 rounded-full transition-colors',
            aufnahmeLaeuft ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-primary/10 text-primary'
          )}>
            <Mic className="w-8 h-8" />
          </div>

          <p className="text-sm font-mono">
            {formatDauer(sekunden)} <span className="text-muted-foreground">/ {formatDauer(maxDauer)}</span>
          </p>

          {!blob ? (
            aufnahmeLaeuft ? (
              <Button onClick={stop} className="gap-2 bg-rose-600 hover:bg-rose-700">
                <Square className="w-4 h-4" /> Aufnahme beenden
              </Button>
            ) : (
              <Button onClick={start} disabled={pruefen || versucheAufgebraucht} className="gap-2">
                <Mic className="w-4 h-4" /> Aufnahme starten
              </Button>
            )
          ) : (
            <div className="space-y-3">
              <audio src={blobUrl} controls className="w-full" />
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {!ergebnis && (
                  <>
                    <Button variant="outline" onClick={nochmal} disabled={pruefen} className="gap-2">
                      <RotateCcw className="w-4 h-4" /> Neu aufnehmen
                    </Button>
                    <Button onClick={abschicken} disabled={pruefen} className="gap-2">
                      {pruefen
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird ausgewertet…</>
                        : <><Send className="w-4 h-4" /> Abschicken & auswerten</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {maxVersuche > 0 && (
            <p className="text-xs text-muted-foreground">
              Versuche: {versuche} von {maxVersuche}
            </p>
          )}
          {(fehler || fehlerText) && (
            <p className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {fehler || fehlerText}
            </p>
          )}
        </div>

        {/* Rückmeldung */}
        <SprechaufgabeFeedback ergebnis={ergebnis} />

        {ergebnis && !versucheAufgebraucht && (
          <Button variant="outline" onClick={nochmal} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" /> Noch einmal aufnehmen
          </Button>
        )}
      </div>

      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy || !ergebnis}
          onClick={onErledigt}
          title={!ergebnis ? 'Schicke zuerst deine Aufnahme ab.' : ''}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Erledigt
        </Button>
      </div>
    </div>
  );
}