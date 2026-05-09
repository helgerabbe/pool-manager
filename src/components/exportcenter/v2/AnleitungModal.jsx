/**
 * AnleitungModal.jsx
 *
 * Statisches Nachschlagewerk für das Export-Team. Erklärt für jedes
 * Drift-Szenario, was konkret zu tun ist. Bewusst statisch
 * (kein dynamischer Plan), damit das Team auch ohne offene Einheit
 * nachlesen kann, wie was funktioniert.
 *
 * Der dynamische, kontextbezogene Action-Plan lebt weiterhin in
 * `OperatorActionPlanCard` und zeigt nur die gerade relevanten Schritte.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollText, FileCode, Trash2, Sparkles, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import OperatorActionPlanCard from '@/components/export/airgap/OperatorActionPlanCard';
import { useOperatorActionPlan } from '@/hooks/useOperatorActionPlan';
import { META_SYSTEM_PROMPT } from '@/lib/operatorMetaSystemPrompt';

/**
 * Lädt + rendert den kontextspezifischen Action Plan für eine konkrete
 * Einheit. Eigene Sub-Komponente, damit der Hook nur dann läuft, wenn
 * tatsächlich eine Einheit ausgewählt ist (Empty-State sonst).
 */
function ActionPlanSection({ einheitId }) {
  const { actionPlan, einheit } = useOperatorActionPlan(einheitId);
  const handleCopyMetaPrompt = async () => {
    try {
      await navigator.clipboard.writeText(META_SYSTEM_PROMPT);
      toast.success('Meta-System-Prompt in Zwischenablage kopiert.');
    } catch {
      toast.error('Kopieren fehlgeschlagen.');
    }
  };
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-primary" />
        Aktueller Action Plan
        {einheit?.titel_der_einheit && (
          <span className="text-xs font-normal text-muted-foreground">
            · {einheit.titel_der_einheit}
          </span>
        )}
      </h3>
      <OperatorActionPlanCard
        actionPlan={actionPlan}
        onCopyMetaPrompt={handleCopyMetaPrompt}
      />
    </section>
  );
}

const SCENARIOS = [
  {
    id: 'first-export',
    icon: ScrollText,
    title: '🆕 Erst-Export einer Einheit',
    steps: [
      'Tab 0 — Meta-System-Prompt: kopieren und als allerersten Prompt in die MBK senden. Auf „MBK v2.0 bereit." warten.',
      'Tab 1 — Struktur: kopieren und an die MBK senden. Sie generiert daraus imsmanifest.xml und alle leeren Task-HTMLs.',
      'Tab 2 — Aufgaben: alle Items der Reihe nach kopieren und an die MBK senden. Pro Item entsteht eine task-<id>.html.',
      'Falls KI-Aufgaben existieren: Tab 3 (Globale KI) kopieren, danach Tab 5 (KI-Aufgaben) Item für Item.',
      'Alle Dateien aus der MBK-Antwort einsammeln und zu einem SCORM-ZIP packen.',
      'Im Header „Export beendet & Freigeben" klicken — die Einheit kehrt in den Bearbeitungsmodus zurück.',
    ],
  },
  {
    id: 'task-changed',
    icon: FileCode,
    title: '✏️ Eine Aufgabe wurde geändert',
    steps: [
      'Tab 0 — Meta-System-Prompt einmal pro Sitzung an eine frische MBK senden.',
      'Tab 2 — Aufgaben: nur das geänderte Item identifizieren (Out-of-Sync-Badge). Dieses Item kopieren.',
      'MBK liefert eine neue task-<id>.html zurück.',
      'Im bestehenden SCORM-ZIP genau diese eine Datei austauschen — alles andere bleibt unangetastet.',
      'Im Header bestätigen, dass der Export erfolgreich war.',
    ],
  },
  {
    id: 'new-task',
    icon: Sparkles,
    title: '➕ Eine neue Aufgabe wurde hinzugefügt',
    steps: [
      'Tab 0 — Meta-System-Prompt senden.',
      'Tab 1 — Struktur: hat sich geändert (neuer Eintrag in scorm_file_mapping). Kopieren und an MBK senden — sie liefert eine neue imsmanifest.xml.',
      'Tab 2 — Aufgaben: das neue Item (Badge „Neu") kopieren — MBK liefert die neue task-<id>.html.',
      'Im SCORM-ZIP sowohl das Manifest austauschen als auch die neue task-<id>.html hinzufügen.',
    ],
  },
  {
    id: 'task-deleted',
    icon: Trash2,
    title: '🗑️ Eine Aufgabe wurde gelöscht',
    steps: [
      'Operator-Action-Plan oben prüfen: Tombstones zeigen welche task-<id>.html im ZIP überflüssig geworden ist.',
      'Tab 1 — Struktur: ist out of sync (Mapping-Eintrag fehlt). Kopieren und an MBK senden — neue imsmanifest.xml ohne den Eintrag.',
      'Im SCORM-ZIP: Manifest austauschen, die ungenutzte task-<id>.html manuell löschen.',
    ],
  },
  {
    id: 'ki-task-changed',
    icon: Sparkles,
    title: '🤖 KI-Aufgabe wurde geändert (Briefing oder Lernziel)',
    steps: [
      'Tab 0 — Meta-System-Prompt senden.',
      'Tab 3 — Globale KI: einmal pro Sitzung an die MBK übergeben (Stammdaten + Nomenklatur).',
      'Tab 5 — KI-Aufgaben: das geänderte Item kopieren. Die MBK generiert eine neue task-<id>.html.',
      'Im SCORM-ZIP nur die eine Datei tauschen.',
    ],
  },
  {
    id: 'systembaustein',
    icon: ListChecks,
    title: '🧱 Systembausteine',
    steps: [
      'Tab 4 ist aktuell als Platzhalter aktiv — die eigentliche Generierungs-Routine wird gerade mit der MBK-Entwicklung abgestimmt.',
      'Bis dahin werden die Systembaustein-Anweisungen automatisch über Tab 1 (Struktur) und Tab 3 (Globale KI) an die MBK mitgegeben — es geht keine Information verloren.',
    ],
  },
  {
    id: 'globale-aenderung',
    icon: ScrollText,
    title: '🏫 Globale Änderung (Schul-Nomenklatur, MBK-Prompts)',
    steps: [
      'Tab 3 (Globale KI) wird automatisch out-of-sync, sobald eine globale Quelle geändert wurde — auch in anderen Einheiten.',
      'Tab 0 — Meta-System-Prompt senden.',
      'Tab 3 — Globale KI: kopieren und an die MBK senden. Der system_context_hash ändert sich.',
      'Anschließend alle KI-Aufgaben (Tab 5), die diese Globalwerte nutzen, ebenfalls neu generieren.',
    ],
  },
];

export default function AnleitungModal({ open, onOpenChange, einheitId = null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Anleitung — Export-Szenarien
          </DialogTitle>
          <DialogDescription>
            Nachschlagewerk für das Export-Team. Oben findest du den
            kontextspezifischen Action Plan für die aktuell ausgewählte
            Einheit, darunter die allgemeinen Drift-Szenarien zum Nachschlagen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {einheitId && open && <ActionPlanSection einheitId={einheitId} />}

          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.id} className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                  {s.title}
                </h3>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal pl-5">
                  {s.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}