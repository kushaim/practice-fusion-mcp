export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

interface Bundle {
  resourceType: "Bundle";
  entry?: { resource?: FhirResource }[];
  link?: { relation: string; url: string }[];
}

interface TokenSource {
  getAccessToken(): Promise<string>;
}

export class FhirClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenSource,
  ) {}

  async search(
    resourceType: string,
    params: Record<string, string>,
    opts: { limit?: number } = {},
  ): Promise<FhirResource[]> {
    const qs = new URLSearchParams(params).toString();
    let url: string | undefined = `${this.baseUrl}/${resourceType}${qs ? `?${qs}` : ""}`;
    const resources: FhirResource[] = [];
    const MAX_PAGES = 50;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const bundle = (await this.get(url)) as Bundle;
      for (const e of bundle.entry ?? []) {
        if (e.resource) resources.push(e.resource);
      }
      // Stop paging once we have one more than the caller asked for, so a broad
      // query can't pull the whole dataset into memory.
      if (opts.limit !== undefined && resources.length > opts.limit) break;
      url = bundle.link?.find((l) => l.relation === "next")?.url;
    }
    return resources;
  }

  async read(resourceType: string, id: string): Promise<FhirResource> {
    return (await this.get(
      `${this.baseUrl}/${resourceType}/${encodeURIComponent(id)}`,
    )) as FhirResource;
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
