import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Inbox, FilePlus2, BookOpen, Layers, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AuftragPosteingang from '@/components/importcenter/AuftragPosteingang';
import AustauschPosteingang from '@/components/austausch/AustauschPosteingang';
import { useAustauschNachrichten } from '@/hooks/useAustausch';
import AuftragFormular from '@/components/importcenter/AuftragFormular';
import SchemaBibliothek from '@/components/importcenter/SchemaBibliothek';
import StrukturLeser from '@/components/importcenter/StrukturLeser';

/**
 * Import-Center — das Export-Center gespiegelt.
 *
 * Lesende Seite (Tor nach außen): Schema-Bibliothek + Einheiten-Struktur.
 * Schreibende Seite (Freigabe-Tor): Aufträge stellen, begutachten, freigeben.
 *
 * Bewusst parallel zum MBK-Rückmeldesystem: Der mit dem Kursbau ausgehandelte
 * Prüfbefund-Vertrag bleibt unangetastet.
 */
export default function ImportCenter() {
  const { data: austausch } = useAustauschNachrichten();
  const offeneMbk = austausch?.offen_fuer_pm || 0;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Import-Center</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Auftrags-Posteingang für Änderungen von außen. Jeder Auftrag wird geprüft, kann in der
          Schüler-Vorschau angesehen werden und verändert erst nach ausdrücklicher Freigabe etwas
          im Bestand.
        </p>
      </header>

      <Tabs defaultValue="posteingang">
        <TabsList>
          <TabsTrigger value="posteingang" className="gap-2">
            <Inbox className="h-4 w-4" /> Posteingang
          </TabsTrigger>
          <TabsTrigger value="austausch" className="gap-2">
            <Mail className="h-4 w-4" /> Kursbau
            {offeneMbk > 0 && (
              <Badge className="h-5 min-w-5 justify-center px-1.5 text-[11px]">{offeneMbk}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stellen" className="gap-2">
            <FilePlus2 className="h-4 w-4" /> Auftrag stellen
          </TabsTrigger>
          <TabsTrigger value="nachschlagen" className="gap-2">
            <Layers className="h-4 w-4" /> Nachschlagen
          </TabsTrigger>
          <TabsTrigger value="bibliothek" className="gap-2">
            <BookOpen className="h-4 w-4" /> Vertrag &amp; Aufgabenarten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posteingang" className="mt-5">
          <AuftragPosteingang />
        </TabsContent>
        <TabsContent value="austausch" className="mt-5">
          <AustauschPosteingang />
        </TabsContent>
        <TabsContent value="stellen" className="mt-5">
          <AuftragFormular />
        </TabsContent>
        <TabsContent value="nachschlagen" className="mt-5">
          <StrukturLeser />
        </TabsContent>
        <TabsContent value="bibliothek" className="mt-5">
          <SchemaBibliothek />
        </TabsContent>
      </Tabs>
    </div>
  );
}