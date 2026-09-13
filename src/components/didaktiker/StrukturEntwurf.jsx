import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Layers, Trash2, Check } from 'lucide-react';

/**
 * Der Strukturentwurf — bearbeitbar, bevor er echt wird. Titel und Leitfragen
 * lassen sich anpassen, einzelne Lernpakete oder Themenfelder wegnehmen. Erst
 * mit „Übernehmen" entsteht die Einheit; vorher ist nichts gespeichert.
 */
export default function StrukturEntwurf({ entwurf, onUebernehmen, laeuft }) {
  const [titel, setTitel] = useState('');
  const [felder, setFelder] = useState([]);

  useEffect(() => {
    setTitel(entwurf?.titel || '');
    setFelder(
      (Array.isArray(entwurf?.themenfelder) ? entwurf.themenfelder : []).map((tf) => ({
        ...tf,
        lernpakete: Array.isArray(tf.lernpakete) ? tf.lernpakete : [],
      }))
    );
  }, [entwurf]);

  const setzeFeld = (idx, aenderung) =>
    setFelder((alt) => alt.map((tf, i) => (i === idx ? { ...tf, ...aenderung } : tf)));

  const setzePaket = (tfIdx, lpIdx, aenderung) =>
    setFelder((alt) =>
      alt.map((tf, i) =>
        i === tfIdx
          ? { ...tf, lernpakete: tf.lernpakete.map((lp, j) => (j === lpIdx ? { ...lp, ...aenderung } : lp)) }
          : tf
      )
    );

  const anzahlPakete = felder.reduce((s, tf) => s + tf.lernpakete.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Vorgeschlagene Struktur</CardTitle>
        </div>
        {entwurf?.begruendung && <p className="text-sm text-muted-foreground">{entwurf.begruendung}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Titel der Einheit</p>
          <Input value={titel} onChange={(e) => setTitel(e.target.value)} />
        </div>

        {felder.map((tf, tfIdx) => (
          <div key={tfIdx} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={tf.titel || ''}
                onChange={(e) => setzeFeld(tfIdx, { titel: e.target.value })}
                className="font-semibold"
              />
              <Button
                variant="ghost"
                size="icon"
                title="Themenfeld entfernen"
                onClick={() => setFelder((alt) => alt.filter((_, i) => i !== tfIdx))}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <Input
              value={tf.leitfrage || ''}
              onChange={(e) => setzeFeld(tfIdx, { leitfrage: e.target.value })}
              placeholder="Leitfrage für die Lernlandkarte"
              className="text-sm"
            />

            <div className="space-y-2 pl-3">
              {tf.lernpakete.map((lp, lpIdx) => (
                <div key={lpIdx} className="rounded-md bg-muted/40 p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={lp.titel || ''}
                      onChange={(e) => setzePaket(tfIdx, lpIdx, { titel: e.target.value })}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Lernpaket entfernen"
                      onClick={() =>
                        setzeFeld(tfIdx, { lernpakete: tf.lernpakete.filter((_, j) => j !== lpIdx) })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  {(lp.lernziele || []).length > 0 && (
                    <ul className="mt-1 list-inside list-disc pl-1 text-xs text-muted-foreground">
                      {lp.lernziele.map((z, i) => (
                        <li key={i}>{z}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <Button
            className="gap-2"
            disabled={laeuft || anzahlPakete === 0 || !titel.trim()}
            onClick={() => onUebernehmen({ ...entwurf, titel: titel.trim(), themenfelder: felder })}
          >
            {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Struktur übernehmen
          </Button>
          <span className="text-xs text-muted-foreground">
            {felder.length} Themenfeld(er) · {anzahlPakete} Lernpaket(e) — die Einheit entsteht in Ihrem
            privaten Bereich.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}