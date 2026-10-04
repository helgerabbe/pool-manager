import React from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { useBibliothekEintraege, useVeroeffentlichen } from '@/hooks/useBibliothek';

/** Veröffentlicht eine Stunde/Übung in der Öffentlichen Bibliothek bzw. zieht sie zurück. */
export default function VeroeffentlichenButton({ art, quelle, unterrichtseinheit }) {
  const { authUser } = useRBAC();
  const { data: eintraege = [] } = useBibliothekEintraege();
  const mut = useVeroeffentlichen();
  const eintrag = eintraege.find((e) => e.quelle_id === quelle.id && e.veroeffentlicht_von === authUser?.email);

  return (
    <button
      type="button"
      disabled={mut.isPending}
      onClick={() => mut.mutate({ art, quelle, unterrichtseinheit, user: authUser, eintrag })}
      title={eintrag ? 'Veröffentlicht – klicken zum Zurückziehen' : 'In der Öffentlichen Bibliothek veröffentlichen'}
      className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${eintrag ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
      {eintrag ? 'Veröffentlicht' : 'Veröffentlichen'}
    </button>
  );
}