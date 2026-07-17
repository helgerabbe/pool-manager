import { useEffect, useMemo } from 'react';
import useExternesCss from '@/hooks/useExternesCss';
import { buildThemeBridgeCss } from '@/lib/externesThemeBridge';

/**
 * Injiziert das externe CSS (GitHub-CSS-Connector) plus die daraus
 * abgeleitete Design-Brücke (Farben/Radien/Schriften des MBK-Design-Kits
 * → interne App-Tokens, gültig innerhalb von .externes-theme-scope).
 * Wird in der Schüleransicht und in der Element-Vorschau (IPadFrame)
 * verwendet, damit beide exakt das zentrale MBK-Theme zeigen.
 * Ist der Connector deaktiviert oder nicht konfiguriert, rendert die
 * Komponente nichts — dann gilt das lokale Layout.
 */
export default function ExternesThemeStyle({ fresh = false }) {
  const { enabled, css, refetch } = useExternesCss();

  // fresh=true (Element-Vorschau): Beim Öffnen die CSS-Datei IMMER direkt
  // neu aus dem Repository laden, damit nie eine alte Version zu sehen ist.
  useEffect(() => {
    if (fresh) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);

  const bridgeCss = useMemo(() => (enabled ? buildThemeBridgeCss(css) : ''), [enabled, css]);
  if (!enabled) return null;
  return <style data-externes-theme="true">{css + '\n' + bridgeCss}</style>;
}