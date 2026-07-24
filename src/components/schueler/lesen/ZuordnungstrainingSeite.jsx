import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, RotateCcw, XCircle, Play, Pause, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/** Fisher-Yates Shuffle. */
function mischen(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** field_values.training_pairs → normalisierte, gültige Paare mit stabilen IDs. */
function normalisierePaare(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((p, i) => ({
      id: `p-${i}`,
      typ: p?.left_typ || 'text',
      text: String(p?.left_text || ''),
      url: String(p?.left_url || ''),
      antwort: String(p?.right || '').trim(),
    }))
    .filter((p) => p.antwort && (p.typ === 'text' ? p.text.trim() : p.url));
}

/**
 * Baut die nächste Übungsrunde:
 *  - primär noch nicht gemeisterte Paare (gemischt),
 *  - aufgefüllt mit bereits gemeisterten, falls weniger offene übrig sind,
 *  - gelegentlich wird eine gemeisterte Zuordnung wieder eingemischt (Rotation).
 */
function baueRunde(paare, counts, schwelle, groesse) {
  const offen = mischen(paare.filter((p) => (counts[p.id] || 0) < schwelle));
  const gemeistert = mischen(paare.filter((p) => (counts[p.id] || 0) >= schwelle));
  const runde = offen.slice(0, groesse);
  let gIdx = 0;
  while (runde.length < Math.min(groesse, paare.length) && gIdx < gemeistert.length) {
    runde.push(gemeistert[gIdx++]);
  }
  // Wiederholungs-Rotation: ab und zu ein gemeistertes Paar wieder einmischen.
  if (offen.length > groesse && gemeistert.length > 0 && Math.random() < 0.34) {
    runde[runde.length - 1] = gemeistert[0];
  }
  return mischen(runde);
}

/** Kleiner Audio-Player für Audio-Paare (kein <button>, weil in klickbarer Zelle). */
function AudioAbspielen({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = (e) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.currentTime = 0;
      a.play().catch(() => {});
      setPlaying(true);
    }
  };
  return (
    <span className="inline-flex items-center gap-2" onClick={toggle}>
      <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 cursor-pointer">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </span>
      <span className="text-[11px] text-muted-foreground">Anhören</span>
      <audio ref={audioRef} src={url} preload="none" onEnded={() => setPlaying(false)} />
    </span>
  );
}

/**
 * Schüler-Aktivität „Zuordnungstraining" (repetitives Rotationsüben).
 *
 * Die Lehrkraft hinterlegt einen (großen) Satz Zuordnungspaare — links Text,
 * Bild oder Audio, rechts der zuzuordnende Begriff. Der Schüler übt in kleinen
 * Runden (Rundengröße konfigurierbar, Default 6): richtig zugeordnete Paare
 * sammeln Punkte; ein Paar gilt als „gemeistert", sobald es X-mal (Default 2)
 * richtig zugeordnet wurde. Falsche Paare wandern zurück in den Stapel,
 * gemeisterte werden gelegentlich wieder eingemischt. Sind ALLE Paare
 * gemeistert, ist die Übung bestanden („Erledigt").
 */
export default function ZuordnungstrainingSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const schwelle = Math.max(1, Number(fv.meister_schwelle) || 2);
  const paare = useMemo(() => normalisierePaare(fv.training_pairs), [fv.training_pairs]);
  const groesse = Math.max(2, Math.min(Number(fv.runden_groesse) || 6, Math.max(2, paare.length)));

  // counts: { [pairId]: Anzahl richtiger Zuordnungen }
  const [counts, setCounts] = useState({});
  const [runde, setRunde] = useState(() => baueRunde(paare, {}, schwelle, groesse));
  const [rundenNr, setRundenNr] = useState(1);
  const [zuordnung, setZuordnung] = useState({});
  const [aktiverBegriff, setAktiverBegriff] = useState(null);
  const [geprueft, setGeprueft] = useState(false);

  const antworten = useMemo(
    () => mischen(runde.map((p, i) => ({ id: `a-${i}`, text: p.antwort }))),
    [runde]
  );

  const belegteAntworten = useMemo(() => new Set(Object.values(zuordnung)), [zuordnung]);
  const gemeisterteAnzahl = paare.filter((p) => (counts[p.id] || 0) >= schwelle).length;
  // Bestehens-Quote: Lehrkraft legt fest, welcher Anteil der Paare sicher
  // gemeistert sein muss (100/90/80/70 %). Default: 100 % = alle Paare.
  const bestehenProzent = [100, 90, 80, 70].includes(Number(fv.bestehen_prozent)) ? Number(fv.bestehen_prozent) : 100;
  const zielAnzahl = Math.max(1, Math.ceil((paare.length * bestehenProzent) / 100));
  const bestanden = paare.length > 0 && gemeisterteAnzahl >= zielAnzahl;

  const waehleBegriff = (id) => {
    if (geprueft) return;
    setAktiverBegriff((cur) => (cur === id ? null : id));
  };

  const waehleAntwort = (text) => {
    if (geprueft || !aktiverBegriff) return;
    setZuordnung((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === text) delete next[k];
      next[aktiverBegriff] = text;
      return next;
    });
    setAktiverBegriff(null);
  };

  const alleZugeordnet = runde.length > 0 && runde.every((p) => zuordnung[p.id]);
  const richtigeInRunde = runde.filter((p) => zuordnung[p.id] === p.antwort).length;

  const pruefen = () => {
    const next = { ...counts };
    runde.forEach((p) => {
      if (zuordnung[p.id] === p.antwort) next[p.id] = (next[p.id] || 0) + 1;
    });
    setCounts(next);
    setGeprueft(true);
  };

  const naechsteRunde = () => {
    setRunde(baueRunde(paare, counts, schwelle, groesse));
    setRundenNr((n) => n + 1);
    setZuordnung({});
    setAktiverBegriff(null);
    setGeprueft(false);
  };

  const statusFor = (p) => {
    if (!geprueft) return 'neutral';
    return zuordnung[p.id] === p.antwort ? 'richtig' : 'falsch';
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {/* Aufgabenstellung */}
      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.instruction || 'Ordne in jeder Runde die Begriffe richtig zu – so lange, bis du alle sicher beherrschst.'}
      </AufgabenstellungBox>

      {/* Fortschritt: gemeisterte Paare + Rundenzähler */}
      {paare.length > 0 && (
        <div className="mb-3 shrink-0">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
            <span>
              Gemeistert: <span className="text-foreground font-semibold">{gemeisterteAnzahl} / {paare.length}</span>
              {zielAnzahl < paare.length && <span className="ml-1">(Ziel: {zielAnzahl})</span>}
            </span>
            <span>Runde {rundenNr}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${paare.length ? Math.round((gemeisterteAnzahl / paare.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Zuordnungs-Bereich */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {paare.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Für dieses Zuordnungstraining sind noch keine Paare hinterlegt.
          </p>
        ) : bestanden && geprueft ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
            <span className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-emerald-600" />
            </span>
            <p className="text-base font-bold text-emerald-700">
              {gemeisterteAnzahl === paare.length
                ? `Alle ${paare.length} Zuordnungen gemeistert! 🎉`
                : `Ziel erreicht: ${gemeisterteAnzahl} von ${paare.length} Zuordnungen gemeistert! 🎉`}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Du hast genug Paare {schwelle > 1 ? `${schwelle}-mal ` : ''}richtig zugeordnet. Die Übung ist bestanden.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 content-start">
            {/* Linke Spalte: Begriffe (Text / Bild / Audio) */}
            <div className="space-y-1.5">
              {runde.map((p) => {
                const status = statusFor(p);
                const aktiv = aktiverBegriff === p.id;
                const zugeordnet = zuordnung[p.id];
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => waehleBegriff(p.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') waehleBegriff(p.id); }}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-2.5 py-1.5 transition-colors flex flex-col gap-1',
                      geprueft ? 'cursor-default' : 'cursor-pointer',
                      status === 'neutral' && (aktiv ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'),
                      status === 'richtig' && 'border-emerald-300 bg-emerald-50',
                      status === 'falsch' && 'border-rose-300 bg-rose-50'
                    )}
                  >
                    {p.typ === 'bild' && (
                      <img src={p.url} alt="" className="w-full max-h-24 object-contain rounded" />
                    )}
                    {p.typ === 'audio' && <AudioAbspielen url={p.url} />}
                    {p.typ === 'text' && (
                      <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{p.text}</span>
                    )}
                    {zugeordnet && (
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-medium leading-tight',
                        status === 'falsch' ? 'text-rose-600' : status === 'richtig' ? 'text-emerald-700' : 'text-primary'
                      )}>
                        {status === 'richtig' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        {status === 'falsch' && <XCircle className="w-3 h-3 shrink-0" />}
                        → {zugeordnet}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rechte Spalte: Antworten */}
            <div className="space-y-1.5">
              {antworten.map((a) => {
                const belegt = belegteAntworten.has(a.text);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => waehleAntwort(a.text)}
                    disabled={geprueft || !aktiverBegriff}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-2.5 py-1.5 text-xs sm:text-sm text-foreground leading-tight transition-colors',
                      belegt ? 'border-border bg-muted/60 text-muted-foreground' : 'border-border bg-card',
                      !geprueft && aktiverBegriff && 'hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    {a.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback nach dem Prüfen */}
        {geprueft && !bestanden && (
          <div className={cn(
            'mt-4 rounded-xl px-4 py-3 text-sm font-medium text-center',
            richtigeInRunde === runde.length
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          )}>
            {richtigeInRunde === runde.length
              ? 'Super! Alle richtig zugeordnet – weiter zur nächsten Runde. 🎉'
              : `${richtigeInRunde} von ${runde.length} richtig – die falschen kommen zurück in den Stapel und tauchen wieder auf.`}
          </div>
        )}
      </div>

      {/* Aktionen */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {!geprueft ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={!alleZugeordnet || paare.length === 0}
            onClick={pruefen}
          >
            <CheckCircle2 className="w-4 h-4" /> Prüfen
          </Button>
        ) : bestanden ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : (
          <Button className="gap-2" onClick={naechsteRunde}>
            <RotateCcw className="w-4 h-4" /> Nächste Runde
          </Button>
        )}
      </div>
    </div>
  );
}