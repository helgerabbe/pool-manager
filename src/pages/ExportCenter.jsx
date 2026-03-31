import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, RefreshCw, AlertCircle, CheckCircle2,
  Layers, Target, Puzzle, BookOpen, FileJson, Loader2, ChevronDown, AlertTriangle
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const SYNC_BADGE = {
  new:      { label: 'Neu',       className: 'bg-green-100 text-green-700' },
  modified: { label: 'Geändert',  className: 'bg-amber-100 text-amber-700' },
  exported: { label: 'Exportiert',className: 'bg-blue-100 text-blue-700' },
};

function SyncBadge({ status }) {
  const cfg = SYNC_BADGE[status] || SYNC_BADGE.new;
  return <Badge className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>;
}

export default function ExportCenter() {
  const queryClient = useQueryClient();
  const { permissions } = useRBAC();
  const [selectedEinheitId, setSelectedEinheitId] = useState('');
  const [exportMode, setExportMode] = useState(null); // 'full' | 'delta'
  const [exportResult, setExportResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!selectedEinheitId,
  });
  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!selectedEinheitId,
  });
  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: !!selectedEinheitId,
  });

  const einheit = einheiten.find(e => e.id === selectedEinheitId) || null;

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === selectedEinheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const paketIds = paketeFuerEinheit.map(p => p.id);
  const zieleFuerEinheit    = lernziele.filter(lz => paketIds.includes(lz.lernpaket_id));
  const aufgabenFuerEinheit = aufgaben.filter(a   => paketIds.includes(a.lernpaket_id));

  // Sammle unvollständige Aktivitäten
  const unvollstaendige = [];
  paketeFuerEinheit.forEach(paket => {
    const phasenConfig = paket.phasen_konfiguration || {};
    Object.entries(phasenConfig).forEach(([phaseKey, phaseConfig]) => {
      if (phaseConfig && phaseConfig.selected_aktivitaet_id && phaseConfig.is_complete === false) {
        const akt = lernpakete.find(lp => 
          lp.phasen_konfiguration?.[phaseKey]?.selected_aktivitaet_id === phaseConfig.selected_aktivitaet_id
        );
        const phaseLabel = { input: 'Input', uebung: 'Übung', abschluss: 'Abschluss' }[phaseKey] || phaseKey;
        unvollstaendige.push({
          paketTitel: paket.titel_des_pakets,
          phase: phaseLabel,
          aktivitaetId: phaseConfig.selected_aktivitaet_id,
        });
      }
    });
  });

  // Delta: nur 'new' oder 'modified'
  const deltaEinheit  = einheit && ['new','modified'].includes(einheit.sync_status) ? [einheit] : [];
  const deltaPakete   = paketeFuerEinheit.filter(p  => ['new','modified'].includes(p.sync_status));
  const deltaZiele    = zieleFuerEinheit.filter(lz  => ['new','modified'].includes(lz.sync_status));
  const deltaAufgaben = aufgabenFuerEinheit.filter(a => ['new','modified'].includes(a.sync_status));
  const deltaTotal    = deltaEinheit.length + deltaPakete.length + deltaZiele.length + deltaAufgaben.length;

  // Alle markieren als 'exported'
  const markAllExported = async () => {
    const updates = [];
    if (einheit && einheit.sync_status !== 'exported') {
      updates.push(base44.entities.Einheiten.update(einheit.id, { sync_status: 'exported' }));
    }
    for (const p  of paketeFuerEinheit)    updates.push(base44.entities.Lernpakete.update(p.id,   { sync_status: 'exported' }));
    for (const lz of zieleFuerEinheit)     updates.push(base44.entities.Lernziele.update(lz.id,   { sync_status: 'exported' }));
    for (const a  of aufgabenFuerEinheit)  updates.push(base44.entities.Aufgabenbausteine.update(a.id, { sync_status: 'exported' }));
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['lernziele'] });
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
  };

  const handleExport = async (mode) => {
    if (!einheit) return;
    setIsExporting(true);
    setExportMode(mode);

    const pakete   = mode === 'delta' ? deltaPakete   : paketeFuerEinheit;
    const ziele    = mode === 'delta' ? deltaZiele    : zieleFuerEinheit;
    const aufg     = mode === 'delta' ? deltaAufgaben : aufgabenFuerEinheit;

    const exportData = {
      export_timestamp: new Date().toISOString(),
      export_type: mode,
      einheit: {
        id: einheit.id,
        titel: einheit.titel_der_einheit,
        fach: einheit.fach,
        jahrgangsstufe: einheit.jahrgangsstufe,
        sync_status: einheit.sync_status,
      },
      lernpakete: pakete.map(p => ({
        id: p.id,
        reihenfolge: p.reihenfolge_nummer,
        titel: p.titel_des_pakets,
        dauer_minuten: p.geschaetzte_dauer_minuten,
        sync_status: p.sync_status,
        lernziele: ziele.filter(lz => lz.lernpaket_id === p.id).map(lz => ({
          id: lz.id,
          formulierung: lz.formulierung_fachsprache,
          kategorie: lz.kategorie,
          schueler_uebersetzung: lz.schueler_uebersetzung,
          sync_status: lz.sync_status,
          aufgabenbausteine: aufg.filter(a => a.lernpaket_id === p.id && a.lernziel_id === lz.id).map(a => ({
            id: a.id,
            typ: a.baustein_typ,
            ebene: a.anforderungsebene,
            inhalt: a.aufgabentext_inhalt,
            sync_status: a.sync_status,
          })),
        })),
      })),
    };

    setExportResult(exportData);

    if (mode === 'full') {
      await markAllExported();
      toast.success('Voll-Export abgeschlossen. Alle Datensätze als "exportiert" markiert.');
    } else {
      // Delta: nur geänderte markieren
      const updates = [];
      if (deltaEinheit.length) updates.push(base44.entities.Einheiten.update(einheit.id, { sync_status: 'exported' }));
      for (const p  of deltaPakete)    updates.push(base44.entities.Lernpakete.update(p.id,   { sync_status: 'exported' }));
      for (const lz of deltaZiele)     updates.push(base44.entities.Lernziele.update(lz.id,   { sync_status: 'exported' }));
      for (const a  of deltaAufgaben)  updates.push(base44.entities.Aufgabenbausteine.update(a.id, { sync_status: 'exported' }));
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      toast.success(`Delta-Export: ${deltaTotal} geänderte Elemente exportiert.`);
    }

    setIsExporting(false);
  };

  const downloadJSON = () => {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `poolplaner_export_${einheit?.titel_der_einheit?.replace(/\s+/g,'_')}_${format(new Date(),'yyyyMMdd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!permissions.kannExportieren) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <AlertCircle className="w-6 h-6" />
        <p>Sie haben keine Berechtigung für den Export.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export-Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Initial- oder Delta-Export für Moodle-Administratoren.
        </p>
      </div>

      {/* Einheit wählen */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground shrink-0">Einheit:</span>
        <Select value={selectedEinheitId} onValueChange={(v) => { setSelectedEinheitId(v); setExportResult(null); }}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Einheit auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {einheiten.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.fach} – {e.titel_der_einheit} (Jg. {e.jahrgangsstufe})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {einheit && <SyncBadge status={einheit.sync_status} />}
      </div>

      {einheit && (
        <>
          {/* Sync-Übersicht */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: BookOpen, label: 'Einheit', total: 1, delta: deltaEinheit.length },
              { icon: Layers,   label: 'Lernpakete', total: paketeFuerEinheit.length, delta: deltaPakete.length },
              { icon: Target,   label: 'Lernziele',  total: zieleFuerEinheit.length,  delta: deltaZiele.length },
              { icon: Puzzle,   label: 'Aufgaben',   total: aufgabenFuerEinheit.length, delta: deltaAufgaben.length },
            ].map(({ icon: Icon, label, total, delta }) => (
              <Card key={label} className="border shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${delta > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{total}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {delta > 0 && (
                      <p className="text-[10px] text-amber-600 font-medium">{delta} geändert</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Unvollständigkeits-Warnung */}
          {unvollstaendige.length > 0 && (
            <Card className="border border-yellow-200 bg-yellow-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  {unvollstaendige.length} Aktivität{unvollstaendige.length !== 1 ? 'en' : ''} sind inhaltlich unvollständig
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-yellow-700 mb-3">
                  Die folgenden Aktivitäten enthalten noch Platzhalter und erfordern manuelle Nacharbeit in Moodle:
                </p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="incomplete-activities">
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="text-yellow-800 font-medium">Details anzeigen ({unvollstaendige.length})</span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="space-y-2">
                        {unvollstaendige.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-yellow-700 p-2 rounded bg-white/50 border border-yellow-100">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>
                              <strong>{item.paketTitel}</strong> → <em>{item.phase}</em>
                            </span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Delta-Vorschau */}
           {deltaTotal > 0 && (
            <Card className="border border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                  {deltaTotal} Element{deltaTotal !== 1 ? 'e' : ''} seit dem letzten Export geändert
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {deltaEinheit.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Einheit</p>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      {einheit.titel_der_einheit}
                      <SyncBadge status={einheit.sync_status} />
                    </div>
                  </div>
                )}
                {deltaPakete.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lernpakete ({deltaPakete.length})</p>
                    <div className="space-y-1">
                      {deltaPakete.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          {p.titel_des_pakets}
                          <SyncBadge status={p.sync_status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {deltaZiele.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lernziele ({deltaZiele.length})</p>
                    <div className="space-y-1">
                      {deltaZiele.map(lz => (
                        <div key={lz.id} className="flex items-center gap-2 text-sm">
                          <Target className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate max-w-xs">{lz.formulierung_fachsprache}</span>
                          <SyncBadge status={lz.sync_status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {deltaAufgaben.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenbausteine ({deltaAufgaben.length})</p>
                    <div className="space-y-1">
                      {deltaAufgaben.slice(0, 8).map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-sm">
                          <Puzzle className="w-3.5 h-3.5 text-muted-foreground" />
                          <Badge className="text-[10px] bg-muted">{a.baustein_typ}</Badge>
                          <span className="truncate max-w-xs text-muted-foreground">{a.aufgabentext_inhalt?.substring(0,50) || 'Kein Inhalt'}</span>
                          <SyncBadge status={a.sync_status} />
                        </div>
                      ))}
                      {deltaAufgaben.length > 8 && (
                        <p className="text-xs text-muted-foreground pl-5">…und {deltaAufgaben.length - 8} weitere</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {deltaTotal === 0 && !exportResult && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">Alle Daten sind synchron – keine unexportierten Änderungen vorhanden.</p>
            </div>
          )}

          {/* Export-Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => !isExporting && handleExport('full')}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Initialer Voll-Export</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alle Daten der Einheit exportieren. Setzt danach alle <code className="text-[10px] bg-muted px-1 rounded">sync_status</code> auf "exportiert".
                  </p>
                  <p className="text-xs text-primary font-medium mt-2">
                    {paketeFuerEinheit.length} Pakete · {zieleFuerEinheit.length} Ziele · {aufgabenFuerEinheit.length} Aufgaben
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`border transition-colors ${deltaTotal > 0 ? 'hover:border-amber-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => !isExporting && deltaTotal > 0 && handleExport('delta')}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Delta-Export</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nur neue und geänderte Datensätze exportieren (status = "new" oder "modified").
                  </p>
                  <p className={`text-xs font-medium mt-2 ${deltaTotal > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {deltaTotal > 0 ? `${deltaTotal} geänderte Element${deltaTotal !== 1 ? 'e' : ''}` : 'Keine Änderungen'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {isExporting && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Export wird vorbereitet…
            </div>
          )}

          {/* Export-Ergebnis */}
          {exportResult && !isExporting && (
            <Card className="border border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    Export erfolgreich — {exportMode === 'full' ? 'Voll-Export' : 'Delta-Export'}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={downloadJSON} className="gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON herunterladen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="text-xs bg-card rounded-lg p-4 overflow-auto max-h-64 border border-border">
                  {JSON.stringify(exportResult, null, 2).substring(0, 2000)}
                  {JSON.stringify(exportResult, null, 2).length > 2000 ? '\n…(gekürzt – vollständige Version via Download)' : ''}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}