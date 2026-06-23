import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initStore } from "./store";
import "./index.css";

// One-time: migrate any inline photos to IndexedDB + request durable storage.
void initStore();

// PWA: auto-update the service worker in the background.
registerSW({ immediate: true });

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
