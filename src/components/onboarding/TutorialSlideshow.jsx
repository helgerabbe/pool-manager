/**
 * TutorialSlideshow.jsx
 *
 * Onboarding-Tutorial für neue Nutzer.
 * Zustand wird in localStorage gespeichert.
 * Migration-ready: Kommentar zeigt, wie man UserService einbinden kann.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X, BookOpen, Package, Rocket, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Persistenz (localStorage) ──────────────────────────────────────────────
// Migration hint: Ersetze diese beiden Funktionen durch UserService-Calls,
// z.B. UserService.updateTutorialStatus(true) / UserService.getTutorialStatus()
const STORAGE_KEY = 'poolmanager_hasSeenTutorial';

export function getTutorialSeen() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setTutorialSeen() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

// ── Slide-Inhalte ──────────────────────────────────────────────────────────
const SLIDES = [
  {
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600',
    title: 'Willkommen beim Pool Manager!',
    subtitle: 'Deine Orga-App für Freiarbeitszeiten',
    body: 'Der Pool Manager hilft dir, Unterrichtseinheiten strukturiert zu planen und deinen Schülern klare Lernpfade bereitzustellen. Alle Inhalte lassen sich direkt nach Moodle exportieren.',
  },
  {
    icon: Package,
    color: 'bg-amber-100 text-amber-600',
    title: 'Was ist ein Lernpaket?',
    subtitle: 'Das Herzstück der App',
    body: 'Ein Lernpaket ist eine abgeschlossene Lerneinheit zu einem Thema. Es enthält Lernziele, Aktivitäten (Videos, Übungen, Tests) und Aufgaben auf verschiedenen Anforderungsebenen – von Basis bis Projekt.',
  },
  {
    icon: Rocket,
    color: 'bg-green-100 text-green-600',
    title: 'So startest du',
    subtitle: 'In 3 Schritten zum ersten Lernpaket',
    body: (
      <ol className="space-y-2 text-sm text-left">
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">1</span>
          <span><strong>Einheit anlegen</strong> – Wähle Fach, Jahrgang und Titel deiner Unterrichtseinheit.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">2</span>
          <span><strong>Struktur aufbauen</strong> – Erstelle Themenfelder und ordne Lernpakete per Drag & Drop zu.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">3</span>
          <span><strong>Inhalte befüllen</strong> – Füge Lernziele, Aktivitäten und Aufgaben hinzu und gib sie für Moodle frei.</span>
        </li>
      </ol>
    ),
  },
];

// ── Dialog-Komponente ──────────────────────────────────────────────────────
export function TutorialSlideshowDialog({ open, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === SLIDES.length - 1;

  const handleFinish = () => {
    setTutorialSeen();
    onClose(true); // true = abgeschlossen
  };

  const handleSkip = () => {
    setTutorialSeen();
    onClose(false); // false = übersprungen
  };

  return (
    <Dialog open={open} onOpenChange={() => handleSkip()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Slide-Inhalt */}
        <div className="flex flex-col items-center text-center p-8 gap-4">
          {/* Icon */}
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', slide.color)}>
            <Icon className="w-8 h-8" />
          </div>

          {/* Texte */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{slide.subtitle}</p>
            <h2 className="text-xl font-bold">{slide.title}</h2>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed">
            {typeof slide.body === 'string' ? <p>{slide.body}</p> : slide.body}
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t bg-muted/30">
          {currentSlide > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setCurrentSlide(c => c - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Zurück
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
              Überspringen
            </Button>
          )}

          {isLast ? (
            <Button onClick={handleFinish} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Los geht's!
            </Button>
          ) : (
            <Button onClick={() => setCurrentSlide(c => c + 1)} className="gap-1">
              Weiter <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Tutorial-Card für die Startseite ──────────────────────────────────────
export default function TutorialCard() {
  const [seen, setSeen] = useState(getTutorialSeen());
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClose = (completed) => {
    setDialogOpen(false);
    setSeen(true);
  };

  return (
    <>
      <div
        className={cn(
          'relative rounded-xl border p-5 flex items-start gap-4 cursor-pointer transition-all hover:shadow-md',
          seen ? 'bg-green-50 border-green-200' : 'bg-primary/5 border-primary/20 hover:border-primary/40'
        )}
        onClick={() => setDialogOpen(true)}
      >
        {/* Badge */}
        {seen && (
          <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" /> Abgeschlossen
          </div>
        )}

        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          seen ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
        )}>
          <BookOpen className="w-5 h-5" />
        </div>

        <div>
          <p className="font-semibold text-sm">Onboarding-Tutorial</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {seen
              ? 'Tutorial erneut ansehen – jederzeit verfügbar.'
              : 'Neu hier? Lerne die wichtigsten Konzepte in 3 kurzen Schritten kennen.'}
          </p>
          <p className="text-xs font-medium text-primary mt-2">Tutorial {seen ? 'erneut ' : ''}starten →</p>
        </div>
      </div>

      <TutorialSlideshowDialog open={dialogOpen} onClose={handleClose} />
    </>
  );
}