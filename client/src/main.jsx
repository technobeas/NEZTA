import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { Providers } from './app/Providers.jsx';
import { App } from './app/App.jsx';
import { startPwa } from './services/pwa.js';

startPwa();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
