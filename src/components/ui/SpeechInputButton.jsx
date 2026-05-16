/**
 * SpeechInputButton.jsx
 *
 * Mikrofon-Button mit Web-Speech-API.
 *
 * Verhalten:
 *  - Klick: startet die Aufnahme (rotes pulsierendes Mikro + Countdown).
 *  - Erneuter Klick: stoppt die Aufnahme manuell.
 *  - Hard-Cap: nach `maxSeconds` (Default 20 s) wird automatisch gestoppt.
 *  - Sprechpausen führen NICHT zum Abbruch: sobald Chrome `onend` feuert
 *    (was bei `continuous=true` nach jeder finalen Phrase passiert), wird
 *    eine FRISCHE Recognition-Instanz gestartet, solange der Nutzer nicht
 *    selbst gestoppt hat und das Zeitlimit nicht erreicht ist.
 *
 * Props:
 *   onResult(text) – wird mit dem neuen Gesamttext aufgerufen
 *   value          – aktueller Textwert (wird durch Sprache ergänzt)
 *   disabled       – deaktiviert den Button
 *   maxSeconds     – Hard-Cap in Sekunden (Default 20)
 *   className      – optionale extra CSS-Klassen
 */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SpeechInputButton({
  onResult,
  value = '',
  disabled = false,
  maxSeconds = 20,
  className,
  label = null,
  listeningLabel = null,
}) {
  const [isListening, setIsListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const tickIntervalRef = useRef(null);
  const hardStopTimeoutRef = useRef(null);
  const sessionBaseRef = useRef('');
  const finalTranscriptRef = useRef('');

  // Aktuellen value-Snapshot vorhalten, damit der Auto-Restart nicht gegen
  // einen veralteten Closure-Wert mergt.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const clearTimers = () => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (hardStopTimeoutRef.current) {
      clearTimeout(hardStopTimeoutRef.current);
      hardStopTimeoutRef.current = null;
    }
  };

  const createRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      let interimChunk = '';
      let finalChunk = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript?.trim();
        if (!transcript) continue;
        if (e.results[i].isFinal) {
          finalChunk += (finalChunk ? ' ' : '') + transcript;
        } else {
          interimChunk += (interimChunk ? ' ' : '') + transcript;
        }
      }

      if (finalChunk) {
        finalTranscriptRef.current = [finalTranscriptRef.current, finalChunk].filter(Boolean).join(' ');
      }

      const next = [sessionBaseRef.current, finalTranscriptRef.current, interimChunk]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (next) {
        valueRef.current = next;
        onResult(next);
      }
    };

    recognition.onerror = (e) => {
      // Diese Fehler treten bei continuous=true häufig nach kurzen Pausen auf.
      // Sie dürfen die Aufnahme nicht beenden; onend startet automatisch neu.
      if (['no-speech', 'aborted', 'network'].includes(e.error)) return;
      toast.error('Spracherkennung fehlgeschlagen: ' + e.error);
    };

    recognition.onend = () => {
      // Nur stoppen, wenn der Nutzer das wollte oder das Zeitlimit erreicht ist.
      // Sonst frische Instanz starten (Chrome beendet bei continuous=true
      // gerne nach jeder finalen Phrase).
      if (!shouldRestartRef.current) {
        clearTimers();
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
          clearTimers();
          setIsListening(false);
        }
      }, 80);
    };

    return recognition;
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    clearTimers();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  };

  const startListening = () => {
    shouldRestartRef.current = true;
    sessionBaseRef.current = (value || '').trim();
    finalTranscriptRef.current = '';
    valueRef.current = value;
    setSecondsLeft(maxSeconds);

    // Sekundengenauer Countdown fürs UI.
    tickIntervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    // Hard-Cap: spätestens nach maxSeconds automatisch stoppen.
    hardStopTimeoutRef.current = setTimeout(() => {
      stopListening();
    }, maxSeconds * 1000);

    try {
      const recognition = createRecognition();
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      shouldRestartRef.current = false;
      clearTimers();
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
      clearTimers();
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {isListening && (
        <span
          className="text-[11px] font-mono font-semibold text-red-600 tabular-nums"
          aria-live="polite"
        >
          {secondsLeft}s
        </span>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={isListening ? `Aufnahme stoppen (${secondsLeft}s übrig)` : 'Spracheingabe starten'}
        aria-label={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
        aria-pressed={isListening}
        className={cn(
          'flex items-center justify-center transition-colors shrink-0',
          label ? 'h-9 px-3 rounded-md gap-2 text-sm font-medium' : 'w-7 h-7 rounded-full',
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400 ring-offset-1'
            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        {label && <span>{isListening ? (listeningLabel || 'Aufnahme stoppen') : label}</span>}
      </button>
    </div>
  );
}