import useExternesCss from '@/hooks/useExternesCss';

/**
 * Injiziert das externe CSS (GitHub-CSS-Connector) in die Seite,
 * solange die Komponente gemountet ist. Wird in der Schüleransicht
 * und in der Element-Vorschau (IPadFrame) verwendet, damit beide
 * exakt das zentrale Theme zeigen. Ist der Connector deaktiviert
 * oder nicht konfiguriert, rendert die Komponente nichts —
 * dann gilt das lokale Layout.
 */
export default function ExternesThemeStyle() {
  const { enabled, css } = useExternesCss();
  if (!enabled) return null;
  return <style data-externes-theme="true">{css}</style>;
}