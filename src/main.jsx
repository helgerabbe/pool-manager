import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import ErrorBoundary from '@/components/errors/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary label="der App">
    <App />
  </ErrorBoundary>
);