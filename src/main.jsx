import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bootstrap's compiled CSS. Import once, before app styles, so react-bootstrap
// components are styled everywhere.
import 'bootstrap/dist/css/bootstrap.min.css'
import { HashRouter } from 'react-router-dom'
// After Bootstrap so the theme's variable overrides win.
import './theme.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { ProgressProvider } from './progress/ProgressProvider.jsx'
import { StoriesProvider } from './data/StoriesProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* HashRouter keeps routing fully client-side (URLs like /#/about), which
        works on GitHub Pages' static host with no server-side rewrite. */}
    <HashRouter>
      {/* AuthProvider sits inside the router so its consumers can navigate,
          and outside App so every route shares one session. */}
      <AuthProvider>
        {/* ProgressProvider is inside AuthProvider because reading progress will
            eventually be scoped to the signed-in user. */}
        <ProgressProvider>
          {/* StoriesProvider fetches the catalog from Supabase once, at startup. */}
          <StoriesProvider>
            <App />
          </StoriesProvider>
        </ProgressProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
