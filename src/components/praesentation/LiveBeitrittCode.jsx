import React from 'react';

/** Beitrittsbildschirm an der Tafel: großer Raum-Code wie bei Kahoot. */
export default function LiveBeitrittCode({ raum, anzahl }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
      <p className="text-xl text-muted-foreground">Öffne den Pool-Manager auf deinem Gerät, tippe auf „Mitmachen“ und gib diesen Code ein:</p>
      <p className="text-8xl font-display font-extrabold tracking-[0.2em] text-primary">{raum.code}</p>
      <p className="text-2xl font-semibold">{raum.titel}</p>
      <p className="text-lg text-muted-foreground">{anzahl} {anzahl === 1 ? 'Schüler ist' : 'Schüler sind'} beigetreten</p>
    </div>
  );
}