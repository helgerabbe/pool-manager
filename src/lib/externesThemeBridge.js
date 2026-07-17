/**
 * externesThemeBridge.js
 *
 * "Design-Brücke" zwischen dem externen MBK-Design-Kit (GitHub-CSS-Connector)
 * und den internen Design-Tokens der App.
 *
 * Das Design-Kit definiert seine Werte als --mbk-* Variablen (Hex-Farben,
 * Radien, Schriften). Die App rendert über eigene Tokens (--primary,
 * --background, … als HSL-Tripel). Diese Brücke liest die --mbk-*-Werte aus
 * dem geladenen CSS-Text aus, konvertiert Hex → HSL und erzeugt einen
 * Override-Block, der NUR innerhalb von .externes-theme-scope gilt
 * (Schüleransicht + Element-Vorschau). Ändert die MBK das Design-Kit,
 * folgt die App automatisch — ohne Umbau der Komponenten.
 */

// Welches MBK-Token speist welche internen Tokens?
const FARB_MAPPING = {
  '--mbk-color-primary': ['--primary', '--ring'],
  '--mbk-color-bg': ['--background'],
  '--mbk-color-surface': ['--card', '--popover'],
  '--mbk-color-surface-2': ['--secondary', '--muted'],
  '--mbk-color-text': ['--foreground', '--card-foreground', '--popover-foreground', '--secondary-foreground'],
  '--mbk-color-muted': ['--muted-foreground'],
  '--mbk-color-border': ['--border', '--input'],
  '--mbk-color-error': ['--destructive'],
};

/** '#rgb' oder '#rrggbb' → 'H S% L%' (Tailwind-HSL-Tripel), sonst null. */
export function hexToHslTriplet(hex) {
  const m = String(hex).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Liest alle --mbk-*-Variablen aus dem CSS-Text. Bei Mehrfach-Definitionen
 * (Hell/Dunkel-Theme) gewinnt das ERSTE Vorkommen — das ist im Design-Kit
 * per Konvention das helle Standard-Theme.
 */
export function parseMbkTokens(cssText) {
  const tokens = {};
  const re = /(--mbk-[\w-]+)\s*:\s*([^;{}]+);/g;
  let m;
  while ((m = re.exec(cssText || ''))) {
    const name = m[1];
    if (!(name in tokens)) tokens[name] = m[2].trim();
  }
  return tokens;
}

/**
 * Erzeugt den Override-CSS-Block für .externes-theme-scope aus dem
 * geladenen Design-Kit-CSS. Gibt '' zurück, wenn keine verwertbaren
 * Tokens gefunden wurden (dann bleibt alles beim lokalen Layout).
 */
export function buildThemeBridgeCss(cssText) {
  const tokens = parseMbkTokens(cssText);
  const zeilen = [];

  for (const [mbkToken, ziele] of Object.entries(FARB_MAPPING)) {
    const wert = tokens[mbkToken];
    const hsl = wert ? hexToHslTriplet(wert) : null;
    if (!hsl) continue; // color-mix(...) u. Ä. bewusst überspringen
    ziele.forEach((ziel) => zeilen.push(`${ziel}: ${hsl};`));
  }

  if (tokens['--mbk-radius-md']) zeilen.push(`--radius: ${tokens['--mbk-radius-md']};`);
  if (zeilen.length === 0) return '';

  return [
    `.externes-theme-scope { ${zeilen.join(' ')} }`,
    // Schriften des Design-Kits übernehmen (Fallback: bisherige Schrift)
    tokens['--mbk-font'] ? `.externes-theme-scope { font-family: var(--mbk-font); }` : '',
    tokens['--mbk-font-display']
      ? `.externes-theme-scope h1, .externes-theme-scope h2, .externes-theme-scope h3 { font-family: var(--mbk-font-display); }`
      : '',
  ].filter(Boolean).join('\n');
}