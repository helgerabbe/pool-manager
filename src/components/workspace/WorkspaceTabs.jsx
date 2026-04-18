/**
 * WorkspaceTabs.jsx
 *
 * 8-Stufen Workflow für den Workspace einer Einheit.
 * Nur Icons mit sofortigem Tooltip bei Mouse-Over.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, LayoutGrid, Zap, Wand2, ClipboardList, Target, CheckSquare, Rocket, ExternalLink } from 'lucide-react';
import HelpDialog from '@/components/ui/HelpDialog';

const TABS = [
  {
    value: 'einheit', label: 'Einheit verwalten', icon: BookOpen, step: 1,
    help: {
      title: 'Einheit verwalten',
      description: 'Hier legen Sie die Grunddaten Ihrer Unterrichtseinheit fest und verwalten das Team.',
      features: ['Titel, Fach und Jahrgang anpassen', 'Einheit sperren oder freigeben', 'Mitarbeiter hinzufügen'],
      faqs: [
        { question: 'Was bedeutet "Einheit gesperrt"?', answer: 'Lehrkräfte können keine Inhalte mehr bearbeiten. Nur Fachschaftsleitung und Admins haben weiterhin Schreibzugriff.' },
        { question: 'Was ist der Unterschied zwischen offen und sequenziell?', answer: 'Offen: Themenfelder können in beliebiger Reihenfolge bearbeitet werden. Sequenziell: Themenfelder sind nummeriert und müssen der Reihe nach bearbeitet werden. Lernpakete innerhalb eines Themenfelds sind immer frei zugänglich.' },
      ],
    },
  },
  {
    value: 'struktur', label: 'Struktur anlegen', icon: LayoutGrid, step: 2,
    help: {
      title: 'Struktur anlegen',
      description: 'Hier erstellen Sie Themenfelder und Lernpakete und ordnen diese per Drag & Drop.',
      features: ['Themenfelder erstellen und umbenennen', 'Lernpakete anlegen und zuordnen', 'Reihenfolge per Drag & Drop ändern'],
      faqs: [
        { question: 'Was ist ein Themenfeld?', answer: 'Ein Themenfeld ist ein thematischer Block (z.B. Grundrechenarten), dem mehrere Lernpakete zugeordnet werden können.' },
        { question: 'Was passiert mit Paketen, wenn ich ein Themenfeld lösche?', answer: 'Die Lernpakete werden sicher ins Sammelbecken verschoben – kein Inhalt geht verloren.' },
      ],
    },
  },
  {
    value: 'aktivitaeten', label: 'Aktivitäten und Lernziele', icon: Zap, step: 3,
    help: {
      title: 'Aktivitäten und Lernziele',
      description: 'Definieren Sie Lernziele und ordnen Sie Aktivitäten (Videos, Übungen, Abschlusstests) den Lernpaketen zu.',
      features: ['Lernziele pro Lernpaket formulieren', 'Aktivitäten aus dem Katalog auswählen', 'Felder wie URL, Datei oder Text befüllen'],
      faqs: [
        { question: 'Was sind Aktivitäten?', answer: 'Aktivitäten sind konkrete Aufgaben oder Materialien (z.B. Video ansehen, Lernkarte üben), die in einer der drei Phasen (Input, Übung, Abschluss) stattfinden.' },
        { question: 'Wann ist eine Aktivität "vollständig"?', answer: 'Sobald alle Pflichtfelder der Aktivität ausgefüllt sind, wird sie automatisch als vollständig markiert.' },
      ],
    },
  },
  {
    value: 'aufgaben', label: 'Basisaufgaben erstellen', icon: Wand2, step: 4,
    help: {
      title: 'Basisaufgaben erstellen',
      description: 'Erstellen Sie interaktive Basisaufgaben (Multiple Choice, Lückentext, Zuordnung) direkt einer Aktivität zugeordnet.',
      features: ['Aufgabentyp wählen (MC, Lückentext, Sortierung …)', 'KI-Klon-Funktion: aus einer Mastervorlage Varianten erzeugen', 'Aufgaben freigeben für den Moodle-Export'],
      faqs: [
        { question: 'Was ist eine Mastervorlage?', answer: 'Eine Mastervorlage ist eine Musteraufgabe, aus der die KI automatisch Varianten (Klone) mit ähnlichem Inhalt erzeugen kann.' },
        { question: 'Wann kann ich eine Aufgabe freigeben?', answer: 'Sobald alle Pflichtfelder ausgefüllt sind, erscheint der "Freigeben"-Button. Freigegebene Aufgaben werden für den Export vorgemerkt.' },
      ],
    },
  },
  {
    value: 'ebene2', label: 'Allgemeine Aufgaben erstellen', icon: ClipboardList, step: 5,
    help: {
      title: 'Allgemeine Aufgaben (Ebene 2)',
      description: 'Hier erstellen Sie Transfer-Aufgaben, bei denen Schüler ihr Wissen auf neue Situationen anwenden.',
      features: ['Aufgabe mit Text oder Bild beschreiben', 'Schwierigkeitsgrad festlegen', 'Kompetenzen und Lernziele zuordnen'],
      faqs: [
        { question: 'Was ist der Unterschied zu Basisaufgaben?', answer: 'Basisaufgaben üben direkt den Lernstoff. Transfer-Aufgaben verlangen, dass Schüler das Gelernte auf neue, unbekannte Situationen anwenden.' },
        { question: 'Was ist die Kompetenzzuordnung?', answer: 'Sie können Lernziele per Drag & Drop einer Aufgabe zuweisen, damit der KI-Tutor gezielt passendes Feedback geben kann.' },
      ],
    },
  },
  {
    value: 'ebene3', label: 'Anwendungs- & Projektaufgaben', icon: Target, step: 6,
    help: {
      title: 'Anwendungs- & Projektaufgaben (Ebene 3)',
      description: 'Komplexe Aufgaben, bei denen Schüler ein Produkt oder Projekt erstellen und dafür mehrere Kompetenzen kombinieren.',
      features: ['Anwendungsaufgaben oder Projektaufgaben anlegen', 'Erwartungshorizont und Bewertungskriterien hinterlegen', 'Ergebnisform und Dateiformat festlegen'],
      faqs: [
        { question: 'Was ist der Unterschied zwischen Anwendungsaufgabe und Projektaufgabe?', answer: 'Anwendungsaufgaben sind kürzer und fokussierter. Projektaufgaben sind umfangreicher und verlangen eigenständige Planung und Umsetzung.' },
        { question: 'Wozu dient der Erwartungshorizont?', answer: 'Er gibt dem KI-Tutor Leitplanken, um Schüler bei der Bearbeitung gezielt zu unterstützen, ohne die Lösung vorwegzunehmen.' },
      ],
    },
  },
  {
    value: 'cockpit', label: 'Freigabe-Cockpit', icon: CheckSquare, step: 7,
    help: {
      title: 'Freigabe-Cockpit',
      description: 'Eine Übersicht aller Inhalte mit ihrem Freigabe-Status. Hier bereiten Sie den Export vor.',
      features: ['Status aller Aktivitäten und Aufgaben im Überblick', 'Inhalte für den Export vormerken', 'Direkt in den entsprechenden Tab springen'],
      faqs: [
        { question: 'Was bedeutet "pending"?', answer: '"Pending" bedeutet, dass der Inhalt für den nächsten Moodle-Export vorgemerkt ist, aber noch nicht exportiert wurde.' },
        { question: 'Kann ich die Vorauswahl rückgängig machen?', answer: 'Ja, über das Zurücksetzen-Symbol neben jedem Eintrag können Sie den Pending-Status wieder entfernen.' },
      ],
    },
  },
  {
    value: 'export', label: 'Moodle-Export', icon: Rocket, step: 8,
    help: {
      title: 'Moodle-Export',
      description: 'Exportieren Sie freigegebene Inhalte direkt nach Moodle oder laden Sie die Export-Datei herunter.',
      features: ['Synchronisationsstatus aller Inhalte einsehen', 'Export bestätigen (nur für Administratoren)', 'Zeitstempel des letzten Exports prüfen'],
      faqs: [
        { question: 'Wer darf den Export bestätigen?', answer: 'Nur Administratoren und Moodle-Designer können den finalen Export auslösen und bestätigen.' },
        { question: 'Was passiert nach dem Export?', answer: 'Alle exportierten Elemente erhalten den Status "synced". Änderungen danach werden als "modified" markiert und müssen erneut exportiert werden.' },
      ],
    },
  },
  {
    value: 'brian', label: 'Brian.study Export', icon: ExternalLink, step: 9,
    help: {
      title: 'Brian.study Export',
      description: 'Generieren Sie Prompts für Brian.study und markieren Sie Aufgaben als exportiert (Dual-Lock).',
      features: ['Globale Parameter setzen (Strenge, Sprache, Kursniveau)', 'Brian-Prompt pro Aufgabe generieren', 'Aufgabe als "In Brian" markieren – Dual-Lock aufheben'],
      faqs: [
        { question: 'Was ist der Dual-Lock?', answer: 'Eine Aufgabe bleibt gesperrt, bis sie in BEIDE Systeme exportiert wurde: Moodle UND Brian.study. Erst dann wird die Bearbeitungssperre aufgehoben.' },
        { question: 'Was sind Bewertungsrubriken?', answer: 'Im Tab "Abgabe & Gütekriterien" (Ebene-3-Aufgaben) können Sie Brian-kompatible Rubriken mit Titel, Punkten und Kriterientext hinterlegen.' },
      ],
    },
  },
];

export default function WorkspaceTabs({ activeTab, onTabChange }) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1 bg-muted p-2 rounded-xl shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <div key={tab.value} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                    )}>
                      {tab.step}
                    </span>
                    <Icon className="w-4 h-4 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
              {isActive && <HelpDialog {...tab.help} />}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}