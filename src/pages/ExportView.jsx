import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Copy, Loader2, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';

export default function ExportView() {
  const { permissions } = useRBAC();
  const queryClient = useQueryClient();
  const [selectedEinheitId, setSelectedEinheitId] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [exportType, setExportType] = useState('full');

  // ──── Queries ────
  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
    enabled: permissions.kannExportieren,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', selectedEinheitId],
    queryFn: () =>
      selectedEinheitId
        ? base44.entities.Lernpakete.filter({ einheit_id: selectedEinheitId })
        : Promise.resolve([]),
    enabled: !!selectedEinheitId,
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele', selectedEinheitId],
    queryFn: () =>
      selectedEinheitId
        ? base44.entities.Lernziele.list()
        : Promise.resolve([]),
    enabled: !!selectedEinheitId,
  });

  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine', selectedEinheitId],
    queryFn: () =>
      selectedEinheitId
        ? base44.entities.Aufgabenbausteine.list()
        : Promise.resolve([]),
    enabled: !!selectedEinheitId,
  });

  // ──── Mutation für Export ────
  const exportMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('exportMoodlePlan', data),
    onSuccess: (response) => {
      setExportResult(response.data);
      toast.success('Export erfolgreich generiert');
      queryClient.invalidateQueries({ queryKey: ['lernpakete', selectedEinheitId] });
      queryClient.invalidateQueries({ queryKey: ['lernziele', selectedEinheitId] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', selectedEinheitId] });
    },
    onError: (error) => {
      toast.error('Export fehlgeschlagen: ' + error.message);
    },
  });

  // ──── Statistik für Delta-Logik ────
  const deltaStats = useMemo(() => {
    if (!selectedEinheitId) return { new: 0, modified: 0, total: 0 };

    const paketStats = lernpakete.filter((p) => ['new', 'modified'].includes(p.sync_status)).length;
    const zielStats = lernziele.filter((z) => ['new', 'modified'].includes(z.sync_status)).length;
    const aufgabenStats = aufgabenbausteine.filter((a) => ['new', 'modified'].includes(a.sync_status)).length;

    return {
      new: lernpakete.filter((p) => p.sync_status === 'new').length +
           lernziele.filter((z) => z.sync_status === 'new').length +
           aufgabenbausteine.filter((a) => a.sync_status === 'new').length,
      modified: lernpakete.filter((p) => p.sync_status === 'modified').length +
                lernziele.filter((z) => z.sync_status === 'modified').length +
                aufgabenbausteine.filter((a) => a.sync_status === 'modified').length,
      total: paketStats + zielStats + aufgabenStats,
    };
  }, [selectedEinheitId, lernpakete, lernziele, aufgabenbausteine]);

  const handleExport = (type) => {
    if (!selectedEinheitId) {
      toast.error('Bitte wählen Sie eine Einheit aus');
      return;
    }
    setExportType(type);
    exportMutation.mutate({ einheitId: selectedEinheitId, exportType: type });
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const dataStr = JSON.stringify(exportResult, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moodle-export-${selectedEinheitId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('JSON heruntergeladen');
  };

  const handleCopyToClipboard = () => {
    if (!exportResult) return;
    const dataStr = JSON.stringify(exportResult, null, 2);
    navigator.clipboard.writeText(dataStr);
    toast.success('In Zwischenablage kopiert');
  };

  if (!permissions.kannExportieren) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Zugriff verweigert: Sie haben keine Exportberechtigung.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedEinheit = einheiten.find((e) => e.id === selectedEinheitId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <FileJson className="w-6 h-6 text-primary" />
          Moodle Export Center
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Exportieren Sie Ihre Unterrichtseinheiten als strukturierte Moodle-Baupläne.
        </p>
      </div>

      {/* Einheit-Auswahl */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Einheit auswählen</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedEinheitId || ''}
            onChange={(e) => {
              setSelectedEinheitId(e.target.value || null);
              setExportResult(null);
            }}
            className="w-full h-9 px-3 py-2 rounded-md border border-input bg-transparent text-sm"
          >
            <option value="">-- Einheit wählen --</option>
            {einheiten.map((e) => (
              <option key={e.id} value={e.id}>
                {e.titel_der_einheit} ({e.fach} · Jahrgang {e.jahrgangsstufe})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Statistik & Export-Optionen */}
      {selectedEinheit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Export-Typ und Statistik</CardTitle>
            <CardDescription>
              {selectedEinheit.titel_der_einheit} ({selectedEinheit.fach})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Delta-Statistik */}
            {deltaStats.total > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>{deltaStats.total}</strong> geänderte Elemente verfügbar:
                  <strong className="ml-2">{deltaStats.new} neu</strong>,
                  <strong className="ml-2">{deltaStats.modified} geändert</strong>
                </AlertDescription>
              </Alert>
            )}

            {deltaStats.total === 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  Alle Elemente sind bereits exportiert.
                </AlertDescription>
              </Alert>
            )}

            {/* Export-Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleExport('full')}
                disabled={exportMutation.isPending}
                variant="default"
                className="gap-2"
              >
                {exportMutation.isPending && exportType === 'full' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generiert…</>
                ) : (
                  <><Download className="w-4 h-4" />Voll-Export</>
                )}
              </Button>
              <Button
                onClick={() => handleExport('delta')}
                disabled={exportMutation.isPending || deltaStats.total === 0}
                variant="outline"
                className="gap-2"
              >
                {exportMutation.isPending && exportType === 'delta' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generiert…</>
                ) : (
                  <><Download className="w-4 h-4" />Nur Änderungen</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export-Ergebnis */}
      {exportResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">3. Export-Ergebnis</CardTitle>
                <CardDescription className="mt-1">
                  {exportResult.summary?.total_sections} Sektion(en) · {exportResult.summary?.total_activities} Aktivitäten
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Erfolgreich
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* JSON-Preview */}
            <Tabs defaultValue="preview" className="w-full">
              <TabsList>
                <TabsTrigger value="preview">Vorschau</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-3 mt-4">
                <div className="text-sm space-y-2">
                  <div className="font-semibold text-foreground">Export-Informationen:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Einheit:</span> {exportResult.unit_name}
                    </div>
                    <div>
                      <span className="font-medium">Fach:</span> {exportResult.unit_subject}
                    </div>
                    <div>
                      <span className="font-medium">Jahrgang:</span> {exportResult.unit_grade}
                    </div>
                    <div>
                      <span className="font-medium">Export-Typ:</span> {exportResult.export_type === 'full' ? 'Voll-Export' : 'Delta-Export'}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="font-semibold text-foreground text-sm mb-2">Sektionen:</div>
                  <div className="space-y-2">
                    {exportResult.sections?.slice(0, 5).map((section, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted/30 border border-border text-sm"
                      >
                        <div className="font-medium text-foreground">{section.section_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {section.activities.length} Aktivitäten · {section.learning_goals.length} Lernziele
                        </div>
                      </div>
                    ))}
                  </div>
                  {exportResult.sections?.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{exportResult.sections.length - 5} weitere Sektionen…
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-4">
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-[400px] border border-border">
                  <code>{JSON.stringify(exportResult, null, 2)}</code>
                </pre>
              </TabsContent>
            </Tabs>

            {/* Download & Copy Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
              >
                <Download className="w-4 h-4" />
                Als .json herunterladen
              </Button>
              <Button
                onClick={handleCopyToClipboard}
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
              >
                <Copy className="w-4 h-4" />
                In Zwischenablage kopieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}