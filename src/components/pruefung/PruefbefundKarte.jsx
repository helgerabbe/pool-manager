/**
 * PruefbefundKarte — EIN Befund in der Taskliste des Prüfbereichs.
 *
 * Zeigt Kategorie, Schwere, Befundtext und Vorschlag; verlinkt an die Stelle,
 * an der die Lehrkraft sie behebt. Bei Befunden zu den vorab per KI erzeugten
 * Seiten (ziel_typ='systembaustein') liegt dieser Ort NICHT in einem
 * Aufgaben-Reiter, sondern im Export-Center — dorthin wird verlinkt.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Check, RotateCcw, ShieldAlert, MessageSquareWarning, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRUEF_SCHWERE, getKategorieLabel, MBK_QUELLE } from '@/lib/pruefungKategorien';
import InternenInhaltErzeugenButton from './InternenInhaltErzeugenButton';
import InhaltGesichtetButton from './InhaltGesichtetButton';
import MbkAbweichungBanner from './MbkAbweichungBanner';
import VorschlagBlock from './VorschlagBlock';

const BEWUSST_PLACEHOLDER =
  'Warum soll das so bleiben? Ein Satz reicht – das Moodle-Team liest ihn und meldet den Punkt dann nicht noch einmal.';
const WIDERSPRUCH_PLACEHOLDER =
  'Warum trifft der Hinweis nicht zu? Deine Begründung geht an das Moodle-Team, das darauf antwortet.';

export default function PruefbefundKarte({ befund, ziel, einheitId, kannBewusstSetzen, onEntscheiden }) {
  // null | 'bewusst' | 'widerspruch' — welche begründete Entscheidung gerade
  // geschrieben wird. Beide nutzen dasselbe Textfeld.
  const [kommentarModus, setKommentarModus] = useState(null);
  const [kommentar, setKommentar] = useState(befund.kommentar || '');
  const schwere = PRUEF_SCHWERE[befund.schwere] || PRUEF_SCHWERE.hinweis;
  const erledigt = befund.entscheidung !== 'offen';
  // Vorab erzeugbarer KI-Inhalt: direkt hier erzeugbar (Onboarding-Elemente
  // entstehen dagegen über die Vorschau im Reiter „Arbeitspläne").
  // Ungesichteter KI-Text: `sicht::<snapshotId>` — hier wird bestätigt, nicht erzeugt.
  const sichtungsZiel = befund.ziel_typ === 'systembaustein'
    && String(befund.ziel_id || '').startsWith('sicht::')
    ? String(befund.ziel_id).slice('sicht::'.length)
    : null;
  const direktErzeugbar = befund.ziel_typ === 'systembaustein'
    && !sichtungsZiel
    && !String(befund.ziel_id || '').startsWith('onboarding::');

  return (
    <div className={cn('rounded-lg border p-3 space-y-2', erledigt ? 'bg-muted/40 border-border' : 'bg-card border-border')}>
      <div className="flex items-start gap-2 flex-wrap">
        <Badge variant="outline" className={schwere.cls}>{schwere.label}</Badge>
        <Badge variant="outline" className="bg-slate-50">{befund.kategorie}. {getKategorieLabel(befund.kategorie)}</Badge>
        <span className="text-sm font-semibold flex-1 min-w-0">{befund.ziel_titel || 'Unbenannte Stelle'}</span>
        {befund.entscheidung === 'behoben' && <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">Erledigt</Badge>}
        {befund.entscheidung === 'bewusst' && <Badge className="bg-violet-100 text-violet-800 border-violet-300" variant="outline">Bleibt so</Badge>}
        {befund.entscheidung === 'widerspruch' && <Badge className="bg-orange-100 text-orange-800 border-orange-300" variant="outline">Widerspruch</Badge>}
        {befund.erneut_gefunden && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Wieder aufgetaucht</Badge>}
        {befund.mbk_quelle === 'sichtung' && (
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
            {MBK_QUELLE.sichtung.label}
          </Badge>
        )}
      </div>

      {befund.fundort && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{befund.fundort}</span>
        </p>
      )}

      <MbkAbweichungBanner befund={befund} />

      <p className="text-sm text-foreground">{befund.befund}</p>
      <VorschlagBlock
        vorschlag={befund.vorschlag}
        istEinfuegetext={befund.mbk_quelle === 'sichtung'}
      />
      {(befund.entscheidung === 'bewusst' || befund.entscheidung === 'widerspruch') && befund.kommentar && (
        <p className="text-xs text-violet-800">Begründung: {befund.kommentar}</p>
      )}
      {erledigt && befund.quelle === 'mbk' && (
        <p className="text-xs text-muted-foreground">
          {befund.antwort_gesendet_am
            ? 'An das Moodle-Team zurückgemeldet.'
            : 'Noch nicht zurückgemeldet – geht mit dem nächsten „Eingearbeitet, bitte neu bauen" raus.'}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        {ziel?.href && (
          <Button asChild size="sm" variant="outline">
            <Link to={ziel.href}>
              {ziel.label} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        )}
        {befund.entscheidung === 'offen' ? (
          <>
            {sichtungsZiel && (
              <InhaltGesichtetButton
                snapshotId={sichtungsZiel}
                onGesichtet={() => onEntscheiden({ befundId: befund.id, entscheidung: 'behoben' })}
              />
            )}
            {direktErzeugbar && (
              <InternenInhaltErzeugenButton
                einheitId={einheitId}
                zielId={befund.ziel_id}
                onErzeugt={() => onEntscheiden({ befundId: befund.id, entscheidung: 'behoben' })}
              />
            )}
            <Button size="sm" variant={direktErzeugbar || sichtungsZiel ? 'outline' : 'default'} onClick={() => onEntscheiden({ befundId: befund.id, entscheidung: 'behoben' })}>
              <Check className="w-3.5 h-3.5" /> Erledigt
            </Button>
            {kannBewusstSetzen && (
              <Button size="sm" variant="outline" onClick={() => setKommentarModus((v) => (v === 'bewusst' ? null : 'bewusst'))}>
                <ShieldAlert className="w-3.5 h-3.5" /> Soll so bleiben
              </Button>
            )}
            {befund.quelle === 'mbk' && (
              <Button size="sm" variant="outline" onClick={() => setKommentarModus((v) => (v === 'widerspruch' ? null : 'widerspruch'))}>
                <MessageSquareWarning className="w-3.5 h-3.5" /> Sehe ich anders
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onEntscheiden({ befundId: befund.id, entscheidung: 'offen' })}>
            <RotateCcw className="w-3.5 h-3.5" /> Wieder öffnen
          </Button>
        )}
      </div>

      {kommentarModus && befund.entscheidung === 'offen' && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            placeholder={kommentarModus === 'widerspruch' ? WIDERSPRUCH_PLACEHOLDER : BEWUSST_PLACEHOLDER}
            className="text-sm"
          />
          <Button
            size="sm"
            disabled={!kommentar.trim()}
            onClick={() => {
              onEntscheiden({ befundId: befund.id, entscheidung: kommentarModus, kommentar: kommentar.trim() });
              setKommentarModus(null);
            }}
          >
            Begründung speichern
          </Button>
        </div>
      )}
    </div>
  );
}