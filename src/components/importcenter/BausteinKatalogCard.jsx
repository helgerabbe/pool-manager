import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Boxes, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Veröffentlicht das Baustein-Vokabular (Schritt-Typen + Aktivitätenkatalog)
 * als Datei im Repository. Nach Änderungen am Aktivitätenkatalog erneut drücken
 * — dann weiß der Kursbau, was es gibt, statt es an einem halb leeren Kurs zu
 * merken.
 */
export default function BausteinKatalogCard() {
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [fehler, setFehler] = useState('');

  const senden = async () => {
    setLaeuft(true);
    setFehler('');
    setErgebnis(null);
    try {
      const res = await base44.functions.invoke('pushBausteinKatalog', {});
      setErgebnis(res.data);
    } catch (e) {
      setFehler(e?.message || 'Das hat nicht geklappt.');
    }
    setLaeuft(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="h-4 w-4 text-primary" /> Bausteine an den Kursbau melden
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Schreibt die Liste aller Schritt-Typen und aller Aktivitäten samt ihrer Felder in den
          Ordner <code>bausteine/</code> des Repositorys. Nach Änderungen am Aktivitätenkatalog
          erneut drücken.
        </p>
        <Button onClick={senden} disabled={laeuft} className="gap-2">
          {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
          Liste veröffentlichen
        </Button>
        {ergebnis && (
          <p className="flex items-center gap-2 text-emerald-700">
            <Check className="h-4 w-4" />
            {ergebnis.aktivitaeten} Aktivitäten und {ergebnis.schritt_typen} Schritt-Typen
            {ergebnis.commit_url ? ' veröffentlicht.' : ' — schon aktuell, nichts geändert.'}
          </p>
        )}
        {fehler && <p className="text-destructive">{fehler}</p>}
      </CardContent>
    </Card>
  );
}