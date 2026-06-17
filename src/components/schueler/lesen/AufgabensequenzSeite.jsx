import { useState, useCallback } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight, FileText, ListChecks, Film, Music, Image, ExternalLink, EyeOff, Copy, Sparkles, MessageCircleQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AufgabenstellungBox from './AufgabenstellungBox';

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
  const yt = mt === 'video' ? youtubeEmbed(material.url) : null;
  const vm = mt === 'video' ? vimeoEmbed(material.url) : null;

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

      {mt === 'video' && material.url && !yt && !vm && (
        <div className="rounded-xl overflow-hidden border border-border bg-black">
          <video src={material.url} controls className="w-full h-auto max-h-72" />
        </div>
      )}

      {mt === 'audio' && material.url && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-2">Tondatei anhören</p>
          <audio src={material.url} controls className="w-full" />
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
 * Schüler-Aktivität „Aufgabensequenz".
 *
 * Zeigt eine Abfolge von Material- und Aufgabenschritten, die streng
 * nacheinander abgearbeitet werden. Jeder Schritt wird einzeln angezeigt,
 * mit "Weiter" / "Zurück"-Navigation. Am letzten Schritt erscheint "Erledigt".
 */
export default function AufgabensequenzSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const schritte = Array.isArray(fv.sequenz_schritte) ? fv.sequenz_schritte : [];
  const [currentStep, setCurrentStep] = useState(0);
  const [antworten, setAntworten] = useState({});
  const [loesungSichtbar, setLoesungSichtbar] = useState({}); // pro schritt.id → boolean

  const step = schritte[currentStep] || null;
  const istMaterial = step?.typ === 'material';
  const istAufgabe = step?.typ === 'aufgabe';
  const isFirst = currentStep === 0;
  const isLast = currentStep === schritte.length - 1;

  const standardAufgabe =
    'Bearbeite die folgende Aufgabensequenz Schritt für Schritt. Lies dir zuerst das Material durch und bearbeite dann die dazugehörigen Aufgaben.';

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

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Aufgabenstellung */}
      <AufgabenstellungBox className="mb-4 shrink-0">
        {fv.aufgabentext || standardAufgabe}
      </AufgabenstellungBox>

      {/* Schritt-Indikator */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Schritt {currentStep + 1} von {schritte.length}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            istMaterial
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {istMaterial ? 'Material' : 'Aufgabe'}
          </span>
        </div>
        {/* Fortschrittsbalken */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / schritte.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Inhalt – Material oder Aufgabe */}
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

                  {/* KI-Frage-Prompt Button */}
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
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => isFirst ? onBack() : setCurrentStep(prev => prev - 1)}
          disabled={busy}
        >
          <ArrowLeft className="w-4 h-4" />
          {isFirst ? 'Zurück zum Lernpaket' : 'Zurück'}
        </Button>

        {isLast ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : (
          <Button
            className="gap-2"
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={busy}
          >
            Weiter
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}