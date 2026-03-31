import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileJson, BookOpen, Layers, Target, Puzzle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function MoodleExport() {
  const { permissions, isLoading: rbacLoading } = useRBAC();
  const [exportedId, setExportedId] = useState(null);

  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
    enabled: permissions.kannExportieren,
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: permissions.kannExportieren,
  });
  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: permissions.kannExportieren,
  });
  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: permissions.kannExportieren,
  });

  const freigegebene = einheiten.filter(e => e.freigabe_status === 'Freigegeben für Moodle');

  const buildExportPayload = (einheit) => {
    const pakete = lernpakete
      .filter(lp => lp.einheit_id === einheit.id)
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .map(paket => ({
        id: paket.id,
        reihenfolge_nummer: paket.reihenfolge_nummer,
        titel: paket.titel_des_pakets,
        geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten,
        lernziele: lernziele
          .filter(lz => lz.lernpaket_id === paket.id)
          .map(lz => ({
            id: lz.id,
            formulierung_fachsprache: lz.formulierung_fachsprache,
            anforderungsebene: lz.anforderungsebene,
            schueler_uebersetzung: lz.schueler_uebersetzung,
          })),
        aufgabenbausteine: aufgaben
          .filter(a => a.lernpaket_id === paket.id)
          .map(a => ({
            id: a.id,
            baustein_typ: a.baustein_typ,
            lernziel_id: a.lernziel_id,
            aufgabentext_inhalt: a.aufgabentext_inhalt,
            erwartungshorizont_ki_prompt: a.erwartungshorizont_ki_prompt,
          })),
      }));

    return {
      export_version: '1.0',
      export_date: new Date().toISOString(),
      einheit: {
        id: einheit.id,
        fach: einheit.fach,
        titel: einheit.titel_der_einheit,
        jahrgangsstufe: einheit.jahrgangsstufe,
        navigationslogik: einheit.navigationslogik,
        freigabe_status: einheit.freigabe_status,
      },
      lernpakete: pakete,
    };
  };

  const handleExport = (einheit) => {
    const payload = buildExportPayload(einheit);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poolplaner_${einheit.fach}_Jg${einheit.jahrgangsstufe}_${einheit.titel_der_einheit.replace(/\s+/g, '_').substring(0, 30)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedId(einheit.id);
    setTimeout(() => setExportedId(null), 2000);
  };

  if (rbacLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!permissions.kannExportieren) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Kein Zugriff. Diese Seite ist nur für <strong>Moodle-Designer</strong> und <strong>Administratoren</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileJson className="w-6 h-6 text-primary" />
          Moodle-Export
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exportiert freigegebene Einheiten als strukturierte JSON-Datei für den Moodle-Import.
        </p>
      </div>

      {/* Übersicht */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{freigegebene.length}</p>
              <p className="text-xs text-muted-foreground">Einheiten zur Freigabe</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {freigegebene.reduce((acc, e) => {
                  const pakete = lernpakete.filter(lp => lp.einheit_id === e.id);
                  return acc + pakete.reduce((a2, p) => a2 + aufgaben.filter(a => a.lernpaket_id === p.id).length, 0);
                }, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Aufgabenbausteine gesamt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export-Liste */}
      {freigegebene.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center">
            <FileJson className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Keine freigegebenen Einheiten vorhanden.<br />
              Bitten Sie die Fachschaftsleitung, Einheiten für Moodle freizugeben.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {freigegebene.map(einheit => {
            const pakete    = lernpakete.filter(lp => lp.einheit_id === einheit.id);
            const paketIds  = pakete.map(p => p.id);
            const zieleCount   = lernziele.filter(lz => paketIds.includes(lz.lernpaket_id)).length;
            const aufgabenCount = aufgaben.filter(a => paketIds.includes(a.lernpaket_id)).length;
            const justExported = exportedId === einheit.id;

            return (
              <Card key={einheit.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-base">{einheit.titel_der_einheit}</h3>
                        <Badge className="bg-green-100 text-green-700 text-[10px]">Freigegeben</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {einheit.fach} · Jahrgang {einheit.jahrgangsstufe} · {einheit.navigationslogik}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />{pakete.length} Lernpakete
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />{zieleCount} Lernziele
                        </span>
                        <span className="flex items-center gap-1">
                          <Puzzle className="w-3 h-3" />{aufgabenCount} Aufgaben
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExport(einheit)}
                      variant={justExported ? 'secondary' : 'default'}
                      className="gap-2 shrink-0"
                    >
                      {justExported
                        ? <><CheckCircle2 className="w-4 h-4 text-green-600" />Exportiert</>
                        : <><Download className="w-4 h-4" />JSON exportieren</>
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Format-Info */}
      <Card className="border-0 bg-muted/40">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Exportformat:</strong> Hierarchisches JSON mit Metadaten (Version, Datum), Einheit, Lernpakete, Lernziele und Aufgabenbausteine (inkl. KI-Prompts). Dateiname-Schema: <code>poolplaner_[Fach]_Jg[Jahrgang]_[Titel].json</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}