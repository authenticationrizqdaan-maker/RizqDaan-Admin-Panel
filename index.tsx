
import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp'; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// RizqDaan Admin App Build
// Forcing Admin Panel as the exclusive entry point
root.render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
