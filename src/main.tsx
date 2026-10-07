import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './i18n';
import { initMetaPixel } from './utils/analytics';

initMetaPixel();

const rootEl = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Prerendered routes (scripts/prerender.mjs) ship real markup inside #root — hydrate onto it
// instead of throwing it away. Plain SPA entry points still start from an empty shell.
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app);
} else {
  createRoot(rootEl).render(app);
}
