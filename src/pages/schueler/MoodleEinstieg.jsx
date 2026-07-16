import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { parseLtiToken, speichereLtiToken } from '@/lib/ltiSession';

/**
 * Landeseite für Schüler, die per Moodle-LTI-Launch ankommen (Etappe 2).
 * Wird OHNE Base44-Login gerendert (Bypass in App.jsx) — die Identität steckt
 * im signierten ?lti=-Token aus ltiLaunch und wird lokal gespeichert.
 * Danach springt die Seite automatisch in die verknüpfte Einheit (oder in
 * die Schüler-Übersicht, wenn die Aktivität keine Einheit angibt).
 */
export default function MoodleEinstieg() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('lti');
  const payload = token ? parseLtiToken(token) : null;
  const gueltig = Boolean(payload && payload.exp > Date.now());

  if (gueltig) {
    speichereLtiToken(token);
  }

  useEffect(() => {
    if (!gueltig) return;
    const ziel = payload.einheit ? `/lernen/einheit?id=${payload.einheit}` : '/lernen';
    // Kurze Pause, damit die Begrüßung sichtbar ist, dann Neuladen ohne
    // ?lti=-Parameter — App.jsx erkennt die gespeicherte Sitzung.
    const timer = setTimeout(() => window.location.replace(ziel), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm text-center space-y-4">
        {gueltig ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-slate-900">
              Hallo{payload.name ? ` ${payload.name}` : ''}!
            </h1>
            <p className="text-sm text-slate-600">
              Deine Anmeldung über Moodle hat geklappt. Du bist jetzt sicher mit der Lern-App verbunden.
            </p>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />
              {payload.einheit
                ? 'Deine Lerneinheit öffnet sich gleich automatisch …'
                : 'Deine Lernübersicht öffnet sich gleich automatisch …'}
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900">Anmeldung nicht möglich</h1>
            <p className="text-sm text-slate-600">
              Dein Zugangslink ist ungültig oder abgelaufen. Bitte gehe zurück zu Moodle und
              klicke dort erneut auf die Aufgabe.
            </p>
          </>
        )}
      </div>
    </div>
  );
}