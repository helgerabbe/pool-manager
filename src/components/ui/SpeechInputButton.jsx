/**
 * SpeechInputButton.jsx
 *
 * Robuste Mikrofon-Aufnahme mit Base44-Transkription.
 * Aufnahme endet nur durch Nutzer-Stop oder maxSeconds-Hard-Cap.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadFile, transcribeAudio } from '@/services/schueler/SchuelerDataService';

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickIntervalRef = useRef(null);
  const hardStopTimeoutRef = useRef(null);
  const stoppedByUnmountRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

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

  const cleanupStream = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const appendTranscript = (transcript) => {
    const clean = String(transcript || '').trim();
    if (!clean) {
      toast.error('Es wurde kein Text erkannt. Bitte erneut versuchen und deutlich sprechen.');
      return;
    }

    const current = String(value || '').trim();
    onResult([current, clean].filter(Boolean).join(' '));
  };

  const transcribeRecording = async () => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    cleanupStream();

    if (stoppedByUnmountRef.current || chunks.length === 0) return;

    setIsTranscribing(true);
    try {
      const mimeType = recorderRef.current?.mimeType || 'audio/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const audioBlob = new Blob(chunks, { type: mimeType });
      const audioFile = new File([audioBlob], `spracheingabe-${Date.now()}.${extension}`, { type: mimeType });
      const { file_url } = await uploadFile(audioFile);
      const transcript = await transcribeAudio(file_url);
      appendTranscript(transcript);
    } finally {
      setIsTranscribing(false);
      recorderRef.current = null;
    }
  };

  const stopListening = () => {
    clearTimers();
    setIsListening(false);

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      cleanupStream();
    }
  };

  const startListening = async () => {
    if (!isSupported) {
      toast.error('Audioaufnahme wird von diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.');
      return;
    }

    chunksRef.current = [];
    stoppedByUnmountRef.current = false;
    setSecondsLeft(maxSeconds);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = transcribeRecording;

      recorder.start();
      setIsListening(true);

      tickIntervalRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);

      hardStopTimeoutRef.current = setTimeout(stopListening, maxSeconds * 1000);
    } catch (err) {
      cleanupStream();
      toast.error('Mikrofon konnte nicht gestartet werden. Bitte Berechtigung prüfen.');
    }
  };

  const handleToggle = () => {
    if (disabled || isTranscribing) return;
    if (isListening) stopListening();
    else startListening();
  };

  useEffect(() => {
    return () => {
      stoppedByUnmountRef.current = true;
      clearTimers();
      try {
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
      } catch {
        cleanupStream();
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {isListening && (
        <span className="text-[11px] font-mono font-semibold text-red-600 tabular-nums" aria-live="polite">
          {secondsLeft}s
        </span>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isTranscribing}
        title={isListening ? `Aufnahme stoppen (${secondsLeft}s übrig)` : 'Spracheingabe starten'}
        aria-label={isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
        aria-pressed={isListening}
        className={cn(
          'flex items-center justify-center transition-colors shrink-0',
          label ? 'h-9 px-3 rounded-md gap-2 text-sm font-medium' : 'w-7 h-7 rounded-full',
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400 ring-offset-1'
            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          (disabled || isTranscribing) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isTranscribing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-3.5 h-3.5" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
        {label && <span>{isTranscribing ? 'Wird erkannt…' : isListening ? (listeningLabel || 'Aufnahme stoppen') : label}</span>}
      </button>
    </div>
  );
}