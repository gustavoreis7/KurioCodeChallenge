import { http, HttpResponse } from "msw";
import {
  configureMocks,
  getMockConfig,
  resetMockConfig,
  scenarioNames,
  type MockConfig,
} from "./scenarios";
import {
  clearMockTimers,
  DomainError,
  settleOrder,
  updateMockNft,
} from "./domain";
import { disconnectMockSockets, emitNftUpdated, nftEvent } from "./socket";
import { getNft } from "./domain";
import { readState, resetMockState, setMockClock } from "./state";

export async function resetMocks() {
  clearMockTimers();
  disconnectMockSockets();
  resetMockConfig();
  await resetMockState();
}
// These endpoints only exist while MSW is enabled, including demonstration builds.
export const controlHandlers = [
  http.post("*/api/__mock/reset", async () => {
    await resetMocks();
    return HttpResponse.json({ reset: true });
  }),
  http.post("*/api/__mock/config", async ({ request }) => {
    const config = (await request.json()) as Partial<MockConfig> & {
      now?: string;
    };
    if (config.scenario && !scenarioNames.includes(config.scenario))
      return HttpResponse.json({ error: "Unknown scenario" }, { status: 422 });
    for (const value of [
      config.latencyMs,
      config.paymentDelayMs,
      config.timeoutMs,
    ]) {
      if (
        value !== undefined &&
        (!Number.isSafeInteger(value) || value < 0 || value > 30_000)
      )
        return HttpResponse.json({ error: "Invalid delay" }, { status: 422 });
    }
    if (config.now !== undefined && !Number.isFinite(Date.parse(config.now)))
      return HttpResponse.json({ error: "Invalid clock" }, { status: 422 });
    if (config.now !== undefined) setMockClock(config.now);
    configureMocks(config);
    return HttpResponse.json(getMockConfig());
  }),
  http.post("*/api/__mock/nfts/:id", async ({ request, params }) => {
    try {
      const patch = (await request.json()) as {
        priceEth?: string;
        editionId?: string;
        available?: number;
        duplicate?: boolean;
        stale?: boolean;
      };
      const previous = getNft(readState(), String(params.id));
      const current = updateMockNft(String(params.id), patch);
      if (patch.duplicate) {
        const event = nftEvent(current);
        emitNftUpdated(event);
        emitNftUpdated(event);
      }
      if (patch.stale) emitNftUpdated(nftEvent(previous));
      return HttpResponse.json(current);
    } catch (error) {
      return HttpResponse.json(
        {
          error: {
            code: error instanceof DomainError ? error.code : "VALIDATION",
            message: String(error),
          },
        },
        { status: error instanceof DomainError ? error.status : 422 },
      );
    }
  }),
  http.post("*/api/__mock/orders/:id/settle", async ({ request, params }) => {
    const { status } = (await request.json()) as {
      status: "confirmed" | "refused";
    };
    if (status !== "confirmed" && status !== "refused")
      return HttpResponse.json({ error: "Invalid status" }, { status: 422 });
    try {
      return HttpResponse.json(settleOrder(String(params.id), status));
    } catch (error) {
      return HttpResponse.json({ error: String(error) }, { status: 404 });
    }
  }),
  http.post("*/api/__mock/disconnect", () => {
    disconnectMockSockets();
    return HttpResponse.json({ disconnected: true });
  }),
];
