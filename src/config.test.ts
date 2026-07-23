import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

const base = {
  PF_FHIR_BASE_URL: "https://fhir.example.com/r4",
  PF_TOKEN_URL: "https://auth.example.com/token",
  PF_CLIENT_ID: "client-123",
  PF_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
};

describe("loadConfig", () => {
  it("applies defaults for scope and alg", () => {
    const cfg = loadConfig(base);
    expect(cfg.scopes).toBe("system/*.read");
    expect(cfg.tokenAlg).toBe("RS384");
    expect(cfg.auditLogPath).toBeUndefined();
    expect(cfg.auditLogFormat).toBe("text");
    expect(cfg.retryMaxAttempts).toBe(4);
    expect(cfg.retryBaseMs).toBe(500);
    expect(cfg.retryCapMs).toBe(8000);
  });

  it("throws a clear error when a required var is missing", () => {
    expect(() => loadConfig({ ...base, PF_CLIENT_ID: undefined })).toThrow(/PF_CLIENT_ID/);
  });

  it("parses retry env vars", () => {
    const cfg = loadConfig({
      ...base,
      PF_RETRY_MAX_ATTEMPTS: "6",
      PF_RETRY_BASE_MS: "250",
      PF_RETRY_CAP_MS: "4000",
    });
    expect(cfg.retryMaxAttempts).toBe(6);
    expect(cfg.retryBaseMs).toBe(250);
    expect(cfg.retryCapMs).toBe(4000);
  });

  it("rejects out-of-range retry values", () => {
    expect(() => loadConfig({ ...base, PF_RETRY_MAX_ATTEMPTS: "0" })).toThrow();
    expect(() => loadConfig({ ...base, PF_RETRY_MAX_ATTEMPTS: "99" })).toThrow();
    expect(() => loadConfig({ ...base, PF_RETRY_BASE_MS: "abc" })).toThrow();
  });
});
