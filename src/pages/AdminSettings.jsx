import React, { useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ROLLEN } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, BookOpen, GraduationCap, Puzzle, CalendarRange, Settings2 } from 'lucide-react';
import LookupTable from '@/components/admin/LookupTable';
import PhasenTable from '@/components/admin/PhasenTable';
import WartungsmodusToggle from '@/components/admin/WartungsmodusToggle';
import AktivitaetenKatalog from '@/components/admin/AktivitaetenKatalog';

const KATEGORIEN = ['Diagnostik', 'Input', 'Übung', 'Projekt', 'Prüfung'];

export default function AdminSettings() {
  const { rolle: realRolle } = useRBAC();
  const {
    wartungsmodus, setWartungsmodus, isWartungsmodusLoading,
    faecherRaw, jahrgaengeRaw, bausteinTypenRaw, phasenRaw,
    isLoading,
  } = useSystemSettings();

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

      {/* Wartungsmodus — prominent ganz oben */}
      <WartungsmodusToggle
        aktiv={wartungsmodus}
        onChange={setWartungsmodus}
        isPending={isWartungsmodusLoading}
      />

      {/* Lookup-Tabellen */}
      <Tabs defaultValue="faecher">
        <TabsList className="bg-muted grid w-full grid-cols-4">
          <TabsTrigger value="faecher" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />Fächer
          </TabsTrigger>
          <TabsTrigger value="jahrgaenge" className="gap-1.5 text-xs">
            <GraduationCap className="w-3.5 h-3.5" />Jahrgänge
          </TabsTrigger>
          <TabsTrigger value="phasen" className="gap-1.5 text-xs">
            <CalendarRange className="w-3.5 h-3.5" />Phasen
          </TabsTrigger>
          <TabsTrigger value="aktivitaeten" className="gap-1.5 text-xs">
            <Puzzle className="w-3.5 h-3.5" />Aktivitäten
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}