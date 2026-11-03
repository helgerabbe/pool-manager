import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const anker = (i, j) => `fi-${i}${j != null ? `-${j}` : ''}`;
const springe = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** Das gegliederte fachliche Exposé mit Inhaltsverzeichnis. */
export default function FachinhaltExpose({ fachinhalt, laedt, onVertiefen }) {
  const kapitel = fachinhalt?.kapitel || [];
  if (!kapitel.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-primary/40" />
        Noch kein gegliederter Fachinhalt. Füge rechts Texte, Sprachnotizen oder Links hinzu und drücke „In den Fachinhalt einordnen“.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <nav className="rounded-xl border bg-card p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-accent">Inhaltsverzeichnis</p>
        <ol className="space-y-1.5 text-sm">
          {kapitel.map((k, i) => (
            <li key={i}>
              <button onClick={() => springe(anker(i))} className="font-semibold hover:text-primary">{i + 1}. {k.titel}</button>
              <ol className="ml-5 mt-1 space-y-0.5">
                {(k.abschnitte || []).map((a, j) => <li key={j}><button onClick={() => springe(anker(i, j))} className="text-muted-foreground hover:text-primary">{i + 1}.{j + 1} {a.titel}</button></li>)}
              </ol>
            </li>
          ))}
        </ol>
      </nav>
      {kapitel.map((k, i) => (
        <section key={i} id={anker(i)} className="scroll-mt-48 rounded-xl border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-bold">{i + 1}. {k.titel}</h3>
            <Button size="sm" variant="outline" disabled={!!laedt} onClick={() => onVertiefen(k.titel, i)}>
              {laedt === `kap-${i}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Kernthema mit Internetrecherche erweitern
            </Button>
          </div>
          {(k.abschnitte || []).map((a, j) => (
            <div key={j} id={anker(i, j)} className="mb-5 scroll-mt-48">
              <h4 className="mb-1.5 font-semibold">{i + 1}.{j + 1} {a.titel}</h4>
              <div className="prose prose-sm max-w-none"><ReactMarkdown>{a.text || ''}</ReactMarkdown></div>
            </div>
          ))}
        </section>
      ))}
      {fachinhalt.quellen?.length > 0 && (
        <section className="rounded-xl border bg-card p-5 text-sm">
          <h3 className="mb-2 font-semibold">Verwendete Quellen</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{fachinhalt.quellen.map((q, i) => <li key={i} className="break-all">{q}</li>)}</ul>
        </section>
      )}
      {fachinhalt.aktualisiert_am && <p className="text-xs text-muted-foreground">Zuletzt eingeordnet am {new Date(fachinhalt.aktualisiert_am).toLocaleString('de-DE')}</p>}
    </div>
  );
}