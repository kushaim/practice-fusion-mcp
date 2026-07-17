import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FhirClient } from "./client.js";

const tokenProvider = { getAccessToken: async () => "tok-1" };

describe("FhirClient", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("search() returns the resources from a searchset Bundle", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          resourceType: "Bundle",
          type: "searchset",
          entry: [
            { resource: { resourceType: "Patient", id: "p1" } },
            { resource: { resourceType: "Patient", id: "p2" } },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new FhirClient("https://fhir.example.com/r4", tokenProvider);
    const result = await client.search("Patient", { name: "smith" });

    expect(result.map((r) => r.id)).toEqual(["p1", "p2"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://fhir.example.com/r4/Patient?name=smith");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
  });

  it("search() returns [] when the Bundle has no entries", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ resourceType: "Bundle", type: "searchset" }), { status: 200 }),
    );
    const client = new FhirClient("https://fhir.example.com/r4", tokenProvider);
    expect(await client.search("Condition", { patient: "p1" })).toEqual([]);
  });

  it("read() returns a single resource", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ resourceType: "Patient", id: "p1" }), { status: 200 }),
    );
    const client = new FhirClient("https://fhir.example.com/r4", tokenProvider);
    const patient = await client.read("Patient", "p1");
    expect(patient.id).toBe("p1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://fhir.example.com/r4/Patient/p1");
  });

  it("throws a sanitized error on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 403 }));
    const client = new FhirClient("https://fhir.example.com/r4", tokenProvider);
    await expect(client.read("Patient", "p1")).rejects.toThrow(/FHIR request failed: 403/);
  });
});
