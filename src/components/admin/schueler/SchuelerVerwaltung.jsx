import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Loader2, Trash2, Upload, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SchuelerFormDialog from './SchuelerFormDialog';
import SchuelerImportDialog from './SchuelerImportDialog';

/** Schülerliste: wer hier steht, wird beim IServ-Login als Schüler erkannt. */
export default function SchuelerVerwaltung() {
  const qc = useQueryClient();
  const [suche, setSuche] = React.useState('');
  const [neu, setNeu] = React.useState(false);
  const [importOffen, setImportOffen] = React.useState(false);
  const { data: liste = [], isLoading } = useQuery({
    queryKey: ['schuelerStamm'],
    queryFn: () => base44.entities.Schueler.list('nachname', 2000),
  });
  const neuLaden = () => qc.invalidateQueries({ queryKey: ['schuelerStamm'] });
  const loeschen = async (s) => {
    if (!window.confirm(`${s.vorname || ''} ${s.nachname || ''} entfernen?`)) return;
    await base44.entities.Schueler.delete(s.id);
    neuLaden();
  };
  const q = suche.toLowerCase();
  const gefiltert = liste.filter((s) => `${s.vorname} ${s.nachname} ${s.email} ${s.klasse}`.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><GraduationCap className="h-6 w-6 text-primary" /> Schülerverwaltung</h1>
          <p className="mt-1 text-sm text-muted-foreground">{liste.length} Schüler · {liste.filter((s) => s.user_id).length} bereits angemeldet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOffen(true)}><Upload className="h-4 w-4" /> Liste importieren</Button>
          <Button className="gap-2" onClick={() => setNeu(true)}><UserPlus className="h-4 w-4" /> Schüler hinzufügen</Button>
        </div>
      </div>
      <Input placeholder="Suchen nach Name, E-Mail oder Klasse …" value={suche} onChange={(e) => setSuche(e.target.value)} className="max-w-sm" />
      <div className="divide-y rounded-xl border bg-card">
        {isLoading && <Loader2 className="m-6 h-5 w-5 animate-spin" />}
        {!isLoading && gefiltert.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Noch keine Schüler eingetragen.</p>}
        {gefiltert.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{s.vorname} {s.nachname} {s.klasse && <span className="text-muted-foreground">· {s.klasse}</span>}</p>
              <p className="text-xs text-muted-foreground">{s.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={s.user_id ? 'default' : 'secondary'}>{s.user_id ? 'Angemeldet' : 'Noch nicht angemeldet'}</Badge>
              <Button variant="ghost" size="icon" onClick={() => loeschen(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      <SchuelerFormDialog open={neu} onOpenChange={setNeu} onGespeichert={neuLaden} />
      <SchuelerImportDialog open={importOffen} onOpenChange={setImportOffen} vorhandene={liste} onGespeichert={neuLaden} />
    </div>
  );
}