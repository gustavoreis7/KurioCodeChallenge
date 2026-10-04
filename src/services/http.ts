import axios, { CanceledError, type InternalAxiosRequestConfig } from "axios";
import { guestId, sessionState, setSession } from "./session";
import type { ApiError } from "@/types";

type SessionRequest = InternalAxiosRequestConfig & {
  sessionRevision?: number;
  privateRequest?: boolean;
};
export const http = axios.create({ baseURL: "/api", timeout: 12_000 });
http.interceptors.request.use((config: SessionRequest) => {
  const { session, revision } = sessionState();
  if (typeof window !== "undefined")
    config.headers.set("X-Guest-Id", guestId());
  if (session && !config.headers.has("Authorization"))
    config.headers.set("Authorization", `Bearer ${session.token}`);
  config.sessionRevision = revision;
  config.privateRequest =
    !/^\/nfts(?:\/|$)/.test(config.url ?? "") &&
    !/^\/auth\//.test(config.url ?? "");
  return config;
});
http.interceptors.response.use(
  (response) => {
    const config = response.config as SessionRequest;
    if (
      config.privateRequest &&
      config.sessionRevision !== sessionState().revision
    )
      throw new CanceledError("Resposta da sessao anterior descartada");
    return response;
  },
  (error) => {
    const config = error.config as SessionRequest | undefined;
    if (
      config?.privateRequest &&
      config.sessionRevision !== sessionState().revision
    )
      return Promise.reject(new CanceledError("Sessao encerrada"));
    if (
      error.response?.status === 401 &&
      config?.url !== "/auth/login" &&
      config?.url !== "/auth/register" &&
      !config?.url?.startsWith("/auth/social/") &&
      sessionState().session
    ) {
      setSession(null);
      window.dispatchEvent(new Event("kurio.session.expired"));
    }
    return Promise.reject(error);
  },
);
export function errorMessage(error: unknown) {
  if (axios.isAxiosError<ApiError>(error))
    return (
      error.response?.data?.error?.message ??
      (error.code === "ECONNABORTED"
        ? "A resposta demorou. Tente novamente."
        : "Nao foi possivel carregar os dados. Tente novamente.")
    );
  return error instanceof Error
    ? error.message
    : "Nao foi possivel concluir a operacao.";
}
export function fieldErrors(error: unknown): Record<string, string> {
  return axios.isAxiosError<ApiError>(error)
    ? (error.response?.data?.error?.fields ?? {})
    : {};
}
