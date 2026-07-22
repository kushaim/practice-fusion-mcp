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
        "practicefusion_get_appointments",
        "practicefusion_get_conditions",
        "practicefusion_get_lab_results",
        "practicefusion_get_medications",
        "practicefusion_get_patient",
        "practicefusion_search_patients",
      ].sort(),
    );
  });
});
