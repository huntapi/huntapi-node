import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ENDPOINTS,
  HuntApiApiError,
  HuntApiClient,
  HuntApiConfigurationError,
  HuntApiResponseDecodingError,
  HuntApiSerializationError,
  HuntApiTransportError,
  type HuntApiFetch,
} from "../src/index.js";

type Recorded = { url: URL; init: RequestInit };

function mockFetch(
  responder: (request: Recorded) => Response | Promise<Response> = () =>
    jsonResponse({ ok: true }),
): { fetch: HuntApiFetch; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetch: HuntApiFetch = async (input, init) => {
    const recorded = { url: new URL(String(input)), init };
    calls.push(recorded);
    return responder(recorded);
  };
  return { fetch, calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function header(call: Recorded, name: string): string | null {
  return new Headers(call.init.headers).get(name);
}

describe("HuntApiClient configuration", () => {
  it("requires an API key", () => {
    const previous = process.env.HUNTAPI_API_KEY;
    delete process.env.HUNTAPI_API_KEY;
    try {
      assert.throws(() => new HuntApiClient(), HuntApiConfigurationError);
      assert.throws(
        () => new HuntApiClient({ apiKey: "   " }),
        HuntApiConfigurationError,
      );
    } finally {
      if (previous !== undefined) process.env.HUNTAPI_API_KEY = previous;
    }
  });

  it("reads the API key from HUNTAPI_API_KEY", async () => {
    const previous = process.env.HUNTAPI_API_KEY;
    process.env.HUNTAPI_API_KEY = "env-key";
    try {
      const { fetch, calls } = mockFetch();
      const client = new HuntApiClient({ fetch });
      await client.request("GET", "/v1/usage");
      assert.equal(header(calls[0]!, "x-api-key"), "env-key");
    } finally {
      if (previous === undefined) delete process.env.HUNTAPI_API_KEY;
      else process.env.HUNTAPI_API_KEY = previous;
    }
  });

  it("rejects an invalid base URL and timeout", () => {
    assert.throws(
      () => new HuntApiClient({ apiKey: "k", baseUrl: "not a url" }),
      HuntApiConfigurationError,
    );
    assert.throws(
      () => new HuntApiClient({ apiKey: "k", timeout: -1 }),
      HuntApiConfigurationError,
    );
  });
});

describe("requests", () => {
  it("sends the featured operation as a GET with the API key header", async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({ hello: "world" }));
    const client = new HuntApiClient({ apiKey: "test-key", fetch });
    const response = await client.mediaMetadata({
      query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
    });

    assert.equal(response.kind, "json");
    assert.deepEqual(response.data, { hello: "world" });
    const call = calls[0]!;
    assert.equal(call.init.method, "GET");
    assert.equal(
      call.url.origin + call.url.pathname,
      "https://api.huntapi.com/v1/media/metadata",
    );
    assert.equal(header(call, "x-api-key"), "test-key");
    assert.match(header(call, "user-agent") ?? "", /^huntapi-node\//);
    assert.equal(call.init.redirect, "manual");
  });

  it("serializes booleans, numbers and arrays in the query string", async () => {
    const { fetch, calls } = mockFetch();
    const client = new HuntApiClient({
      apiKey: "k",
      fetch,
      baseUrl: "https://example.test/",
    });
    await client.request("GET", "/v1/anything", {
      text: "a b&c",
      flag: false,
      count: 0,
      ratio: 1.5,
      list: ["x", "y"],
      skipped: undefined,
      nothing: null,
    });
    const url = calls[0]!.url;
    assert.equal(url.origin, "https://example.test");
    assert.deepEqual(
      [...url.searchParams],
      [
        ["text", "a b&c"],
        ["flag", "false"],
        ["count", "0"],
        ["ratio", "1.5"],
        ["list", "x"],
        ["list", "y"],
      ],
    );
  });

  it("sends POST parameters as a JSON body", async () => {
    const { fetch, calls } = mockFetch();
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await client.request("POST", "/v1/anything", {
      query: "x",
      page: 2,
      gone: undefined,
    });
    const call = calls[0]!;
    assert.equal(call.init.method, "POST");
    assert.equal(header(call, "content-type"), "application/json");
    assert.deepEqual(JSON.parse(String(call.init.body)), {
      query: "x",
      page: 2,
    });
    assert.equal(call.url.search, "");
  });

  it("fills path parameters", async () => {
    const { fetch, calls } = mockFetch();
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await client.request("GET", "/v1/items/{id}", { id: "a/b c", other: 1 });
    assert.equal(calls[0]!.url.pathname, "/v1/items/a%2Fb%20c");
    assert.equal(calls[0]!.url.search, "?other=1");
    await assert.rejects(
      client.request("GET", "/v1/items/{id}", {}),
      HuntApiSerializationError,
    );
  });

  it("keeps the global parameters in the query string on POST", async () => {
    const { fetch, calls } = mockFetch();
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await client.request("POST", "/v1/anything", {
      query: "x",
      is_async: true,
      fields: "a",
    });
    const call = calls[0]!;
    assert.deepEqual(JSON.parse(String(call.init.body)), { query: "x" });
    assert.equal(call.url.search, "?fields=a&is_async=true");
  });

  it("validates required parameters before sending", async () => {
    const { fetch, calls } = mockFetch();
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await assert.rejects(
      // @ts-expect-error -- missing required parameter on purpose
      client.mediaMetadata({}),
      HuntApiSerializationError,
    );
    assert.equal(calls.length, 0);
  });

  it("lets dual GET/POST operations use POST", async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({}));
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await client.audioDownload({ query: "test" }, { method: "POST" });
    assert.equal(calls[0]!.init.method, "POST");
    assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), {
      query: "test",
    });
  });

  it("rejects an unsupported method for an operation", async () => {
    const client = new HuntApiClient({ apiKey: "k", fetch: mockFetch().fetch });
    await assert.rejects(
      client.jobs({ id: "test" }, { method: "POST" }),
      HuntApiConfigurationError,
    );
  });

  it("accepts the global parameters on every endpoint", async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({ job_id: "j1" }));
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await client.mediaMetadata({
      ...{ query: "https://www.youtube.com/watch?v=Z5YP8kznWZs" },
      fields: "a,b.c",
      is_async: true,
      soft_fail: false,
    });
    const query = calls[0]!.url.searchParams;
    assert.equal(query.get("fields"), "a,b.c");
    assert.equal(query.get("is_async"), "true");
    assert.equal(query.get("soft_fail"), "false");
  });

  it("calls every documented endpoint on its path", async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({}));
    const client = new HuntApiClient({
      apiKey: "k",
      fetch,
    }) as unknown as Record<string, (params: unknown) => Promise<unknown>>;
    const required: Record<string, Record<string, unknown>> = {
      audio_download: { query: "test" },
      jobs: { id: "test" },
      media_metadata: { query: "test" },
      video_download: { query: "test" },
    };
    for (const [name, endpoint] of Object.entries(ENDPOINTS)) {
      const method = name.replace(/_([a-z0-9])/g, (_m, c: string) =>
        c.toUpperCase(),
      );
      assert.equal(
        typeof client[method],
        "function",
        `missing method ${method}`,
      );
      await client[method]!.call(client, required[name] ?? {});
      const call = calls.at(-1)!;
      const expectedPath = endpoint.path.replace(/\{[^}]+\}/g, "test");
      assert.equal(call.url.pathname, expectedPath, name);
      assert.equal(call.init.method, endpoint.methods[0], name);
    }
    assert.equal(calls.length, Object.keys(ENDPOINTS).length);
  });
});

describe("responses", () => {
  it("returns binary bodies with their content type", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const { fetch } = mockFetch(
      () => new Response(bytes, { headers: { "content-type": "image/png" } }),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch });
    const response = await client.request("GET", "/v1/anything");
    assert.equal(response.kind, "binary");
    if (response.kind === "binary") {
      assert.deepEqual([...response.bytes], [...bytes]);
      assert.equal(response.contentType, "image/png");
    }
  });

  it("rejects a non-JSON success for a JSON operation", async () => {
    const { fetch } = mockFetch(
      () =>
        new Response("<html>", { headers: { "content-type": "text/html" } }),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await assert.rejects(
      client.mediaMetadata({
        query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
      }),
      HuntApiResponseDecodingError,
    );
  });

  it("maps API errors", async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ error: "Invalid API Key" }, 401),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch });
    const error = await client
      .request("GET", "/v1/usage")
      .catch((e: unknown) => e);
    assert.ok(error instanceof HuntApiApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "Invalid API Key");
    assert.deepEqual(error.responseBody, { error: "Invalid API Key" });
  });

  it("keeps non-JSON error bodies", async () => {
    const { fetch } = mockFetch(
      () => new Response("Bad gateway", { status: 502 }),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch, maxRetries: 0 });
    const error = await client
      .request("GET", "/v1/usage")
      .catch((e: unknown) => e);
    assert.ok(error instanceof HuntApiApiError);
    assert.equal(error.status, 502);
    assert.equal(
      new TextDecoder().decode(error.rawResponse.body),
      "Bad gateway",
    );
  });

  it("wraps transport failures", async () => {
    const client = new HuntApiClient({
      apiKey: "k",
      maxRetries: 0,
      fetch: async () => {
        throw new TypeError("network down");
      },
    });
    await assert.rejects(
      client.request("GET", "/v1/usage"),
      HuntApiTransportError,
    );
  });

  it("propagates caller cancellation", async () => {
    const controller = new AbortController();
    controller.abort(new Error("stop"));
    const client = new HuntApiClient({ apiKey: "k", fetch: mockFetch().fetch });
    await assert.rejects(
      client.request("GET", "/v1/usage", null, { signal: controller.signal }),
      /stop/,
    );
  });
});

describe("retries", () => {
  it("retries retryable statuses, then succeeds", async () => {
    const statuses = [503, 429, 200];
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ ok: true }, statuses.shift()!),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch, retryDelay: 1 });
    const response = await client.request("GET", "/v1/usage");
    assert.equal(response.kind, "json");
    assert.equal(calls.length, 3);
  });

  it("gives up after maxRetries", async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ error: "busy" }, 503),
    );
    const client = new HuntApiClient({
      apiKey: "k",
      fetch,
      retryDelay: 1,
      maxRetries: 2,
    });
    await assert.rejects(client.request("GET", "/v1/usage"), HuntApiApiError);
    assert.equal(calls.length, 3);
  });

  it("never retries client errors", async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ error: "Payment required" }, 402),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch, retryDelay: 1 });
    await assert.rejects(client.request("GET", "/v1/usage"), HuntApiApiError);
    assert.equal(calls.length, 1);
  });

  it("retries network errors and honours Retry-After", async () => {
    let n = 0;
    const client = new HuntApiClient({
      apiKey: "k",
      retryDelay: 1,
      fetch: async () => {
        n++;
        if (n === 1) throw new TypeError("socket hang up");
        if (n === 2)
          return new Response("{}", {
            status: 429,
            headers: { "retry-after": "0", "content-type": "application/json" },
          });
        return jsonResponse({ ok: true });
      },
    });
    await client.request("GET", "/v1/usage");
    assert.equal(n, 3);
  });

  it("retries 401 rate limits but not per-key quotas or invalid keys", async () => {
    const cases: [string, number][] = [
      [
        "Rate limit exceeded: You've exceeded the rate limit on your subscription",
        2,
      ],
      ["Rate limit exceeded for the API key: quota daily", 1],
      ["Invalid API Key", 1],
    ];
    for (const [message, expectedCalls] of cases) {
      let n = 0;
      const { fetch, calls } = mockFetch(() =>
        n++ === 0
          ? jsonResponse({ error: message }, 401)
          : jsonResponse({ ok: true }),
      );
      const client = new HuntApiClient({ apiKey: "k", fetch, retryDelay: 1 });
      await client.request("GET", "/v1/usage").catch(() => undefined);
      assert.equal(calls.length, expectedCalls, message);
    }
  });

  it("lets one request override the retry count", async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({}, 500));
    const client = new HuntApiClient({ apiKey: "k", fetch, retryDelay: 1 });
    await assert.rejects(
      client.request("GET", "/v1/usage", null, { maxRetries: 0 }),
      HuntApiApiError,
    );
    assert.equal(calls.length, 1);
  });
});

describe("batch", () => {
  it("keeps input order, isolates failures and caps concurrency", async () => {
    const client = new HuntApiClient({ apiKey: "k", fetch: mockFetch().fetch });
    let running = 0;
    let peak = 0;
    const results = await client.batch(
      [1, 2, 3, 4, 5, 6],
      async (n) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        if (n === 4) throw new Error("boom");
        return n * 10;
      },
      { concurrency: 2 },
    );
    assert.equal(peak, 2);
    assert.deepEqual(
      results.map((r) => (r.status === "fulfilled" ? r.value : "failed")),
      [10, 20, 30, "failed", 50, 60],
    );
    assert.equal(results[3]!.index, 3);
  });

  it("runs SDK calls", async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({ ok: true }));
    const client = new HuntApiClient({ apiKey: "k", fetch });
    const results = await client.batch(["a", "b", "c"], (q) =>
      client.request("GET", "/v1/usage", { q }),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
    assert.equal(calls.length, 3);
  });
});

describe("waitForJob", () => {
  it("polls until the job reaches a terminal status", async () => {
    const statuses = ["Queued", "Running", "CompletedJob"];
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ status: statuses.shift(), progress: 50 }),
    );
    const client = new HuntApiClient({ apiKey: "k", fetch });
    const seen: unknown[] = [];
    const job = await client.waitForJob("abc", {
      intervalMs: 1,
      onProgress: (j) => seen.push(j),
    });
    assert.equal(job.data.status, "CompletedJob");
    assert.equal(calls.length, 3);
    assert.equal(calls[0]!.url.pathname, "/v1/jobs/abc");
    assert.equal(seen.length, 3);
  });

  it("times out", async () => {
    const { fetch } = mockFetch(() => jsonResponse({ status: "Running" }));
    const client = new HuntApiClient({ apiKey: "k", fetch });
    await assert.rejects(
      client.waitForJob("abc", { intervalMs: 5, timeoutMs: 1 }),
      /did not finish/,
    );
  });
});
