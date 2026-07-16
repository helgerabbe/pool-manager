import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Landeseite für Schüler, die per Moodle-LTI-Launch ankommen (Etappe 1).
 * Wird OHNE Base44-Login gerendert (Bypass in App.jsx) — die Identität steckt
 * im signierten ?lti=-Token aus ltiLaunch und wird lokal gespeichert.
 * Der direkte Einstieg in die Einheit folgt in Etappe 3.
 */
function parseToken(token) {
  try {
    const part = token.split('.')[0];
    const bytes = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    // UTF-8-Dekodierung (Namen mit Umlauten)
    const json = decodeURIComponent(
      bytes.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch (_e) {
    return null;
  }
}

export default function MoodleEinstieg() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('lti');
  const payload = token ? parseToken(token) : null;
  const gueltig = Boolean(payload && payload.exp > Date.now());

  if (gueltig) {
    localStorage.setItem('lti_session', token);
  }

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
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              Der direkte Einstieg in deine Lerneinheit wird gerade fertiggestellt und
              öffnet sich hier in Kürze automatisch.
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