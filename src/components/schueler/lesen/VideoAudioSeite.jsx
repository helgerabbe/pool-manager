import { CheckCircle2, Loader2, ArrowLeft, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AufgabenstellungBox from './AufgabenstellungBox';

/** Erkennt YouTube-Video-IDs aus den gängigen URL-Formen. */
function youtubeEmbed(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** Erkennt Vimeo-IDs. */
function vimeoEmbed(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

/**
 * Schüler-Aktivität „Video / Audio".
 *
 * Einheitliches Layout wie die übrigen Schüler-Aktivitäten:
 *  - kein Header (Phase/Titel kommt aus der Navigation),
 *  - blauer Aufgabenstellungs-Anker oben,
 *  - das Medium ist direkt eingebettet (YouTube/Vimeo per iFrame,
 *    direkte Video-Dateien per <video>, Audio per <audio>),
 *  - unten genau zwei schülerfreundliche Buttons: links „Zurück zum
 *    Lernpaket", rechts grün „Erledigt".
 */
export default function VideoAudioSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const url = fv.url || fv.video_url || '';
  const istAudio = fv.medientyp === 'audio';

  const ytEmbed = !istAudio ? youtubeEmbed(url) : null;
  const vmEmbed = !istAudio ? vimeoEmbed(url) : null;
  const istEmbed = Boolean(ytEmbed || vmEmbed);

  const standardAufgabe = istAudio
    ? 'Höre dir die folgende Tondatei aufmerksam an und versuche, den Inhalt vollständig zu erfassen.'
    : 'Schau dir das folgende Video aufmerksam an und versuche, den Inhalt vollständig zu erfassen.';

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Aufgabenstellung – einheitlicher blauer Anker mit Icon. */}
      <AufgabenstellungBox className="mb-4 shrink-0">
        {fv.aufgabentext || standardAufgabe}
      </AufgabenstellungBox>

      {/* Medium – direkt eingebettet */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="pb-2">
          {!url ? (
            <p className="text-sm text-muted-foreground italic text-center py-10">
              Für diese Aktivität ist noch kein Medium hinterlegt.
            </p>
          ) : istAudio ? (
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 text-accent">
                <Music className="w-7 h-7" />
              </span>
              <p className="text-sm font-medium text-foreground">Tondatei anhören</p>
              <audio src={url} controls className="w-full">
                Dein Browser kann diese Audiodatei nicht abspielen.
              </audio>
            </div>
          ) : istEmbed ? (
            <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-video">
              <iframe
                src={ytEmbed || vmEmbed}
                title="Video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-border bg-black">
              <video src={url} controls className="w-full h-auto max-h-[60vh]">
                Dein Browser kann dieses Video nicht abspielen.
              </video>
            </div>
          )}

          {url && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              {istAudio ? <Music className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
              Du kannst {istAudio ? 'die Aufnahme' : 'das Video'} so oft anhören bzw. ansehen, wie du möchtest.
            </p>
          )}
        </div>
      </div>

      {/* Aktion: links zurück, rechts grün */}
      <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {istAudio ? 'Gehört' : 'Angeschaut'}
        </Button>
      </div>
    </div>
  );
}