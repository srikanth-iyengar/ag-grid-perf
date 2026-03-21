import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import App from './App';
import './index.css';
import { registerMockServer } from './mockServer';

ModuleRegistry.registerModules([AllEnterpriseModule]);

async function bootstrap() {
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
