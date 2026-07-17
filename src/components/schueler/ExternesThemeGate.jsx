import { Outlet } from 'react-router-dom';
import ExternesThemeStyle from '@/components/schueler/ExternesThemeStyle';

/**
 * Layout-Route um den Schülerbereich: lädt das externe CSS
 * (GitHub-CSS-Connector) und wendet es an, solange sich der
 * Nutzer im Schülerbereich befindet.
 */
export default function ExternesThemeGate() {
  return (
    <>
      <ExternesThemeStyle />
      {/* display:contents — nimmt am Layout nicht teil, vererbt aber die
          Design-Brücken-Tokens (.externes-theme-scope) an den Schülerbereich. */}
      <div className="externes-theme-scope" style={{ display: 'contents' }}>
        <Outlet />
      </div>
    </>
  );
}