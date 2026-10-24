import React from 'react';

const luecke = <span className="mx-1 inline-block w-36 border-b-[3px] border-[#2A4074] align-baseline" />;

/** Lückentext im Tablet-Rahmen: Arbeitsfläche mit Text und Wortspeicher. */
export default function LueckentextTabletInhalt() {
  return (
    <div className="flex min-h-[420px] flex-1 flex-col gap-6 rounded-xl border-2 border-[#C9CED8] bg-white p-6">
      <p className="text-2xl leading-[2.4]">Die Pflanze nimmt mit den {luecke} Wasser auf. In den {luecke} entsteht mit {luecke} Zucker.</p>
      <div className="mt-auto flex flex-wrap gap-3 border-t pt-4">
        {['Blättern', 'Blüte', 'Licht', 'Stängel', 'Wurzeln'].map((w) => <span key={w} className="rounded-xl border-2 bg-[#F6F7F9] px-5 py-2 text-xl font-semibold">{w}</span>)}
      </div>
    </div>
  );
}