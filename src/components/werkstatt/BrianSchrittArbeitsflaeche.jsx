import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Target, ClipboardCheck, Bot } from 'lucide-react';
import BrianAufgabeSection from '@/components/werkstatt/BrianAufgabeSection';
import LernzielAnalysePanel from '@/components/allgemeineAufgaben/LernzielAnalysePanel';
import ErwartungshorizontTab from '@/components/allgemeineAufgaben/ErwartungshorizontTab';
import AITutorPromptPanel from '@/components/allgemeineAufgaben/AITutorPromptPanel';

/**
 * BrianSchrittArbeitsflaeche
 * ──────────────────────────
 * Der vollständige Durchlauf für EIN Brian-Gespräch, in vier Reitern.
 *
 * Warum vier: Brian weiß beim Wechsel aus Moodle nicht, bei welcher Aufgabe er
 * helfen soll. Diese Information steckt in vier Feldern, die eine Lehrkraft
 * ungern von Hand schreibt — deshalb entstehen sie aus Angaben, die ihr näher
 * liegen: was die Schüler tun sollen, welche Lernziele dahinterstehen, was
 * eine gute Lösung ausmacht. Der vierte Reiter erzeugt daraus die Felder.
 *
 * Reiter 1 ist die AUFGABE (Text, Bild, Material) — nicht die Brian-Felder.
 * Die stehen im letzten Reiter und entstehen dort automatisch.
 *
 * Diese Reihenfolge war schon der Aufbau der früheren Einzelaufgabe. Seit ein
 * Brian-Gespräch ein SCHRITT ist, gehört sie hierher — Brian arbeitet pro
 * Dialog, also braucht jeder Schritt seinen eigenen Durchlauf.
 *
 * Alle vier Panels sind dieselben wie an der Aufgabe, nur im Entwurfsmodus:
 * Sie speichern nichts selbst, sondern melden Änderungen nach oben. Erst
 * „Übernehmen" im Schritt-Fenster macht sie gültig.
 */
export default function BrianSchrittArbeitsflaeche({
  schritt,
  onChange,
  aufgabe,
  einheit,
  kannBearbeiten = true,
}) {
  const b = schritt?.brian || {};
  const setBrian = (teil) => onChange({ ...schritt, brian: { ...b, ...teil } });

  // Die ausgewählten Lernziele dieses Gesprächs — Grundlage für die Erzeugung
  // der vier Felder. Getrennt nach regulären und Basis-Lernzielen, weil
  // generateBrianSegments beide unterschiedlich behandelt.
  const items = Array.isArray(b.lernzielanalyse?.items) ? b.lernzielanalyse.items : [];
  const lernziele = items.filter((it) => it.quelle !== 'basismodul' && it.quelle !== 'basismodul_luecke');
  const basisLernziele = items.filter((it) => it.quelle === 'basismodul');

  return (
    <Tabs defaultValue="aufgabe" className="flex flex-col h-full min-h-0">
      <TabsList className="bg-muted shrink-0">
        <TabsTrigger value="aufgabe" className="text-xs gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Aufgabe
        </TabsTrigger>
        <TabsTrigger value="lernziele" className="text-xs gap-1.5">
          <Target className="w-3.5 h-3.5" /> Lernziele
        </TabsTrigger>
        <TabsTrigger value="erwartung" className="text-xs gap-1.5">
          <ClipboardCheck className="w-3.5 h-3.5" /> Erwartungshorizont
        </TabsTrigger>
        <TabsTrigger value="brian" className="text-xs gap-1.5">
          <Bot className="w-3.5 h-3.5" /> Brian-Felder
        </TabsTrigger>
      </TabsList>

      <TabsContent value="aufgabe" className="flex-1 min-h-0 overflow-y-auto m-0 pt-3">
        <BrianAufgabeSection schritt={schritt} onChange={onChange} />
      </TabsContent>

      <TabsContent value="lernziele" className="flex-1 min-h-0 overflow-y-auto m-0 pt-3">
        <LernzielAnalysePanel
          aufgabe={aufgabe}
          kannBearbeiten={kannBearbeiten}
          items={items}
          onItemsChange={(neue) => setBrian({
            lernzielanalyse: { items: neue, analysiert_am: new Date().toISOString() },
          })}
          schrittTitel={schritt?.titel || b.dialog_name || ''}
          schrittAufgabenstellung={b.aufgabenstellung || b.learner_instruction || ''}
        />
      </TabsContent>

      <TabsContent value="erwartung" className="flex-1 min-h-0 overflow-y-auto m-0 pt-3">
        <ErwartungshorizontTab
          aufgabe={aufgabe}
          einheit={einheit}
          kannBearbeiten={kannBearbeiten}
          mappedLernziele={lernziele}
          mappedBasisLernziele={basisLernziele}
          wert={b.erwartungshorizont || ''}
          onWertChange={(text) => setBrian({ erwartungshorizont: text })}
          aufgabenstellungOverride={b.aufgabenstellung || b.learner_instruction || ''}
          loesungDateiUrl={b.erwartungshorizont_datei_url || null}
          loesungDateiName={b.erwartungshorizont_datei_name || ''}
          onDateiChange={({ url, name }) => setBrian({
            erwartungshorizont_datei_url: url,
            erwartungshorizont_datei_name: name,
          })}
        />
      </TabsContent>

      <TabsContent value="brian" className="flex-1 min-h-0 overflow-y-auto m-0 pt-3">
        <AITutorPromptPanel
          aufgabe={aufgabe}
          einheit={einheit}
          kannBearbeiten={kannBearbeiten}
          mappedLernziele={lernziele}
          mappedBasisLernziele={basisLernziele}
          brianWerte={b}
          onBrianChange={setBrian}
          erzeugungsKontext={{
            titel: schritt?.titel || b.dialog_name || '',
            aufgabenstellung: b.aufgabenstellung || b.learner_instruction || '',
            erwartungshorizont: b.erwartungshorizont || '',
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
