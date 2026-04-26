/**
 * DidaktischerGuidePanel.jsx
 *
 * Slide-Over (Modal-Dialog) für den "Didaktischen Guide" des Magic-Raster-Epics
 * (Phase 3). Zeigt Lehrkräften einen kurzen Erklärungstext zum aktuell
 * gewählten Lerntyp und bietet einen primären Button zum Laden des
 * Standard-Rasters.
 *
 * Reine Anzeige-Komponente — keine State-Mutationen am Pfad. Die echte
 * Apply-Logik wird in Phase 4 ergänzt und über `onApplyClick` ausgelöst.
 *
 * Props:
 *   - isOpen:      Steuerung der Sichtbarkeit (vom Cockpit gehalten).
 *   - onClose:     Callback beim Schließen (X-Button, Overlay-Klick, ESC).
 *   - lerntyp:     Schlüssel des aktuell gewählten Lerntyps. Erwartet einen
 *                  der vier Werte 'minimalist' | 'pragmatiker' | 'ehrgeizig' |
 *                  'passioniert'. Default-Fallback im Mapping schützt bei
 *                  unerwarteten Werten.
 *   - isLocked:    true, wenn der aktuelle Pfad `locked_for_export` ist —
 *                  dann ist der Apply-Button disabled und ein Sperr-Hinweis
 *                  wird eingeblendet.
 *   - onApplyClick: Callback für den primären Button. Phase 3 erhält hier
 *                  nur eine Dummy-Funktion vom Cockpit; Phase 4 ersetzt sie
 *                  durch die echte Template-Apply-Logik.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Lock, Sparkles, Layers, Trophy, Star, Info } from 'lucide-react';

// ── Mapping: Lerntyp → Anzeigeinhalte ──────────────────────────────────
// Der Erklärungstext ist bewusst als Dummy ausgelegt (Phase 3); finale
// pädagogische Texte folgen über das Pädagogik-Team. Die Struktur (label,
// icon, accentClasses) ist absichtlich identisch zur Lerntyp-Definition
// im LernpfadeArchitekt, damit ein späterer Refactor zu einer gemeinsamen
// Konstante einfach möglich ist.
const LERNTYP_INFO = {
  minimalist: {
    label: 'Minimalist',
    icon: Sparkles,
    accent: 'text-slate-700 bg-slate-50 border-slate-200',
    description:
      'Fokussiert auf das Wesentliche. Kleinschrittiger Aufbau mit hohem ' +
      'Handlungsanteil und einer niedrigen kognitiven Einstiegshürde für ' +
      'einen sicheren Basis-Lernerfolg.',
  },
  pragmatiker: {
    label: 'Pragmatiker',
    icon: Layers,
    accent: 'text-blue-700 bg-blue-50 border-blue-200',
    description:
      'Effizienz im Fokus. Nutzt Vorab-Tests (Fast-Track), um Lernpfade ' +
      'abzukürzen und Zeit für gezielte Übungen in Transfer-Aufgaben ' +
      '(Level 2) zu gewinnen.',
  },
  ehrgeizig: {
    label: 'Ehrgeizige',
    icon: Trophy,
    accent: 'text-amber-700 bg-amber-50 border-amber-200',
    description:
      'Viel erreichen. Strukturierte Vorbereitung auf Prüfungen mit ' +
      'vollständiger Abdeckung aller Lernziele und systematischer Anmeldung ' +
      'zur schriftlichen Arbeit.',
  },
  passioniert: {
    label: 'Passionierte',
    icon: Star,
    accent: 'text-violet-700 bg-violet-50 border-violet-200',
    description:
      'Große Freiheit in der Gestaltung des Arbeitsprozesses. ' +
      'Projektorientierter Ansatz mit freiem Zugriff auf alle Inhalte für ' +
      'eigenständiges, forschendes Lernen und kreative Projektarbeit.',
  },
};

// Defensiver Fallback, falls das Cockpit aus irgendeinem Grund einen
// unerwarteten Schlüssel liefert. Die UI bleibt damit auch bei Schema-
// Änderungen oder Schreibfehlern bedienbar.
const FALLBACK_INFO = {
  label: '–',
  icon: BookOpen,
  accent: 'text-slate-700 bg-slate-50 border-slate-200',
  description: 'Für diesen Lerntyp liegt aktuell keine Erklärung vor.',
};

export default function DidaktischerGuidePanel({
  isOpen,
  onClose,
  lerntyp,
  isLocked = false,
  onApplyClick,
}) {
  const info = LERNTYP_INFO[lerntyp] || FALLBACK_INFO;
  const Icon = info.icon;

  return (
    <Dialog open={!!isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Didaktischer Guide
          </DialogTitle>
        </DialogHeader>

        {/* Lerntyp-Header: Icon + Label in der Lerntyp-Akzentfarbe */}
        <div
          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${info.accent}`}
        >
          <div className="w-9 h-9 rounded-md bg-white/70 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              Lerntyp
            </p>
            <p className="text-sm font-semibold leading-tight">{info.label}</p>
          </div>
        </div>

        {/* Erklärungstext (profil-spezifisch) */}
        <p className="text-sm leading-relaxed text-foreground/80">
          {info.description}
        </p>

        {/* Doku-Absprung – führt zur ausführlichen Lerntypen-Doku */}
        <Link
          to="/docs/dashboards-v2"
          onClick={() => onClose?.()}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          <Info className="w-3.5 h-3.5" />
          Mehr über die Lerntypen und den Aufbau der Dashboards erfahren
        </Link>

        {/* Sperr-Hinweis – nur sichtbar, wenn der Pfad freigegeben/gesperrt ist */}
        {isLocked && (
          <div
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            role="alert"
          >
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Raster kann nicht geladen werden, da der Lernpfad aktuell freigegeben
              und gesperrt ist.
            </span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button
            type="button"
            onClick={() => onApplyClick?.()}
            disabled={isLocked}
            title={
              isLocked
                ? 'Pfad ist freigegeben und gesperrt – bitte zuerst entsperren.'
                : undefined
            }
            className="gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {`Standard-Raster für ${info.label} laden`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}