/**
 * VideoLinkKarte.jsx
 *
 * Anzeige für Videos, die sich nicht einbetten lassen (z. B. Studyflix):
 * ein deutlicher Knopf, der das Video in einem neuen Tab öffnet — statt eines
 * schwarzen Players, der nie startet.
 */
import { PlayCircle, ExternalLink } from 'lucide-react';

export default function VideoLinkKarte({ url, anbieter }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4 text-center">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 text-accent">
        <PlayCircle className="w-8 h-8" />
      </span>
      <p className="text-sm font-medium text-foreground">
        {anbieter ? `Das Video liegt bei ${anbieter}.` : 'Das Video liegt auf einer externen Seite.'}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Video ansehen <ExternalLink className="w-4 h-4" />
      </a>
      <p className="text-xs text-muted-foreground">
        Es öffnet sich ein neuer Tab. Komm danach hierher zurück und bestätige unten.
      </p>
    </div>
  );
}