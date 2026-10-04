import { delay, HttpResponse } from "msw";
import { setMockClock, transact } from "./state";
import { disconnectMockSockets } from "./socket";

export const scenarioNames = [
  "success",
  "empty",
  "slow",
  "variable-latency",
  "offline",
  "http-422",
  "http-500",
  "session-expired",
  "forbidden",
  "registration-conflict",
  "validation-error",
  "invalid-coupon",
  "expired-coupon",
  "price-changed",
  "edition-sold-out",
  "timeout-after-create",
  "payment-refused",
  "payment-confirmed",
  "pending",
  "wallet-refused",
] as const;
export type Scenario = (typeof scenarioNames)[number];
export interface MockConfig {
  scenario: Scenario;
  latencyMs: number;
  paymentDelayMs: number;
  timeoutMs: number;
  now?: string;
}
const defaults: MockConfig = {
  scenario: "success",
  latencyMs: 80,
  paymentDelayMs: 600,
  timeoutMs: 1500,
};
const CONFIG_KEY = "kurio.mock.config.v1";
function configStorage() {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
function loadConfig(): MockConfig {
  try {
    const value = JSON.parse(
      configStorage()?.getItem(CONFIG_KEY) ?? "null",
    ) as Partial<MockConfig> | null;
    if (
      !value ||
      !scenarioNames.includes(value.scenario!) ||
      ![value.latencyMs, value.paymentDelayMs, value.timeoutMs].every(
        (delay) =>
          typeof delay === "number" &&
          Number.isSafeInteger(delay) &&
          delay >= 0 &&
          delay <= 30_000,
      )
    )
      return { ...defaults };
    if (
      value.now !== undefined &&
      (typeof value.now !== "string" || !Number.isFinite(Date.parse(value.now)))
    )
      return { ...defaults };
    return {
      scenario: value.scenario!,
      latencyMs: value.latencyMs!,
      paymentDelayMs: value.paymentDelayMs!,
      timeoutMs: value.timeoutMs!,
      ...(value.now && { now: value.now }),
    };
  } catch {
    return { ...defaults };
  }
}
let config = loadConfig();
if (config.now) setMockClock(config.now);
let requestCount = 0;
export function configureMocks(next: Partial<MockConfig>) {
  config = { ...config, ...next };
  configStorage()?.setItem(CONFIG_KEY, JSON.stringify(config));
}
export function resetMockConfig() {
  config = { ...defaults };
  requestCount = 0;
  configStorage()?.removeItem(CONFIG_KEY);
}
export function getMockConfig() {
  return { ...config };
}
export function getScenario(request: Request): Scenario {
  const value =
    request.headers.get("X-Mock-Scenario") ??
    new URL(request.url).searchParams.get("scenario") ??
    config.scenario;
  return scenarioNames.includes(value as Scenario)
    ? (value as Scenario)
    : "success";
}
export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
  details?: unknown,
) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        ...(fields && { fields }),
        ...(details !== undefined && { details }),
      },
    },
    { status },
  );
}
export async function applyNetwork(
  request: Request,
): Promise<Response | undefined> {
  const scenario = getScenario(request);
  const count = requestCount++;
  await delay(
    scenario === "slow"
      ? 2000
      : scenario === "variable-latency"
        ? [600, 40, 250][count % 3]
        : config.latencyMs,
  );
  if (scenario === "offline") return HttpResponse.error();
  if (scenario === "http-422" || scenario === "validation-error")
    return apiError(422, "VALIDATION", "Dados invalidos", {
      name: "Verifique este campo",
    });
  if (scenario === "http-500")
    return apiError(503, "TRANSIENT", "Servico temporariamente indisponivel");
  if (scenario === "session-expired") {
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (token) {
      transact((state) => {
        delete state.sessions[token];
      });
      disconnectMockSockets(token);
    }
    return apiError(401, "SESSION_EXPIRED", "Sessao expirada");
  }
  if (scenario === "forbidden")
    return apiError(403, "FORBIDDEN", "Acesso nao permitido");
}
