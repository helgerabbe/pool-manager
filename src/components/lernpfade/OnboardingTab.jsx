/**
 * OnboardingTab.jsx
 *
 * Schlanke, NICHT editierbare Ansicht für die einheits-globale
 * Orientierungs-/Onboarding-Phase (5. Pill in Tab 8, vor den vier
 * Lerntyp-Dashboards).
 *
 * Konzept (siehe Einheiten.onboarding_konfiguration):
 *   - Die Orientierung ist VOR der Dashboard-Wahl vorgeschaltet, gehört
 *     also nicht in eines der vier Dashboards. Sie besteht aus drei FESTEN
 *     KI-Elementen, deren Struktur die Lehrkraft nicht verändern kann:
 *       1. Kurze Einführung in die Einheit
 *       2. Freiwilliger Fragenblock (Selbsteinschätzung)
 *       3. Einstiegsdiagnose (Wissens-Quiz)
 *   - Pro Element: „Vorschau" öffnet das jeweilige KI-Vorschau-Modal.
 *     Aus dem Modal heraus wird der Snapshot in dieses Feld GESPEICHERT.
 *
 * Diese Komponente ist reine Präsentation + Status-Anzeige. Vorschau und
 * Speichern laufen über Callbacks ans Cockpit.
 */
import React from 'react';
import { BookOpen, Compass, ClipboardCheck, Eye, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ELEMENTE = [
  {
    key: 'einfuehrung',
    titel: 'Kurze Einführung in die Einheit',
    beschreibung: 'Ein schülergerechter Überblick mit Bild – worum geht es in dieser Einheit?',
    Icon: BookOpen,
    accent: 'text-blue-600',
    accentBg: 'bg-blue-50',
  },
  {
    key: 'fragenblock',
    titel: 'Freiwilliger Fragenblock für die Einstiegsdiagnose',
    beschreibung: 'Selbsteinschätzung: Wie sicher fühlt sich der Schüler bei den Themen?',
    Icon: Compass,
    accent: 'text-violet-600',
    accentBg: 'bg-violet-50',
  },
  {
    key: 'einstiegsdiagnose',
    titel: 'Einstiegsdiagnose',
    beschreibung: 'KI-Wissensquiz zu den Inhalten der Einheit, das eine Lerntyp-Empfehlung vorbereitet.',
    Icon: ClipboardCheck,
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
  },
];

export default function OnboardingTab({
  onboardingKonfig,
  onPreviewEinfuehrung,
  onPreviewQblock,
  onPreviewDiagnoseQuiz,
}) {
  const previewHandlers = {
    einfuehrung: onPreviewEinfuehrung,
    fragenblock: onPreviewQblock,
    einstiegsdiagnose: onPreviewDiagnoseQuiz,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Erklär-Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                <Compass className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Orientierung &amp; Onboarding</h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Diese Phase ist allen vier Dashboards <strong>vorgeschaltet</strong> und gilt für die
                  gesamte Einheit. Die drei Elemente sind <strong>fest vorgegeben</strong> – ihre
                  Struktur kann nicht verändert werden. Du kannst die KI-Inhalte über „Vorschau" erzeugen
                  und für die Einheit speichern.
                </p>
              </div>
            </div>
          </div>

          {/* Die drei festen Elemente */}
          {ELEMENTE.map(({ key, titel, beschreibung, Icon, accent, accentBg }) => {
            const gespeichert = !!onboardingKonfig?.[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3"
              >
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${accentBg} ${accent}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{titel}</h3>
                    {gespeichert ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Circle className="w-3.5 h-3.5" /> Noch nicht erstellt
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{beschreibung}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => previewHandlers[key]?.()}
                  className="gap-1.5 h-8 text-[11px] shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Vorschau
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}