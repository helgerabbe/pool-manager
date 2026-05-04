/**
 * mbkGlobalPromptsMarkdown.js
 *
 * Erzeugt Markdown-Bundles aus dem MBK-Prompt-Manager (Tab 2 im
 * Export-Center) und bietet einen Browser-Download dafür.
 * Reine Util-Datei ohne React-Abhängigkeiten — testbar und stabil.
 */

const KATEGORIE_TITEL = {
  global: 'Globale Definitionen',
  systembaustein: 'Systembausteine',
};

function sortPrompts(prompts) {
  return [...prompts].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );
}

/**
 * Baut einen Markdown-String für eine Prompt-Liste einer Kategorie.
 * Inaktive Einträge werden ausgelassen.
 */
export function buildMarkdownForKategorie(prompts, kategorie) {
  const titel = KATEGORIE_TITEL[kategorie] || kategorie;
  const stand = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const items = sortPrompts(
    (prompts || []).filter(
      (p) => p?.kategorie === kategorie && p?.ist_aktiv !== false
    )
  );

  const sections = items.map((p, idx) => {
    const heading = `## ${idx + 1}. ${p.anzeigename || p.schluessel}`;
    const meta = `_Schlüssel: \`${p.schluessel}\`_`;
    const body = (p.prompt_text || '').trim() || '_(kein Text gepflegt)_';
    return `${heading}\n\n${meta}\n\n${body}\n`;
  });

  return [
    `# MBK-Prompt-Manager — ${titel}`,
    `_Stand: ${stand}_`,
    '',
    items.length === 0 ? '_(keine aktiven Einträge)_' : sections.join('\n---\n\n'),
  ].join('\n');
}

/**
 * Browser-Download eines Markdown-Strings als .md-Datei.
 */
export function downloadMarkdown(filename, markdown) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}