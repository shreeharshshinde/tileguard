/**
 * @tileguard/inspector — SPA entry point
 *
 * Mounts the React application into the #root element defined in index.html.
 * All application logic lives in InspectorApp and its child components.
 *
 * Implemented in Milestone 6.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// InspectorApp is implemented in Milestone 6 (React UI Panels & Viewport Shell).
// This placeholder keeps the SPA shell functional and type-check-clean.
function InspectorApp(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#94a3b8',
        fontFamily: 'monospace',
        fontSize: '14px',
      }}
    >
      TileGuard Inspector — Milestone 1 skeleton (UI implemented in Milestone 6)
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <InspectorApp />
  </StrictMode>,
);
