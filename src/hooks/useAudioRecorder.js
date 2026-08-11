import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mikrofon-Aufnahme im Browser (MediaRecorder) mit harter Zeitbegrenzung.
 * Wird von der Aktivität „Sprechaufgabe" genutzt.
 *
 * @param {number} maxSekunden Aufnahme stoppt automatisch nach dieser Dauer.
 */
export default function useAudioRecorder(maxSekunden = 60) {
  const [aufnahmeLaeuft, setAufnahmeLaeuft] = useState(false);
  const [sekunden, setSekunden] = useState(0);
  const [blob, setBlob] = useState(null);
  const [fehler, setFehler] = useState('');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const urlRef = useRef('');

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stop = useCallback(() => {
    stopTimer();
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setAufnahmeLaeuft(false);
  }, []);

  const start = useCallback(async () => {
    setFehler('');
    setBlob(null);
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ''; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setBlob(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
      };
      recorderRef.current = rec;
      rec.start();
      setSekunden(0);
      setAufnahmeLaeuft(true);
      timerRef.current = setInterval(() => {
        setSekunden((prev) => {
          const next = prev + 1;
          if (next >= maxSekunden) stop();
          return next;
        });
      }, 1000);
    } catch {
      setFehler('Kein Zugriff auf das Mikrofon. Erlaube die Mikrofon-Nutzung in deinem Browser.');
    }
  }, [maxSekunden, stop]);

  const reset = useCallback(() => {
    setBlob(null);
    setSekunden(0);
    setFehler('');
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ''; }
  }, []);

  // Abspiel-URL für die fertige Aufnahme.
  const blobUrl = blob ? (urlRef.current = urlRef.current || URL.createObjectURL(blob)) : '';

  useEffect(() => () => {
    stopTimer();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return { aufnahmeLaeuft, sekunden, blob, blobUrl, fehler, start, stop, reset };
}