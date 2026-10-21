import React from 'react';
import { FOLIEN_KONZEPT } from '@/lib/folienKonzept';

/** Infoseite: Begriffe, mit denen jede Folie einer Bauanleitung für den Grafikassistenten gekennzeichnet wird. */
export default function FolienKonzept() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold">Folienkonzept</h2>
        <p className="text-sm text-muted-foreground">Jede Folie einer Bauanleitung wird mit diesen Begriffen gekennzeichnet, damit der Grafikassistent weiß, was die Folie leisten muss.</p>
      </div>
      {FOLIEN_KONZEPT.map((b) => (
        <section key={b.titel} className="space-y-3 border-t pt-6">
          <h3 className="font-display text-xl font-bold">{b.titel}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {b.punkte.map(([name, text]) => (
              <div key={name} className="rounded-xl border bg-card p-4">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}