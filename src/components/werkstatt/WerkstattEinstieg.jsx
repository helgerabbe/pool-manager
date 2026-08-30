import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FolderOpen, Lightbulb, ChevronDown, ChevronRight, Sparkles, Loader2, PenLine,
} from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import { MicOff, Inbox, Sparkles as SparklesIcon } from 'lucide-react';
import MaterialSammlung from '@/components/werkstatt/MaterialSammlung';
import useOffeneAufgabenIdeen from '@/hooks/useOffeneAufgabenIdeen';

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
  einheitId,
  onIdeeUebernehmen,
  onGeneratorOeffnen,
  materialien = [],
  onMaterialienChange,
  idee = '',
  onIdeeChange,
  onVorschlagen,
  onSelbstAnlegen,
  busy = false,
  disabled = false,
}) {
  // Beide Kästen starten zugeklappt: So sieht man auf einen Blick, dass es
  // zwei Wege gibt, statt sofort in einem Formular zu stehen.
  const [materialOffen, setMaterialOffen] = useState(false);
  const [ideeOffen, setIdeeOffen] = useState(false);

  // SpeechInputButton rendert NICHTS, wenn der Browser keine Aufnahme kann
  // (kein HTTPS, eingebettete Ansicht, fehlende Berechtigung). Ohne eigenen
  // Hinweis verschwaende der Mikrofonknopf dann kommentarlos und wirkte
  // kaputt — deshalb pruefen wir hier dieselbe Bedingung und sagen es.
  const spracheMoeglich = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  const hatIdee = !!idee.trim();
  const anzahl = materialien.length;

  // Bereits gesammelte Ideen dieser Einheit — sie sollen hier landen können,
  // statt in der Sammelbox liegen zu bleiben.
  const { ideen } = useOffeneAufgabenIdeen(einheitId, { enabled: !!einheitId });

  return (
    <div className="w-full max-w-4xl space-y-4 py-2">
      {/* Der Arbeitsauftrag — abgesetzt, damit klar ist, dass hier etwas von
          der Lehrkraft erwartet wird und nicht nur eine Erklärung steht. */}
      <div className="rounded-xl border-l-4 border-l-violet-500 border border-violet-200 bg-violet-50 px-4 py-3">
        <p className="text-sm text-violet-900 leading-relaxed">
          <span className="font-semibold">Legen Sie ab, was Sie schon haben, und erzählen Sie,
          was passieren soll.</span>{' '}
          Beides ist freiwillig — je mehr Sie mitgeben, desto genauer wird der Vorschlag.
        </p>
      </div>

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
            <p className="text-base font-bold text-slate-800">Material</p>
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
            <p className="text-base font-bold text-slate-800">Ihre Ideen</p>
            <p className="text-xs text-slate-500">
              {hatIdee ? `${idee.trim().length} Zeichen erfasst` : 'Aufsprechen oder tippen — was soll in der Aufgabe passieren?'}
            </p>
          </div>
        </button>
        {ideeOffen && (
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-3">
            {spracheMoeglich ? (
              <div className="space-y-2">
                <SpeechInputButton
                  value={idee}
                  onResult={onIdeeChange}
                  maxSeconds={90}
                  disabled={disabled}
                  label="Idee aufsprechen"
                  listeningLabel="Ich höre zu …"
                />
                <p className="text-xs text-slate-500 leading-relaxed">
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
            {ideen.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <Inbox className="w-3.5 h-3.5" />
                  {ideen.length === 1
                    ? 'Eine gesammelte Idee liegt bereit'
                    : `${ideen.length} gesammelte Ideen liegen bereit`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ideen.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onIdeeUebernehmen?.(i)}
                      title={i.beschreibung || undefined}
                      className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {i.titel}
                      {i.material_urls?.length > 0 && (
                        <span className="ml-1 text-[10px] text-amber-700">
                          +{i.material_urls.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800">
                  Übernehmen füllt das Feld unten und legt mitgebrachtes Material ab. In der
                  Sammelbox bleibt die Idee stehen, bis Sie sie dort abhaken.
                </p>
              </div>
            )}

            <Textarea
              value={idee}
              onChange={(e) => onIdeeChange(e.target.value)}
              placeholder="z. B. „Die Schüler sollen erkennen, woran man eine Kurzgeschichte erkennt. Erst den Text lesen, dann die Merkmale sammeln, am Ende selbst prüfen, ob ein zweiter Text eine Kurzgeschichte ist.“"
              className="min-h-[130px] text-sm"
              disabled={disabled}
            />

            {/* Der Fall „ich muss eine Aufgabe machen und habe noch gar
                nichts". Der Generator ist ein Werkzeug, kein eigener Weg —
                er füllt dieses Feld oder parkt für später. */}
            {onGeneratorOeffnen && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-600 flex-1 min-w-[200px]">
                  Noch keine Idee? Lassen Sie sich welche vorschlagen — passend zum Themenfeld.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={onGeneratorOeffnen}
                  disabled={disabled}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Ideen vorschlagen lassen
                </Button>
              </div>
            )}
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
