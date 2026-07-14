import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bootstrap's compiled CSS. Import once, before app styles, so react-bootstrap
// components are styled everywhere.
import 'bootstrap/dist/css/bootstrap.min.css'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* HashRouter keeps routing fully client-side (URLs like /#/about), which
        works on GitHub Pages' static host with no server-side rewrite. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
