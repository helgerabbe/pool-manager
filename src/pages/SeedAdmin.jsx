import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatabaseZap, CheckCircle2, AlertCircle, Loader2, ChevronRight, ShieldCheck, SkipForward } from 'lucide-react';

export default function SeedAdmin() {
  const { permissions, isLoading: rbacLoading } = useRBAC();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleSeed = async () => {
    setRunning(true);
    setResult(null);
    const response = await base44.functions.invoke('seedTestdata', {});
    setResult(response.data);
    setRunning(false);
  };

  if (rbacLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!permissions.kannBenutzerVerwalten) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Kein Zugriff. Nur Administratoren dürfen Testdaten einspielen.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DatabaseZap className="w-6 h-6 text-primary" />
          Testdaten-Seed
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spielt initiale Testdaten in die Datenbank ein. Bereits vorhandene Datensätze werden übersprungen.
        </p>
      </div>

      {/* Was wird erstellt */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datensätze im Seed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { label: '5 Benutzer', detail: '1× Admin · 1× Fachschaftsleitung · 2× Fachlehrkraft · 1× Moodle-Designer' },
            { label: '1 Einheit', detail: '"Interpretation von Kurzgeschichten" – Deutsch, Jg. 9, Sequenziell' },
            { label: '2 Lernpakete', detail: '"Merkmale erkennen" und "Figurencharakterisierung"' },
            { label: '3 Lernziele', detail: 'Ebene 1, 2 und 3 für Lernpaket 1' },
            { label: '4 Aufgabenbausteine', detail: 'Pre-Test · Ebene-1-Übung (🔒 gesperrt) · Ebene-2-Aufgabe · Ebene-3-Projekt' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground ml-2">{item.detail}</span>
              </div>
            </div>
          ))}
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Record-Lock-Test:</strong> Der Aufgabenbaustein "Ebene-1-Übung" ist mit <code>lock_status=true</code> und <code>locked_by_user="lehrkraft.mueller@schule-beispiel.de"</code> vorbelegt, um das Locking-Verhalten direkt zu testen.
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSeed}
        disabled={running}
        size="lg"
        className="w-full gap-2"
      >
        {running ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Daten werden eingespielt…</>
        ) : (
          <><DatabaseZap className="w-4 h-4" />Seed jetzt ausführen</>
        )}
      </Button>

      {/* Ergebnis-Log */}
      {result && (
        <Card className={`border-0 shadow-sm ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-base flex items-center gap-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.success
                ? <><CheckCircle2 className="w-4 h-4" />Erfolgreich abgeschlossen</>
                : <><AlertCircle className="w-4 h-4" />Fehler aufgetreten</>
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.error && (
              <p className="text-sm text-red-700 mb-3">{result.error}</p>
            )}
            {result.log && (
              <div className="space-y-1">
                {result.log.map((line, i) => {
                  const isSkip = line.startsWith('⏭️');
                  const isWarn = line.startsWith('⚠️');
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {isSkip
                        ? <SkipForward className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        : isWarn
                          ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                      }
                      <span className={isSkip ? 'text-muted-foreground' : isWarn ? 'text-amber-700' : 'text-green-800'}>
                        {line.replace(/^[✅⏭️⚠️]\s*/, '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}