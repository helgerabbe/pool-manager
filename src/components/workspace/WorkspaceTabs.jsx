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
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';

// ✅ TAB-SPERREN: Welche Tabs sind für welche Rolle sichtbar?
const getVisibleTabs = (rolle) => {
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaft = rolle === ROLLEN.FACHSCHAFT;
  const istMoodleDesigner = rolle === ROLLEN.MOODLE_DESIGNER;
  const istFachlehrkraft = rolle === ROLLEN.FACHLEHRKRAFT;
  const showExportTabs = istAdmin || istMoodleDesigner;

  const allTabs = [
  {
    value: 'einheit', label: 'Einheit verwalten', icon: BookOpen, step: 1,
    help: {
      title: 'Einheit verwalten',
      description: 'Hier legen Sie die Grunddaten Ihrer Unterrichtseinheit fest, verwalten das Team und steuern den Bearbeitungsstatus.',
      features: [
        'Titel, Fach und Jahrgang anpassen',
        'Einheit sperren (nur Lesen) oder für Bearbeitung freigeben',
        'Mitarbeiter hinzufügen und Rollen vergeben (Leitung, Editor, Leser)',
        'Gesamtziele der Einheit definieren',
      ],
      faqs: [
        { question: 'Was bedeutet "Einheit gesperrt"?', answer: 'Lehrkräfte können keine Inhalte mehr bearbeiten. Nur Fachschaftsleitung und Admins haben weiterhin Schreibzugriff. Sinnvoll sobald alle Inhalte exportiert sind.' },
        { question: 'Was ist der Unterschied zwischen offen und sequenziell?', answer: 'Offen: Themenfelder können in beliebiger Reihenfolge bearbeitet werden. Sequenziell: Themenfelder sind nummeriert und müssen der Reihe nach bearbeitet werden. Lernpakete innerhalb eines Themenfelds sind immer frei zugänglich.' },
        { question: 'Was sind Einheitsmitglieder?', answer: 'Mitglieder sind Lehrkräfte, die Zugriff auf diese Einheit haben. Die Leitung hat volle Rechte, Editoren können Inhalte bearbeiten, Leser dürfen nur zuschauen.' },
      ],
    },
  },
  {
    value: 'struktur', label: 'Struktur der Einheit', icon: LayoutGrid, step: 2,
    help: {
      title: 'Struktur der Einheit',
      description: 'Hier sehen Sie das Grundgerüst Ihrer Einheit: Themenfelder als übergeordnete Blöcke und Lernpakete als konkrete Lernabschnitte.',
      features: [
        'Themenfelder und Lernpakete im Überblick',
        'Reihenfolge und Zuordnung einsehen',
        'Bearbeitungsmodus der Einheit erkennen',
      ],
      faqs: [
        { question: 'Was ist ein Themenfeld?', answer: 'Ein Themenfeld ist ein thematischer Block (z.B. "Grundrechenarten"), dem mehrere Lernpakete zugeordnet werden können. Es entspricht einem Kapitel oder einer Unterrichtssequenz.' },
        { question: 'Warum kann ich die Struktur nicht bearbeiten?', answer: 'Nur Fachschaftsleitung und Administratoren können die Struktur bearbeiten. Als Fachlehrkraft können Sie die Struktur einsehen, aber nicht ändern.' },
      ],
    },
  },
  {
    value: 'aktivitaeten', label: 'Aktivitäten und Lernziele', icon: Zap, step: 3,
    help: {
      title: 'Aktivitäten und Lernziele',
      description: 'Befüllen Sie die Lernpakete mit Lernzielen und konkreten Aktivitäten in drei Phasen: Input, Übung und Abschluss.',
      features: [
        'Lernziele pro Lernpaket formulieren (Fachsprache + Schülerübersetzung)',
        'Aktivitäten aus dem Katalog auswählen und konfigurieren',
        'Felder wie URL, Datei, Text oder Audio befüllen',
        'KI-Mastervorlage: eine Aktivität als Vorlage markieren für automatische Klone',
      ],
      faqs: [
        { question: 'Was sind Aktivitäten?', answer: 'Aktivitäten sind konkrete Aufgaben oder Materialien (z.B. Video ansehen, Lernkarte üben, Quiz lösen), die in einer der drei Phasen (Input, Übung, Abschluss) stattfinden.' },
        { question: 'Wann ist eine Aktivität "vollständig"?', answer: 'Sobald alle Pflichtfelder der Aktivität ausgefüllt sind, wird sie automatisch als vollständig markiert. Nur vollständige Aktivitäten können freigegeben werden.' },
        { question: 'Was ist eine KI-Mastervorlage?', answer: 'Eine als Master markierte Aktivität dient als Vorlage, aus der die KI automatisch inhaltlich ähnliche Varianten für andere Lernpakete erzeugen kann.' },
      ],
    },
  },
  {
    value: 'aufgaben', label: 'Basisaufgaben erstellen', icon: Wand2, step: 4,
    help: {
      title: 'Basisaufgaben erstellen (Ebene 1)',
      description: 'Erstellen Sie interaktive Basisaufgaben, die direkt einer Aktivität zugeordnet sind und im Lernpaket erscheinen.',
      features: [
        'Aufgabentyp wählen: Multiple Choice, Lückentext, Zuordnung, Sortierung …',
        'KI-Klon-Funktion: aus einer Mastervorlage automatisch Varianten erzeugen',
        'Aufgaben freigeben für den Moodle-Export',
        'Erwartungshorizont für den KI-Tutor hinterlegen',
      ],
      faqs: [
        { question: 'Was ist eine Mastervorlage?', answer: 'Eine Mastervorlage ist eine Musteraufgabe, aus der die KI automatisch Varianten (Klone) mit ähnlichem Inhalt, aber anderen konkreten Beispielen erzeugen kann.' },
        { question: 'Wann kann ich eine Aufgabe freigeben?', answer: 'Sobald alle Pflichtfelder ausgefüllt sind, erscheint der "Freigeben"-Button. Freigegebene Aufgaben werden im Cockpit (Tab 7) für den Export vorgemerkt.' },
        { question: 'Was ist der Unterschied zu Ebene-2-Aufgaben?', answer: 'Basisaufgaben (Ebene 1) sind interaktive, automatisch bewertbare Übungen direkt im Lernpaket. Ebene-2-Aufgaben (Tab 5) sind offene Transfer-Aufgaben, die von Schülern selbstständig bearbeitet werden.' },
      ],
    },
  },
  {
    value: 'ebene2', label: 'Allgemeine Aufgaben (Ebene 2)', icon: ClipboardList, step: 5,
    help: {
      title: 'Allgemeine Aufgaben (Ebene 2 – Transfer)',
      description: 'Hier erstellen Sie offene Transfer-Aufgaben, bei denen Schüler ihr Wissen auf neue Situationen anwenden und selbstständig eine Lösung erarbeiten.',
      features: [
        'Aufgabe mit Text, Bild oder Scan beschreiben',
        'Schwierigkeitsgrad (1–3 Sterne) festlegen',
        'Kompetenzen und Lernziele per Drag & Drop zuordnen',
        'Erwartungshorizont manuell oder per KI generieren',
        'KI-Aufgaben-Assistent: grobe Idee → vollständiger Aufgabenentwurf',
        'KI-Tutor-Prompt automatisch aus Aufgabe und Lernzielen erstellen',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zu Basisaufgaben?', answer: 'Basisaufgaben (Tab 4) üben direkt den Lernstoff mit automatischer Auswertung. Transfer-Aufgaben (Ebene 2) verlangen, dass Schüler das Gelernte eigenständig auf neue Situationen übertragen – ohne automatische Korrektur.' },
        { question: 'Was ist die Kompetenzzuordnung?', answer: 'Sie können Lernziele per Drag & Drop einer Aufgabe zuweisen. Der KI-Tutor nutzt diese, um gezielt passendes Feedback zu geben.' },
        { question: 'Was ist der KI-Aufgaben-Assistent?', answer: 'Mit dem "Mit KI entwerfen"-Button können Sie eine grobe Idee eingeben (auch per Spracheingabe), und die KI erstellt daraus automatisch Titel, Aufgabenstellung und Kompetenzvorschläge.' },
        { question: 'Was ist der Erwartungshorizont?', answer: 'Er definiert, welche Inhalte und Qualitätsmerkmale eine gute Schülerantwort aufweisen sollte. Der KI-Tutor nutzt ihn als Leitplanke für sein Feedback.' },
      ],
    },
  },
  {
    value: 'ebene3', label: 'Anwendungs- & Projektaufgaben', icon: Target, step: 6,
    help: {
      title: 'Anwendungs- & Projektaufgaben (Ebene 3)',
      description: 'Komplexe Aufgaben, bei denen Schüler ein Produkt oder Projekt selbstständig planen und erstellen. Vollständige Integration mit Brian.study möglich.',
      features: [
        'Anwendungsaufgaben oder umfangreichere Projektaufgaben anlegen',
        'KI-Aufgaben-Assistent: Idee per Sprache oder Text eingeben → Entwurf generieren',
        'Erwartungshorizont per KI generieren und manuell verfeinern',
        'Abgabeformat und Bewertungsrubriken im Brian-Format festlegen (Titel, Punkte, Kriterien)',
        'KI generiert 2–3 thematische Bewertungskategorien passend zur Aufgabe',
        'Lernlandkarte: Lernziele priorisieren und als Kontext für den Projekt-Coach nutzen',
        'Projekt-Coach Prompt automatisch aus Aufgabe + Lernlandkarte generieren',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zwischen Anwendungsaufgabe und Projektaufgabe?', answer: 'Anwendungsaufgaben sind kürzer und fokussierter (z.B. einen Text analysieren). Projektaufgaben sind umfangreicher und verlangen eigenständige Planung, Recherche und Umsetzung über einen längeren Zeitraum.' },
        { question: 'Was sind Bewertungsrubriken im Brian-Format?', answer: 'Anstatt der alten Stufen (ausreichend/gut/sehr gut) gibt es jetzt thematische Kategorien (z.B. "Inhaltliche Tiefe", "Darstellung") mit Punktzahl und Kriterientext. Die KI kann diese automatisch generieren.' },
        { question: 'Was ist der Projekt-Coach?', answer: 'Ein KI-Tutor-Prompt, der im Tab "KI-Tutor Prompt" angezeigt wird. Er führt Schüler per Sokrates-Methode durch das Projekt, ohne die Lösung vorwegzunehmen.' },
        { question: 'Was ist der Dual-Lock?', answer: 'Sobald eine Aufgabe freigegeben wird, ist sie gesperrt. Die Sperre wird erst aufgehoben, wenn die Aufgabe sowohl in Moodle (Tab 8) als auch in Brian.study (Tab 9) exportiert wurde.' },
      ],
    },
  },
  {
    value: 'cockpit', label: 'Freigabe-Cockpit (Moodle)', icon: CheckSquare, step: 7,
    help: {
      title: 'Freigabe-Cockpit – Moodle-Export vorbereiten',
      description: 'Übersicht aller Inhalte dieser Einheit mit ihrem aktuellen Status. Hier selektieren Sie, was für den nächsten Moodle-Export übergeben werden soll.',
      features: [
        'Status aller Aktivitäten und Aufgaben auf einen Blick',
        'Freigegebene Inhalte für den Moodle-Export vormerken ("pending")',
        'Inhalte mit Export-Fehler erneut einplanen',
        'Per Klick direkt zum entsprechenden Inhalt springen und korrigieren',
        'Übergabe einzelner Elemente rückgängig machen',
      ],
      faqs: [
        { question: 'Was bedeutet "Wird exportiert 🔒"?', answer: 'Das Export-Team hat diesen Inhalt gezogen. Er ist für Lehrkräfte schreibgeschützt, bis der Export vom Admin als erfolgreich oder fehlgeschlagen bestätigt wird.' },
        { question: 'Kann ich die Vorauswahl rückgängig machen?', answer: 'Ja, über das Pfeil-zurück-Symbol neben einem "pending"-Eintrag können Sie die Übergabe wieder zurücksetzen.' },
        { question: 'Was exportiert dieses Cockpit?', answer: 'Nur den Moodle-Export. Für Brian.study gibt es ein separates Cockpit in Tab 9.' },
      ],
    },
  },
  {
    value: 'export', label: 'Moodle-Export', icon: Rocket, step: 8,
    help: {
      title: 'Moodle-Export – Bestätigung & Status',
      description: 'Hier bestätigt das Export-Team, welche Inhalte erfolgreich nach Moodle übertragen wurden, und setzt den finalen Sync-Status.',
      features: [
        'Synchronisationsstatus aller Inhalte einsehen (synced, pending, error)',
        'Export-Paket herunterladen (JSON/Bauplan)',
        'Erfolgreich exportierte Elemente bestätigen → Status "synced"',
        'Fehlgeschlagene Elemente als "error" markieren → Sperre wird aufgehoben',
      ],
      faqs: [
        { question: 'Wer darf den Export bestätigen?', answer: 'Nur Administratoren und Moodle-Designer können den finalen Export bestätigen und den Status setzen.' },
        { question: 'Was passiert nach der Bestätigung?', answer: 'Erfolgreich exportierte Elemente erhalten den Status "synced" und sind live in Moodle. Bei Änderungen danach werden sie als "modified" markiert und müssen erneut exportiert werden.' },
        { question: 'Was ist der Unterschied zu Tab 7 (Cockpit)?', answer: 'Tab 7 ist für Lehrkräfte: Inhalte auswählen und übergeben. Tab 8 ist für das Export-Team: den tatsächlichen Upload nach Moodle bestätigen.' },
      ],
    },
  },
  {
    value: 'brian', label: 'Brian.study Export', icon: ExternalLink, step: 9,
    help: {
      title: 'Brian.study Export – Cockpit',
      description: 'Generieren Sie strukturierte Prompts für Brian.study und markieren Sie Aufgaben als exportiert. Erst wenn Moodle UND Brian bestätigt sind, wird die Bearbeitungssperre vollständig aufgehoben (Dual-Lock).',
      features: [
        'Globale Parameter festlegen: Antwortstrenge, Sprachschwierigkeit, Kursniveau',
        'Für jede freigegebene Ebene-2- und Ebene-3-Aufgabe einen Brian-Prompt generieren',
        'Prompt enthält: Parameter, Aufgabenstellung, Materialien und Bewertungsrubriken',
        'Prompt in die Zwischenablage kopieren und direkt in Brian.study einfügen',
        'Aufgabe als "In Brian integriert" markieren → brian_sync_status = synced',
        'Dual-Lock: Bearbeitungssperre wird erst aufgehoben wenn Moodle + Brian beide synced',
      ],
      faqs: [
        { question: 'Was ist der Dual-Lock?', answer: 'Eine freigegebene Aufgabe bleibt für Lehrkräfte gesperrt, bis sie in BEIDE Systeme exportiert wurde: Moodle (Tab 8) UND Brian.study (Tab 9). Erst dann wird die Bearbeitungssperre automatisch aufgehoben.' },
        { question: 'Was sind Bewertungsrubriken?', answer: 'Im Tab "Abgabe & Gütekriterien" (bei Ebene-3-Aufgaben) können thematische Kategorien mit Punktzahl und Kriterientext hinterlegt werden. Die KI schlägt 2–3 passende Kategorien vor. Diese erscheinen automatisch im generierten Brian-Prompt.' },
        { question: 'Wo lege ich die Rubriken für eine Aufgabe fest?', answer: 'Im Workspace-Tab 6 (Ebene 3), dann die Aufgabe auswählen → Tab "Abgabe & Gütekriterien". Dort können Sie Rubriken manuell anlegen oder per KI generieren lassen.' },
      ],
    },
  },
  ];

  return allTabs.filter(tab => {
    // Export-Tabs (8 & 9) nur für Admin und Moodle-Designer
    if (['export', 'brian'].includes(tab.value)) {
      return showExportTabs;
    }
    // Tabs 1 & 2 (Einheit verwalten, Struktur) sind für ALLE sichtbar (auch Fachlehrkräfte)
    // Tabs 3-7 sind für alle Lehrkräfte sichtbar
    return true;
  });
};

export default function WorkspaceTabs({ activeTab, onTabChange }) {
  const { rolle } = useRBAC();
  const visibleTabs = getVisibleTabs(rolle);
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <div key={tab.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      'relative flex items-center gap-2 py-3 rounded-lg border-2 transition-all font-medium',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-md px-8 justify-start'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50 px-3 justify-center'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-all',
                      isActive 
                        ? 'bg-primary-foreground text-primary scale-110' 
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {tab.step}
                    </span>
                    <Icon className={cn('w-4 h-4 shrink-0 transition-all', isActive && 'scale-110')} />
                    {isActive && <div className="absolute -top-1 -right-1"><HelpDialog {...tab.help} /></div>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}