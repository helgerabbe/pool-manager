import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, AlertTriangle, Link2 } from 'lucide-react';

/**
 * Das Rechercheergebnis — die Grundlage, auf der der Entwurf steht. Sie wird
 * gezeigt, damit die Lehrkraft die Empfehlung fachlich beurteilen kann, statt
 * einer Struktur zu vertrauen, deren Herkunft sie nicht kennt.
 */
export default function FundamentKarte({ fundament }) {
  if (!fundament) return null;
  const zugaenge = Array.isArray(fundament.zugaenge) ? fundament.zugaenge : [];
  const stolpersteine = Array.isArray(fundament.stolpersteine) ? fundament.stolpersteine : [];
  const quellen = Array.isArray(fundament.quellen) ? fundament.quellen : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Was die Fachdidaktik dazu sagt</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {fundament.leitidee && <p className="leading-relaxed text-foreground">{fundament.leitidee}</p>}

        {zugaenge.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Bewährte Reihenfolge</p>
            <ol className="space-y-1">
              {zugaenge.map((z, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>
                    <span className="font-medium text-foreground">{z.titel}</span>
                    {z.begruendung ? <span className="text-muted-foreground"> — {z.begruendung}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {stolpersteine.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Typische Stolpersteine
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {stolpersteine.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {quellen.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Quellen</p>
            <ul className="space-y-1">
              {quellen.map((q, i) => (
                <li key={i}>
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Link2 className="h-3 w-3" /> {q.titel}
                  </a>
                  {q.erkenntnis ? <span className="text-muted-foreground"> — {q.erkenntnis}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}