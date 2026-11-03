import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Sparkles, Globe } from 'lucide-react';
import { toast } from 'sonner';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import { fachinhaltEinordnen } from '@/lib/kiFachinhalt';

/** Eingang: Text/Sprache und Links in den Fachinhalt werfen, dann ausdrücklich einordnen lassen. */
export default function FachinhaltEingang({ einheit, planung, quellen, onNeu }) {
  const [text, setText] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [laedt, setLaedt] = React.useState(null);
  const offen = quellen.filter((q) => !q.eingeordnet).length;

  const ablegen = async () => {
    setLaedt('ablegen');
    try {
      const me = await base44.auth.me();
      const basis = { unterrichtseinheit_id: einheit.id, besitzer_email: me.email };
      const neu = [];
      if (text.trim()) neu.push({ ...basis, art: 'text', inhalt: text.trim() });
      if (url.trim()) neu.push({ ...basis, art: 'link', url: url.trim() });
      await base44.entities.FachinhaltQuelle.bulkCreate(neu);
      setText(''); setUrl(''); onNeu();
    } finally { setLaedt(null); }
  };
  const einordnen = async (recherche) => {
    setLaedt(recherche ? 'recherche' : 'einordnen');
    try { await fachinhaltEinordnen({ einheit, planung, quellen, recherche }); toast.success('Fachinhalt aktualisiert.'); onNeu(); }
    catch { toast.error('Das Einordnen hat nicht geklappt. Bitte noch einmal versuchen.'); }
    finally { setLaedt(null); }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="font-semibold">Wissen hineinwerfen</p>
      <FreitextMitSprache rows={5} value={text} onChange={setText} placeholder="Text einfügen oder einsprechen: alles, was du zum Thema weißt oder gefunden hast." />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link zu einer interessanten Seite (optional)" />
      <Button variant="outline" className="w-full" onClick={ablegen} disabled={(!text.trim() && !url.trim()) || !!laedt}>
        {laedt === 'ablegen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ablegen
      </Button>
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">{offen} noch nicht eingeordnete Quelle{offen === 1 ? '' : 'n'}. Bestehender Fachinhalt wird ergänzt, nicht ersetzt.</p>
        <Button className="w-full" onClick={() => einordnen(false)} disabled={!!laedt}>
          {laedt === 'einordnen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} In den Fachinhalt einordnen
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => einordnen(true)} disabled={!!laedt}>
          {laedt === 'recherche' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Mit Internetrecherche erweitern
        </Button>
        {laedt && laedt !== 'ablegen' && <p className="text-xs text-muted-foreground">Das kann ein bis zwei Minuten dauern …</p>}
      </div>
    </div>
  );
}