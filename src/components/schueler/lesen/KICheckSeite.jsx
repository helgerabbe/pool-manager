import { useState } from 'react';
import {
  CheckCircle2, Loader2, ArrowLeft, ExternalLink, AppWindow,
  Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';
import HinweisBox from './HinweisBox';

const BRIAN_URL = 'https://brian.study';
const BRIAN_LOGO = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/2d9be32ce_image.png';

/**
 * Schüler-Aktivität „KI-Check" (Abschluss-Phase).
 *
 * Der Schüler verlässt die App und führt den KI-Check bei Brian (brian.study)
 * durch. Aktuell wird nur die Startseite geöffnet – später kann eine konkrete
 * Aufgaben-ID verlinkt werden, die den Check direkt öffnet. Nach erfolgreichem
 * Check kommt der Schüler zurück und bestätigt mit „Erledigt".
 */
export default function KICheckSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const [kopiert, setKopiert] = useState(false);

  const oeffneFenster = () => window.open(BRIAN_URL, '_blank', 'noopener,noreferrer,width=1100,height=800');
  const oeffneTab = () => window.open(BRIAN_URL, '_blank', 'noopener,noreferrer');
  const kopiereLink = async () => {
    try {
      await navigator.clipboard.writeText(BRIAN_URL);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch { /* Clipboard nicht verfügbar – still ignorieren */ }
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-5 pb-2">
          {/* Aufgabenstellung – einheitlicher blauer Anker. */}
          <AufgabenstellungBox>
            {fv.instruction || 'Führe den KI-Check bei Brian durch, um zu zeigen, was du gelernt hast.'}
          </AufgabenstellungBox>

          {/* Hinweis: Wechsel zu Brian – gelber Anker mit Brian-Logo. */}
          <HinweisBox>
            <div className="flex items-center gap-3 mb-1.5">
              <img
                src={BRIAN_LOGO}
                alt="Brian"
                className="w-9 h-9 rounded-lg object-contain bg-white shrink-0"
              />
              <p className="font-semibold">Achtung: Du verlässt jetzt diese App.</p>
            </div>
            <p>
              Den <strong>KI-Check</strong> machst du bei <strong>Brian</strong>. Öffne Brian und
              führe dort den passenden KI-Check zu diesem Lernpaket durch.{' '}
              <strong>Komm hierher zurück, wenn du den Check erfolgreich geschafft hast</strong>,
              und tippe dann unten auf „Erledigt".
            </p>
          </HinweisBox>

          {/* Brian-Öffnen-Optionen */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Brian öffnen</p>
            <p className="text-xs text-muted-foreground truncate mb-3">{BRIAN_URL}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={oeffneFenster} className="gap-2 bg-primary hover:bg-primary/90">
                <AppWindow className="w-4 h-4" /> Neues Fenster
              </Button>
              <Button variant="outline" onClick={oeffneTab} className="gap-2">
                <ExternalLink className="w-4 h-4" /> Neuer Tab
              </Button>
              <Button variant="outline" onClick={kopiereLink} className="gap-2">
                {kopiert
                  ? <><Check className="w-4 h-4 text-emerald-600" /> Kopiert!</>
                  : <><Copy className="w-4 h-4" /> Link kopieren</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Aktion: links zurück, rechts grün „Erledigt" */}
      <div className="pt-4 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className={cn('gap-2 bg-emerald-600 hover:bg-emerald-700')}
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Erledigt
        </Button>
      </div>
    </div>
  );
}