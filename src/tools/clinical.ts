import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDeps } from "./patients.js";
import { shapeCondition, shapeMedication, shapeObservation } from "../fhir/shapers.js";
import { textResult, errorResult } from "./result.js";

export function registerClinicalTools(server: McpServer, { client, audit }: ToolDeps): void {
  const patientId = z.string().describe("FHIR Patient resource id");

  server.registerTool(
    "get_conditions",
    { description: "List a patient's conditions / problems.", inputSchema: { patientId } },
    async ({ patientId }) => {
      const params = { patient: patientId };
      try {
        const r = await client.search("Condition", params);
        audit.record({ tool: "get_conditions", params, outcome: "ok" });
        return textResult(r.map(shapeCondition));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audit.record({ tool: "get_conditions", params, outcome: "error", error: msg });
        return errorResult(msg);
      }
    },
  );

  server.registerTool(
    "get_medications",
    { description: "List a patient's medication requests.", inputSchema: { patientId } },
    async ({ patientId }) => {
      const params = { patient: patientId };
      try {
        const r = await client.search("MedicationRequest", params);
        audit.record({ tool: "get_medications", params, outcome: "ok" });
        return textResult(r.map(shapeMedication));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audit.record({ tool: "get_medications", params, outcome: "error", error: msg });
        return errorResult(msg);
      }
    },
  );

  server.registerTool(
    "get_lab_results",
    { description: "List a patient's laboratory observations.", inputSchema: { patientId } },
    async ({ patientId }) => {
      const params = { patient: patientId, category: "laboratory" };
      try {
        const r = await client.search("Observation", params);
        audit.record({ tool: "get_lab_results", params, outcome: "ok" });
        return textResult(r.map(shapeObservation));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audit.record({ tool: "get_lab_results", params, outcome: "error", error: msg });
        return errorResult(msg);
      }
    },
  );
}
