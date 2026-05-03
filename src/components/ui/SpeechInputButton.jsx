/**
 * SpeechInputButton.jsx
 *
 * Mikrofon-Button der das Web Speech API nutzt, um Sprache in Text umzuwandeln.
 * Hängt den erkannten Text an den bestehenden Wert an.
 *
 * Verhalten:
 *  - Klick: startet die Aufnahme (rotes pulsierendes Mikro).
 *  - Erneuter Klick: stoppt die Aufnahme manuell.
 *  - Sprechpausen führen NICHT zum Abbruch: sobald Chrome `onend` feuert
 *    (was bei `continuous=true` nach jeder finalen Phrase passiert), wird
 *    eine FRISCHE Recognition-Instanz gestartet, solange der Nutzer nicht
 *    selbst gestoppt hat. Das verhindert den `InvalidStateError`, den
 *    Chrome wirft, wenn man `start()` auf einer beendeten Instanz erneut
 *    aufruft.
 *
 * Props:
 *   onResult(text) – wird mit dem neuen Gesamttext aufgerufen
 *   value          – aktueller Textwert (wird durch Sprache ergänzt)
 *   disabled       – deaktiviert den Button
 *   className      – optionale extra CSS-Klassen
 */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SpeechInputButton({ onResult, value = '', disabled = false, className }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  // Aktuellen value-Snapshot vorhalten, damit der Auto-Restart nicht gegen
  // einen veralteten Closure-Wert mergt.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const createRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      let chunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          chunk += (chunk ? ' ' : '') + e.results[i][0].transcript;
        }
      }
      if (!chunk) return;
      const current = valueRef.current || '';
      const separator = current.trim() ? ' ' : '';
      const next = current + separator + chunk;
      valueRef.current = next; // Ref sofort updaten, damit folgende Chunks richtig anhängen
      onResult(next);
    };

    recognition.onerror = (e) => {
      // 'no-speech' und 'aborted' sind erwartbar bei continuous=true und
      // sollen nicht als Fehler dem Nutzer gezeigt werden.
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      toast.error('Spracherkennung fehlgeschlagen: ' + e.error);
      shouldRestartRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      // Nur stoppen, wenn der Nutzer das wollte. Sonst frische Instanz starten.
      if (!shouldRestartRef.current) {
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }
      // Kleine Pause, damit Chrome den alten Stream sauber freigibt.
      setTimeout(() => {
        if (!shouldRestartRef.current) {
          setIsListening(false);
          return;
        }
        try {
          const next = createRecognition();
          recognitionRef.current = next;
          next.start();
        } catch {
          shouldRestartRef.current = false;
          setIsListening(false);
        }
      }, 80);
    };

    return recognition;
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  };

  const startListening = () => {
    shouldRestartRef.current = true;
    valueRef.current = value;
    try {
      const recognition = createRecognition();
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      shouldRestartRef.current = false;
      setIsListening(false);
      toast.error('Spracherkennung konnte nicht gestartet werden.');
    }
  };

  const handleToggle = () => {
    if (!isSupported) {
      toast.error('Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Beim Unmount aufräumen, damit kein Stream im Hintergrund weiterläuft.
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      title={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
      aria-label={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
      aria-pressed={isListening}
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0',
        isListening
          ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400 ring-offset-1'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
    </button>
  );
}