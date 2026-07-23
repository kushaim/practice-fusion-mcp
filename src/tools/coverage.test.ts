import { describe, it, expect, vi } from "vitest";
import { registerCoverageTools } from "./coverage.js";
import type { FhirClient } from "../fhir/client.js";
import { AuditLogger } from "../audit/logger.js";

function harness() {
  const handlers = new Map<string, (args: any) => Promise<any>>();
  const server = { registerTool: (n: string, _c: unknown, h: any) => handlers.set(n, h) };
  const client = { search: vi.fn(), read: vi.fn() } as unknown as FhirClient;
  const audit = new AuditLogger();
  vi.spyOn(audit, "record").mockImplementation(() => {});
  registerCoverageTools(server as any, { client, audit });
  return { handlers, client };
}

describe("coverage tools", () => {
  it("get_coverage searches Coverage by patient (no status filter)", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Coverage",
        id: "cov-1",
        status: "active",
        type: { text: "Medical" },
        payer: [{ display: "Aetna" }],
        subscriberId: "MEM-12345",
        period: { start: "2026-01-01", end: "2026-12-31" },
        relationship: { coding: [{ code: "self" }] },
      },
    ]);
    const res = await handlers.get("practicefusion_get_coverage")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith("Coverage", { patient: "p1" }, { limit: 50 });
    expect(res.structuredContent.results[0]).toMatchObject({
      id: "cov-1",
      status: "active",
      type: "Medical",
      payer: "Aetna",
      subscriberId: "MEM-12345",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      relationship: "self",
    });
  });

  it("get_coverage passes the status filter through", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([]);
    await handlers.get("practicefusion_get_coverage")!({ patientId: "p1", status: "active" });
    expect(client.search).toHaveBeenCalledWith(
      "Coverage",
      { patient: "p1", status: "active" },
      { limit: 50 },
    );
  });

  it("get_coverage surfaces coding display when type.text is absent", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Coverage",
        id: "cov-2",
        status: "active",
        type: { coding: [{ display: "Dental" }] },
        period: { start: "2026-01-01" },
      },
    ]);
    const res = await handlers.get("practicefusion_get_coverage")!({ patientId: "p1" });
    expect(res.structuredContent.results[0].type).toBe("Dental");
    expect(res.structuredContent.results[0].periodStart).toBe("2026-01-01");
  });

  it("get_coverage returns an empty list for a patient with no coverage", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([]);
    const res = await handlers.get("practicefusion_get_coverage")!({ patientId: "p1" });
    expect(res.structuredContent.results).toEqual([]);
    expect(res.structuredContent.count).toBe(0);
  });

  it("get_coverage returns an errorResult on a 4xx/5xx", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockRejectedValue(new Error("FHIR request failed: 403"));
    const res = await handlers.get("practicefusion_get_coverage")!({ patientId: "p1" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("FHIR request failed: 403");
  });

  it("get_coverage respects the limit param", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([]);
    await handlers.get("practicefusion_get_coverage")!({ patientId: "p1", limit: 5 });
    expect(client.search).toHaveBeenCalledWith("Coverage", { patient: "p1" }, { limit: 5 });
  });
});
