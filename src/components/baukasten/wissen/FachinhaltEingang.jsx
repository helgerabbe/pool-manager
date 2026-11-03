import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Sparkles, Globe } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Wissen hinzufügen (Text, Sprache, Link) und ausdrücklich einordnen lassen. */
export default function FachinhaltEingang({ einheit, quellen, laedt, onEinordnen, onNeu }) {
  const [text, setText] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [speichert, setSpeichert] = React.useState(false);
  const [fokus, setFokus] = React.useState('');
  const offen = quellen.filter((q) => !q.eingeordnet).length;

  const hinzufuegen = async () => {
    setSpeichert(true);
    try {
      const me = await base44.auth.me();
      const basis = { unterrichtseinheit_id: einheit.id, besitzer_email: me.email };
      const neu = [];
      if (text.trim()) neu.push({ ...basis, art: 'text', inhalt: text.trim() });
      if (url.trim()) neu.push({ ...basis, art: 'link', url: url.trim() });
      await base44.entities.FachinhaltQuelle.bulkCreate(neu);
      setText(''); setUrl(''); onNeu();
    } finally { setSpeichert(false); }
  };

  return (
    <div className="h-fit space-y-3 rounded-xl border bg-card p-4">
      <p className="font-semibold">Wissen hinzufügen</p>
      <FreitextMitSprache rows={5} value={text} onChange={setText} placeholder="Text einfügen oder einsprechen: alles, was du zum Thema weißt oder gefunden hast." />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link zu einer interessanten Seite (optional)" />
      <Button variant="outline" className="w-full" onClick={hinzufuegen} disabled={(!text.trim() && !url.trim()) || speichert}>
        {speichert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Hinzufügen
      </Button>
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">{offen} noch nicht eingeordnete Information{offen === 1 ? '' : 'en'}. Bestehender Fachinhalt wird ergänzt, nicht ersetzt.</p>
        <Button className="w-full" onClick={() => onEinordnen(false)} disabled={!!laedt}>
          {laedt === 'einordnen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} In den Fachinhalt einordnen
        </Button>
        <Input value={fokus} onChange={(e) => setFokus(e.target.value)} placeholder="Recherche-Thema (optional), z. B. „Der Roman“" />
        <Button variant="secondary" className="w-full" onClick={() => onEinordnen(true, fokus.trim() || undefined)} disabled={!!laedt}>
          {laedt === 'recherche' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Mit Internetrecherche erweitern
        </Button>
        {laedt && <p className="text-xs text-muted-foreground">Das kann ein bis zwei Minuten dauern …</p>}
      </div>
    </div>
  );
}