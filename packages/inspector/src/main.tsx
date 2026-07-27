/**
 * @tileguard/inspector — SPA entry point
 *
 * Mounts the React application into the #root element defined in index.html.
 * All application logic lives in InspectorApp and its child components.
 *
 * Implemented in Milestone 6.
 */
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import { InspectorApp } from './components/InspectorApp.js';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(<InspectorApp />);
