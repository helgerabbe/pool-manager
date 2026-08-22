/**
 * AnleitungModal.jsx
 *
 * Nachschlagewerk für den Export. Beschreibt den aktuellen, entkoppelten
 * Ablauf (GitHub-Push mit Delta-Abgleich, ZIP als Fallback, Copy/Paste-Tabs
 * für einzelne Bausteine) — ohne die frühere Einheiten-Freigabe.
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
import { ScrollText, FileCode, ListChecks, GitBranch, RefreshCw, Package } from 'lucide-react';
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
    id: 'github-push',
    icon: GitBranch,
    title: '🚀 Regelweg: Push nach GitHub',
    steps: [
      'Einheit links auswählen. Ein Push ist jederzeit möglich — es gibt keine Freigabe und keine Sperre mehr; die Lehrkräfte arbeiten während des Exports normal weiter.',
      'In der GitHub-Karte „Änderungen prüfen" — es wird gezeigt, welche Dateien neu, geändert oder unverändert sind (Delta-Abgleich gegen das Repository).',
      'Push starten. Es werden nur die tatsächlich geänderten Dateien übertragen (Struktur-Payloads + Material-Ordner).',
      'Danach steht die Einheit auf „In Sync" und der Zeitpunkt des Exports wird gespeichert.',
    ],
  },
  {
    id: 'delta',
    icon: RefreshCw,
    title: '🔍 Was hat sich seit dem letzten Push geändert?',
    steps: [
      'Das Badge an jeder Einheit sagt es auf einen Blick: „Neu" = noch nie exportiert, „In Sync" = Stand im Repo ist aktuell, „Out of Sync" = seit dem letzten Push wurde im Pool-Manager gearbeitet.',
      'Daneben steht das Datum des letzten Exports; dasselbe Datum findest du auch auf der Einheiten-Kachel und in Tab 1 der Einheit.',
      'Bei „Out of Sync" genügt ein erneuter Push — der Delta-Abgleich schiebt nur die betroffenen Dateien nach.',
      'Wer wann in einer Einheit gearbeitet hat, steht in Tab 1 der Einheit unter „Letzte Aktivitäten".',
    ],
  },
  {
    id: 'zip',
    icon: Package,
    title: '📦 Manuelle Übergabe per ZIP (Air-Gap)',
    steps: [
      'Wenn kein GitHub-Weg möglich ist: „Air-Gap-Paket herunterladen" erzeugt ein ZIP mit allen Struktur-Payloads und den zugehörigen Medien.',
      'Das ZIP enthält dieselben Daten wie der Push — es ist nur der Transportweg per Hand.',
      'Inhalt an die MBK übergeben; die Einheit bleibt dabei uneingeschränkt bearbeitbar.',
    ],
  },
  {
    id: 'tabs',
    icon: FileCode,
    title: '📋 Einzelne Bausteine per Copy/Paste an die MBK',
    steps: [
      'Die Tabs unterhalb der Export-Karten geben jeden Baustein einzeln als JSON heraus: Meta-Prompt, Struktur, Aufgaben, Globale KI, Systembausteine, UI-Konfiguration.',
      'Sinnvoll für Nacharbeit an einer einzelnen Aufgabe: Item kopieren, an die MBK senden, die zurückgelieferte Datei im Zielsystem austauschen.',
      'Jeder Tab zeigt selbst an, ob sein Inhalt seit der letzten Übergabe abgewichen ist.',
    ],
  },
  {
    id: 'globale-aenderung',
    icon: ScrollText,
    title: '🏫 Globale Änderung (Schul-Nomenklatur, MBK-Prompts)',
    steps: [
      'Der Tab „Globale KI" wird abweichend, sobald eine globale Quelle geändert wurde — das betrifft alle Einheiten gleichzeitig.',
      'Globale KI erneut an die MBK übergeben; danach die KI-Aufgaben neu generieren, die diese Werte nutzen.',
    ],
  },
  {
    id: 'systembaustein',
    icon: ListChecks,
    title: '🧱 Systembausteine',
    steps: [
      'Systembausteine (Onboarding, Kompaktwissen, Lernlandkarte u. a.) laufen im eigenen Tab mit und werden zusätzlich über Struktur und Globale KI mitgegeben.',
      'Bereits fertig aufbereitete Schüler-Inhalte werden als „fertige_inhalte" mitgeschickt und sind von der MBK 1:1 zu übernehmen.',
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
            Anleitung — Export
          </DialogTitle>
          <DialogDescription>
            Oben der aktuelle Action Plan für die ausgewählte Einheit, darunter
            die Abläufe zum Nachschlagen. Grundsatz: Ein Export ist jederzeit
            möglich und zieht immer den aktuellen Stand — es gibt keine formale
            Freigabe und keine Bearbeitungssperre mehr.
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