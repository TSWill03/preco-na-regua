import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/dm-sans/index.css';
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/index.css';
import App from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
