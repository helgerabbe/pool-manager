import React from 'react';

const ACHSEN = [['fit', 'Arbeitstempo'], ['stark', 'Selbstständigkeit'], ['leistung', 'Leistungsvermögen']];

const Profil = ({ titel, profil }) => (
  <div className="rounded-lg border p-3">
    <p className="mb-2 font-semibold">{titel}</p>
    {ACHSEN.map(([k, l]) => (
      <div key={k} className="flex items-center gap-3 py-0.5">
        <span className="w-36 text-muted-foreground">{l}</span>
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2.5 w-6 rounded ${n <= (profil?.[k] ?? 3) ? 'bg-primary' : 'bg-muted'}`} />)}</div>
        <span className="text-xs">{profil?.[k] ?? 3}</span>
      </div>
    ))}
  </div>
);

/** Was die App über die Lerngruppe weiß. */
export default function LerngruppePanel({ einheit, lerngruppe }) {
  if (!lerngruppe) return <p className="text-sm text-muted-foreground">Die Einheit ist keiner Lerngruppe zugeordnet.</p>;
  return (
    <div className="space-y-3 text-sm">
      <p><span className="font-semibold">{lerngruppe.name}</span> · {lerngruppe.fach} · Jahrgang {lerngruppe.jahrgangsstufe}{lerngruppe.schuljahr && ` · ${lerngruppe.schuljahr}`}</p>
      <Profil titel="Standard-Einschätzung der Lerngruppe" profil={lerngruppe.profil} />
      {einheit.profil ? <Profil titel="Eigene Einschätzung für diese Einheit (gilt hier)" profil={einheit.profil} />
        : <p className="text-muted-foreground">Für diese Einheit gilt die Standard-Einschätzung.</p>}
      <p className="text-xs text-muted-foreground">3 = normal. Weitere Angaben zur Lerngruppe sind nicht hinterlegt.</p>
    </div>
  );
}