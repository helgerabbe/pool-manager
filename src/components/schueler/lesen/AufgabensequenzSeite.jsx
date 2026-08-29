import { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight, FileText, ListChecks, Film, Music, Image, ExternalLink, EyeOff, Sparkles, MessageCircleQuestion, AlertTriangle, Hand, MonitorPlay, PencilRuler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AufgabenstellungBox from './AufgabenstellungBox';
import HinweisBox from './HinweisBox';
import KITutorSeite from './KITutorSeite';
import { getAktivitaetSeite } from '@/lib/aktivitaetSeitenMap';
import { fragmentZuDokument } from '@/lib/aufgabeFragment';
import { schritteAusAufgabe, getSchrittTyp, SCHRITT_TYPEN } from '@/lib/schrittTypen';
import useSnapshotHtml from '@/hooks/useSnapshotHtml';
import useAktivitaetenKatalogMap from '@/hooks/useAktivitaetenKatalogMap';

/** Erkennt YouTube-Video-IDs. */
function youtubeEmbed(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** Erkennt Vimeo-IDs. */
function vimeoEmbed(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

/** Icon für Material-Typ */
function MaterialIcon({ typ }) {
  switch (typ) {
    case 'video': return <Film className="w-5 h-5" />;
    case 'audio': return <Music className="w-5 h-5" />;
    case 'bild': return <Image className="w-5 h-5" />;
    case 'link': return <ExternalLink className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
}

/** Material-Block (Text, Bild, Video, Audio, PDF, Link) */
function MaterialBlock({ material }) {
  const mt = material?.material_typ || 'text';
  const yt = mt === 'video' ? youtubeEmbed(material.url || '') : null;
  const vm = mt === 'video' ? vimeoEmbed(material.url || '') : null;
  // Video/Audio können als Link ODER als hochgeladene Datei hinterlegt sein.
  const medienUrl = material.url || material.datei_url || '';

  return (
    <div className="space-y-3">
      {material.beschreibung && mt !== 'video' && mt !== 'audio' && (
        <p className="text-sm text-muted-foreground">{material.beschreibung}</p>
      )}

      {mt === 'text' && material.inhalt && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {material.inhalt}
        </div>
      )}

      {mt === 'bild' && material.datei_url && (
        <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
          <img src={material.datei_url} alt="Material" className="w-full h-auto object-contain max-h-72" />
        </div>
      )}

      {mt === 'video' && material.url && (yt || vm) && (
        <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
          <iframe
            src={yt || vm}
            title="Video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {mt === 'video' && medienUrl && !yt && !vm && (
        <div className="rounded-xl overflow-hidden border border-border bg-black">
          {material.datei_url && !material.url ? (
            <video src={material.datei_url} controls className="w-full h-auto max-h-72" />
          ) : (
            <div className="bg-card p-4 text-center">
              <a href={medienUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm break-all">
                Video öffnen
              </a>
            </div>
          )}
        </div>
      )}

      {mt === 'audio' && medienUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-2">Tondatei anhören</p>
          <audio src={medienUrl} controls className="w-full" />
        </div>
      )}

      {mt === 'text' && material.datei_url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <a href={material.datei_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
            Dokument öffnen
          </a>
        </div>
      )}

      {mt === 'pdf' && material.datei_url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-sm mb-2">PDF-Dokument</p>
          <a href={material.datei_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
            PDF öffnen
          </a>
        </div>
      )}

      {mt === 'link' && material.url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm break-all">
            {material.url}
          </a>
        </div>
      )}

      {(!material.inhalt && !material.url && !material.datei_url) && (
        <p className="text-sm text-muted-foreground italic">Kein Inhalt hinterlegt.</p>
      )}
    </div>
  );
}

/**
 * Offener Schritt: in der Aufgabenwerkstatt erzeugtes HTML-Fragment.
 *
 * Das Fragment wird für die Anzeige in ein vollständiges Dokument verpackt
 * (lib/aufgabeFragment) und in einem abgeschotteten iframe gezeigt. Bewusst
 * OHNE allow-same-origin: die Aufgabe darf ihr eigenes Skript ausführen,
 * kommt aber nicht an die App heran.
 */
function OffenerSchrittBlock({ offen }) {
  const { html: dateiHtml } = useSnapshotHtml(offen?.snapshot_url || '');
  const dokument = useMemo(() => {
    if (offen?.snapshot_html) return offen.snapshot_html;
    if (dateiHtml) return dateiHtml;
    if (offen?.fragment) return fragmentZuDokument(offen.fragment);
    return '';
  }, [offen?.snapshot_html, offen?.fragment, dateiHtml]);

  if (!dokument) {
    return <p className="text-sm text-muted-foreground italic">Für diesen Schritt ist noch keine Aufgabe gebaut.</p>;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <iframe
        srcDoc={dokument}
        title="Aufgabe"
        className="w-full min-h-[420px] border-0"
        sandbox="allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}

/** Handlungsschritt: Arbeit an realem Material, nur Bestätigung. */
function HandlungBlock({ handlung }) {
  const h = handlung || {};
  return (
    <div className="space-y-3">
      {h.arbeitsauftrag && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {h.arbeitsauftrag}
        </div>
      )}
      {h.material_hinweis && (
        <HinweisBox>
          <p className="font-semibold mb-1">Das brauchst du dafür</p>
          <p>{h.material_hinweis}</p>
        </HinweisBox>
      )}
      {h.datei_url && (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <a href={h.datei_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
            {h.datei_name || 'Arbeitsblatt öffnen'}
          </a>
        </div>
      )}
      {!h.arbeitsauftrag && !h.material_hinweis && !h.datei_url && (
        <p className="text-sm text-muted-foreground italic">Kein Arbeitsauftrag hinterlegt.</p>
      )}
    </div>
  );
}

/** Externer Schritt: eingebettete fremde Seite (z. B. GeoGebra). */
function ExternBlock({ extern }) {
  const e = extern || {};
  if (!e.url) {
    return <p className="text-sm text-muted-foreground italic">Für diesen Schritt ist noch keine Seite hinterlegt.</p>;
  }
  return (
    <div className="space-y-3">
      {e.hinweis && <HinweisBox>{e.hinweis}</HinweisBox>}
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <iframe
          src={e.url}
          title={e.titel || 'Externe Seite'}
          className="w-full border-0"
          style={{ height: e.hoehe ? `${e.hoehe}px` : '480px' }}
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="text-xs text-muted-foreground break-all">
        <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">
          In neuem Tab öffnen
        </a>
      </p>
    </div>
  );
}

/**
 * Schüler-Aktivität „Aufgabensequenz".
 *
 * Zeigt eine geordnete Schrittfolge, die nacheinander abgearbeitet wird.
 * Der Typ sitzt am Schritt (siehe lib/schrittTypen): material, aufgabe,
 * katalog, offen, brian, handlung, extern.
 *
 * Zwei Darstellungsarten:
 *   - Schritte, die im Rahmen dieser Seite gezeigt werden (material,
 *     aufgabe, offen, handlung, extern) — mit der Navigation unten.
 *   - Schritte, die an eine eigene Schüler-Seite delegieren (katalog über
 *     lib/aktivitaetSeitenMap, brian über KITutorSeite). Diese Seiten
 *     bringen ihre eigene Navigation mit; die Sequenz reicht ihnen nur
 *     „weiter" und „zurück" durch und blendet die eigene Leiste aus.
 *
 * Liest beide Speicherorte: `field_values.sequenz_schritte` (Katalog-
 * Aktivität „Aufgabensequenz") und `sequenz_schritte` direkt an der
 * AllgemeineAufgabe.
 */
export default function AufgabensequenzSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const schritte = useMemo(() => schritteAusAufgabe(aktivitaet), [aktivitaet]);
  const [currentStep, setCurrentStep] = useState(0);
  const [antworten, setAntworten] = useState({});
  const [loesungSichtbar, setLoesungSichtbar] = useState({}); // pro schritt.id → boolean

  const step = schritte[currentStep] || null;
  const typ = step?.typ || SCHRITT_TYPEN.MATERIAL;
  const typInfo = getSchrittTyp(typ);
  const istMaterial = typ === SCHRITT_TYPEN.MATERIAL;
  const istAufgabe = typ === SCHRITT_TYPEN.AUFGABE;
  const isFirst = currentStep === 0;
  const isLast = currentStep === schritte.length - 1;

  // Katalog-Schritte brauchen den Namen der Aktivität, um die passende
  // Schüler-Seite zu finden. Nur laden, wenn wirklich ein solcher Schritt
  // in der Folge steckt.
  const brauchtKatalog = schritte.some((s) => s?.typ === SCHRITT_TYPEN.KATALOG);
  const { katalogMap } = useAktivitaetenKatalogMap({ enabled: brauchtKatalog });

  const standardAufgabe =
    'Bearbeite die folgende Aufgabensequenz Schritt für Schritt. Lies dir zuerst das Material durch und bearbeite dann die dazugehörigen Aufgaben.';

  const weiter = useCallback(() => {
    if (isLast) onErledigt?.();
    else setCurrentStep((prev) => prev + 1);
  }, [isLast, onErledigt]);

  const zurueck = useCallback(() => {
    if (isFirst) onBack?.();
    else setCurrentStep((prev) => prev - 1);
  }, [isFirst, onBack]);

  /** Baut einen KI-Frage-Prompt aus dem Kontext der Aufgabensequenz zusammen. */
  const baueKiFragePrompt = useCallback(() => {
    if (!step) return '';
    const materialTeile = [];
    schritte.forEach((s, i) => {
      if (s.typ === 'material') {
        const mat = s.material || {};
        let beschriftung = mat.beschreibung || `Material ${i + 1}`;
        if (mat.material_typ === 'text' && mat.inhalt) {
          materialTeile.push(`## ${beschriftung}\n${mat.inhalt}`);
        } else if ((mat.material_typ === 'video' || mat.material_typ === 'audio') && mat.url) {
          materialTeile.push(`## ${beschriftung}\nURL: ${mat.url}${mat.transkript ? '\nTranskript:\n' + mat.transkript : ''}`);
        } else if (mat.url) {
          materialTeile.push(`## ${beschriftung}\nURL: ${mat.url}`);
        } else if (mat.datei_url) {
          materialTeile.push(`## ${beschriftung}\nDatei: ${mat.datei_url}`);
        }
      }
    });

    const aufgabenText = fv.aufgabentext || '';
    const schrittAufgabe = step?.aufgabe?.aufgabenstellung || '';
    const musterloesung = step?.aufgabe?.musterloesung || '';
    const meineAntwort = antworten[step?.id] || '';

    return [
      'Ich brauche Hilfe bei einer Aufgabe aus einer Aufgabensequenz.',
      '',
      aufgabenText ? `## Gesamt-Aufgabenstellung\n${aufgabenText}` : '',
      '',
      materialTeile.length > 0 ? `## Material\n${materialTeile.join('\n\n')}` : '',
      '',
      schrittAufgabe ? `## Konkrete Aufgabe\n${schrittAufgabe}` : '',
      '',
      meineAntwort ? `## Meine Antwort\n${meineAntwort}` : '',
      '',
      musterloesung ? `## Musterlösung\n${musterloesung}` : '',
      '',
      'Bitte erkläre mir, warum die Musterlösung richtig ist und wo mein Denkfehler liegen könnte. Gehe dabei Schritt für Schritt vor und verwende einfache Sprache.',
    ].filter(Boolean).join('\n');
  }, [step, schritte, fv, antworten]);

  const handleKopierePrompt = useCallback(async () => {
    const text = baueKiFragePrompt();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Frage-Prompt in die Zwischenablage kopiert. Du kannst ihn jetzt an eine KI (z.B. ChatGPT) übergeben.');
    } catch {
      toast.error('Konnte nicht kopieren.');
    }
  }, [baueKiFragePrompt]);

  if (schritte.length === 0) {
    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
        <AufgabenstellungBox className="mb-4 shrink-0">
          {fv.aufgabentext || standardAufgabe}
        </AufgabenstellungBox>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground italic">
            Für diese Aktivität ist noch keine Aufgabensequenz hinterlegt.
          </p>
        </div>
        <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
            <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
          </Button>
        </div>
      </div>
    );
  }

  /* Schritt-Indikator — über beiden Darstellungsarten gleich. */
  const indikator = (
    <div className="shrink-0 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Schritt {currentStep + 1} von {schritte.length}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          typInfo?.classes?.badge || 'bg-slate-50 text-slate-700 border-slate-200'
        }`}>
          {typInfo?.kurz || 'Schritt'}
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / schritte.length) * 100}%` }}
        />
      </div>
    </div>
  );

  /* ── Delegierende Schritte: eigene Seite mit eigener Navigation ───────── */

  if (typ === SCHRITT_TYPEN.KATALOG) {
    const kat = katalogMap[step.aktivitaet_id];
    const Seite = getAktivitaetSeite(kat?.name);
    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
        {indikator}
        <div className="flex-1 min-h-0">
          {Seite ? (
            <Seite
              aktivitaet={{ id: step.id, aktivitaet_id: step.aktivitaet_id, field_values: step.field_values || {} }}
              kat={kat}
              busy={busy}
              onErledigt={weiter}
              onBack={zurueck}
            />
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center text-center px-4">
                <p className="text-sm text-amber-700 inline-flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {kat?.name
                    ? `Für „${kat.name}“ ist die Schüleransicht noch nicht hinterlegt.`
                    : 'Für diesen Schritt ist noch kein Aufgabenformat ausgewählt.'}
                </p>
              </div>
              <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2" onClick={zurueck} disabled={busy}>
                  <ArrowLeft className="w-4 h-4" /> {isFirst ? 'Zurück zum Lernpaket' : 'Zurück'}
                </Button>
                <Button className="gap-2" onClick={weiter} disabled={busy}>
                  {isLast ? 'Erledigt' : 'Weiter'} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (typ === SCHRITT_TYPEN.BRIAN) {
    const b = step.brian || {};
    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
        {indikator}
        <div className="flex-1 min-h-0">
          <KITutorSeite
            aktivitaet={{ id: step.id, field_values: { instruction: b.learner_instruction || b.aufgabenstellung || '' } }}
            kat={{ name: b.dialog_name || 'KI-Tutor Aufgabe (Brian)' }}
            busy={busy}
            onErledigt={weiter}
            onBack={zurueck}
          />
        </div>
      </div>
    );
  }

  /* ── Schritte im eigenen Rahmen ───────────────────────────────────────── */

  const istHandlung = typ === SCHRITT_TYPEN.HANDLUNG;
  const weiterLabel = istHandlung
    ? (step.handlung?.bestaetigungstext || 'Erledigt – ich habe das gemacht')
    : (isLast ? 'Erledigt' : 'Weiter');

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Aufgabenstellung */}
      <AufgabenstellungBox className="mb-4 shrink-0">
        {fv.aufgabentext || standardAufgabe}
      </AufgabenstellungBox>

      {indikator}

      {/* Inhalt */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="pb-2">
          {istMaterial && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <MaterialIcon typ={step.material?.material_typ || 'text'} />
                </span>
                <span className="text-sm font-semibold">
                  {step.titel || 'Material'}
                </span>
              </div>
              <MaterialBlock material={step.material || {}} />
            </div>
          )}

          {typ === SCHRITT_TYPEN.OFFEN && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 text-violet-700 shrink-0">
                  <PencilRuler className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold">{step.titel || 'Aufgabe'}</span>
              </div>
              <OffenerSchrittBlock offen={step.offen} />
            </div>
          )}

          {istHandlung && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <Hand className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold">{step.titel || 'Handlungsaufgabe'}</span>
              </div>
              <HandlungBlock handlung={step.handlung} />
            </div>
          )}

          {typ === SCHRITT_TYPEN.EXTERN && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                  <MonitorPlay className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold">
                  {step.titel || step.extern?.titel || 'Externe Seite'}
                </span>
              </div>
              <ExternBlock extern={step.extern} />
            </div>
          )}

          {istAufgabe && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <ListChecks className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold">
                  {step.titel || 'Aufgabe'}
                </span>
              </div>
              {step.aufgabe?.aufgabenstellung && (
                <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed mb-4">
                  {step.aufgabe.aufgabenstellung}
                </div>
              )}
              {step.aufgabe?.input_erforderlich !== false && (
                <Textarea
                  value={antworten[step.id] || ''}
                  onChange={(e) => setAntworten(prev => ({ ...prev, [step.id]: e.target.value }))}
                  placeholder="Deine Antwort …"
                  className="min-h-[100px]"
                  disabled={busy || loesungSichtbar[step.id]}
                />
              )}

              {/* Musterlösung-Button */}
              {step.aufgabe?.musterloesung && !loesungSichtbar[step.id] && (
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 self-end border-violet-300 text-violet-700 hover:bg-violet-50"
                    onClick={() => setLoesungSichtbar(prev => ({ ...prev, [step.id]: true }))}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Ich bin fertig – zeig mir die Lösung
                  </Button>
                </div>
              )}

              {/* Musterlösung anzeigen */}
              {step.aufgabe?.musterloesung && loesungSichtbar[step.id] && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <p className="text-xs font-semibold text-violet-800 mb-1.5">Musterlösung</p>
                    <p className="text-sm text-violet-900 whitespace-pre-wrap leading-relaxed">
                      {step.aufgabe.musterloesung}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleKopierePrompt}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Frage an KI stellen (Prompt kopieren)
                  </Button>
                </div>
              )}

              {/* Keine Musterlösung → nur Bestätigung */}
              {!step.aufgabe?.musterloesung && step.aufgabe?.input_erforderlich === false && (
                <p className="mt-3 text-sm text-muted-foreground italic">
                  Klicke auf Weiter, wenn du diesen Schritt erledigt hast.
                </p>
              )}
              {!step.aufgabe?.musterloesung && step.aufgabe?.input_erforderlich !== false && (
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 self-end border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleKopierePrompt}
                  >
                    <MessageCircleQuestion className="w-3.5 h-3.5" />
                    Frage an KI stellen (Prompt kopieren)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={zurueck} disabled={busy}>
          <ArrowLeft className="w-4 h-4" />
          {isFirst ? 'Zurück zum Lernpaket' : 'Zurück'}
        </Button>

        <Button
          className={`gap-2 ${(isLast || istHandlung) ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          onClick={weiter}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" />
            : (isLast || istHandlung) ? <CheckCircle2 className="w-4 h-4" /> : null}
          {weiterLabel}
          {!isLast && !istHandlung && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
