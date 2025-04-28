import React from 'react';
import ReactDOM from 'react-dom/client';
import DynamicRouter from './components/DynamicRouter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DynamicRouter />
  </React.StrictMode>,
);