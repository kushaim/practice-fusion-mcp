import { describe, it, expect, vi } from "vitest";
import { registerRecordTools } from "./records.js";
import type { FhirClient } from "../fhir/client.js";
import { AuditLogger } from "../audit/logger.js";

function harness() {
  const handlers = new Map<string, (args: any) => Promise<any>>();
  const server = { registerTool: (n: string, _c: unknown, h: any) => handlers.set(n, h) };
  const client = { search: vi.fn(), read: vi.fn() } as unknown as FhirClient;
  const audit = new AuditLogger();
  vi.spyOn(audit, "record").mockImplementation(() => {});
  registerRecordTools(server as any, { client, audit });
  return { handlers, client };
}

describe("record tools", () => {
  it("get_encounters searches Encounter by patient", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Encounter",
        id: "e1",
        status: "finished",
        class: { display: "ambulatory" },
        period: { start: "2026-07-10T09:00:00Z" },
        type: [{ text: "Office visit" }],
      },
    ]);
    const res = await handlers.get("practicefusion_get_encounters")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith("Encounter", { patient: "p1" }, { limit: 50 });
    expect(res.structuredContent.results[0].class).toBe("ambulatory");
    expect(res.structuredContent.results[0].type).toBe("Office visit");
  });

  it("get_documents searches DocumentReference by patient", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "DocumentReference",
        id: "d1",
        type: { text: "Progress note" },
        status: "current",
        date: "2026-07-11T12:00:00Z",
        description: "Follow-up visit note",
      },
    ]);
    const res = await handlers.get("practicefusion_get_documents")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith(
      "DocumentReference",
      { patient: "p1" },
      { limit: 50 },
    );
    expect(res.structuredContent.results[0].type).toBe("Progress note");
    expect(res.structuredContent.results[0].description).toBe("Follow-up visit note");
  });
});
