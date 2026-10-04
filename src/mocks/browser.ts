import { setupWorker } from "msw/browser";
import { handlers } from "./handlers-index";
import { initializeMockState } from "./state";
import { clearMockTimers, recoverPendingOrders } from "./domain";
import { disconnectMockSockets } from "./socket";
import { http } from "@/services/http";

declare global {
  interface Window {
    kurioMocks?: {
      post<T = unknown>(path: string, data?: unknown): Promise<T>;
    };
  }
}

export const worker = setupWorker(...handlers);
export async function startMockWorker(options: {
  enabled: boolean;
  serviceWorkerUrl?: string;
}) {
  if (!options.enabled) return;
  await initializeMockState();
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: options.serviceWorkerUrl ?? "/mockServiceWorker.js" },
  });
  window.kurioMocks = {
    async post<T>(path: string, data: unknown = {}) {
      if (!path.startsWith("/__mock/"))
        throw new Error("Controle MSW invalido");
      return (await http.post<T>(path, data)).data;
    },
  };
  recoverPendingOrders();
}
export function stopMockWorker() {
  delete window.kurioMocks;
  clearMockTimers();
  disconnectMockSockets();
  worker.stop();
}
