export function buildEinheitGrundgeruestContext(einheit) {
  const raw = einheit?.grundgeruest_rohtext?.trim();
  const structured = einheit?.grundgeruest_strukturiert;

  if (!raw && !structured) {
    return '';
  }

  const lines = ['## Grundgerüst der Einheit'];

  if (raw) {
    lines.push('', '### Freitext der Lehrkraft', raw);
  }

  if (structured && typeof structured === 'object') {
    lines.push('', '### Strukturierte KI-Auswertung');
    if (structured.thema) lines.push(`Thema: ${structured.thema}`);
    if (structured.lernziele?.length) lines.push(`Lernziele: ${structured.lernziele.join('; ')}`);
    if (structured.zentrale_begriffe?.length) lines.push(`Zentrale Begriffe: ${structured.zentrale_begriffe.join(', ')}`);
    if (structured.software_materialien?.length) lines.push(`Software/Materialien: ${structured.software_materialien.join('; ')}`);
    if (structured.grenzen) lines.push(`Grenzen/Nicht-Gegenstand: ${structured.grenzen}`);
    if (structured.offene_punkte?.length) lines.push(`Offene Punkte: ${structured.offene_punkte.join('; ')}`);
  }

  return lines.join('\n');
}