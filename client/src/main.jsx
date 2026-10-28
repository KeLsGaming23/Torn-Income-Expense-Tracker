import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { TornDataProvider } from './context/TornDataContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { registerSW } from './registerServiceWorker.js';

// Register Service Worker for PWA
registerSW();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TornDataProvider>
        <App />
      </TornDataProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
