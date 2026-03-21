import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModuleRegistry } from 'ag-grid-community';
import App from './App';
import './index.css';
import { registerMockServer } from './mockServer';

async function registerEnterpriseModules() {
  const agGridEnterprise = await import('ag-grid-enterprise');
  const allEnterpriseModule = /** @type {{ AllEnterpriseModule?: unknown }} */ (agGridEnterprise).AllEnterpriseModule;

  if (allEnterpriseModule) {
    ModuleRegistry.registerModules([/** @type {import('ag-grid-community').Module} */ (allEnterpriseModule)]);
  }
}

async function bootstrap() {
  await registerEnterpriseModules();
  await registerMockServer();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap().catch((error) => {
  console.error(error);
});
