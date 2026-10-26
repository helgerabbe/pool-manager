import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Layers, Clock, RefreshCw } from 'lucide-react';
import useStundenbaukasten from '@/hooks/useStundenbaukasten';
import { neuerBaustein, summeMinuten, ueberfuehren, kiStunde, alsPhase, amEinschubTeilen } from '@/lib/stundenbaukasten';
import { vorschlagen, fuellen, mitVorlage } from '@/lib/kiBaukasten';
import { folieAusWunsch } from '@/lib/kiStundenbau';
import AblaufZeitleiste from '@/components/baukasten/AblaufZeitleiste';
import BausteinPalette from '@/components/baukasten/BausteinPalette';
import FundamentPanel from '@/components/baukasten/FundamentPanel';
import AssistentLeiste from '@/components/baukasten/AssistentLeiste';
import VorschlagsBereich from '@/components/baukasten/VorschlagsBereich';
import BausteinDetail from '@/components/baukasten/BausteinDetail';
import AltinhalteHinweis from '@/components/baukasten/AltinhalteHinweis';
import FolienDesignerDialog from '@/components/baukasten/FolienDesignerDialog';
import UnterrichtStartenButton from '@/components/baukasten/UnterrichtStartenButton';
import StundenTitelFeld from '@/components/baukasten/StundenTitelFeld';

/** Stundenbaukasten: Fundament + vertikaler Ablauf aus Methoden, Inhaltsfolien und Übungen. */
export default function StundenbauAssistent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stunde, bk, einheitTitel, aendern } = useStundenbaukasten(id);
  const [fundOffen, setFundOffen] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);
  const [ersetzen, setErsetzen] = React.useState(false);
  const [design, setDesign] = React.useState(null);
  if (!stunde) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const kopf = { einheit: stunde.fach, thema: einheitTitel };
  const bausteine = bk.bausteine || [];
  const mitLaden = async (fn) => { setLaedt(true); try { await fn(); } catch { toast.error('Der Assistent hat nicht geantwortet. Bitte noch einmal versuchen.'); } finally { setLaedt(false); } };
  const setzeBaustein = (b) => aendern({ bausteine: bausteine.map((x) => (x.id === b.id ? b : x)) });
  const hinzu = async (art, daten) => aendern({ bausteine: [...bausteine, ...amEinschubTeilen(await mitVorlage(neuerBaustein(art, daten), stunde.fach))] });
  const zurueck = () => (detail ? setDetail(null) : navigate(-1));
  const vorschlag = (wunsch) => mitLaden(async () => { setErsetzen(!wunsch && !bausteine.length ? false : !wunsch); await aendern({ vorschlaege: await vorschlagen(stunde, bk, wunsch) }); });
  const entscheiden = (vid, ja) => {
    const v = bk.vorschlaege.find((x) => x.id === vid);
    aendern({ vorschlaege: bk.vorschlaege.filter((x) => x.id !== vid), ...(ja ? { bausteine: [...bausteine, v] } : {}) });
  };
  const alle = (ja) => aendern({ vorschlaege: [], ...(ja ? { bausteine: ersetzen ? bk.vorschlaege : [...bausteine, ...bk.vorschlaege] } : {}) });
  const offenB = bausteine.find((b) => b.id === detail?.id);
  const designB = bausteine.find((b) => b.id === design?.bid);

  return (
    <div className="flex h-full">
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/90 px-8 py-4 backdrop-blur">
          <button onClick={zurueck} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Stundenbau · {stunde.fach}</p>
            <StundenTitelFeld stunde={stunde} />
            {bk.fundament.thema && bk.fundament.thema !== stunde.arbeitstitel && <p className="truncate text-xs text-muted-foreground" title={bk.fundament.thema}>{bk.fundament.thema}</p>}
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground" title="Grober Richtwert aus den Bausteinen">
            <Clock className="h-3 w-3" /> geschätzt ca. {summeMinuten(bausteine)} Min.
          </span>
          <Button variant="outline" size="sm" onClick={() => setFundOffen(true)}><Layers className="h-4 w-4" /> Fundament</Button>
          <UnterrichtStartenButton stunde={stunde} />
        </header>
        <div className="mx-auto max-w-5xl space-y-5 px-8 py-6">
          {offenB ? (
            <BausteinDetail b={offenB} kopf={kopf} startFolie={detail.folie} laedt={laedt} onAendern={setzeBaustein} onFertig={() => setDetail(null)}
              onFuellen={() => mitLaden(async () => setzeBaustein(await fuellen(stunde, bk, offenB)))}
              onEinfuegen={async (pos, art, wunsch) => { const f = await folieAusWunsch(kiStunde(stunde, bk), alsPhase(offenB), art, wunsch, offenB.folien); const l = [...offenB.folien]; l.splice(pos, 0, f); setzeBaustein({ ...offenB, folien: l }); }} />
          ) : (
            <>
              <AssistentLeiste laedt={laedt} leer={!bausteine.length} onVorschlag={vorschlag} />
              <VorschlagsBereich vorschlaege={bk.vorschlaege} kopf={kopf} onEntscheiden={entscheiden} onAlle={alle} ersetzen={ersetzen} onErsetzen={setErsetzen} />
              <AltinhalteHinweis offen={bk.offen}
                onUebernehmen={(i) => aendern({ bausteine: [...bausteine, neuerBaustein('inhalt', { titel: bk.offen[i].titel, folien: bk.offen[i].folien })], offen: bk.offen.filter((_, j) => j !== i) })}
                onVerwerfen={(i) => aendern({ offen: bk.offen.filter((_, j) => j !== i) })} />
              <AblaufZeitleiste bausteine={bausteine} kopf={kopf} onReihenfolge={(l) => aendern({ bausteine: l })}
                onOeffnen={(bid, folie) => setDetail({ id: bid, folie })} onEntfernen={(bid) => aendern({ bausteine: bausteine.filter((b) => b.id !== bid) })}
                onFolieHinzu={(b, f) => setzeBaustein({ ...b, folien: [...b.folien, f] })}
                onFolien={(b, folien) => setzeBaustein({ ...b, folien })}
                onBearbeiten={(b, i) => setDesign({ bid: b.id, i })} onPhase={(b, phase) => setzeBaustein({ ...b, phase })} onTitel={(b, titel) => setzeBaustein({ ...b, titel })} />
              {stunde.planer_stand?.entwurf?.phasen?.length > 0 && (
                <button onClick={() => window.confirm('Ablauf und Fundament aus der Planung neu übernehmen? Der jetzige Ablauf wird ersetzt.') && aendern(ueberfuehren(stunde))}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className="h-3 w-3" /> Aus der Planung neu übernehmen</button>
              )}
            </>
          )}
        </div>
      </main>
      {!offenB && (
        <aside className="w-72 shrink-0 overflow-y-auto border-l bg-card/50 p-4">
          <p className="mb-4 font-display font-bold">Bausteine</p>
          <BausteinPalette fundament={bk.fundament} onHinzu={hinzu} />
        </aside>
      )}
      <FolienDesignerDialog folie={designB?.folien[design.i] || null} onAbbrechen={() => setDesign(null)}
        onOk={(f) => { setzeBaustein({ ...designB, folien: designB.folien.map((x, j) => (j === design.i ? f : x)) }); setDesign(null); }} />
      <FundamentPanel offen={fundOffen} onOffen={setFundOffen} fundament={bk.fundament} onAendern={(fundament) => aendern({ fundament })} />
    </div>
  );
}