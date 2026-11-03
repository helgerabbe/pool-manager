import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, BookOpen, Paperclip, Users, NotebookPen } from 'lucide-react';
import useEinheitWissen from '@/hooks/useEinheitWissen';
import FachinhaltPanel from './FachinhaltPanel';
import MaterialienPanel from './MaterialienPanel';
import LerngruppePanel from './LerngruppePanel';
import TagebuchPanel from './TagebuchPanel';

const REITER = [
  { k: 'fach', l: 'Fachinhalt', icon: BookOpen },
  { k: 'mat', l: 'Materialien', icon: Paperclip },
  { k: 'lg', l: 'Lerngruppe', icon: Users },
  { k: 'bisher', l: 'Einheit bisher', icon: NotebookPen },
];

/** Leiste: Was weiß die App zu dieser Einheit? */
export default function WissensLeiste({ einheitId }) {
  const [offen, setOffen] = React.useState(null);
  const { data, isLoading, refetch } = useEinheitWissen(einheitId);
  if (!einheitId) return null;
  const r = REITER.find((x) => x.k === offen);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Wissen</span>
      {REITER.map(({ k, l, icon: I }) => (
        <button key={k} onClick={() => setOffen(k)} className="flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs hover:bg-muted">
          <I className="h-3 w-3" />{l}{k === 'bisher' && data && ` (${data.tagebuch.length})`}
        </button>
      ))}
      <Sheet open={!!offen} onOpenChange={(o) => !o && setOffen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle className="font-display">{r?.l}</SheetTitle></SheetHeader>
          <div className="mt-5">
            {isLoading || !data ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                {offen === 'fach' && <FachinhaltPanel planung={data.planung} />}
                {offen === 'mat' && <MaterialienPanel planung={data.planung} fachregister={data.fachregister} />}
                {offen === 'lg' && <LerngruppePanel einheit={data.einheit} lerngruppe={data.lerngruppe} />}
                {offen === 'bisher' && <TagebuchPanel einheit={data.einheit} tagebuch={data.tagebuch} onNeu={refetch} />}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}