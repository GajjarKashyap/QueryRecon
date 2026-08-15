import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { useApiKeysStore } from './store/apiKeysStore';
import { useLocalAssistantStore, type HermesProvider } from './store/localAssistantStore';
import './index.css';

if (window.location.hostname === '127.0.0.1') {
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.hostname = 'localhost';
  window.location.replace(canonicalUrl);
} else {
  const setupToken = new URL(window.location.href).searchParams.get('setupToken');
  if (setupToken) {
    fetch(`/__queryrecon/bootstrap?token=${encodeURIComponent(setupToken)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`Setup returned HTTP ${response.status}`)))
      .then(setup => {
        Object.entries(setup.keys || {}).forEach(([provider, key]) => useApiKeysStore.getState().setKey(provider, String(key || '')));
        Object.entries(setup.models || {}).forEach(([provider, model]) => model && useApiKeysStore.getState().setModel(provider, String(model)));
        const assistant = useLocalAssistantStore.getState();
        assistant.setHermesEndpoint(setup.hermes.endpoint);
        assistant.setHermesApiKey(setup.hermes.apiKey);
        assistant.setHermesProvider(setup.hermes.provider as HermesProvider);
        assistant.setHermesModel(setup.hermes.model);
        assistant.setRuntime('hermes');
      })
      .catch(error => console.error('QueryRecon setup failed:', error))
      .finally(() => {
        window.history.replaceState({}, '', '/hermes-agent');
        window.location.reload();
      });
  } else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  }
}
