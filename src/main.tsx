import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { MedicineProvider } from "@/context/MedicineContext";
import { ensureDevSession } from "@/services/authService";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function render() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <MedicineProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                borderRadius: "16px",
                fontSize: "14px",
                fontWeight: 500,
              },
            }}
          />
        </MedicineProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

// TEMPORARY (see src/services/authService.ts): make sure we have a token
// before the medicine list's first fetch fires, so it doesn't 401 on
// initial load. Resolves instantly once real login is in place.
ensureDevSession().finally(render);
