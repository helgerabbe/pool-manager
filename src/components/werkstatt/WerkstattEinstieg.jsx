import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FolderOpen, Lightbulb, ChevronDown, ChevronRight, Sparkles, Loader2, PenLine,
} from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import { MicOff } from 'lucide-react';
import MaterialSammlung from '@/components/werkstatt/MaterialSammlung';

/**
 * WerkstattEinstieg
 * ─────────────────
 * Die erste Ebene der Aufgabenwerkstatt: Material ablegen, Idee erzählen.
 *
 * Warum eine eigene Ansicht statt einer Spalte: Solange es keine Schritte
 * gibt, hat die Lehrkraft genau zwei Dinge zu tun. Ein dreispaltiges Fenster
 * mit drei leeren Spalten ist dafür der falsche Rahmen — es sieht aus, als
 * fehle etwas, statt zu sagen, was jetzt dran ist.
 *
 * Beide Kästen dürfen leer bleiben. Wer nichts hat und nichts erzählen will,
 * nimmt den Nebenweg und legt die Folge selbst an.
 *
 * Die Idee lässt sich aufsprechen (90 Sekunden). Das ist kein Beiwerk: Eine
 * Lehrkraft erzählt in anderthalb Minuten mehr über ihre Aufgabe, als sie in
 * derselben Zeit tippt — und der Assistent braucht genau diese Beschreibung.
 */
export default function WerkstattEinstieg({
  materialien = [],
  onMaterialienChange,
  idee = '',
  onIdeeChange,
  onVorschlagen,
  onSelbstAnlegen,
  busy = false,
  disabled = false,
}) {
  const [materialOffen, setMaterialOffen] = useState(true);
  const [ideeOffen, setIdeeOffen] = useState(true);

  // SpeechInputButton rendert NICHTS, wenn der Browser keine Aufnahme kann
  // (kein HTTPS, eingebettete Ansicht, fehlende Berechtigung). Ohne eigenen
  // Hinweis verschwaende der Mikrofonknopf dann kommentarlos und wirkte
  // kaputt — deshalb pruefen wir hier dieselbe Bedingung und sagen es.
  const spracheMoeglich = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  const hatIdee = !!idee.trim();
  const anzahl = materialien.length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 py-2">
      <p className="text-sm text-slate-600 leading-relaxed">
        Legen Sie ab, was Sie schon haben, und erzählen Sie, was passieren soll. Beides ist
        freiwillig — je mehr Sie mitgeben, desto genauer wird der Vorschlag.
      </p>

      {/* ── Material ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setMaterialOffen((o) => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        >
          {materialOffen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <FolderOpen className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">Material</p>
            <p className="text-xs text-slate-500">
              {anzahl === 0
                ? 'Foto einer Buchseite, PDF, Link, eingefügter Text — oder nichts'
                : `${anzahl} ${anzahl === 1 ? 'Material' : 'Materialien'} abgelegt`}
            </p>
          </div>
        </button>
        {materialOffen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            <MaterialSammlung
              materialien={materialien}
              onChange={onMaterialienChange}
              disabled={disabled}
            />
          </div>
        )}
      </section>

      {/* ── Idee ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setIdeeOffen((o) => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        >
          {ideeOffen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <Lightbulb className="w-5 h-5 text-violet-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">Ihre Idee</p>
            <p className="text-xs text-slate-500">
              {hatIdee ? `${idee.trim().length} Zeichen` : 'Aufsprechen oder tippen — was soll in der Aufgabe passieren?'}
            </p>
          </div>
        </button>
        {ideeOffen && (
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-3">
            {spracheMoeglich ? (
              <div className="flex items-start gap-2">
                <SpeechInputButton
                  value={idee}
                  onResult={onIdeeChange}
                  maxSeconds={90}
                  disabled={disabled}
                  label="Idee aufsprechen"
                  listeningLabel="Ich höre zu …"
                />
                <p className="text-xs text-slate-500 leading-relaxed pt-1.5">
                  Bis zu 90 Sekunden. Erzählen Sie einfach, als würden Sie es einer Kollegin
                  erklären — das Gesprochene landet danach im Feld und lässt sich dort noch ändern.
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <MicOff className="w-4 h-4 shrink-0 mt-0.5" />
                Aufsprechen geht auf diesem Gerät gerade nicht — dafür braucht der Browser eine
                gesicherte Verbindung und die Erlaubnis, das Mikrofon zu benutzen. Tippen
                funktioniert genauso gut.
              </p>
            )}
            <Textarea
              value={idee}
              onChange={(e) => onIdeeChange(e.target.value)}
              placeholder="z. B. „Die Schüler sollen erkennen, woran man eine Kurzgeschichte erkennt. Erst den Text lesen, dann die Merkmale sammeln, am Ende selbst prüfen, ob ein zweiter Text eine Kurzgeschichte ist.“"
              className="min-h-[130px] text-sm"
              disabled={disabled}
            />
          </div>
        )}
      </section>

      {/* ── Weiter ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 space-y-3">
        <p className="text-sm text-violet-900 leading-relaxed">
          <span className="font-semibold">Als Nächstes schlägt der Assistent einen Ablauf vor.</span>{' '}
          Er entscheidet, aus welchen Schritten die Aufgabe bestehen soll und welcher Typ zu jedem
          Schritt passt — gebaut wird dabei noch nichts. Danach ändern Sie den Ablauf, so lange Sie
          wollen.
        </p>
        {anzahl > 0 && (
          <p className="text-xs text-violet-800">
            Bilder und PDFs schaut der Assistent sich an — bis zu vier Dateien, jeweils höchstens
            4 MB. Größere und andere Dateitypen kennt er nur mit Bezeichnung; Links folgt er nicht.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onVorschlagen} disabled={busy || disabled} className="gap-2">
            {busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Der Ablauf entsteht …</>
              : <><Sparkles className="w-4 h-4" /> Weiter — Ablauf vorschlagen</>}
          </Button>
          <Button variant="ghost" onClick={onSelbstAnlegen} disabled={busy || disabled} className="gap-2 text-slate-600">
            <PenLine className="w-4 h-4" /> Folge selbst anlegen
          </Button>
        </div>
        {!hatIdee && anzahl === 0 && (
          <p className="text-xs text-violet-800">
            Ohne Idee und ohne Material kann der Assistent wenig ausrichten — dann ist „Folge selbst
            anlegen“ der schnellere Weg.
          </p>
        )}
      </div>
    </div>
  );
}
