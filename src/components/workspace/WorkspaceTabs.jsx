/**
 * WorkspaceTabs.jsx
 *
 * 8-Stufen Workflow für den Workspace einer Einheit.
 * Nur Icons mit sofortigem Tooltip bei Mouse-Over.
 *
 * Hinweis (Phase H Cleanup): Die ehemaligen Tabs 9 (Moodle-Export) und 10
 * (Brian.study Export) wurden aus der Einheitenansicht entfernt — beide
 * Workflows laufen jetzt zentral im eigenständigen Export-Center
 * (Hauptmenü). Tab 8 („Freigabe-Cockpit") bleibt als Übergabepunkt der
 * Einheit erhalten.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, LayoutGrid, Zap, Wand2, ClipboardList, Target, CheckSquare, Compass } from 'lucide-react';
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
    value: 'dashboards', label: 'Dashboards (Lernpfade)', icon: Compass, step: 7,
    help: {
      title: 'Dashboards – Lernpfad-Architekt',
      description: 'Hier bauen Sie für jeden der vier Lerntypen (Minimalist, Pragmatiker, Ehrgeizig, Passioniert) einen eigenen Lernpfad zusammen – aufgeteilt in Sektoren mit Standard-Bausteinen und Aufgaben aus Ebene 2 und 3.',
      features: [
        'Material-Pool links: alle Aufgaben aus Ebene 2 und 3 sowie globale System-Bausteine (Lernlandkarte, Anmeldung, Zwischentest, externer Test, Platzhalter …).',
        'Vier Lerntyp-Tabs mit eigenem Pfad – Wechsel oben rechts in der Toolbar.',
        'Standard-Raster pro Lerntyp über den „Guide" einspielen (Sektor 0 Orientierung → Einstieg → Training → Test → Projekt).',
        'Sektoren per „+ Sektor hinzufügen" anlegen – die Vorlagen sind pro Lerntyp passend (z.B. Erarbeitungs-/Trainingsphase, Anwendung & Training, Projekt-Sektor, Leerer Sektor).',
        'Pro Sektor zwischen „sequenziell" (feste Reihenfolge) und „frei" (offen) umschalten und Aufgaben/Bausteine per Drag & Drop einsortieren.',
        'Ampel-Status zeigt pro Aufgabe an, ob sie für den Pfad freigegeben werden kann; mit „Prüfen & freigeben" sperren Sie den Pfad für die Schüler.',
        'Strukturelle Sperre + Auto-Save: nur ein Bearbeiter gleichzeitig, andere sehen den Stand schreibgeschützt; Änderungen werden im Hintergrund gespeichert.',
      ],
      faqs: [
        { question: 'Was sind die vier Lerntypen?', answer: 'Schülerprofile mit unterschiedlicher Lernstrategie: Minimalist (Wesentliches), Pragmatiker (will effizient zum Ziel), Ehrgeizig (will viel erreichen, vollständige Prüfungsvorbereitung), Passioniert (große Freiheit, Fokus auf Projekte).' },
        { question: 'Was ist Sektor 0?', answer: 'Ein vorgeschalteter Orientierungs-Sektor mit Einführungsbeispiel, freiwilligem Frageblock und Einstiegsdiagnose. Er ist in allen vier Lerntypen identisch und sorgt dafür, dass Schüler den gleichen Einstieg in die Einheit haben.' },
        { question: 'Was macht „Standard-Raster laden" im Guide?', answer: 'Der Guide spielt das didaktisch passende Sektor-Gerüst für den aktuellen Lerntyp ein (z.B. beim Pragmatiker: Orientierung → Lernlandkarte → Grundlagen und Training → Abschlusstest). Bestehende Aufgaben werden dabei nicht überschrieben.' },
        { question: 'Was bedeuten die Vorlagen im „+ Sektor hinzufügen"-Menü?', answer: 'Sie passen zum Lerntyp: Pragmatiker/Ehrgeizig bieten z.B. „Erarbeitungs- und Trainingsphase", Passionierte „Anwendungs- und Trainingsphase" + „Projekt-Sektor". Überall gibt es zusätzlich „Leerer Sektor" ohne Platzhalter.' },
        { question: 'Was bedeutet „Prüfen & freigeben"?', answer: 'Der Pfad wird auf vollständige (grüne) Aufgaben geprüft und für die Schüler sichtbar gemacht. Danach ist der Pfad gesperrt – Änderungen sind erst nach „Entsperren" wieder möglich.' },
        { question: 'Was passiert mit den Aufgaben aus Ebene 2/3?', answer: 'Die Aufgaben selbst bleiben unverändert. Hier legen Sie nur fest, in welchem Sektor und in welcher Reihenfolge sie für den jeweiligen Lerntyp angeboten werden.' },
        { question: 'Warum kann ich nicht bearbeiten?', answer: 'Der Tab nutzt eine eigene strukturelle Sperre. Wenn jemand anderes den Lernpfad gerade bearbeitet oder der Pfad freigegeben/gesperrt ist, sehen Sie nur den Lese-Modus.' },
      ],
    },
  },
  {
    value: 'cockpit', label: 'Freigabe-Cockpit (Moodle)', icon: CheckSquare, step: 8,
    help: {
      title: 'Freigabe-Cockpit – Moodle-Export vorbereiten',
      description: 'Übersicht aller Inhalte dieser Einheit mit ihrem aktuellen Status. Hier selektieren Sie, was für den nächsten Moodle-Export übergeben werden soll. Den eigentlichen Upload nach Moodle bzw. Brian.study erledigt das Export-Team im zentralen Export-Center (Hauptmenü).',
      features: [
        'Status aller Aktivitäten und Aufgaben auf einen Blick',
        'Freigegebene Inhalte für den nächsten Export vormerken ("pending")',
        'Inhalte mit Export-Fehler erneut einplanen',
        'Per Klick direkt zum entsprechenden Inhalt springen und korrigieren',
        'Übergabe einzelner Elemente rückgängig machen',
        'Finale Einheits-Freigabe für den Export auslösen',
      ],
      faqs: [
        { question: 'Was bedeutet "Wird exportiert 🔒"?', answer: 'Das Export-Team hat diesen Inhalt gezogen. Er ist für Lehrkräfte schreibgeschützt, bis der Export vom Admin als erfolgreich oder fehlgeschlagen bestätigt wird.' },
        { question: 'Kann ich die Vorauswahl rückgängig machen?', answer: 'Ja, über das Pfeil-zurück-Symbol neben einem "pending"-Eintrag können Sie die Übergabe wieder zurücksetzen.' },
        { question: 'Wo wird der eigentliche Upload nach Moodle / Brian.study bestätigt?', answer: 'Im zentralen Export-Center, das im Hauptmenü erreichbar ist. Dort liegen sowohl die Moodle- als auch die Brian.study-Bestätigungen für alle Einheiten gebündelt.' },
      ],
    },
  },
  ];

  return allTabs.filter(tab => {
    // Tab 8 (Freigabe-Cockpit) nur für Admin und Moodle-Designer
    if (tab.value === 'cockpit') {
      return showExportTabs;
    }
    // Tab 7 (Dashboards): für alle Lehrkräfte/Admins sichtbar
    if (tab.value === 'dashboards') return true;
    // Tabs 1 & 2 (Einheit verwalten, Struktur) sind für ALLE sichtbar (auch Fachlehrkräfte)
    // Tabs 3-6 sind für alle Lehrkräfte sichtbar
    return true;
  });
};

export default function WorkspaceTabs({ activeTab, onTabChange }) {
  const { rolle } = useRBAC();
  const visibleTabs = getVisibleTabs(rolle);
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <div key={tab.value} className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      'flex items-center gap-1.5 py-1 rounded-md border transition-all font-medium',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm px-3 justify-start'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50 px-2 justify-center'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all',
                      isActive
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {tab.step}
                    </span>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
              {isActive && <div className="absolute -top-1 -right-1"><HelpDialog {...tab.help} /></div>}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}