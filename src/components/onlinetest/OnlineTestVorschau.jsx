import React from 'react';
import { toast } from 'sonner';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { onlineTestHtml } from '@/lib/onlineTestHtml';

const kopieren = (text, was) => navigator.clipboard.writeText(text).then(() => toast.success(`${was} kopiert.`));

/** WYSIWYG-Vorschau der test.html plus Teil 2 und Teil 3 zum Kopieren. */
export default function OnlineTestVorschau({ test }) {
  const html = React.useMemo(() => onlineTestHtml(test), [test]);
  const [neu, setNeu] = React.useState(0);
  React.useEffect(() => {
    const h = (e) => { if (e.data?.typ === 'neunzehn-testabgabe') toast.success(`Vorschau: Abgabe mit ${e.data.antworten.length} Antworten an die App geschickt.`); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);
  const herunterladen = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'test.html'; a.click(); URL.revokeObjectURL(a.href);
  };
  const textTab = (wert, was) => (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={() => kopieren(wert || '', was)}><Copy /> Kopieren</Button>
      <pre className="whitespace-pre-wrap rounded-lg border bg-card p-4 font-inter text-sm">{wert}</pre>
    </div>
  );

  return (
    <Tabs defaultValue="test" className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <TabsList>
          <TabsTrigger value="test">Teil 1 · Test</TabsTrigger>
          <TabsTrigger value="hintergrund">Teil 2 · Hintergrund</TabsTrigger>
          <TabsTrigger value="eh">Teil 3 · Erwartungshorizont</TabsTrigger>
        </TabsList>
        <span className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setNeu((n) => n + 1)} title="Neue Varianten ziehen">Neu mischen</Button>
          <Button size="sm" variant="outline" onClick={() => kopieren(html, 'test.html')}><Copy /> HTML kopieren</Button>
          <Button size="sm" onClick={herunterladen}><Download /> test.html</Button>
        </span>
      </div>
      <TabsContent value="test" className="mt-0 flex-1 p-4">
        <iframe key={neu} title="Vorschau Online-Test" sandbox="allow-scripts" srcDoc={html} className="h-full w-full rounded-lg border bg-white" />
      </TabsContent>
      <TabsContent value="hintergrund" className="mt-0 flex-1 overflow-y-auto p-4">{textTab(test.hintergrund, 'Hintergrund')}</TabsContent>
      <TabsContent value="eh" className="mt-0 flex-1 overflow-y-auto p-4">{textTab(test.erwartungshorizont, 'Erwartungshorizont')}</TabsContent>
    </Tabs>
  );
}