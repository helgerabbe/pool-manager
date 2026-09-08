import { useState } from 'react';
import {
  CheckCircle2, Loader2, ArrowLeft, ExternalLink, AppWindow,
  Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';
import EinfachFormatierterText from './EinfachFormatierterText';
import HinweisBox from './HinweisBox';
import BrianSchluesselEingabe from './BrianSchluesselEingabe';
import BrianAnweisungKopieren from './BrianAnweisungKopieren';
import BildLightbox from './BildLightbox';
import { hatSchluessel } from '@/lib/brianSchluessel';

const BRIAN_URL = 'https://brian.study';
const BRIAN_LOGO = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/2d9be32ce_image.png';

/**
 * Schüler-Aktivität „KI-Tutor Aufgabe".
 *
 * Schülergerechte Ansicht im einheitlichen Design: blaue Aufgabenstellung oben,
 * gelbes Hinweisfeld (Wechsel zur App Brian) mit Brian-Logo, drei Öffnungs-
 * Optionen für brian.study (neues Fenster / neuer Tab / kopieren) und unten die
 * beiden Buttons (zurück + grün „Erledigt"). Später kann statt der Startseite
 * eine konkrete Aufgaben-ID übergeben werden.
 */
export default function KITutorSeite({
  aktivitaet, kat, lernpaketTitel, busy, onErledigt, onBack, schluessel = null, dialogUrl = null,
  // true = Aufgabe mit eigenen Brian-Feldern (Aufgabenwerkstatt): IMMER der
  // Link-Weg, auch wenn die URL noch nicht hinterlegt ist — der Dialog wird
  // in Brian angelegt, die Schüler kopieren hier nie eine Anweisung.
  eigenerDialog = false,
}) {
  const fv = aktivitaet?.field_values || {};
  // Lernpaket-Master (KITutorMasterForm) speichert `aufgabenstellung` + `bild_url`,
  // ältere Aufgaben `instruction` — beide Quellen lesen, sonst bleibt die Seite leer.
  const aufgabenText = fv.instruction || fv.aufgabenstellung || '';
  const bildUrl = fv.bild_url || fv.aufgaben_bild_url || '';
  const [bildGross, setBildGross] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  // ZWEI WEGE — bewusst so, nicht vereinfachen:
  // (a) Sind die vier Brian-Felder übertragen (dialogUrl liegt vor), führt ein
  //     HARTER LINK direkt in die in Brian vorbereitete Aufgabe. Nichts kopieren.
  // (b) Fehlt der Link (kleine Brian-Aufgaben in Lernpaketen, Tab 4), bekommen
  //     die Schüler den START-PROMPT zum Kopieren — Lernpakete laufen ohne
  //     eigene Brian-Dialoge, das Gespräch startet aus der Anweisung heraus.
  const direkt = !!dialogUrl || !!fv.brian_url || eigenerDialog;
  const zielUrl = dialogUrl || fv.brian_url || BRIAN_URL;
  // Wann der Schüler von hier aus zu Brian gewechselt ist — Grundlage der
  // Plausibilitätsprüfung beim Schlüsselcode.
  const [geoeffnetAm, setGeoeffnetAm] = useState(null);
  const mitCode = hatSchluessel(schluessel);

  const merkeOeffnen = () => setGeoeffnetAm((prev) => prev || Date.now());
  const oeffneFenster = () => { merkeOeffnen(); window.open(zielUrl, '_blank', 'noopener,noreferrer,width=1100,height=800'); };
  const oeffneTab = () => { merkeOeffnen(); window.open(zielUrl, '_blank', 'noopener,noreferrer'); };
  const kopiereLink = async () => {
    try {
      await navigator.clipboard.writeText(zielUrl);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch { /* Clipboard nicht verfügbar – still ignorieren */ }
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-5 pb-2">
          {/* Aufgabenstellung – einheitlicher blauer Anker. */}
          {aufgabenText && (
            <AufgabenstellungBox>
              <EinfachFormatierterText text={aufgabenText} />
            </AufgabenstellungBox>
          )}

          {/* Bild zur Aufgabe (z. B. Tabelle) – antippen vergrößert. */}
          {bildUrl && (
            <button
              type="button"
              onClick={() => setBildGross(true)}
              className="block w-full rounded-xl border border-border bg-card overflow-hidden"
              aria-label="Bild vergrößern"
            >
              <img src={bildUrl} alt="Bild zur Aufgabe" className="w-full h-auto object-contain max-h-72" />
            </button>
          )}
          {bildGross && <BildLightbox url={bildUrl} onClose={() => setBildGross(false)} />}

          {/* Hinweis: Wechsel zu Brian – gelber Anker mit Brian-Logo. */}
          <HinweisBox>
            <div className="flex items-center gap-3 mb-1.5">
              <img
                src={BRIAN_LOGO}
                alt="Brian"
                className="w-9 h-9 rounded-lg object-contain bg-white shrink-0"
              />
              <p className="font-semibold">Du wechselst jetzt zu Brian.</p>
            </div>
            <p>
              Diese Aufgabe bearbeitest du mit deinem KI-Tutor <strong>Brian</strong>. So geht's:
            </p>
            {direkt ? (
              <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                <li>
                  {dialogUrl
                    ? <>Öffne Brian – der Link führt <strong>direkt zu dieser Aufgabe</strong>. Du musst nichts kopieren.</>
                    : <>Öffne Brian und wähle dort die Aufgabe <strong>„{kat?.name || 'aus deinem Unterricht'}"</strong>. Du musst nichts kopieren.</>}
                </li>
                <li>Bearbeite die Aufgabe im Gespräch mit Brian und <strong>komm danach hierher zurück</strong>.
                  {mitCode
                    ? ' Brian nennt dir am Ende einen Schlüsselcode — den gibst du unten ein.'
                    : ' Tippe dann unten auf „Erledigt".'}
                </li>
              </ol>
            ) : (
              <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                <li>Öffne Brian und starte dort ein <strong>allgemeines Tutorgespräch</strong>.</li>
                <li>Kopiere die Anweisung unten und füge sie als erste Nachricht ein.</li>
                <li>Bearbeite die Aufgabe gemeinsam mit Brian und <strong>komm danach hierher zurück</strong>.
                  {mitCode
                    ? ' Brian nennt dir am Ende einen Schlüsselcode — den gibst du unten ein.'
                    : ' Tippe dann unten auf „Erledigt".'}
                </li>
              </ol>
            )}
          </HinweisBox>

          {/* Ohne vorbereiteten Dialog: der Start-Prompt zum Kopieren. */}
          {!direkt && (
            <BrianAnweisungKopieren
              aufgabe={aufgabenText}
              erwartungshorizont={fv.system_prompt || fv.erwartungshorizont || ''}
            />
          )}

          {/* Brian-Öffnen-Optionen */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              {direkt ? 'Aufgabe in Brian öffnen' : 'Brian öffnen'}
            </p>
            <p className="text-xs text-muted-foreground truncate mb-3">{zielUrl}</p>
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

          {/* Abschluss über den Schlüsselcode — nur wenn Codes vergeben sind. */}
          {mitCode && (
            <BrianSchluesselEingabe
              schluessel={schluessel}
              geoeffnetAm={geoeffnetAm}
              busy={busy}
              onAbschluss={(ergebnis) => onErledigt?.(ergebnis)}
            />
          )}
        </div>
      </div>

      {/* Aktion: links zurück, rechts grün „Erledigt" (ohne Codes) */}
      <div className={cn('pt-4 shrink-0 grid gap-3', mitCode ? 'grid-cols-1' : 'grid-cols-2')}>
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {!mitCode && (
          <Button
            className={cn('gap-2 bg-emerald-600 hover:bg-emerald-700')}
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        )}
      </div>
    </div>
  );
}