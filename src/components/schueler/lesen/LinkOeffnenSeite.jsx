import { useState } from 'react';
import {
  CheckCircle2, Loader2, ArrowLeft, ExternalLink, AppWindow,
  Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';
import HinweisBox from './HinweisBox';

const PHASE_LABEL = { Input: 'Erklärung', 'Übung': 'Übung', Abschluss: 'Abschluss' };

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/**
 * Schüler-Aktivität „Link / URL".
 *
 * Deterministische, schülergerechte Ansicht: macht klar, dass der Schüler die
 * App verlässt, bietet drei Öffnungs-Optionen (neues Fenster / neuer Tab /
 * kopieren) und weist deutlich darauf hin, danach zurückzukehren und „Erledigt"
 * zu bestätigen. Ein kleines Comic-Idiom oben sorgt für Wiedererkennung.
 */
export default function LinkOeffnenSeite({ aktivitaet, kat, lernpaketTitel, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const phase = PHASE_LABEL[aktivitaet.phase] || aktivitaet.phase;

  const rawList = Array.isArray(fv.webadressen) ? fv.webadressen : [];
  const links = (rawList.length > 0
    ? rawList
    : (fv.url ? [{ url: fv.url, label: fv.titel || null }] : []))
    .map((l) => (typeof l === 'string' ? { url: l, label: null } : l))
    .filter((l) => l?.url);

  const [kopiert, setKopiert] = useState(null);

  const oeffneFenster = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=1100,height=800');
  };
  const oeffneTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const kopiereLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setKopiert(url);
      setTimeout(() => setKopiert((k) => (k === url ? null : k)), 2000);
    } catch { /* Clipboard nicht verfügbar – still ignorieren */ }
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-5 pb-2">
          {/* Aufgabenstellung – einheitlicher blauer Anker mit Icon. */}
          {fv.aufgabentext && (
            <AufgabenstellungBox>{fv.aufgabentext}</AufgabenstellungBox>
          )}

          {/* Hinweis: Du verlässt die App – einheitlicher gelber Anker mit Warn-Icon. */}
          <HinweisBox>
            <p className="font-semibold">Du verlässt jetzt die Lern-App.</p>
            <p>Der Link öffnet eine andere Webseite. Schau sie dir in Ruhe an und <strong>komm danach hierher zurück</strong>, um unten auf „Erledigt" zu tippen.</p>
          </HinweisBox>

          {/* Links mit Optionen */}
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-10">
              Für diese Aktivität ist noch kein Link hinterlegt.
            </p>
          ) : (
            <div className="space-y-3">
              {links.map((link, idx) => (
                <div key={`${link.url}-${idx}`} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {link.label || hostname(link.url)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mb-3">{link.url}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button onClick={() => oeffneFenster(link.url)} className="gap-2 bg-primary hover:bg-primary/90">
                      <AppWindow className="w-4 h-4" /> Neues Fenster
                    </Button>
                    <Button variant="outline" onClick={() => oeffneTab(link.url)} className="gap-2">
                      <ExternalLink className="w-4 h-4" /> Neuer Tab
                    </Button>
                    <Button variant="outline" onClick={() => kopiereLink(link.url)} className="gap-2">
                      {kopiert === link.url
                        ? <><Check className="w-4 h-4 text-emerald-600" /> Kopiert!</>
                        : <><Copy className="w-4 h-4" /> Link kopieren</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

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