import { setupServer } from "msw/node";
import { handlers } from "./handlers-index";
import { initializeMockState } from "./state";

export const server = setupServer(...handlers);
export async function startMockServer() {
  await initializeMockState();
  server.listen({ onUnhandledRequest: "error" });
}
