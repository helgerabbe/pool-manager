import { Outlet } from 'react-router-dom';

/**
 * Minimales Layout für den reinen Schüler-Build (VITE_BACKEND=supabase).
 *
 * Ersetzt AppLayout, das Base44-abhängige Hooks nutzt (Presence, SSE,
 * RBAC, Wartungsbanner) und im statischen GitHub-Pages-Build nicht
 * funktionieren würde. Die Schüler-Seiten bringen ihre eigene UI mit –
 * hier nur der Full-Screen-Container.
 */
export default function SchuelerOnlyLayout() {
  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden overflow-x-hidden bg-background">
      <main className="flex-1 overflow-hidden overflow-x-hidden min-h-0">
        <div className="h-full w-full overflow-hidden overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}