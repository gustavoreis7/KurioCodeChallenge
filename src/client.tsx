import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

async function startClient() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { startMockWorker } = await import("./mocks/browser");
    await startMockWorker({ enabled: true });
  }
  const { StartClient } = await import("@tanstack/react-start/client");
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
}

void startClient().catch((error: unknown) => {
  console.error("Failed to initialize the marketplace", error);
});
