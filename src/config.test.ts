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
  });

  it("throws a clear error when a required var is missing", () => {
    expect(() => loadConfig({ ...base, PF_CLIENT_ID: undefined })).toThrow(/PF_CLIENT_ID/);
  });
});
