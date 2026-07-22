import { describe, it, expect, vi } from "vitest";
import { registerPatientTools } from "./patients.js";
import type { FhirClient } from "../fhir/client.js";
import { AuditLogger } from "../audit/logger.js";

function harness() {
  const handlers = new Map<string, (args: any) => Promise<any>>();
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: (args: any) => Promise<any>) =>
      handlers.set(name, handler),
  };
  const client = { search: vi.fn(), read: vi.fn() } as unknown as FhirClient;
  const audit = new AuditLogger();
  vi.spyOn(audit, "record").mockImplementation(() => {});
  registerPatientTools(server as any, { client, audit });
  return { handlers, client, audit };
}

describe("patient tools", () => {
  it("search_patients returns shaped patients in structuredContent", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      { resourceType: "Patient", id: "p1", name: [{ given: ["Ana"], family: "Rivera" }] },
    ]);
    const res = await handlers.get("practicefusion_search_patients")!({ name: "rivera" });
    expect(client.search).toHaveBeenCalledWith("Patient", { name: "rivera" }, { limit: 50 });
    expect(res.structuredContent.results[0].name).toBe("Ana Rivera");
    expect(res.structuredContent.count).toBe(1);
    expect(res.structuredContent.has_more).toBe(false);
  });

  it("search_patients honors the limit param and reports has_more", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      { resourceType: "Patient", id: "p1", name: [{ family: "A" }] },
      { resourceType: "Patient", id: "p2", name: [{ family: "B" }] },
    ]);
    const res = await handlers.get("practicefusion_search_patients")!({ name: "x", limit: 1 });
    expect(client.search).toHaveBeenCalledWith("Patient", { name: "x" }, { limit: 1 });
    expect(res.structuredContent.count).toBe(1);
    expect(res.structuredContent.has_more).toBe(true);
  });

  it("get_patient reads by id and audits", async () => {
    const { handlers, client, audit } = harness();
    (client.read as any).mockResolvedValue({ resourceType: "Patient", id: "p1", name: [{ family: "Rivera" }] });
    const res = await handlers.get("practicefusion_get_patient")!({ patientId: "p1" });
    expect(client.read).toHaveBeenCalledWith("Patient", "p1");
    expect(res.structuredContent.id).toBe("p1");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "practicefusion_get_patient", outcome: "ok" }),
    );
  });

  it("returns isError and audits on client failure", async () => {
    const { handlers, client, audit } = harness();
    (client.read as any).mockRejectedValue(new Error("FHIR request failed: 404"));
    const res = await handlers.get("practicefusion_get_patient")!({ patientId: "nope" });
    expect(res.isError).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "practicefusion_get_patient", outcome: "error" }),
    );
  });
});
