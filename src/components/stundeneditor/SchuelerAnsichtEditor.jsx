import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SchuelerGeraet from './SchuelerGeraet';

/** Schüleransicht: genau das, was die Schüler über Moodle sehen – Anweisung direkt bearbeitbar. */
export default function SchuelerAnsichtEditor({ phase, stundeId, onSpeichern }) {
  const [text, setText] = React.useState(phase.schueler_anweisung || '');
  React.useEffect(() => { setText(phase.schueler_anweisung || ''); }, [phase.id]);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Anweisung auf dem Schülergerät</p>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== (phase.schueler_anweisung || '') && onSpeichern(text)} />
      </div>
      <SchuelerGeraet phase={{ ...phase, schueler_anweisung: text }} />
      <Link to={`/unterrichtsstunde/${stundeId}?tab=regieblatt`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" /> Aufgabe oder Material dieser Phase im Regieblatt bearbeiten
      </Link>
    </div>
  );
}