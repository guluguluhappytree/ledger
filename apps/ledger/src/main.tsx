import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AccountButton, SyncProvider } from "lifestyle-sync";
import App from "./App";
import { applyRemotePayload } from "./store";
import { STORAGE_KEY } from "./types";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SyncProvider appKey={STORAGE_KEY} onRemoteData={applyRemotePayload}>
      <AccountButton />
      <App />
    </SyncProvider>
  </StrictMode>,
);
