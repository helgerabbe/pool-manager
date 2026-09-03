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
import { ArrowRight, Check, RotateCcw, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRUEF_SCHWERE, getKategorieLabel } from '@/lib/pruefungKategorien';

const BEWUSST_PLACEHOLDER =
  'Warum bleibt das so? Die Begründung wird an die MBK weitergegeben.';

export default function PruefbefundKarte({ befund, ziel, kannBewusstSetzen, onEntscheiden }) {
  const [kommentarOffen, setKommentarOffen] = useState(false);
  const [kommentar, setKommentar] = useState(befund.kommentar || '');
  const schwere = PRUEF_SCHWERE[befund.schwere] || PRUEF_SCHWERE.hinweis;
  const erledigt = befund.entscheidung !== 'offen';

  return (
    <div className={cn('rounded-lg border p-3 space-y-2', erledigt ? 'bg-muted/40 border-border' : 'bg-card border-border')}>
      <div className="flex items-start gap-2 flex-wrap">
        <Badge variant="outline" className={schwere.cls}>{schwere.label}</Badge>
        <Badge variant="outline" className="bg-slate-50">{befund.kategorie}. {getKategorieLabel(befund.kategorie)}</Badge>
        <span className="text-sm font-semibold flex-1 min-w-0">{befund.ziel_titel || 'Unbenannte Stelle'}</span>
        {befund.entscheidung === 'behoben' && <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">Behoben</Badge>}
        {befund.entscheidung === 'bewusst' && <Badge className="bg-violet-100 text-violet-800 border-violet-300" variant="outline">Bewusst gelassen</Badge>}
        {befund.erneut_gefunden && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Erneut gefunden</Badge>}
      </div>

      <p className="text-sm text-foreground">{befund.befund}</p>
      {befund.vorschlag && <p className="text-xs text-muted-foreground">→ {befund.vorschlag}</p>}
      {befund.entscheidung === 'bewusst' && befund.kommentar && (
        <p className="text-xs text-violet-800">Begründung: {befund.kommentar}</p>
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
            <Button size="sm" onClick={() => onEntscheiden({ befundId: befund.id, entscheidung: 'behoben' })}>
              <Check className="w-3.5 h-3.5" /> Behoben
            </Button>
            {kannBewusstSetzen && (
              <Button size="sm" variant="outline" onClick={() => setKommentarOffen((v) => !v)}>
                <ShieldAlert className="w-3.5 h-3.5" /> Bewusst so lassen
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onEntscheiden({ befundId: befund.id, entscheidung: 'offen' })}>
            <RotateCcw className="w-3.5 h-3.5" /> Wieder öffnen
          </Button>
        )}
      </div>

      {kommentarOffen && befund.entscheidung === 'offen' && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            placeholder={BEWUSST_PLACEHOLDER}
            className="text-sm"
          />
          <Button
            size="sm"
            disabled={!kommentar.trim()}
            onClick={() => {
              onEntscheiden({ befundId: befund.id, entscheidung: 'bewusst', kommentar: kommentar.trim() });
              setKommentarOffen(false);
            }}
          >
            Bewusst gelassen speichern
          </Button>
        </div>
      )}
    </div>
  );
}