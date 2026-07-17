export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

interface Bundle {
  resourceType: "Bundle";
  entry?: { resource?: FhirResource }[];
}

interface TokenSource {
  getAccessToken(): Promise<string>;
}

export class FhirClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenSource,
  ) {}

  async search(resourceType: string, params: Record<string, string>): Promise<FhirResource[]> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${resourceType}${qs ? `?${qs}` : ""}`;
    const bundle = (await this.get(url)) as Bundle;
    return (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is FhirResource => Boolean(r));
  }

  async read(resourceType: string, id: string): Promise<FhirResource> {
    return (await this.get(`${this.baseUrl}/${resourceType}/${encodeURIComponent(id)}`)) as FhirResource;
  }

  private async get(url: string): Promise<unknown> {
    const token = await this.tokens.getAccessToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/fhir+json" },
    });
    if (!res.ok) throw new Error(`FHIR request failed: ${res.status}`);
    return res.json();
  }
}
