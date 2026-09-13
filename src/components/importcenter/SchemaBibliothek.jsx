import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, BookOpen } from 'lucide-react';
import { useAuftragsSchemata } from '@/hooks/useImportCenter';

/**
 * Die Schema-Bibliothek: der lesende Teil des Tors nach außen. Welche
 * Auftragsarten gibt es, wie muss ein gültiger Auftrag aussehen — und welche
 * Aufgabenarten stehen mit welchen Parametern bereit?
 */
export default function SchemaBibliothek() {
  const { data, isLoading } = useAuftragsSchemata();
  const [suche, setSuche] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Bibliothek wird geladen …
      </div>
    );
  }

  const arten = data?.auftragsarten || [];
  const aufgabenarten = (data?.aufgabenarten || []).filter((a) =>
    String(a.name || '').toLowerCase().includes(suche.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Auftragsarten (Vertrag {data?.vertrag_version})</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Verbindliche Form eines Auftrags. Ein Absender validiert dagegen, bevor er sendet;
            das Import-Center prüft beim Empfang erneut.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {arten.map((a) => (
            <div key={a.art} className="rounded-lg border border-border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{a.label}</span>
                <Badge variant="secondary" className="font-mono text-[11px]">{a.art}</Badge>
                <Badge variant="outline" className="text-[11px]">Ziel: {a.ziel_typ}</Badge>
                {a.position_erlaubt && <Badge variant="outline" className="text-[11px]">mit Position</Badge>}
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{a.beschreibung}</p>
              <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
                {JSON.stringify(a.parameter, null, 2)}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aufgabenarten ({aufgabenarten.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Welche Parameter eine Aufgabenart braucht, steht in ihrem Feld-Schema. Pflichtfelder
            sind mit * markiert.
          </p>
          <Input
            className="mt-2 max-w-sm"
            placeholder="Aufgabenart suchen …"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {aufgabenarten.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{a.name}</span>
                <Badge variant="outline" className="text-[11px]">{a.phase}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{a.id}</span>
              </div>
              {a.form_schema.length === 0 ? (
                <p className="text-sm text-muted-foreground">Kein Feld-Schema hinterlegt.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {a.form_schema
                    .filter((f) => f && f.type !== 'info')
                    .map((f) => (
                      <li key={f.field_name} className="text-muted-foreground">
                        <span className="font-mono text-xs text-foreground">{f.field_name}</span>
                        {f.required ? <span className="text-destructive">*</span> : null}
                        <span> · {f.label} · {f.type}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}