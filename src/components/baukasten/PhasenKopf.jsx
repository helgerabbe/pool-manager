import React from 'react';

/** Optionale, benennbare Phase über einem Baustein (z. B. „Einstieg“, „Input“). Leer = gehört zur vorigen Phase. */
export default function PhasenKopf({ phase, neu, onPhase }) {
  const [wert, setWert] = React.useState(phase || '');
  React.useEffect(() => setWert(phase || ''), [phase]);
  return (
    <div className={`flex items-center gap-3 ${neu ? 'pt-4' : ''}`}>
      <input value={wert} onChange={(e) => setWert(e.target.value)} onBlur={() => wert !== (phase || '') && onPhase(wert.trim())}
        placeholder={neu ? 'Phase benennen …' : '+ neue Phase'}
        className={`bg-transparent outline-none ${neu ? 'font-display text-sm font-bold uppercase tracking-wider text-primary placeholder:text-muted-foreground/50' : 'w-28 text-[11px] text-muted-foreground/60 placeholder:text-muted-foreground/40 focus:w-48'}`} />
      {neu && <div className="h-px flex-1 bg-border" />}
    </div>
  );
}