/**
 * PruefbereichTab — Reiter 8: Export-Vorprüfung mit Taskliste.
 *
 * Zwei Herkünfte, zwei Reiter (2026-09-04):
 *   · Interne Prüfung    — die eigene Prüfung der Schule (Regeln + KI).
 *   · Rückmeldung der MBK — was der Kursbau nach dem Export zurückmeldet.
 *
 * Getrennt, weil sonst genau das passiert, was die Liste unbrauchbar macht:
 * Der Bau findet größtenteils dieselben Stellen, und beide Listen zusammen
 * ergäben eine Taskliste voller Dubletten. Der Abgleich ist deshalb ein
 * bewusster Schritt im MBK-Reiter, keine stille Automatik.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck } from 'lucide-react';
import { usePruefbefunde, usePruefungLauf } from '@/hooks/usePruefung';
import InternePruefungReiter from './InternePruefungReiter';
import MbkBefundeReiter from './MbkBefundeReiter';

export default function PruefbereichTab({ einheit, aufgaben = [], kannStarten = false }) {
  const einheitId = einheit?.id;
  const { data: alleBefunde = [], isLoading } = usePruefbefunde(einheitId);
  const { laeuft, fortschritt, starten, entscheiden } = usePruefungLauf(einheitId);

  const { data: me } = useQuery({ queryKey: ['aktuellerNutzer'], queryFn: () => base44.auth.me() });
  const istAdmin = me?.role === 'admin';

  const interneBefunde = alleBefunde.filter((b) => (b.quelle || 'regel') !== 'mbk');
  const mbkOffen = alleBefunde.filter(
    (b) => b.quelle === 'mbk' && (b.entscheidung || 'offen') === 'offen' && b.dublette_status !== 'dublette'
  ).length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Vollständigkeitsprüfung
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Hier läuft zusammen, was vor der Veröffentlichung noch zu klären ist – die eigene Prüfung
          der Schule und die Rückmeldung des Kursbaus.
        </p>
      </div>

      <Tabs defaultValue="intern">
        <TabsList>
          <TabsTrigger value="intern">Interne Prüfung</TabsTrigger>
          <TabsTrigger value="mbk" className="gap-2">
            Rückmeldung der MBK
            {mbkOffen > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                {mbkOffen}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intern" className="mt-4">
          <InternePruefungReiter
            einheitId={einheitId}
            befunde={interneBefunde}
            isLoading={isLoading}
            aufgaben={aufgaben}
            kannStarten={kannStarten}
            laeuft={laeuft}
            fortschritt={fortschritt}
            onStarten={starten}
            onEntscheiden={entscheiden}
          />
        </TabsContent>

        <TabsContent value="mbk" className="mt-4">
          <MbkBefundeReiter
            einheitId={einheitId}
            aufgaben={aufgaben}
            kannStarten={kannStarten}
            istAdmin={istAdmin}
            onEntscheiden={entscheiden}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}