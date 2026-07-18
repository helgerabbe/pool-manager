import React, { useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ROLLEN } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShieldCheck, Settings2, RotateCcw, AlertTriangle,
  Building2, GraduationCap, CalendarRange, BookOpen, Puzzle, Blocks, LayoutDashboard, Plug,
} from 'lucide-react';
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
import DashboardVorlagenTab from '@/components/admin/dashboardVorlage/DashboardVorlagenTab';
import GitHubConnectorCard from '@/components/admin/GitHubConnectorCard';
import GitHubTicketConnectorCard from '@/components/admin/GitHubTicketConnectorCard';
import GitHubCssConnectorCard from '@/components/admin/GitHubCssConnectorCard';
import LtiMoodleCard from '@/components/admin/LtiMoodleCard';

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

      {/* Alle Bereiche als Tabs — kaskadische Ordnung:
          Allgemein → Jahrgänge → Phasen → Fächer → Aktivitäten →
          Systembausteine → Dashboards → Integrationen */}
      <Tabs defaultValue="allgemein">
        <TabsList className="flex flex-wrap justify-start h-auto gap-2 bg-transparent p-0">
          {[
            { value: 'allgemein', label: 'Allgemein', icon: Building2 },
            { value: 'jahrgaenge', label: 'Jahrgänge', icon: GraduationCap },
            { value: 'phasen', label: 'Phasen', icon: CalendarRange },
            { value: 'faecher', label: 'Fächer', icon: BookOpen },
            { value: 'aktivitaeten', label: 'Aktivitäten', icon: Puzzle },
            { value: 'systembausteine', label: 'Systembausteine', icon: Blocks },
            { value: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
            { value: 'integrationen', label: 'Integrationen', icon: Plug },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:text-foreground hover:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow"
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Allgemein — Schul-Stammdaten, Wartungsmodus, Werkszustand (dezent) */}
        <TabsContent value="allgemein" className="mt-5 space-y-6">
          <SchulStammdatenCard />

          <WartungsmodusToggle
            aktiv={wartungsmodus}
            onChange={setWartungsmodus}
            isPending={isWartungsmodusLoading}
          />

          {/* Factory Reset — bewusst dezent als schmale Fußzeile */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">System auf Werkszustand zurücksetzen</span>
              {' — '}löscht alle Einheiten, Lernpakete und Aufgaben unwiderruflich. Benutzerkonten und
              Einstellungen bleiben erhalten.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              disabled={resetMutation.isPending}
              className="gap-1.5 shrink-0 text-muted-foreground hover:text-destructive"
            >
              {resetMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              {resetMutation.isPending ? 'Wird zurückgesetzt...' : 'Zurücksetzen…'}
            </Button>
          </div>
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
                createDefaults={{ ist_poolzeit_fach: true }}
                renderExtra={(values, setValues) => (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">Farbe:</label>
                      <input
                        type="color"
                        value={values.farbe || '#94a3b8'}
                        onChange={e => setValues({ farbe: e.target.value })}
                        className="w-8 h-7 rounded cursor-pointer border border-input p-0.5 bg-transparent"
                        title="Fach-Farbe auswählen"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={values.ist_poolzeit_fach !== false}
                        onChange={e => setValues({ ist_poolzeit_fach: e.target.checked })}
                        className="cursor-pointer"
                      />
                      Poolzeit
                    </label>
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

        {/* Integrationen — externe Datenquellen (GitHub etc.) */}
        <TabsContent value="integrationen" className="mt-4 space-y-6">
          <LtiMoodleCard />
          <GitHubConnectorCard />
          <GitHubTicketConnectorCard />
          <GitHubCssConnectorCard />
        </TabsContent>

        {/* Systembausteine (globaler Pool für Tab „Dashboards") */}
        <TabsContent value="systembausteine" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Systembausteine verwalten</CardTitle>
              <CardDescription>
                Globale Systembausteine, die im Lernpfad-Architekt (Tab „Dashboards") als Pool angeboten werden.
                Es gibt zwei Arten: normale <strong>Systembausteine</strong> und <strong>Bündel</strong> (Container,
                die andere Bausteine/Aufgaben aufnehmen). Die Reihenfolge per Pfeilen bestimmt auch die Anzeige im Pool.
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