import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPair, exportPKCS8, decodeJwt } from "jose";
import { TokenProvider } from "./backend-auth.js";

async function makeKey() {
  const { privateKey } = await generateKeyPair("RS384");
  return exportPKCS8(privateKey);
}

describe("TokenProvider", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts a signed client assertion and returns the access token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok-1", expires_in: 300 }), { status: 200 }),
    );
    const provider = new TokenProvider({
      tokenUrl: "https://auth.example.com/token",
      clientId: "client-123",
      privateKeyPem: await makeKey(),
      scopes: "system/*.read",
      alg: "RS384",
    });

    const token = await provider.getAccessToken();
    expect(token).toBe("tok-1");

    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_assertion_type")).toBe(
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    );
    expect((body.get("client_assertion") ?? "").split(".")).toHaveLength(3);

    const claims = decodeJwt(body.get("client_assertion")!);
    expect(claims.iss).toBe("client-123");
    expect(claims.sub).toBe("client-123");
    expect(claims.aud).toBe("https://auth.example.com/token");
    expect(typeof claims.jti).toBe("string");
    expect(typeof claims.exp).toBe("number");
  });

  it("caches the token and does not re-fetch before expiry", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok-1", expires_in: 300 }), { status: 200 }),
    );
    const provider = new TokenProvider({
      tokenUrl: "https://auth.example.com/token",
      clientId: "client-123",
      privateKeyPem: await makeKey(),
      scopes: "system/*.read",
      alg: "RS384",
    });
    await provider.getAccessToken();
    await provider.getAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on a non-200 token response", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }));
    const provider = new TokenProvider({
      tokenUrl: "https://auth.example.com/token",
      clientId: "client-123",
      privateKeyPem: await makeKey(),
      scopes: "system/*.read",
      alg: "RS384",
    });
    await expect(provider.getAccessToken()).rejects.toThrow(/token request failed: 401/);
  });
});
