import React, { useState } from 'react';
import { CheckCircle2, Eye, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AufgabePreviewModal from '@/components/allgemeineAufgaben/AufgabePreviewModal';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';

const VORSCHAU_STIL = 'gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:text-violet-900';

/** Aktions-Leiste eines Themenfeld-Platzes: Schüler-Vorschau und Freigabe aller Aufgaben des Platzes. */
export default function ThemenfeldPlatzAktionen({ aufgaben, vollstaendig, freigegeben, editierbar, bearbeitet }) {
  const [vorschau, setVorschau] = useState(null);
  const { setReleaseStatusAsync, isPending } = useSetReleaseStatus({ invalidateKeys: ['allgemeineAufgaben'] });

  const freigabeSetzen = async (release) => {
    for (const a of aufgaben) {
      if ((a.content_status === 'approved') === release) continue;
      const ok = await setReleaseStatusAsync({ targetType: 'allgemeine_aufgabe', targetId: a.id, release })
        .then(() => true, () => false);
      if (!ok) break;
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {aufgaben.length === 1 && (
        <Button variant="outline" size="sm" className={VORSCHAU_STIL} onClick={() => setVorschau(aufgaben[0])}>
          <Eye /> Vorschau
        </Button>
      )}
      {aufgaben.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={VORSCHAU_STIL}><Eye /> Vorschau</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {aufgaben.map((a, i) => (
              <DropdownMenuItem key={a.id} onClick={() => setVorschau(a)}>
                Aufgabe {i + 1}{a.titel ? `: ${a.titel}` : ''}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {editierbar && aufgaben.length > 0 && (freigegeben ? (
        <Button variant="outline" size="sm" onClick={() => freigabeSetzen(false)} disabled={isPending}
          className="gap-2 bg-green-50 border-green-400 text-green-800 hover:bg-green-100">
          {isPending ? <Loader2 className="animate-spin" /> : <Lock />} Freigabe zurücknehmen
        </Button>
      ) : (
        <Button size="sm" onClick={() => freigabeSetzen(true)} disabled={!vollstaendig || isPending || bearbeitet} className="gap-2"
          title={vollstaendig ? 'Alle Aufgaben dieses Platzes freigeben' : 'Freigeben geht erst, wenn alle Aufgaben vollständig sind.'}>
          {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Freigeben
        </Button>
      ))}
      <AufgabePreviewModal open={!!vorschau} onOpenChange={(o) => !o && setVorschau(null)} aufgabe={vorschau} />
    </div>
  );
}