import { SignJWT, importPKCS8 } from "jose";

export interface TokenProviderOptions {
  tokenUrl: string;
  clientId: string;
  privateKeyPem: string;
  scopes: string;
  alg: "RS384" | "RS256" | "ES384";
}

const EXPIRY_MARGIN_MS = 30_000;

export class TokenProvider {
  private cached?: { token: string; expiresAt: number };

  constructor(private readonly opts: TokenProviderOptions) {}

  async getAccessToken(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt - EXPIRY_MARGIN_MS) {
      return this.cached.token;
    }
    const assertion = await this.buildAssertion();
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: this.opts.scopes,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
    });
    const res = await fetch(this.opts.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`token request failed: ${res.status}`);
    const json = (await res.json()) as { access_token: string; expires_in?: number };
    const ttlMs = (json.expires_in ?? 300) * 1000;
    this.cached = { token: json.access_token, expiresAt: Date.now() + ttlMs };
    return json.access_token;
  }

  private async buildAssertion(): Promise<string> {
    const key = await importPKCS8(this.opts.privateKeyPem, this.opts.alg);
    return new SignJWT({})
      .setProtectedHeader({ alg: this.opts.alg, typ: "JWT" })
      .setIssuer(this.opts.clientId)
      .setSubject(this.opts.clientId)
      .setAudience(this.opts.tokenUrl)
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
  }
}
