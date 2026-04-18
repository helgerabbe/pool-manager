/**
 * SpeechInputButton.jsx
 *
 * Mikrofon-Button der das Web Speech API nutzt, um Sprache in Text umzuwandeln.
 * Hängt den erkannten Text an den bestehenden Wert an.
 *
 * Props:
 *   onResult(text) – wird mit dem neuen Gesamttext aufgerufen
 *   value          – aktueller Textwert (wird durch Sprache ergänzt)
 *   disabled       – deaktiviert den Button
 *   className      – optionale extra CSS-Klassen
 */
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SpeechInputButton({ onResult, value = '', disabled = false, className }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const handleToggle = () => {
    if (!isSupported) {
      toast.error('Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'aborted') {
        toast.error('Spracherkennung fehlgeschlagen: ' + e.error);
      }
    };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const separator = value.trim() ? ' ' : '';
      onResult(value + separator + transcript);
    };

    recognition.start();
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      title={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0',
        isListening
          ? 'bg-red-100 text-red-600 animate-pulse'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
    </button>
  );
}