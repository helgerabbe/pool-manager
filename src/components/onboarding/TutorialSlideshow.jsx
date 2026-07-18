/**
 * TutorialSlideshow.jsx
 *
 * Automatisches Onboarding-Tutorial für neue Nutzer.
 * Öffnet sich beim ersten Besuch automatisch.
 * Persistenz via localStorage – kein base44-Import!
 *
 * Migration hint: getTutorialSeen / setTutorialSeen können später
 * durch UserService.getTutorialStatus() / .setTutorialSeen() ersetzt werden.
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import {
  ChevronRight, ChevronLeft, CheckCircle2,
  Users, Star, Trophy, LayoutGrid, ArrowRight,
  FolderOpen, Target, Layers, HelpCircle, Sparkles, Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Persistenz (reines Browser-API, kein base44) ───────────────────────────
const STORAGE_KEY = 'poolmanager_tutorial_seen';

export const getTutorialSeen = () => localStorage.getItem(STORAGE_KEY) === 'true';
export const setTutorialSeen = () => localStorage.setItem(STORAGE_KEY, 'true');

// ── Slide-Daten ─────────────────────────────────────────────────────────────
const SLIDES = [
  {
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
    title: 'Poolzeit & Selbstständigkeit',
    text: 'Schüler arbeiten eigenverantwortlich an Fächern ihrer Wahl. Die Fächer geben Aufgaben und Deadlines vor, die Schüler steuern ihren Prozess.',
  },
  {
    icon: Star,
    color: 'bg-amber-100 text-amber-600',
    title: 'Die 4 Lernprofile',
    text: 'Jeder Schüler wählt ein Profil und entscheidet damit selbst über die Intensität und Tiefe der Bearbeitung.',
  },
  {
    icon: Trophy,
    color: 'bg-yellow-100 text-yellow-600',
    title: 'Zielwahl & Noten',
    text: 'Das gewählte Ziel bestimmt die Note: Basisaufgaben (max. 3), Tests, Arbeiten oder Präsentationen (bis 1). Die Note ist eine bewusste Schülerentscheidung.',
  },
  {
    icon: LayoutGrid,
    color: 'bg-violet-100 text-violet-600',
    title: 'Der Pool Manager',
    text: 'Dieses Planungstool hilft uns, die vielen individuellen Lernpfade zu strukturieren und den Überblick zu bewahren.',
  },
  {
    icon: ArrowRight,
    color: 'bg-sky-100 text-sky-600',
    title: 'Der Workflow zu Moodle',
    text: 'Wir planen hier die fachliche Logik. Ein Experten-Team baut daraus den Moodle-Kurs. Änderungen hier fließen direkt nach Moodle zurück.',
  },
  {
    icon: Sparkles,
    color: 'bg-fuchsia-100 text-fuchsia-600',
    title: 'Das Ziel: Dashboards für Moodle',
    text: 'Am Ende entsteht hier für jedes Lernprofil ein eigenes Dashboard – also der konkrete Lernpfad, den die Schüler später in Moodle sehen. Du planst die Struktur einmal in dieser App, und sie wird automatisch nach Moodle übertragen.',
  },
  {
    icon: FolderOpen,
    color: 'bg-orange-100 text-orange-600',
    title: 'Einheiten & Themenfelder',
    text: 'Die Struktur: Eine Einheit besteht aus mehreren Themenfeldern. Darin liegen die modular aufgebauten Lernpakete.',
  },
  {
    icon: Target,
    color: 'bg-red-100 text-red-600',
    title: 'Allgemeine Aufgaben – der Normalfall',
    text: 'Allgemeine Aufgaben sind das, was Schüler in der Mehrzahl bearbeiten. Sie werden mit dem KI-Tutor Brian bearbeitet: Brian führt schrittweise zur Lösung und verrät sie nur im absoluten Notfall. Wer hängen bleibt, bekommt das passende Lernpaket als Hilfe angeboten.',
  },
  {
    icon: Layers,
    color: 'bg-teal-100 text-teal-600',
    title: 'Lernpakete – die Hilfe-Ebene',
    text: 'Lernpakete sind kleine, modulare Bausteine (15–30 Min.) mit festen Inhalten: Schüler bekommen hier ohne wesentliche KI-Unterstützung schnell eine Erklärung und können Übungen direkt durchführen. Jedes Paket hat 3 Phasen: Input (Erklärung), Übung (Anwendung) und Abschluss (Selbstprüfung).',
  },
  {
    icon: Rocket,
    color: 'bg-purple-100 text-purple-600',
    title: 'Projekte – für Selbstständige',
    text: 'Projekte richten sich an leistungsstarke Schüler, die selbstständig arbeiten können. Auch hier begleitet Brian – aber anders: Es gibt nicht die eine richtige Lösung. Brian unterstützt rein methodisch auf Grundlage festgelegter Gütekriterien, statt zur Lösung zu führen.',
  },
  {
    icon: HelpCircle,
    color: 'bg-green-100 text-green-600',
    title: 'Navigation & Direkthilfe',
    text: 'Nutze die Tabulatoren oben zur Navigation. Klicke auf das ?-Symbol in jedem Tab, um jederzeit Direkthilfe zu erhalten.',
    image: 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/c02dbf185_image.png',
  },
];

// ── Wiederverwendbarer Dialog (auch manuell aufrufbar) ─────────────────────
export function TutorialSlideshowDialog({ open: controlledOpen, onClose }) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const Icon = current.icon;
  const isLast = slide === SLIDES.length - 1;
  const total = SLIDES.length;

  const handleClose = () => {
    setTutorialSeen();
    setSlide(0);
    onClose?.();
  };

  return (
    <Dialog open={controlledOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <VisuallyHidden><DialogTitle>{current.title}</DialogTitle></VisuallyHidden>
        <div className="flex flex-col items-center text-center px-8 pt-8 pb-4 gap-5">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center shrink-0', current.color)}>
            <Icon className="w-8 h-8" />
          </div>
          {current.image && (
            <img src={current.image} alt="Menüleisten-Vorschau" className="w-full rounded-xl border border-border shadow-sm object-contain max-h-20" />
          )}
          <div className="space-y-2">
            <h2 className="text-xl font-bold leading-tight">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.text}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={cn('h-1.5 rounded-full transition-all duration-200', i === slide ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/25')} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{slide + 1} von {total}</p>
        </div>
        <div className="flex items-center justify-between px-8 py-4 border-t bg-muted/30">
          {slide > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setSlide(s => s - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Zurück
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground text-xs">
              Überspringen
            </Button>
          )}
          {isLast ? (
            <Button onClick={handleClose} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Tutorial beenden
            </Button>
          ) : (
            <Button onClick={() => setSlide(s => s + 1)} className="gap-1">
              Weiter <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Auto-Öffner beim ersten Login ───────────────────────────────────────────
export default function TutorialSlideshow() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getTutorialSeen()) setOpen(true);
  }, []);

  if (!open) return null;
  return <TutorialSlideshowDialog open={open} onClose={() => setOpen(false)} />;
}