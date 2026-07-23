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

export interface FhirClientOptions {
  retryMaxAttempts?: number;
  retryBaseMs?: number;
  retryCapMs?: number;
  /** Override sleep — exposed for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export class FhirClient {
  private readonly retryMaxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryCapMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenSource,
    options: FhirClientOptions = {},
  ) {
    this.retryMaxAttempts = options.retryMaxAttempts ?? 4;
    this.retryBaseMs = options.retryBaseMs ?? 500;
    this.retryCapMs = options.retryCapMs ?? 8000;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

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
    const { withRetry } = await import("./retry.js");
    const result = await withRetry(
      async () => {
        const token = await this.tokens.getAccessToken();
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/fhir+json" },
        });
        const body = await res.text();
        return {
          status: res.status,
          body,
          headers: res.headers,
          value: () => JSON.parse(body) as unknown,
        };
      },
      {
        maxAttempts: this.retryMaxAttempts,
        baseMs: this.retryBaseMs,
        capMs: this.retryCapMs,
        sleep: this.sleep,
      },
    );
    return result.value;
  }
}
