/**
 * MBKConsole.jsx
 *
 * Die interne MBK-Konsole — paralleler Pfad zum bestehenden Air-Gap-
 * Export-Center. Statt Payloads manuell in eine externe KI zu kopieren,
 * ruft diese Konsole vier spezialisierte Generatoren über `InvokeLLM`
 * direkt in Base44 auf.
 *
 * Tabs (in der Reihenfolge des Workflows):
 *   1. Architekt          — Manifest + 4 Dashboards (Generator 1)
 *   2. Aufgaben           — deterministische Aufgaben (Generator 2, später)
 *   3. Systembausteine    — persona-spezifische Sysbaustein-HTMLs (Generator 3, später)
 *   4. KI-Aufgaben        — Fragmente für KI-Aktivitäten (Generator 4, später)
 *   5. ZIP-Export         — Packer (Generator 5, später)
 *
 * In dieser Stufe ist nur Tab 1 voll funktional; die übrigen sind
 * Platzhalter, damit die Navigation schon vollständig steht.
 */
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Cpu } from 'lucide-react';
import MBKEinheitSelector from '@/components/mbk/MBKEinheitSelector';
import ArchitektTab from '@/components/mbk/ArchitektTab';
import PlaceholderTab from '@/components/mbk/PlaceholderTab';

export default function MBKConsole() {
  const [einheitId, setEinheitId] = useState(null);
  const [activeTab, setActiveTab] = useState('architekt');

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">MBK – Interne Moodle-Builder-KI</h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Erzeugt das SCORM-Paket einer Einheit direkt in Base44 — vier spezialisierte
              Generatoren übernehmen Gerüst, Aufgaben, Systembausteine und KI-Fragmente,
              ein fünfter packt am Ende das ZIP. Alternative zum manuellen Air-Gap-Workflow
              im Export-Center.
            </p>
          </div>
        </div>
      </div>

      {/* ── Einheit-Auswahl ── */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Einheit
        </label>
        <MBKEinheitSelector value={einheitId} onChange={setEinheitId} />
      </div>

      {/* ── Generator-Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="architekt" className="text-xs">
            <span className="font-mono mr-1 opacity-60">1·</span>
            Architekt
          </TabsTrigger>
          <TabsTrigger value="aufgaben" className="text-xs">
            <span className="font-mono mr-1 opacity-60">2·</span>
            Aufgaben
          </TabsTrigger>
          <TabsTrigger value="systembausteine" className="text-xs">
            <span className="font-mono mr-1 opacity-60">3·</span>
            Systembausteine
          </TabsTrigger>
          <TabsTrigger value="ki-aufgaben" className="text-xs">
            <span className="font-mono mr-1 opacity-60">4·</span>
            KI-Aufgaben
          </TabsTrigger>
          <TabsTrigger value="zip-export" className="text-xs">
            <span className="font-mono mr-1 opacity-60">5·</span>
            ZIP-Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architekt" className="mt-4">
          <ArchitektTab einheitId={einheitId} />
        </TabsContent>

        <TabsContent value="aufgaben" className="mt-4">
          <PlaceholderTab
            title="Generator 2 – Aufgaben-Bauer"
            description="Erzeugt die deterministischen Aufgaben (Lernpaket-Monolithe, Themenfeld-Bündel, Projekt-Bündel) auf Basis von Strukturpayload und Task-Content. Die Auswahl wird pro Lernpaket / Themenfeld / Projekt erfolgen, damit du kontrollieren kannst, was generiert wird."
          />
        </TabsContent>

        <TabsContent value="systembausteine" className="mt-4">
          <PlaceholderTab
            title="Generator 3 – Systembaustein-Autor"
            description="Erzeugt die persona-spezifischen Inhalte für jeden Systembaustein (Einführung, Diagnose, Exit-Ticket, …) — pro Lerntyp eine eigene HTML-Datei mit lerntyp-passender Tonalität."
          />
        </TabsContent>

        <TabsContent value="ki-aufgaben" className="mt-4">
          <PlaceholderTab
            title="Generator 4 – KI-Aufgaben-Autor"
            description="Erzeugt die HTML-Fragmente für alle KI-Aktivitäten in den Lernpaketen. Diese Fragmente füllen die Platzhalter, die Generator 2 in den Lernpaket-Hüllen gesetzt hat."
          />
        </TabsContent>

        <TabsContent value="zip-export" className="mt-4">
          <PlaceholderTab
            title="Generator 5 – Packer (ZIP-Export)"
            description="Sammelt alle generierten Dateien dieser Einheit und packt sie in eine fertige SCORM-ZIP-Datei, die direkt in Moodle hochgeladen werden kann."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}