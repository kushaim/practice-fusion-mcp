import { describe, it, expect, vi } from "vitest";
import { registerAllTools } from "./index.js";
import type { FhirClient } from "../fhir/client.js";
import { AuditLogger } from "../audit/logger.js";

describe("registerAllTools", () => {
  it("registers all six read tools", () => {
    const names: string[] = [];
    const server = { registerTool: (n: string) => names.push(n) };
    const client = { search: vi.fn(), read: vi.fn() } as unknown as FhirClient;
    registerAllTools(server as any, { client, audit: new AuditLogger() });
    expect(names.sort()).toEqual(
      [
        "get_appointments",
        "get_conditions",
        "get_lab_results",
        "get_medications",
        "get_patient",
        "search_patients",
      ].sort(),
    );
  });
});
