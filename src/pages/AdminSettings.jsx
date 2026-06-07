import React, { useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ROLLEN } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Settings2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import LookupTable from '@/components/admin/LookupTable';
import PhasenTable from '@/components/admin/PhasenTable';
import WartungsmodusToggle from '@/components/admin/WartungsmodusToggle';
import AktivitaetenKatalog from '@/components/admin/AktivitaetenKatalog';
import SystemBausteineTable from '@/components/admin/SystemBausteineTable';
import SchulStammdatenCard from '@/components/admin/SchulStammdatenCard';
import NomenklaturManagerView from '@/components/admin/nomenklatur/NomenklaturManagerView';
import DashboardVorlagenTab from '@/components/admin/dashboardVorlage/DashboardVorlagenTab';

const KATEGORIEN = ['Diagnostik', 'Input', 'Übung', 'Projekt', 'Prüfung'];

export default function AdminSettings() {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { rolle: realRolle } = useRBAC();
  const {
    wartungsmodus, setWartungsmodus, isWartungsmodusLoading,
    faecherRaw, jahrgaengeRaw, bausteinTypenRaw, phasenRaw,
    isLoading,
  } = useSystemSettings();

  const resetMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('resetSandboxData', {
        confirmReset: true
      });
    },
    onSuccess: (data) => {
      setShowResetDialog(false);
      toast.success(
        `✅ Factory Reset erfolgreich! ${data.deleteCounts?.einheiten || 0} Einheiten und alle Aufgaben wurden gelöscht. ` +
        (data.sampleUnitCreated ? 'Eine Beispiel-Einheit wurde erstellt.' : '')
      );
    },
    onError: (err) => {
      const msg = err.message || '';
      if (err.response?.status === 403) {
        toast.error('🔒 Nur Administratoren dürfen Factory Resets durchführen.');
      } else if (err.response?.status === 429) {
        toast.error('⏱️ Bitte warten Sie mindestens 1 Minute vor dem nächsten Reset.');
      } else {
        toast.error('Fehler beim Reset: ' + msg);
      }
    },
  });

  if (realRolle !== ROLLEN.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Kein Zugriff. Diese Seite ist nur für Administratoren.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-primary" />
          Globale Systemeinstellungen
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verwalten Sie die Lookup-Tabellen (Fächer, Jahrgänge, Phasen) und Aktivitäten sowie den Systembetrieb.
        </p>
      </div>

      {/* Alle Bereiche als Tabs — direkt unter dem Header */}
      <Tabs defaultValue="allgemein">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 h-auto gap-1.5 bg-muted p-1.5 rounded-lg">
          {[
            { value: 'allgemein', label: 'Allgemein' },
            { value: 'system', label: 'System' },
            { value: 'dashboards', label: 'Dashboards' },
            { value: 'faecher', label: 'Fächer' },
            { value: 'jahrgaenge', label: 'Jahrgänge' },
            { value: 'phasen', label: 'Phasen' },
            { value: 'aktivitaeten', label: 'Aktivitäten' },
            { value: 'systembausteine', label: 'System-Bausteine' },
            { value: 'nomenklatur', label: 'Nomenklatur' },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs font-medium px-1.5 py-2 rounded-md leading-tight text-center whitespace-normal data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-colors"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Allgemein — Schul-Stammdaten */}
        <TabsContent value="allgemein" className="mt-4">
          <SchulStammdatenCard />
        </TabsContent>

        {/* System — Wartungsmodus & Werkszustand */}
        <TabsContent value="system" className="mt-4 space-y-6">
          <WartungsmodusToggle
            aktiv={wartungsmodus}
            onChange={setWartungsmodus}
            isPending={isWartungsmodusLoading}
          />

          {/* Factory Reset — dezent, mit ausklappbarem Bereich gegen versehentliche Klicks */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                System auf Werkszustand zurücksetzen
              </CardTitle>
              <CardDescription>
                Löscht alle Einheiten, Themenfelder, Lernpakete und Aufgaben. Benutzerkonten und Systemeinstellungen
                bleiben erhalten. Eine Beispiel-Einheit wird neu erstellt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-muted-foreground">
                  Dieser Vorgang kann <span className="font-semibold text-destructive">nicht rückgängig</span> gemacht werden.
                  Bitte nur nutzen, wenn Sie sicher sind.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetDialog(true)}
                  disabled={resetMutation.isPending}
                  className="gap-2 shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {resetMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  {resetMutation.isPending ? 'Wird zurückgesetzt...' : 'Zurücksetzen…'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboards — Standard-Vorlagen pro Lerntyp */}
        <TabsContent value="dashboards" className="mt-4">
          <DashboardVorlagenTab />
        </TabsContent>

        {/* Fächer */}
        <TabsContent value="faecher" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Fächer verwalten</CardTitle>
              <CardDescription>
                Aktive Fächer erscheinen in allen Dropdowns der App. Inaktive Fächer sind ausgeblendet,
                bestehende Einheiten bleiben erhalten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LookupTable
                entityName="LookupFaecher"
                queryKey={['lookupFaecher']}
                items={faecherRaw}
                labelField="name"
                renderExtra={(values, setValues) => (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Farbe:</label>
                    <input
                      type="color"
                      value={values.farbe || '#94a3b8'}
                      onChange={e => setValues({ farbe: e.target.value })}
                      className="w-8 h-7 rounded cursor-pointer border border-input p-0.5 bg-transparent"
                      title="Fach-Farbe auswählen"
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jahrgänge */}
        <TabsContent value="jahrgaenge" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Jahrgangsstufen verwalten</CardTitle>
              <CardDescription>
                Definieren Sie die verfügbaren Jahrgangsstufen. Unterstützt klassische Nummern (5–13)
                sowie gymnasiale Oberstufen-Bezeichnungen (Q1, Q2 etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LookupTable
                entityName="LookupJahrgaenge"
                queryKey={['lookupJahrgaenge']}
                items={jahrgaengeRaw}
                labelField="bezeichnung"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phasen */}
        <TabsContent value="phasen" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Planungsphasen</CardTitle>
              <CardDescription>
                Definieren Sie Schulhalbjahre oder Planungsphasen als Bezeichnungen.
                Aktive Phasen können in Einheiten referenziert werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhasenTable items={phasenRaw} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aktivitäten-Katalog */}
        <TabsContent value="aktivitaeten" className="mt-4">
          <AktivitaetenKatalog />
        </TabsContent>

        {/* Nomenklatur-Manager (AP2) — Sprache der Schule pro Fach */}
        <TabsContent value="nomenklatur" className="mt-4">
          <NomenklaturManagerView />
        </TabsContent>

        {/* System-Bausteine (globale Standard-Elemente für Tab 7) */}
        <TabsContent value="systembausteine" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">System-Bausteine verwalten</CardTitle>
              <CardDescription>
                Globale Standard-Elemente, die im Lernpfad-Architekt (Tab „Dashboards") als Standard-Elemente
                angeboten werden. Sie können beliebig oft in Sektoren gezogen werden und tragen einen
                klartext-basierten Export-Hinweis für Moodle/Brian.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemBausteineTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset-Bestätigungsdialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <AlertDialogTitle>System auf Werkszustand zurücksetzen?</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 space-y-2">
                  <p>Dies wird alle erstellten Daten löschen:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Alle Einheiten und Themenfelder</li>
                    <li>Alle Lernpakete und Aktivitäten</li>
                    <li>Alle Aufgabenbausteine und Master-Aufgaben</li>
                    <li>Alle Einheit-Mitgliedschaften</li>
                  </ul>
                  <p className="pt-2 font-semibold">Benutzerkonten und Systemeinstellungen bleiben erhalten.</p>
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                    ⚠️ Dieser Vorgang kann nicht rückgängig gemacht werden!
                  </p>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={resetMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetMutation.isPending ? 'Wird zurückgesetzt...' : 'Ja, unwiderruflich löschen'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}