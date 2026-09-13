import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

const SCHRITT_LABEL = {
  einstieg: 'Recherche offen',
  struktur: 'Entwurf liegt vor',
  lernpakete: 'Lernpakete werden gefüllt',
  fertig: 'abgeschlossen',
};

/**
 * Angefangene Durchläufe. Ein Basispaket entsteht nicht in einem Rutsch —
 * deshalb ist Fortsetzen der Normalfall, nicht die Ausnahme.
 */
export default function SitzungListe({ sitzungen, onOeffnen }) {
  if (!sitzungen || sitzungen.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Angefangene Durchläufe</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sitzungen.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{s.titel || s.thema}</p>
              <p className="text-xs text-muted-foreground">
                {s.fach} · Jg. {s.jahrgangsstufe}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                {SCHRITT_LABEL[s.schritt] || s.schritt}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => onOeffnen(s.id)}>
                Fortsetzen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}