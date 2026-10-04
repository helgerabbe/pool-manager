import React from 'react';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Benutzerverwaltung from '@/pages/Benutzerverwaltung';
import SchuelerVerwaltung from '@/components/admin/schueler/SchuelerVerwaltung';

/** Benutzerverwaltung mit zwei Bereichen: Lehrkräfte und Schüler. */
export default function Personenverwaltung() {
  return (
    <Tabs defaultValue="lehrer" className="space-y-6">
      <TabsList>
        <TabsTrigger value="lehrer" className="gap-2"><ShieldCheck className="h-4 w-4" /> Lehrkräfte</TabsTrigger>
        <TabsTrigger value="schueler" className="gap-2"><GraduationCap className="h-4 w-4" /> Schüler</TabsTrigger>
      </TabsList>
      <TabsContent value="lehrer"><Benutzerverwaltung /></TabsContent>
      <TabsContent value="schueler"><SchuelerVerwaltung /></TabsContent>
    </Tabs>
  );
}