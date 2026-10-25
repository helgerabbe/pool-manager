import React from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Plus } from 'lucide-react';
import AufgabenListe from './FundamentAufgaben';

/** Das Stundenfundament: jederzeit öffnen und bearbeiten. Nur das Thema ist nötig. */
export default function FundamentPanel({ offen, onOffen, fundament, onAendern }) {
  const [f, setF] = React.useState(fundament);
  const [laedt, setLaedt] = React.useState(false);
  React.useEffect(() => { if (offen) setF(fundament); }, [offen]); // eslint-disable-line react-hooks/exhaustive-deps
  const setze = (k) => (w) => setF((x) => ({ ...x, [k]: w }));
  const hochladen = async (e) => {
    const datei = e.target.files?.[0]; if (!datei) return;
    setLaedt(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: datei }).finally(() => setLaedt(false));
    setze('materialien')([...(f.materialien || []), { file_uri, name: datei.name }]);
  };
  const speichern = () => { onAendern(f); onOffen(false); };
  return (
    <Sheet open={offen} onOpenChange={onOffen}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle className="font-display">Stundenfundament</SheetTitle></SheetHeader>
        <div className="mt-6 space-y-5">
          <label className="block space-y-1"><span className="text-xs font-semibold">Thema der Stunde *</span><Input value={f.thema} onChange={(e) => setze('thema')(e.target.value)} placeholder="z. B. Einführung des Satzes des Pythagoras" /></label>
          <label className="block space-y-1"><span className="text-xs font-semibold">Ziel <span className="font-normal text-muted-foreground">(optional)</span></span><Textarea rows={2} value={f.ziel} onChange={(e) => setze('ziel')(e.target.value)} placeholder="Am Ende der Stunde können die Schüler …" /></label>
          <AufgabenListe titel="Kernaufgaben" liste={f.kernaufgaben || []} onListe={setze('kernaufgaben')} />
          <AufgabenListe titel="Mögliche Teilaufgaben" liste={f.teilaufgaben || []} onListe={setze('teilaufgaben')} />
          <label className="block space-y-1"><span className="text-xs font-semibold">Didaktische Leitplanken <span className="font-normal text-muted-foreground">(optional)</span></span><Textarea rows={2} value={f.leitplanken} onChange={(e) => setze('leitplanken')(e.target.value)} placeholder="z. B. induktiv, viel Schüleraktivität, Partnerarbeit bevorzugt" /></label>
          <div className="space-y-2">
            <span className="text-xs font-semibold">Materialien</span>
            {(f.materialien || []).map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"><span className="flex-1 truncate">{m.name}</span>
                <button onClick={() => setze('materialien')(f.materialien.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button></div>
            ))}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">{laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Material hochladen<input type="file" className="hidden" onChange={hochladen} /></label>
          </div>
          <Button className="w-full" disabled={!f.thema?.trim()} onClick={speichern}><Plus className="hidden" />Fundament speichern</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}