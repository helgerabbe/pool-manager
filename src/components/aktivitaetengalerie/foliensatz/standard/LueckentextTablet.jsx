import React from 'react';

/** Formatfolie Lückentext, Tablet-Fassung (Skizze): Text mit Lücken, Wortspeicher darunter. */
export default function LueckentextTablet() {
  const luecke = <span className="mx-0.5 inline-block w-12 border-b-2 border-[#2A4074]" />;
  return (
    <div className="space-y-2 text-xs">
      <p className="leading-6">Die Pflanze nimmt mit den {luecke} Wasser auf. In den {luecke} entsteht mit {luecke} Zucker.</p>
      <div className="flex flex-wrap gap-1">
        {['Blättern', 'Licht', 'Stängel', 'Wurzeln'].map((w) => <span key={w} className="rounded-md border bg-white px-2 py-0.5 font-semibold">{w}</span>)}
      </div>
    </div>
  );
}