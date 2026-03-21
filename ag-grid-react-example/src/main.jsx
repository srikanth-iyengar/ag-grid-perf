import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerMockServer } from './mockServer';

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
