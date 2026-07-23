import { describe, it, expect, vi } from "vitest";
import { registerClinicalTools } from "./clinical.js";
import type { FhirClient } from "../fhir/client.js";
import { AuditLogger } from "../audit/logger.js";

function harness() {
  const handlers = new Map<string, (args: any) => Promise<any>>();
  const server = { registerTool: (n: string, _c: unknown, h: any) => handlers.set(n, h) };
  const client = { search: vi.fn(), read: vi.fn() } as unknown as FhirClient;
  const audit = new AuditLogger();
  vi.spyOn(audit, "record").mockImplementation(() => {});
  registerClinicalTools(server as any, { client, audit });
  return { handlers, client };
}

describe("clinical tools", () => {
  it("get_conditions searches Condition by patient", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      { resourceType: "Condition", id: "c1", code: { text: "Hypertension" } },
    ]);
    const res = await handlers.get("practicefusion_get_conditions")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith("Condition", { patient: "p1" }, { limit: 50 });
    expect(res.structuredContent.results[0].condition).toBe("Hypertension");
  });

  it("get_medications searches MedicationRequest by patient", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "MedicationRequest",
        id: "m1",
        medicationCodeableConcept: { text: "Lisinopril" },
      },
    ]);
    const res = await handlers.get("practicefusion_get_medications")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith(
      "MedicationRequest",
      { patient: "p1" },
      { limit: 50 },
    );
    expect(res.structuredContent.results[0].medication).toBe("Lisinopril");
  });

  it("get_lab_results searches Observation with laboratory category", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Observation",
        id: "o1",
        code: { text: "Glucose" },
        valueQuantity: { value: 95, unit: "mg/dL" },
      },
    ]);
    const res = await handlers.get("practicefusion_get_lab_results")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith(
      "Observation",
      { patient: "p1", category: "laboratory" },
      { limit: 50 },
    );
    expect(res.structuredContent.results[0].value).toBe("95 mg/dL");
  });

  it("get_vitals searches Observation with vital-signs category", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Observation",
        id: "v1",
        code: { text: "Heart rate" },
        valueQuantity: { value: 72, unit: "beats/min" },
      },
    ]);
    const res = await handlers.get("practicefusion_get_vitals")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith(
      "Observation",
      { patient: "p1", category: "vital-signs" },
      { limit: 50 },
    );
    expect(res.structuredContent.results[0].value).toBe("72 beats/min");
  });

  it("get_allergies searches AllergyIntolerance by patient", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "AllergyIntolerance",
        id: "al1",
        code: { text: "Penicillin" },
        clinicalStatus: { coding: [{ code: "active" }] },
        criticality: "high",
      },
    ]);
    const res = await handlers.get("practicefusion_get_allergies")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith(
      "AllergyIntolerance",
      { patient: "p1" },
      { limit: 50 },
    );
    expect(res.structuredContent.results[0].substance).toBe("Penicillin");
    expect(res.structuredContent.results[0].criticality).toBe("high");
  });

  it("get_immunizations searches Immunization by patient", async () => {
    const { handlers, client } = harness();
    (client.search as any).mockResolvedValue([
      {
        resourceType: "Immunization",
        id: "im1",
        vaccineCode: { text: "Influenza" },
        status: "completed",
      },
    ]);
    const res = await handlers.get("practicefusion_get_immunizations")!({ patientId: "p1" });
    expect(client.search).toHaveBeenCalledWith("Immunization", { patient: "p1" }, { limit: 50 });
    expect(res.structuredContent.results[0].vaccine).toBe("Influenza");
  });
});
