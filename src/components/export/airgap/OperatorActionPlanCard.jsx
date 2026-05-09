/**
 * OperatorActionPlanCard.jsx
 *
 * UI-Block, der dem Operator vor den vier Payload-Karten zeigt, was er
 * konkret tun muss, damit das SCORM-Paket aktuell bleibt:
 *   - Schritt 1: Meta-System-Prompt kopieren (immer, sobald etwas zu tun ist)
 *   - dann pro Drift-Szenario: Payload kopieren + Datei im ZIP austauschen
 *   - bei Tombstones: Datei aus ZIP entfernen
 *
 * Komplett deklarativ, lebt nur von der Step-Liste aus
 * `lib/operatorActionPlan.js`.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ListChecks,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ScrollText,
  FileCode,
  Trash2,
  Sparkles,
} from 'lucide-react';

const STEP_ICON = {
  meta_prompt: <ScrollText className="w-4 h-4 text-primary" />,
  paste_payload: <Copy className="w-4 h-4 text-primary" />,
  replace_manifest: <FileCode className="w-4 h-4 text-amber-600" />,
  replace_task_html: <FileCode className="w-4 h-4 text-amber-600" />,
  delete_task_html: <Trash2 className="w-4 h-4 text-destructive" />,
};

export default function OperatorActionPlanCard({
  actionPlan,
  onCopyMetaPrompt,
}) {
  const { steps, isEmpty, hasStructuralChange, hasContentChange, hasDeletions } = actionPlan || {};

  if (!actionPlan || isEmpty) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-green-900">Kein Operator-Eingriff nötig</h3>
          <p className="text-xs text-green-900/80 mt-0.5">
            Alle Air-Gap-Payloads sind aktuell und es gibt keine offenen Löschungen.
            Solange du nichts veränderst, muss die MBK nicht aktiviert werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              Operator Action Plan
              <span className="text-xs font-normal text-muted-foreground">
                ({steps.length} Schritt{steps.length === 1 ? '' : 'e'})
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Folge den Schritten der Reihe nach. Schritt 1 setzt die MBK-Sitzung auf,
              danach werden gezielt einzelne Dateien im SCORM-ZIP ausgetauscht oder entfernt.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {hasStructuralChange && (
                <Tag tone="amber" icon={<AlertTriangle className="w-3 h-3" />}>
                  Strukturänderung
                </Tag>
              )}
              {hasContentChange && (
                <Tag tone="primary" icon={<Sparkles className="w-3 h-3" />}>
                  Inhalts-Updates
                </Tag>
              )}
              {hasDeletions && (
                <Tag tone="destructive" icon={<FileWarning className="w-3 h-3" />}>
                  Löschungen
                </Tag>
              )}
            </div>
          </div>
        </div>
      </div>

      <ol className="space-y-2 mt-2">
        {steps.map((step, idx) => (
          <li
            key={step.id}
            className="flex items-start gap-3 rounded-md border bg-background px-3 py-2"
          >
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center tabular-nums">
                {idx + 1}
              </span>
              {STEP_ICON[step.kind]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{step.title}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              {step.kind === 'meta_prompt' && onCopyMetaPrompt && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCopyMetaPrompt}
                  className="mt-2 gap-1.5 h-7 text-xs"
                >
                  <Copy className="w-3 h-3" />
                  Meta-System-Prompt kopieren
                </Button>
              )}
              {step.filename && step.kind !== 'meta_prompt' && (
                <code className="inline-block mt-1 text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">
                  {step.filename}
                </code>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Tag({ tone, icon, children }) {
  const toneClass = {
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    primary: 'bg-primary/10 text-primary border-primary/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  }[tone] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${toneClass}`}>
      {icon}
      {children}
    </span>
  );
}